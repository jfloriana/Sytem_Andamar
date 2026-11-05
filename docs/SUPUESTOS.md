# Supuestos y decisiones

## Skills (sección 4.1)

| Skill | Decisión | Motivo |
|---|---|---|
| `awesome-design-md` | Usada (T0) | Referencia visual IBM Carbon -> `docs/DISENO.md`. |
| `ui-ux-pro-max` | Usada (T0) | Se aplicaron sus reglas de accesibilidad, formularios, tipografía y color; no se ejecutó su buscador de datos. |
| `frontend-design` | Usada en T1 y T2 | Criterio propio sin recargar: ficha 360 como secciones apiladas con borde fino, línea de tiempo con insignias de tipo, informe de importación en cifras tabulares. |
| `web-design-guidelines` | Usada en T1 y T2 | Auditoría de formularios (etiquetas, `aria-describedby`, `autocomplete`, foco al primer error), tablas y móvil; ver capturas en `docs/capturas/`. |
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
