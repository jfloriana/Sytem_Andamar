# Prompt de desarrollo: CRM-Andamar (versión simple para Vercel o Render)

> Copia todo este contenido en tu asistente de programación (por ejemplo, una herramienta de programación) dentro de una carpeta vacía. El sistema se construye por fases y se despliega **solo en Vercel o en Render**, sin servidores propios ni contenedores.

---

## 1. Rol y objetivo

Actúa como un ingeniero de software full-stack con criterio de QA. Construye **CRM-Andamar**, un sistema web de gestión de la relación con los clientes (CRM) para **Andamar**, una distribuidora de productos de consumo (45 empleados, 600 clientes entre tiendas y pequeños supermercados, 15 vendedores). Es el sistema que acompaña al caso práctico integrador del informe «Gestión de la relación con los clientes (CRM)». Este documento es autosuficiente: todo lo que necesitas para construirlo (alcance, roles, datos, reglas, requerimientos y criterios de aceptación) está aquí, y no debes buscar nada en el informe.

El resultado es un **prototipo funcional y desplegable** en Vercel o Render, con datos de prueba y que cumple los criterios de la sección 12.

**Principio rector: simplicidad.** Si hay dos formas de hacer algo, elige la más simple que funcione en un entorno *serverless*. No agregues herramientas, servicios ni capas que este documento no pida. Trabaja de forma autónoma; si algo es ambiguo, decide, anótalo en `docs/SUPUESTOS.md` y sigue.

## 2. Problema de negocio

Andamar gestiona hoy a sus clientes en hojas de cálculo de cada vendedor; los pedidos llegan por llamadas y mensajes y el posventa es informal. Pierde clientes sin saber por qué, no puede pronosticar ventas y depende de la memoria de cada vendedor.

Metas a 12 meses que el sistema debe poder **medir**:

| Indicador | Línea base | Meta |
|---|---|---|
| Tasa de retención anual de clientes | 78 % | 83 % |
| Conversión de oportunidades | 18 % | 22 % |
| Casos resueltos en el primer contacto | no se mide | 70 % |
| Tiempo medio de respuesta a reclamos | no se mide | menos de 24 horas |
| Completitud de datos de clientes | 55 % (estimada) | 90 % |
| Usuarios activos del CRM | no aplica | 90 % de los usuarios con licencia |

## 3. Alcance

**Dentro:** clientes y contactos con vista 360°, embudo de oportunidades, actividades y tareas, pedidos, casos de servicio con plazo (SLA), segmentación A/B/C mensual, alerta de clientes en riesgo, tablero de seis indicadores, consentimientos y solicitudes de titulares de datos, administración de usuarios con auditoría básica e importación desde CSV.

**Fuera (no lo construyas):** facturación electrónica, app móvil nativa, WhatsApp u otra mensajería, IA generativa, multiempresa, pagos, Docker, colas de mensajes, correo transaccional, MFA, importación de Excel.

**Escala:** una sola sede, unos 21 usuarios, hasta 5.000 clientes, moneda USD, interfaz en español.

## 4. Stack técnico (fijo)

- **Next.js 14 o superior** (App Router) con **TypeScript estricto**, para interfaz y API (Server Actions y Route Handlers). Un solo proyecto, sin backend separado.
- **PostgreSQL gestionado + Prisma.** Con Vercel: Neon o Supabase (plan gratuito). Con Render: Render PostgreSQL. Usa la cadena de conexión *pooled* para la app y `DIRECT_URL` para migraciones; crea el cliente de Prisma como *singleton*.
- **Auth.js** (credenciales), contraseñas con `bcryptjs`, sesión JWT. Bloqueo temporal tras 5 intentos fallidos.
- **Zod** para validar toda entrada. **Tailwind CSS + shadcn/ui** para la interfaz y **Recharts** para gráficos. Diseño responsive.
- **papaparse** para importar CSV (solo CSV).
- **Pruebas:** Vitest para reglas de negocio, fórmulas y permisos, y **Playwright** (`@playwright/test`) para las pruebas de extremo a extremo de los flujos críticos (sección 4.2).
- **Calidad:** ESLint y `tsc --noEmit`.

