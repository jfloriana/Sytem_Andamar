# Supuestos y decisiones

## Skills (sección 4.1)

| Skill | Decisión | Motivo |
|---|---|---|
| `awesome-design-md` | Usada (T0) | Referencia visual IBM Carbon -> `docs/DISENO.md`. |
| `ui-ux-pro-max` | Usada (T0) | Se aplicaron sus reglas de accesibilidad, formularios, tipografía y color; no se ejecutó su buscador de datos. |
| `frontend-design` | Usada en T1, T2 y T3 | Criterio propio sin recargar: ficha 360 como secciones apiladas con borde fino, línea de tiempo con insignias de tipo, informe de importación en cifras tabulares. |
| `web-design-guidelines` | Usada en T1, T2 y T3 | Auditoría de formularios (etiquetas, `aria-describedby`, `autocomplete`, foco al primer error), tablas y móvil; ver capturas en `docs/capturas/`. |
| `image-to-code` | Descartada | No hay capturas ni maquetas adjuntas. |
| Animación/3D (gsap-*, threejs-*, motion-design, animate*, etc.) | Descartadas | Prohibidas por la sección 4.1 y por simplicidad. |
| `test-driven-development` | Usada en T1 | Pruebas de `can()` y bloqueo escritas antes de la implementación. |
| `nextjs-supabase-auth`, `supabase`, `neon-postgres` | Descartadas | La autenticación es Auth.js con credenciales; la base la define el usuario. |

## Decisiones técnicas

- Next.js 15 (App Router), React 19, Prisma 6 (no 7, para mantener `schema.prisma` con `url`/`directUrl` clásicos), Tailwind 3.4, ESLint 8 con `eslint-config-next`, Auth.js v5 (`next-auth@beta`).
- shadcn/ui: componentes copiados a mano en `src/components/ui` (Button, Input, Label, Card, Table) con `components.json`, sin ejecutar la CLI interactiva.
- Sin base de datos disponible en T1: la migración inicial se generó con `prisma migrate diff --from-empty --to-schema-datamodel`; no se ha aplicado a ninguna base.
- Bloqueo tras 5 intentos fallidos: 15 minutos (`src/config.ts`). El contador se reinicia al iniciar sesión con éxito.
- `can(user, accion, recurso)` es una función pura; las reglas de propiedad (VENDEDOR solo su cartera, JEFE_VENTAS su equipo) se evalúan cuando el recurso trae `vendedorId`/`jefeId`.
- Los usuarios no se borran: se desactivan (`activo=false`) para conservar la auditoría. Un usuario desactivado no puede iniciar sesión.
- Las pruebas E2E requieren una base de pruebas con seed (T5); en T1 se escriben pero no se ejecutan.

## Fase 2: clientes, contactos, 360 y CSV

- Documento: se normaliza (sin espacios ni guiones, mayúsculas) y debe tener 6 a 20 letras o números, para admitir RUC, DNI y otros. Es único y bloquea.
- Teléfono: se guarda solo con dígitos (sin prefijo 51 de 11 dígitos), de 6 a 15 dígitos. Nombre "muy parecido" = nombre normalizado (sin tildes, puntuación ni sufijos S.A.C./E.I.R.L.) con similitud >= 0,90 (`DUPLICADOS` en `src/config.ts`). Nombre o teléfono repetidos solo advierten y se confirma con "Guardar de todos modos".
- Los mensajes de duplicado no revelan el nombre de clientes de otra cartera (un VENDEDOR ve "un cliente de otra cartera").
- Candidatos a duplicado: la consulta busca por documento, teléfono exacto o primeras 3 letras del nombre; si esas 3 letras difieren solo por tildes, el aviso puede no aparecer (la comparación fina sí ignora tildes).
- "Baja" de cliente = estado INACTIVO (no se borran filas: conservan pedidos, casos y auditoría). Ningún rol tiene la acción `eliminar` sobre clientes en la matriz. Auditoría: CREAR_CLIENTE, ACTUALIZAR_CLIENTE, BAJA_CLIENTE, REACTIVAR_CLIENTE, CREAR/ACTUALIZAR/ELIMINAR_CONTACTO e IMPORTAR_CLIENTES.
- Alcance de lectura: VENDEDOR solo su cartera; JEFE_VENTAS su equipo (`filtroCartera`); el resto de roles con permiso de lectura ve todo. Por URL directa un cliente ajeno redirige a `/sin-permiso`. Casos y consentimientos en la ficha se muestran según el rol (sin acceso: aviso); los módulos de pedidos, oportunidades, actividades y casos llegan en la fase 3, por ahora muestran estado vacío.
- Reasignar el vendedor de un cliente solo lo permite `can(..., "reasignar")` (JEFE_VENTAS sobre su equipo). ADMIN elige el vendedor al crear pero no reasigna.
- Importación CSV: solo ADMIN (recurso `importacion`). Columnas: documento, razonSocial, direccion, telefono, email, vendedorEmail, contactoNombre, contactoTelefono, contactoEmail; obligatorias las cuatro primeras salvo telefono/email. Máximo 1000 filas y 1 MB. Documento repetido (en el archivo o en el sistema) se omite como duplicado; nombre o teléfono repetidos se importan y se informan como advertencia. El servidor vuelve a validar el archivo al confirmar (no confía en la vista previa) e inserta en lotes de 200 con `skipDuplicates`.
- `samples/clientes_importacion.csv` se genera con `npx tsx scripts/generar-muestra-clientes.ts` (faker es, seed 42): 600 filas, 30 con errores, 12 con documento repetido y 6 con nombre repetido; 558 importables. Sus documentos empiezan con `2099` y el seed los borra, igual que los clientes `E2E...` creados por las pruebas, para poder repetir la suite.
- Seed de fase 2: 4 clientes demo (2 de `vendedor@`, 2 de `bloqueo@`), idempotente por documento.
- Tablas en móvil: cada fila se apila como tarjeta "etiqueta: valor" (`.tabla-apilada`, `data-label`) en lugar de desplazarse horizontalmente; en escritorio conservan el desplazamiento horizontal.

