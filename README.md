<div align="center">

# 🤝 CRM-Andamar — Gestión de Clientes, Ventas y Servicio

### Plataforma web para el distribuidor Andamar: cartera de clientes, pipeline comercial, pedidos y atención postventa con SLA, control de acceso por rol y auditoría

[![Repo](https://img.shields.io/badge/REPO-GITHUB-181717?style=for-the-badge&logo=github)](https://github.com/jfloriana/Sytem_Andamar)
[![Deploy](https://img.shields.io/badge/DEPLOY-VERCEL-000000?style=for-the-badge&logo=vercel)](https://crm-andamar.vercel.app)
[![Next.js](https://img.shields.io/badge/NEXT.JS-15-000000?style=for-the-badge&logo=nextdotjs)](https://nextjs.org)
[![React](https://img.shields.io/badge/REACT-19-149ECA?style=for-the-badge&logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TYPESCRIPT-STRICT-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![PostgreSQL](https://img.shields.io/badge/POSTGRESQL-SUPABASE-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com)
[![Prisma](https://img.shields.io/badge/PRISMA-6-2D3748?style=for-the-badge&logo=prisma)](https://www.prisma.io)
[![Tailwind](https://img.shields.io/badge/TAILWIND-3.4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)

![Roles](https://img.shields.io/badge/Roles-6-1f6feb)
![Entidades](https://img.shields.io/badge/Entidades-11-0f62fe)
![Auth](https://img.shields.io/badge/Auth-Auth.js%20v5%20%7C%20JWT-6f42c1)
![Pruebas unitarias](https://img.shields.io/badge/Vitest-1221%20pruebas-6e9f18)
![E2E](https://img.shields.io/badge/E2E-Playwright-2ead33)
![Responsive](https://img.shields.io/badge/UI-Responsive%20%7C%20m%C3%B3vil-0e7490)
![Fases](https://img.shields.io/badge/Fases-5%20de%205-f59e0b)

</div>

---

## ¿De qué trata el sistema?

Andamar distribuye productos a una cartera de clientes atendida por varios equipos. Sin un sistema común, la información queda dispersa en hojas de cálculo, correos y mensajes: se duplican clientes, se pierden oportunidades de venta y los reclamos se atienden tarde.

**CRM-Andamar resuelve eso en una sola aplicación web:**

- **Ventas:** cada vendedor ve su cartera de clientes, registra visitas y llamadas, y sigue sus oportunidades de venta desde el primer contacto hasta el cierre.
- **Pedidos:** se registran los pedidos de cada cliente, lo que permite conocer su historial de compras.
- **Servicio al cliente:** los reclamos y consultas se registran como casos con un plazo máximo de atención (SLA). Si un caso se vence, se marca y escala a su jefatura.
- **Datos limpios:** el sistema detecta clientes duplicados y permite cargar cientos de clientes desde un archivo CSV, informando qué filas tienen errores.
- **Vista 360° del cliente:** en una sola pantalla se ve todo lo que ocurrió con un cliente (contactos, actividades, oportunidades, pedidos y casos) en orden cronológico.
- **Control por rol:** cada persona solo ve y hace lo que su cargo permite (vendedor, jefe de ventas, ejecutivo de servicio, gerencia, administrador).
- **Trazabilidad:** las acciones importantes quedan registradas en una bitácora de auditoría.

En las siguientes fases se añaden indicadores gerenciales (clientes en riesgo, valor de vida del cliente, segmentación) y la gestión de consentimientos de datos personales.

> Proyecto académico/demostrativo. Este documento no contiene credenciales, cadenas de conexión ni datos reales; todos los valores sensibles se configuran mediante variables de entorno.

---

## Tabla de contenido

1. [Estado del proyecto](#1-estado-del-proyecto)
2. [Funcionalidades](#2-funcionalidades)
3. [Stack tecnológico](#3-stack-tecnológico)
4. [Arquitectura](#4-arquitectura)
5. [Roles y permisos](#5-roles-y-permisos)
6. [Modelo de datos](#6-modelo-de-datos)
7. [Reglas de negocio](#7-reglas-de-negocio)
8. [Requisitos previos](#8-requisitos-previos)
9. [Instalación local](#9-instalación-local)
10. [Variables de entorno](#10-variables-de-entorno)
11. [Base de datos: migraciones y semilla](#11-base-de-datos-migraciones-y-semilla)
12. [Scripts disponibles](#12-scripts-disponibles)
13. [Pruebas](#13-pruebas)
14. [Despliegue](#14-despliegue)
15. [Seguridad](#15-seguridad)
16. [Estructura del repositorio](#16-estructura-del-repositorio)
17. [Documentación adicional](#17-documentación-adicional)
18. [Solución de problemas](#18-solución-de-problemas)
19. [Hoja de ruta](#19-hoja-de-ruta)

---

## 1. Estado del proyecto

El desarrollo se organiza en cinco fases.

| Fase | Alcance | Estado |
|------|---------|--------|
| 1 | Proyecto base, esquema de datos, autenticación, roles, autorización central, auditoría, gestión de usuarios | Completa |
| 2 | Clientes, contactos, vista 360°, detección de duplicados, importación CSV | Completa |
| 3 | Oportunidades, actividades, pedidos, casos de servicio con SLA | Completa |
| 4 | Segmentación, clientes en riesgo, valor de vida (CLV), tareas programadas, tablero de indicadores | Completa |
| 5 | Consentimientos y solicitudes de titulares, semilla completa, guía de aceptación | Completa |

## 2. Funcionalidades

**Acceso y administración**
- Inicio de sesión con credenciales, sesiones JWT y bloqueo temporal de cuenta tras intentos fallidos.
- Gestión de usuarios y asignación de roles.
- Registro de auditoría de acciones relevantes.

**Clientes**
- Alta, edición y baja lógica (los clientes pasan a estado inactivo, no se eliminan).
- Contactos asociados y vista 360° con línea de tiempo unificada.
- Normalización de documentos y nombres, detección de duplicados e indicador de calidad de datos.
- Importación masiva desde CSV con validación fila a fila, informe de errores y detección de repetidos.

**Comercial**
- Oportunidades con etapas de embudo y registro de cambios de etapa.
- Actividades (llamadas, visitas, tareas) ligadas a clientes y oportunidades.
- Pedidos con montos y estados.

**Servicio**
- Casos de servicio con acuerdos de nivel de servicio (SLA) por prioridad y escalamiento automático calculado al consultar.

**Experiencia de uso**
- Interfaz sobria en tono azul, diseño responsivo; en móvil las tablas se presentan como tarjetas apiladas.
- Formularios con retención de datos tras errores de validación.

## 3. Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Framework | Next.js 15 (App Router), React 19 |
| Lenguaje | TypeScript en modo estricto |
| Base de datos | PostgreSQL |
| ORM | Prisma 6 |
| Autenticación | Auth.js v5 (credenciales, JWT) y bcryptjs |
| Validación | Zod |
| Estilos | Tailwind CSS 3.4 y componentes de estilo shadcn/ui |
| Importación | papaparse |
| Pruebas | Vitest (unitarias) y Playwright (extremo a extremo) |
| Despliegue | Vercel (también compatible con Render) |

## 4. Arquitectura

```
Navegador ─► Next.js (App Router)
              ├─ Componentes de servidor / Server Actions
              ├─ Rutas API (/api/*)
              └─ Middleware de sesión
                     │
        ┌────────────┴─────────────┐
        │  Capa de autorización    │  can(usuario, acción, recurso)
        │  Capa de dominio (pura)  │  reglas sin dependencias de I/O
        └────────────┬─────────────┘
                     │
                 Prisma ─► PostgreSQL
```

Principios de diseño:

- **Autorización centralizada en el servidor.** Toda decisión de acceso pasa por una única función `can()`; la interfaz oculta opciones, pero nunca es la barrera de seguridad.
- **Dominio puro y probado.** Las reglas de negocio (normalización, duplicados, importación, SLA, etapas, pedidos, fechas) viven en `src/domain/` como funciones sin efectos secundarios y con pruebas unitarias.
- **Escalamiento de SLA sin tareas en segundo plano.** El estado de vencimiento se calcula al leer, por lo que no depende de procesos programados.
- **Parámetros en un solo lugar.** Umbrales, plazos y límites se definen en `src/config.ts`.
- **Zona horaria.** Las fechas de negocio se interpretan en hora de Lima y se almacenan en UTC.

## 5. Roles y permisos

| Rol | Descripción |
|-----|-------------|
| ADMIN | Administración de usuarios y configuración |
| GERENCIA | Visión global y lectura de indicadores |
| JEFE_VENTAS | Supervisa la cartera comercial y reasigna vendedores |
| VENDEDOR | Gestiona su propia cartera |
| JEFE_SERVICIO | Supervisa los casos de servicio |
| EJECUTIVO_SERVICIO | Atiende casos de servicio |

El detalle de la matriz acción × recurso está codificado en `src/lib/permisos.ts` y cubierto por pruebas de permisos extremo a extremo.

## 6. Modelo de datos

El esquema (`prisma/schema.prisma`) define once entidades principales: usuarios, clientes, contactos, oportunidades, actividades, pedidos, casos de servicio, registros de auditoría y las entidades de cumplimiento (consentimientos, solicitudes de titulares y política de privacidad). Las migraciones versionadas están en `prisma/migrations/`.

## 7. Reglas de negocio

- **Bloqueo de cuenta:** 5 intentos fallidos consecutivos bloquean el acceso durante 15 minutos.
- **Duplicados:** se comparan documentos y nombres normalizados antes de crear o importar.
- **Importación CSV:** cada fila se valida; las inválidas se informan y las repetidas se omiten, importando solo las filas correctas.
- **SLA:** cada prioridad de caso tiene un plazo; al vencer se marca y escala automáticamente en la lectura.
- **Baja de clientes:** lógica, preserva el historial.

Los supuestos de interpretación del requerimiento están en `docs/SUPUESTOS.md`.

## 8. Requisitos previos

- Node.js 20 o superior y npm
- Una base de datos PostgreSQL accesible (local o en la nube, por ejemplo Supabase o Neon)
- Git

## 9. Instalación local

```bash
git clone https://github.com/jfloriana/Sytem_Andamar.git
cd Sytem_Andamar
npm install            # ejecuta prisma generate automáticamente
```

Cree un archivo `.env` en la raíz del proyecto definiendo las variables descritas en la sección siguiente, aplique las migraciones y cargue los datos de demostración:

```bash
npm run db:migrate
npm run db:seed
npm run dev
```

La aplicación queda disponible en `http://localhost:3000`.

## 10. Variables de entorno

Los valores **nunca** deben subirse al repositorio. El archivo `.env` está excluido por `.gitignore`.

| Variable | Propósito |
|----------|-----------|
| `DATABASE_URL` | Conexión a PostgreSQL usada por la aplicación (en la nube, usar el pooler de transacciones) |
| `DIRECT_URL` | Conexión directa usada por las migraciones |
| `AUTH_SECRET` | Secreto para firmar sesiones; genere uno aleatorio de al menos 32 bytes |
| `AUTH_URL` | URL pública de la aplicación (en local, `http://localhost:3000`) |
| `AUTH_TRUST_HOST` | `true` en plataformas con proxy como Vercel |
| `CRON_SECRET` | Secreto que autoriza las rutas programadas (fase 4) |
| `SEED_PASSWORD` | Contraseña inicial que la semilla asigna a los usuarios de demostración |
| `E2E_PASSWORD` | Contraseña que usan las pruebas extremo a extremo |
| `BASE_URL` | Opcional; URL objetivo de las pruebas extremo a extremo |

Para generar un secreto aleatorio:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Si la contraseña de la base de datos contiene caracteres especiales, deben codificarse en la URL (por ejemplo `@` como `%40` y `#` como `%23`).

## 11. Base de datos: migraciones y semilla

- `npm run db:migrate` aplica las migraciones pendientes (`prisma migrate deploy`).
- `npm run db:seed` carga datos de demostración de forma **idempotente**: un usuario por rol más usuarios adicionales, unos 600 clientes, 24 meses de pedidos, oportunidades, actividades, casos de servicio y consentimientos de muestra. Termina recalculando segmentos y clientes en riesgo. Tarda un par de minutos con una base en la nube.
- El archivo `samples/clientes_importacion.csv` contiene 600 filas pensadas para probar la importación, con errores y repetidos intencionales.

## 12. Scripts disponibles

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Compilación de producción |
| `npm run start` | Servidor de producción |
| `npm run lint` | Análisis estático con ESLint |
| `npm run typecheck` | Verificación de tipos |
| `npm test` | Pruebas unitarias (Vitest) |
| `npm run test:e2e` | Pruebas extremo a extremo (Playwright) |
| `npm run test:e2e:humo` | Prueba de humo contra un despliegue |
| `npm run db:migrate` | Aplica migraciones |
| `npm run db:seed` | Carga la semilla |

## 13. Pruebas

Se aplican cuatro capas de verificación:

1. **Tipos y estilo:** `npm run typecheck` y `npm run lint`.
2. **Unitarias:** `npm test` valida el dominio y la autorización (más de mil casos).
3. **Extremo a extremo:** `npm run test:e2e` recorre autenticación, permisos, administración, clientes, oportunidades, casos, pedidos y vista móvil.
4. **Humo en producción:** `BASE_URL=<url> npm run test:e2e:humo` comprueba un despliegue real.

Las pruebas extremo a extremo requieren la base de datos y la semilla cargada, y pueden tardar varios minutos si la base está en la nube.

## 14. Despliegue

### Vercel

1. Importe el repositorio en Vercel (o use la CLI: `vercel` y `vercel --prod`).
2. Configure en el proyecto las variables de entorno de producción: `DATABASE_URL`, `DIRECT_URL`, `AUTH_SECRET`, `CRON_SECRET` y `AUTH_TRUST_HOST=true`. Defina `AUTH_URL` con el dominio asignado.
3. El comando de compilación por defecto (`next build`) es suficiente; `postinstall` genera el cliente de Prisma.
4. Aplique las migraciones a la base de producción desde un entorno de confianza con `npm run db:migrate`.
5. Si despliega con la CLI, mantenga un archivo `.vercelignore` que excluya `.env*` para que ningún secreto local se cargue en el despliegue.

### Render

1. Cree un servicio web Node con comando de compilación `npm install && npm run build` y de inicio `npm run start`.
2. Cree o conecte una base PostgreSQL y defina las mismas variables de entorno.
3. Ejecute `npm run db:migrate` como paso previo al despliegue.

### Después del despliegue

Ejecute la prueba de humo: `BASE_URL=https://su-dominio npm run test:e2e:humo`.

## 15. Seguridad

- Contraseñas almacenadas con hash bcrypt; nunca en texto plano.
- Sesiones JWT firmadas con `AUTH_SECRET`.
- Bloqueo temporal de cuentas ante intentos fallidos.
- Autorización verificada siempre en el servidor.
- Validación de entradas con Zod en el borde de cada operación.
- Auditoría de acciones sensibles.
- El repositorio es público: **`.env` y cualquier archivo `.env.*` están ignorados** y no deben confirmarse. Si una credencial se expone, rótela de inmediato en el proveedor correspondiente.
- Antes de usar el sistema con datos reales, cambie todas las contraseñas de demostración y el secreto de la base de datos.

## 16. Estructura del repositorio

```
.
├── prisma/            Esquema, migraciones y semilla
├── samples/           Archivos de muestra para importación
├── scripts/           Utilidades (generación de muestras)
├── src/
│   ├── app/           Rutas, páginas y API (App Router)
│   ├── components/    Componentes de interfaz
│   ├── domain/        Reglas de negocio puras
│   ├── lib/           Autorización, auditoría, Prisma, utilidades
│   └── config.ts      Umbrales y parámetros
├── tests/e2e/         Pruebas Playwright
├── docs/              Diseño, supuestos y capturas
└── README.md
```

## 17. Documentación adicional

- `docs/DISENO.md`: lineamientos visuales.
- `docs/SUPUESTOS.md`: supuestos asumidos sobre el requerimiento.
- `docs/INDICADORES.md`: fórmulas y metas de los seis indicadores.
- `docs/PRIVACIDAD.md`: tratamiento de datos personales, consentimientos y solicitudes de titulares.
- `docs/ACEPTACION.md`: checklist de aceptación con la evidencia de cada requisito.
- `docs/capturas/`: capturas de pantalla de las pantallas implementadas.

## 18. Solución de problemas

| Síntoma | Causa probable | Acción |
|---------|----------------|--------|
| Error de conexión intermitente a la base | El host directo puede ser solo IPv6 o inestable | Use el pooler de transacciones en `DATABASE_URL` con `?pgbouncer=true` |
| Las migraciones fallan con el pooler | Las migraciones necesitan conexión directa | Verifique `DIRECT_URL` |
| No se puede iniciar sesión tras un despliegue | Falta `AUTH_SECRET` o `AUTH_TRUST_HOST` | Revise las variables en la plataforma y redespliegue |
| Cuenta bloqueada | Se superaron los intentos fallidos | Espere 15 minutos |
| Pruebas extremo a extremo lentas o interrumpidas | Base remota o poca memoria | Ejecútelas por archivo o contra una base local |

## 19. Hoja de ruta

Las cinco fases están implementadas. Pendientes y mejoras posibles:

- Medir los tiempos de carga de las pantallas contra el criterio de aceptación (menos de 2 s).
- Automatizar la limpieza guiada de duplicados tras la importación.
- Calendario de feriados para los plazos de las solicitudes de titulares (hoy se cuentan días hábiles de lunes a viernes).
- Revisión formal de accesibilidad de las pantallas nuevas.

---

Desarrollado por Joel Florian como proyecto de curso.