**Restricciones del entorno serverless (respétalas):**
- No escribas archivos en disco ni guardes estado en memoria entre peticiones.
- No uses procesos en segundo plano, `node-cron` ni colas. Las tareas programadas se hacen con **Vercel Cron** (`vercel.json`) o con un **Cron Job de Render**, llamando a rutas `/api/cron/*` protegidas con el secreto `CRON_SECRET` (cabecera `Authorization: Bearer ...`).
- Las operaciones largas deben terminar en pocos segundos: importa en lotes (por ejemplo, 200 filas) y limita cada archivo a 1.000 filas.
- El PDF se obtiene con una **vista imprimible** (`window.print()` y estilos `@media print`), sin librerías de PDF en servidor.
- Ejecuta `prisma generate` en `postinstall` y `prisma migrate deploy` en el comando de build o de despliegue.

Convenciones: nombres de **dominio en español** (`Cliente`, `Oportunidad`, `Pedido`, `Caso`), identificadores técnicos en inglés. Commits pequeños al terminar cada fase.

## 4.1 Skills de apoyo

**Antes de escribir código, busca las skills disponibles.** Revisa la carpeta la carpeta de skills instaladas del usuario y las skills del proyecto. Lee el nombre y la descripción de cada una (el encabezado de su `SKILL.md`) y elige las que de verdad sirvan para construir este sistema. Anota en `docs/SUPUESTOS.md` cuáles elegiste y por qué, y cuáles descartaste. Si no puedes leer la carpeta, usa las de la tabla.

La tabla es la **base mínima**. Puedes sumar otras skills que encuentres si aportan a la interfaz, la calidad del código o las pruebas, con la restricción del final. Invócalas con su nombre antes de la tarea indicada; si alguna no está instalada, sigue sin ella y anótalo.

| Skill | Cuándo usarla |
|---|---|
| `/awesome-design-md` | **Una vez, al inicio.** Toma como referencia el `DESIGN.md` de un producto de gestión sobrio y claro (no uno vistoso) para fijar el criterio visual. |
| `/ui-ux-pro-max` | **Una vez, al inicio, y al diseñar tablas, formularios y el tablero.** Define paleta, tipografía y patrones; guarda los acuerdos en `docs/DISENO.md` (tokens de color, tamaños, espaciado, estados de formularios y tablas). |
| `/frontend-design` | **En cada fase con pantallas.** Da criterio visual propio a la interfaz y evita el aspecto genérico de plantilla, sin recargarla: es una herramienta de trabajo. |
| `/web-design-guidelines` | **Al cerrar cada fase con pantallas.** Audita el código de la interfaz (accesibilidad, formularios, foco, contraste, responsive) y corrige lo que encuentre antes de seguir. |
| `/image-to-code` | **Solo si el usuario adjunta capturas o maquetas** de una pantalla. Si no hay imágenes, no la uses. |

**Restricción:** aunque las encuentres, no uses skills de animación, 3D ni efectos (Three.js, GSAP, motion, etc.): el principio rector es la simplicidad y la interfaz va «sin adornos». Una skill nueva no autoriza a agregar dependencias, estilos o animaciones que no estén en la sección 4.

## 4.2 Pruebas de extremo a extremo con Playwright

Usa Playwright para comprobar en un navegador real lo que ya prometen los criterios de aceptación. Si el entorno tiene el plugin o servidor MCP de Playwright, úsalo para explorar la interfaz y depurar; lo que se guarda en el repositorio son pruebas `@playwright/test`.