## Fase 3: oportunidades, actividades, pedidos y casos

- Oportunidades: se agregó `Oportunidad.etapaCambiadaAt` (migración `20261104120000`) para contar las actividades registradas desde el último cambio de etapa. La comparación usa el momento de registro (`Actividad.createdAt`, asignado por la aplicación con el mismo reloj), no la fecha de la visita, para que una actividad con fecha retroactiva no habilite un avance.
- Regla de avance: avanzar a una etapa posterior (incluida GANADA) exige al menos una actividad vinculada a esa oportunidad desde el último cambio. Retroceder no la exige. Marcar PERDIDA no exige actividad pero sí motivo (máx. 300 caracteres). GANADA y PERDIDA cierran la oportunidad (`cerradaAt`) y no admiten más cambios de etapa.
- Una actividad cuenta para una oportunidad solo si se registró desde ella («Registrar actividad» en su ficha); las del cliente sin vincular no cuentan.
- La oportunidad nace en la cartera del cliente (`vendedorId` = vendedor del cliente). Solo JEFE_VENTAS reasigna, y solo a vendedores de su equipo.
- Tablero: en móvil las seis etapas se apilan; en escritorio son columnas con desplazamiento horizontal. Cada tarjeta tiene «Mover etapa» (un diálogo nativo `<dialog>`), sin arrastrar y soltar, que funciona con teclado y táctil. Muestra hasta 20 tarjetas por columna y las 500 más recientes; la lista pagina de 25 en 25.
- «Mi día»: tarea = actividad no completada del usuario; usa el recordatorio si existe y, si no, la fecha. Vencida = antes de ahora. Visita, llamada y mensaje nacen completadas; solo la TAREA exige recordatorio. Las fechas de los formularios son hora de Lima (UTC-5 sin horario de verano) y se convierten a UTC en `src/domain/fechas.ts`.
- «Registrar visita en 3 pasos»: (1) botón «Registrar visita» de Mi día, (2) elegir cliente y anotar el resultado (tipo y fecha ya vienen por defecto), (3) «Guardar visita». Desde la ficha del cliente el cliente ya viene elegido.
- Selectores de cliente: lista simple de hasta 1.000 clientes de la cartera visible (sin dados de baja). Con más clientes se debe entrar desde la ficha (los enlaces «Nuevo ...» ya llevan el cliente).
- Pedidos: monto > 0 y margen entre 0 y el monto; no se aceptan fechas futuras (tolerancia de 1 día). Estados: REGISTRADO -> ENTREGADO -> ANULADO (ANULADO es final y pide confirmación). Los totales y el «último pedido» excluyen los anulados (consultas agregadas con `estado != ANULADO`, equivalente a `esPedidoValido`). Un pedido nuevo devuelve a ACTIVO a un cliente EN_RIESGO (regla 2); el cálculo de riesgo llega en la fase 4.
- Casos: `fechaLimite` = apertura + 24 h (`SLA.horasLimite`). Un caso sin primera respuesta, abierto y vencido se muestra ESCALADO al consultarlo (bandeja, detalle, Mi día y ficha del cliente) sin cambiar lo guardado; la tarea diaria de la fase 4 lo persistirá. La bandeja filtra con la condición equivalente en base de datos (`filtroEscalados`).
- Primera respuesta: se registra con el botón correspondiente (pasa a EN_PROCESO). «Resuelto en el primer contacto» solo puede marcarse al resolver un caso que aún no tiene primera respuesta; si ya la tenía, queda en «No». Resolver sin respuesta previa fija `primeraRespuestaAt` = `resueltoAt`. Cerrar solo aplica a casos resueltos.
- Alcance de casos: JEFE_SERVICIO y GERENCIA ven todos; EJECUTIVO_SERVICIO solo los suyos (responsable) y siempre queda como responsable de lo que registra; el jefe elige entre el equipo de servicio y puede reasignar mientras el caso esté abierto. En la ficha del cliente, el ejecutivo ve el historial de casos en solo lectura pero solo abre los propios.
- Auditoría de fase 3: CREAR/ACTUALIZAR/REASIGNAR_OPORTUNIDAD, CAMBIAR_ETAPA_OPORTUNIDAD, CREAR/COMPLETAR_ACTIVIDAD, CREAR/ANULAR/ENTREGAR_PEDIDO, CREAR/RESPONDER/RESOLVER/CERRAR/REASIGNAR_CASO. La matriz de `can()` no cambió.
- Seed de fase 3 (idempotente, relativo a la fecha de la corrida): 4 oportunidades `Demo:`, 3 actividades, 3 pedidos (uno ANULADO de 9.999 USD para probar la exclusión) y 2 casos (uno vencido sin responder, «Demo: Entrega incompleta»). Se borran y recrean en los 4 clientes demo; el seed también borra lo que las pruebas cuelgan de clientes `E2E...` y `2099...` antes de eliminarlos.