- **Configuración** (`playwright.config.ts`): `baseURL` desde la variable `BASE_URL` (por defecto `http://localhost:3000`); `webServer` que levanta la app compilada (`npm run build && npm start`); proyectos **Chromium de escritorio** y **móvil** (por ejemplo, Pixel 7); capturas y traza solo al fallar.
- **Datos:** usa una base de datos **de pruebas**, separada de la real (otro proyecto de Supabase o un Postgres local), cargada con el seed. Nunca apuntes las pruebas a la base de producción. Antes de la suite, restablece los datos con el seed.
- **Sesión por rol:** inicia sesión una vez por rol y reutiliza `storageState` (`ADMIN`, `GERENCIA`, `JEFE_VENTAS`, `VENDEDOR`, `JEFE_SERVICIO`, `EJECUTIVO_SERVICIO`). Los selectores deben ser por rol o por texto accesible (`getByRole`, `getByLabel`), no por clases de CSS.
- **Pruebas mínimas** (carpeta `tests/e2e/`):
  1. `auth.spec.ts`: inicio de sesión correcto, error con clave incorrecta y bloqueo tras 5 intentos.
  2. `permisos.spec.ts`: un `VENDEDOR` no abre clientes ajenos ni por URL directa; cada rol ve solo su menú.
  3. `clientes.spec.ts`: crear cliente, aviso de duplicado, vista 360° e importación del CSV de muestra con informe de errores.
  4. `oportunidades.spec.ts`: no se avanza de etapa sin actividad; marcar «perdida» exige motivo.
  5. `casos.spec.ts`: un caso vencido aparece como escalado para el jefe de servicio.
  6. `indicadores.spec.ts`: el tablero muestra los seis indicadores con meta y línea base, y exporta CSV.
  7. `cumplimiento.spec.ts`: retirar un consentimiento en un clic; la supresión anonimiza los datos.
  8. `movil.spec.ts`: en un móvil (390×844) registrar una visita toma 3 pasos o menos.
  9. `humo-produccion.spec.ts`: solo inicio de sesión y carga del tablero; es la que se ejecuta contra la URL publicada (`BASE_URL=https://...`).
- **Capturas de revisión:** al terminar, guarda capturas de las pantallas principales en escritorio y móvil en `docs/capturas/` y revísalas con `/web-design-guidelines`.
- **Scripts de `package.json`:** `test` (Vitest), `test:e2e` (Playwright completo) y `test:e2e:humo` (solo la prueba de humo).
- **Vercel y Render:** las pruebas de Playwright no se ejecutan durante el despliegue; se corren en local y, contra la URL publicada, solo la prueba de humo.


## 5. Roles y permisos

| Rol (`enum Rol`) | Permisos |
|---|---|
| `ADMIN` | Usuarios y roles, importación, calidad de datos, consentimientos y auditoría. |
| `GERENCIA` | Lectura de tableros y reportes de toda la empresa; aprueba condiciones especiales del segmento A. |
| `JEFE_VENTAS` | Ve y reasigna clientes y oportunidades del equipo; tablero del equipo. |
| `VENDEDOR` | Solo **su cartera**: clientes, oportunidades, actividades y pedidos. No puede abrir clientes ajenos (tampoco por URL). |
| `JEFE_SERVICIO` | Supervisa casos, plazos y escalamientos; asigna responsables. |
| `EJECUTIVO_SERVICIO` | Registra y resuelve casos; ve el historial del cliente en solo lectura. |

La autorización se aplica **en el servidor** con una función central `can(user, accion, recurso)` usada en todas las acciones y rutas. Cúbrela con pruebas (rol × acción).

## 6. Modelo de datos (Prisma)

Todas las entidades llevan `id`, `createdAt` y `updatedAt`.

- **Usuario**: `nombre`, `email` (único), `passwordHash`, `rol`, `activo`, `jefeId?` (para equipos), `intentosFallidos`, `bloqueadoHasta?`.
- **Cliente**: `documento` (único), `razonSocial`, `direccion`, `telefono?`, `email?`, `estado` (`ACTIVO | INACTIVO | EN_RIESGO`), `segmento` (`A | B | C | SIN_CLASIFICAR`), `vendedorId`, `condicionesEspeciales?`.
- **Contacto**: `clienteId`, `nombre`, `cargo?`, `telefono?`, `email?`, `principal` (uno por cliente).
- **Oportunidad**: `clienteId`, `vendedorId`, `titulo`, `etapa` (`PROSPECTO | CONTACTADO | PROPUESTA | NEGOCIACION | GANADA | PERDIDA`), `montoEstimado`, `motivoPerdida?` (obligatorio si `PERDIDA`), `cerradaAt?`.
- **Actividad**: `tipo` (`VISITA | LLAMADA | MENSAJE | TAREA`), `clienteId`, `oportunidadId?`, `usuarioId`, `fecha`, `resultado?`, `recordatorioAt?`, `completada`.
- **Pedido**: `clienteId`, `oportunidadId?`, `vendedorId`, `fecha`, `monto`, `margen`, `estado` (`REGISTRADO | ENTREGADO | ANULADO`; los anulados no cuentan).
- **Caso**: `clienteId`, `titulo`, `descripcion`, `prioridad` (`BAJA | MEDIA | ALTA | URGENTE`), `estado` (`ABIERTO | EN_PROCESO | ESCALADO | RESUELTO | CERRADO`), `responsableId`, `aperturaAt`, `fechaLimite`, `primeraRespuestaAt?`, `resueltoAt?`, `resueltoPrimerContacto`.
- **Consentimiento**: `clienteId`, `finalidad` (`SERVICIO | PROMOCIONES | ANALITICA`), `canal` (`TELEFONO | EMAIL | WHATSAPP | PRESENCIAL`), `otorgadoAt`, `retiradoAt?`.
- **SegmentoHistorico**: `clienteId`, `mes`, `segmento`, `margenAnual`. Único por (`clienteId`, `mes`).
- **SolicitudTitular**: `clienteId`, `tipo` (`ACCESO | RECTIFICACION | SUPRESION`), `estado`, `solicitadaAt`, `atendidaAt?`.
- **AuditLog**: `usuarioId`, `accion`, `entidad`, `entidadId`, `detalle` (JSON), `createdAt`. Registra altas, cambios y bajas de clientes y usuarios, importaciones, exportaciones y solicitudes de titulares.

Los umbrales y parámetros (segmentos, SLA, límites) van en un archivo `src/config.ts`, no en la base de datos. Índices mínimos: `Cliente(documento)`, `Cliente(vendedorId)`, `Pedido(clienteId, fecha)`, `Oportunidad(etapa, vendedorId)`, `Caso(estado, fechaLimite)`.

## 7. Reglas de negocio (funciones puras en `src/domain/`, con pruebas)

1. **Segmentación.** Margen de los **últimos 12 meses** (pedidos no anulados). **A**: ≥ 1.000 USD; **B**: 300 a 999 USD; **C**: menos de 300 USD; sin pedidos: `SIN_CLASIFICAR`. Se guarda en `SegmentoHistorico` y en `Cliente.segmento`.
2. **Cliente en riesgo.** Sin pedidos durante más de **1,5 veces su intervalo medio de compra** (mínimo 30 días; requiere al menos 3 pedidos). Pasa a `EN_RIESGO` y aparece en la lista de alertas; vuelve a `ACTIVO` con un nuevo pedido.
3. **Oportunidades.** No avanza de etapa sin al menos **una actividad** registrada desde el último cambio de etapa. Al cerrar como `PERDIDA` el motivo es obligatorio.
4. **Servicio (SLA).** `fechaLimite` = apertura + 24 horas. Un caso sin primera respuesta y vencido se **considera escalado al consultarlo** (se calcula al leer, no con un proceso en segundo plano) y la tarea diaria lo marca como `ESCALADO`.
5. **Calidad de datos.** Cliente **completo** = documento, razón social, contacto principal con teléfono o correo, dirección y vendedor asignado.
6. **Contacto responsable.** Máximo **2 comunicaciones promocionales por semana** por cliente y ninguna si retiró el consentimiento de `PROMOCIONES`; contador visible en la ficha.
7. **Duplicados.** Documento único (bloquea); nombre normalizado o teléfono repetidos solo advierten.

**Tareas programadas** (solo dos rutas, ambas con `CRON_SECRET`):
- `/api/cron/diario`: recalcula clientes en riesgo y marca casos vencidos como `ESCALADO`.
- `/api/cron/mensual`: recalcula segmentos y guarda el histórico.
Configura ambas en `vercel.json` (en el plan gratuito de Vercel, cada tarea puede correr como máximo una vez al día; la mensual se programa para el día 1). En Render, usa dos Cron Jobs que llamen a esas rutas. Agrega un botón **«Recalcular ahora»** para `ADMIN`, útil para demostraciones.