## Fase 4: segmentación, riesgo, CLV, cron y tablero

- Fórmulas, filtros y semáforo: ver `docs/INDICADORES.md`. Umbrales, metas y líneas base en `src/config.ts` (`SEGMENTOS`, `RIESGO`, `CLV`, `INDICADORES`).
- Riesgo: umbral = máximo entre 30 días y 1,5 x intervalo medio; «más de» es estricto (el día exacto del umbral no es riesgo). Con menos de 3 pedidos nunca hay riesgo. El recálculo no toca clientes `INACTIVO`.
- Segmento: la ventana de 12 meses es de calendario (UTC) e inclusiva en el inicio. Un cliente con pedidos pero solo fuera de la ventana queda `SIN_CLASIFICAR`. El histórico guarda a todos los clientes (incluidos dados de baja) con el día 1 del mes UTC; recalcular dos veces en el mes reemplaza las filas del mes.
- CLV: `r` es la retención de referencia fija (78 %, línea base del spec) en la ficha y en el tablero, para que ambas cifras coincidan y no dependan de un cálculo pesado por pantalla. Se puede cambiar en `CLV.retencionReferencia`.
- Tablero: fechas del período en UTC, hasta inclusive. Sin denominador el indicador es «Sin datos». La retención de la tendencia es anual móvil. La completitud no tiene historia de ediciones: su tendencia aplica los datos actuales a los clientes que existían en cada mes. Los usuarios activos usan `AuditLog` como señal de escritura.
- Cron: GET y POST con `Authorization: Bearer CRON_SECRET`; sin variable configurada todo se rechaza (401). Los cron no escriben auditoría porque `AuditLog.usuarioId` exige un usuario; «Recalcular ahora» sí (`RECALCULAR_SEGMENTACION`). Las rutas están excluidas del middleware de sesión (se protegen solo con el secreto).
- `vercel.json`: diario a las 08:00 UTC y mensual el día 1 a las 09:00 UTC (el plan gratuito permite una ejecución diaria como máximo).
- Auditoría de fase 4: `RECALCULAR_SEGMENTACION`, `EXPORTAR_INDICADORES`. La matriz de `can()` no cambió: `indicadores` (ver/exportar) y `segmentacion` (recalcular) ya estaban definidos en la fase 1. `JEFE_VENTAS` lee y exporta solo su equipo.
- Seed de fase 4 (idempotente): «Tienda Riesgo Muestra» (cartera de `vendedor@`, 4 pedidos cada 30 días que se cortaron hace 170 días: riesgo y segmento A tras recalcular) y 3 pedidos antiguos de «Panaderia Ajena Tres» (riesgo en otra cartera, para probar el alcance). Cada corrida devuelve los 5 clientes demo a `SIN_CLASIFICAR` y borra su histórico.
- Skills: `dataviz` no estaba instalada en la carpeta de skills del usuario; los gráficos siguen `docs/DISENO.md` (azules Carbon, leyenda y tabla alternativa, meta como línea de referencia, texto alternativo en cada gráfico). Sin animaciones en Recharts (`isAnimationActive={false}`).