## 8. Requerimientos funcionales y criterios de aceptación

| ID | Requerimiento | Prioridad | Criterio de aceptación |
|---|---|---|---|
| RF-01 | Registrar, editar y consultar clientes y contactos con documento único y aviso de duplicados. | Debe | Documento repetido da error claro; nombre muy parecido da advertencia confirmable. |
| RF-02 | Vista 360° del cliente. | Debe | Una página con datos, pedidos, oportunidades, actividades, casos y consentimientos, y una línea de tiempo combinada. |
| RF-03 | Importar clientes desde CSV con validación por fila. | Debe | Vista previa, informe de errores y duplicados, e importación solo tras confirmar. |
| RF-04 | Embudo de oportunidades con etapas estándar. | Debe | Tablero por columnas y lista; bloqueo de avance sin actividad; motivo obligatorio en perdidas. |
| RF-05 | Actividades y tareas con recordatorio. | Debe | Registrar una visita en 3 pasos o menos; pantalla «Mi día» con tareas pendientes y vencidas. |
| RF-06 | Pedidos con monto y margen. | Debe | Actualiza la ficha, el último pedido y el cálculo de riesgo. |
| RF-07 | Segmento A/B/C mensual con histórico. | Debe | «Recalcular ahora» genera filas en `SegmentoHistorico` y se ve la evolución por cliente. |
| RF-08 | Lista de clientes en riesgo. | Debería | Filtrable por vendedor y segmento, con días sin compra e intervalo habitual. |
| RF-09 | CLV simplificado: `CLV = m × r / (1 + d − r)` (`m` margen anual, `r` retención, `d` = 10 %). | Podría | Visible en la ficha y por segmento, con nota de que es una aproximación. |
| RF-10 | Casos de servicio con prioridad, responsable, plazo y escalamiento. | Debe | Un caso vencido aparece como escalado en la bandeja del jefe de servicio. |
| RF-11 | Marcar resolución en primer contacto y medir tiempos. | Debe | Tiempos calculados con apertura, primera respuesta y resolución. |
| RF-12 | Tablero de seis indicadores con filtros y exportación. | Debe | Ver sección 9; exporta CSV y vista imprimible para PDF. |
| RF-13 | Consentimientos y solicitudes de acceso, rectificación y supresión. | Debe | Retirar un consentimiento en un clic; la supresión **anonimiza** los datos personales y queda en auditoría. |
| RF-14 | Usuarios, roles y auditoría. | Debe | Alta, baja y cambio de rol de usuarios; bloqueo tras 5 intentos; visor de auditoría con filtros simples. |

## 9. Indicadores del tablero

Documenta cada fórmula en `docs/INDICADORES.md` y como ayuda en pantalla. Filtros: período, vendedor y segmento.

1. **Retención** = (clientes activos al final − nuevos del período) / activos al inicio × 100. Activo = al menos un pedido no anulado en los 12 meses previos.
2. **Conversión** = oportunidades `GANADA` cerradas en el período / oportunidades creadas en el período × 100.
3. **Resolución en primer contacto** = casos con `resueltoPrimerContacto` / casos resueltos o cerrados × 100.
4. **Tiempo medio de respuesta** = promedio de (`primeraRespuestaAt` − `aperturaAt`) en horas, más el porcentaje dentro del SLA.
5. **Completitud de datos** = clientes completos / clientes activos × 100.
6. **Usuarios activos** = usuarios que hicieron al menos una acción de escritura en los últimos 30 días / usuarios activos × 100.

Cada tarjeta muestra valor, **meta**, **línea base** y semáforo; añade un gráfico de tendencia mensual y la distribución por segmento.

## 10. Interfaz

- Menú lateral por módulos según rol: Inicio («Mi día»), Clientes, Oportunidades, Pedidos, Casos, Indicadores, Cumplimiento, Administración.
- Buscador de clientes por nombre, documento o teléfono.
- Formularios con validación en línea y mensajes claros en español; confirmación antes de acciones destructivas.
- Móvil primero en ficha de cliente, registrar visita y «Mi día». Paleta sobria en azules. Sin adornos innecesarios.

## 11. Seguridad y privacidad (lo esencial)

- Autorización en servidor en cada acción (sección 5); validación con Zod en toda entrada.
- Contraseñas con `bcryptjs`, bloqueo tras 5 intentos, cookies seguras (HTTPS lo da Vercel o Render), secretos solo en variables de entorno del proveedor; incluye `.env.example` sin valores reales.
- Consentimiento por finalidad y canal, retiro sencillo, atención de derechos y auditoría, según la ley de protección de datos del país de operación (por ejemplo, Ley 29733 en Perú). Incluye una página de política de privacidad editable y una nota en `docs/PRIVACIDAD.md` de que no sustituye asesoría legal.
- **Todos los datos de ejemplo son inventados.** Respaldos: usa los del proveedor de base de datos y documéntalo en el README.

## 12. Datos de prueba y aceptación

**Seed** (`prisma/seed.ts`, determinista con `@faker-js/faker` en español y `seed(42)`):
- **21 usuarios**: 1 `ADMIN`, 1 `GERENCIA`, 1 `JEFE_VENTAS`, 15 `VENDEDOR`, 1 `JEFE_SERVICIO` y 2 `EJECUTIVO_SERVICIO`.
- **600 clientes**: 60 de segmento A (margen anual ≈ 1.500 USD), 240 B (≈ 500 USD) y 300 C (≈ 120 USD); margen total ≈ 246.000 USD.
- **24 meses de pedidos**, unos 40 clientes con compras espaciadas (para que aparezcan en riesgo), ~400 oportunidades (conversión cercana a 18 %), actividades, ~150 casos y consentimientos.
- Cerca del 55 % de clientes con datos completos.
- `samples/clientes_importacion.csv` con 600 filas, ~5 % con errores y ~3 % duplicados, para probar RF-03.

**Pruebas automáticas (Vitest):** reglas de la sección 7, fórmulas de la sección 9 (casos límite: sin pedidos, un solo pedido, umbral exacto) y la matriz de permisos; cobertura mínima de 70 % en `src/domain/`.

**Pruebas de extremo a extremo (Playwright):** las de la sección 4.2. Cubren de forma automática los puntos 4 y 5 de la lista de aceptación y parte de los puntos 1, 2 y 3.

**Lista de aceptación** (guárdala en `docs/ACEPTACION.md`, marca cada punto y anota qué prueba lo cubre; los puntos sin prueba automática se revisan a mano):
1. Importar los 600 clientes: menos de 2 % de duplicados y completitud de al menos 90 % tras la limpieza guiada.
2. Los 12 requerimientos «Debe» (RF-01 a RF-07 y RF-10 a RF-14) funcionan.
3. Los indicadores coinciden con el cálculo de `scripts/verificar-indicadores.ts` sobre una muestra de 30 clientes, sin diferencias.
4. Un `VENDEDOR` no puede ver clientes de otro (ni por URL directa).
5. Registrar una visita toma 3 pasos o menos desde el celular.
6. Las pantallas principales cargan en menos de 2 segundos con el seed completo.

## 13. Estructura del proyecto

```
crm-andamar/
├─ src/app/          # páginas, acciones y rutas /api (por módulo)
├─ src/domain/       # reglas puras: segmentacion, riesgo, sla, indicadores
├─ src/lib/          # permisos (can), auditoría, utilidades
├─ src/config.ts     # umbrales y parámetros
├─ src/components/
├─ prisma/           # schema.prisma, migraciones, seed.ts
├─ scripts/          # verificar-indicadores.ts
├─ samples/          # clientes_importacion.csv
├─ tests/            # pruebas Vitest
├─ tests/e2e/        # pruebas Playwright
├─ playwright.config.ts
├─ docs/             # SUPUESTOS.md, INDICADORES.md, PRIVACIDAD.md, ACEPTACION.md, DISENO.md, capturas/
├─ vercel.json       # solo si se despliega en Vercel (crons)
├─ .env.example, README.md
```

## 14. Despliegue (elige uno)

**Opción A: Vercel**
1. Sube el repositorio a GitHub e impórtalo en Vercel.
2. Crea la base de datos en Neon o Supabase y copia las cadenas pooled y directa.
3. Variables de entorno en Vercel: `DATABASE_URL`, `DIRECT_URL`, `AUTH_SECRET`, `AUTH_URL` (o `NEXTAUTH_URL`) y `CRON_SECRET`.
4. Build: `prisma generate && prisma migrate deploy && next build`. Las tareas programadas salen de `vercel.json`.
5. Ejecuta el seed una vez desde tu computadora apuntando a esa base (`npx prisma db seed`).

**Opción B: Render**
1. Crea un *Web Service* desde GitHub (Build: `npm install && npx prisma generate && npx prisma migrate deploy && npm run build`; Start: `npm start`) y una base **Render PostgreSQL**.
2. Mismas variables de entorno que en A.
3. Crea dos **Cron Jobs** de Render que llamen a `/api/cron/diario` y `/api/cron/mensual` con la cabecera `Authorization: Bearer $CRON_SECRET`.
4. Nota: en el plan gratuito el servicio se duerme tras un rato sin uso; avisa de esto en el README.

El README debe explicar **ambas opciones paso a paso** y cómo correr el proyecto en local (`npm install`, `.env`, migraciones, seed, `npm run dev`).

## 15. Forma de trabajo: 5 fases

Antes de empezar, aplica `/awesome-design-md` y `/ui-ux-pro-max` (sección 4.1) y escribe `docs/DISENO.md`. Al terminar cada fase con pantallas ejecuta `/web-design-guidelines`, y en cada una añade las pruebas de Playwright de lo que construiste. Al terminar cada fase ejecuta `tsc --noEmit`, lint, pruebas y `next build`; corrige antes de seguir; haz un commit y resume en 5 líneas lo hecho y lo pendiente.

1. **Fase 1.** Proyecto, base de datos y `schema.prisma`, autenticación, roles, función `can`, auditoría y usuarios (RF-14).
2. **Fase 2.** Clientes, contactos, vista 360°, duplicados e importación CSV (RF-01 a RF-03).
3. **Fase 3.** Oportunidades, actividades, pedidos y casos de servicio con SLA (RF-04 a RF-06, RF-10, RF-11).
4. **Fase 4.** Segmentación, clientes en riesgo, CLV, rutas cron y tablero de indicadores (RF-07 a RF-09, RF-12).
5. **Fase 5.** Consentimientos y solicitudes de titulares (RF-13), seed completo, README, despliegue de prueba y lista de aceptación.

## 16. Verificación antes de entregar (4 capas)

Reporta el resultado de cada una:
1. **Estática:** `tsc --noEmit`, ESLint y `next build` sin errores.
2. **Pruebas:** Vitest en verde (reglas, fórmulas y permisos) y la suite de Playwright en verde en escritorio y móvil.
3. **Funcional y de diseño:** recorrer la lista de `docs/ACEPTACION.md` con un usuario de cada rol, revisar las capturas de `docs/capturas/` con `/web-design-guidelines` y marcar cada punto.
4. **Despliegue:** publicar en Vercel o Render, abrir la URL, iniciar sesión, ver el tablero y ejecutar «Recalcular ahora»; después corre `npm run test:e2e:humo` contra esa URL.

## 17. Entregables

- Repositorio funcionando local y desplegado, con README claro.
- `docs/` breve y completo.
- Resumen final: qué RF quedaron hechos, cuáles parciales (con motivo), supuestos y riesgos conocidos.

## 18. Reglas de conducta

- No amplíes el alcance ni agregues tecnologías no pedidas (sin librerías de animación ni 3D).
- Código legible: funciones cortas, reglas de negocio fuera de la interfaz, nombres claros.
- No dejes funciones a medio hacer ni pruebas desactivadas; si una prueba falla, corrige la causa.
