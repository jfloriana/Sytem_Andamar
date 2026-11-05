# Privacidad y protección de datos personales

> **Este documento describe cómo el sistema apoya el cumplimiento; no es asesoría legal y no sustituye la revisión de un abogado.** Los plazos, textos y reglas deben validarse con la ley de protección de datos del país donde opere Andamar (por ejemplo, la Ley 29733 y su reglamento en Perú) antes de usar el sistema con datos reales.

## Datos que guarda el sistema

| Dato | Dónde | Quién lo ve |
|---|---|---|
| Documento, razón social, dirección, teléfono y correo del cliente | `Cliente` | Según su rol (ver `docs/PROMPT.md`, sección 5; `can()` en `src/lib/permisos.ts`) |
| Nombre, cargo, teléfono y correo de los contactos | `Contacto` | Igual que el cliente |
| Consentimientos por finalidad y canal | `Consentimiento` | `ADMIN` (ver, registrar, retirar); `JEFE_SERVICIO` y `EJECUTIVO_SERVICIO` (solo ver en la ficha del cliente) |
| Solicitudes de acceso, rectificación y supresión | `SolicitudTitular` | Solo `ADMIN` |
| Acciones de los usuarios del CRM | `AuditLog` | Solo `ADMIN` |
| Política de privacidad (versiones) | `PoliticaPrivacidad` | Todos los roles la leen; solo `ADMIN` la edita |

Todos los datos de ejemplo de la semilla (`prisma/seed.ts`) son inventados.

## Consentimientos (RF-13)

- Un consentimiento tiene **finalidad** (`SERVICIO`, `PROMOCIONES`, `ANALITICA`) y **canal** (`TELEFONO`, `EMAIL`, `WHATSAPP`, `PRESENCIAL`). Se registra desde la ficha del cliente («Registrar consentimiento»); no se duplica uno vigente de la misma finalidad y canal.
- **Retirar es un clic**: botón «Retirar» junto a cada consentimiento vigente, en la ficha del cliente y en `Cumplimiento > Consentimientos`. No hay confirmación intermedia ni formulario; el retiro queda en la auditoría (`RETIRAR_CONSENTIMIENTO`). Volver a otorgar crea un registro nuevo (queda el historial).
- Una finalidad está **vigente** si algún canal sigue vigente, **retirada** si todos se retiraron y **sin registro** si nunca se pidió (`src/domain/consentimientos.ts`).
- **Contacto responsable (regla 6):** la ficha muestra cuántas comunicaciones promocionales caben esta semana (máximo 2, `COMUNICACION.maxPromocionalesPorSemana`) y avisa si el cliente retiró o nunca dio el consentimiento de `PROMOCIONES`. Supuesto: cada actividad de tipo `MENSAJE` de los últimos 7 días cuenta como una comunicación promocional. Hoy es un **aviso visible**: el sistema no bloquea el registro de un mensaje.

## Solicitudes de los titulares (RF-13)

Las registra `ADMIN` en `Cumplimiento` (por documento del cliente o desde la ficha). Cada una tiene un plazo en **días hábiles** (lunes a viernes, sin feriados) configurado en `CUMPLIMIENTO.plazoDiasHabiles` de `src/config.ts`:

| Tipo | Plazo supuesto | Qué hace el sistema |
|---|---|---|
| Acceso | 8 días hábiles | Descarga de los datos del titular en JSON (ficha, contactos, consentimientos y cantidad de registros); la descarga queda auditada (`EXPORTAR_DATOS_TITULAR`). |
| Rectificación | 10 días hábiles | Lleva a la edición de la ficha; se marca atendida con la respuesta. |
| Supresión | 10 días hábiles | **Anonimiza** (ver abajo). |

Los plazos son un supuesto tomado como referencia de la normativa peruana de protección de datos; **deben confirmarse con asesoría legal**. Estados: `PENDIENTE`, `EN_PROCESO`, `ATENDIDA`, `RECHAZADA` (rechazar exige un motivo). El plazo se muestra como «En plazo», «Por vencer» (48 horas o menos) o «Vencida»; las cerradas, como «a tiempo» o «fuera de plazo». Todo cambio queda auditado (`CREAR_SOLICITUD_TITULAR`, `ACTUALIZAR_SOLICITUD_TITULAR`).

### Qué hace la supresión

La acción «Anonimizar y atender» (con casilla de confirmación de la identidad del titular) ejecuta, en una sola transacción:

1. **Cliente:** razón social, dirección, teléfono, correo y condiciones especiales se reemplazan por valores neutros; el documento se reemplaza por uno derivado del id (`ANON...`, único y que no revela el original); el cliente queda `INACTIVO`.
2. **Contactos:** nombre, cargo, teléfono y correo se borran.
3. **Consentimientos:** todos los vigentes se retiran.
4. **Texto libre:** se borran los resultados de las actividades y las descripciones de los casos del cliente, y el detalle de la auditoría de ese cliente y sus contactos (queda la acción, no el dato).
5. **Auditoría:** `ANONIMIZAR_CLIENTE` con los conteos de lo anonimizado (sin datos personales).

**Se conserva** el historial comercial (pedidos, oportunidades y casos con su fecha y monto) sin que se pueda asociar a una persona o razón social, porque los pedidos pueden ser necesarios por obligaciones contables y tributarias. La anonimización es **irreversible**: no se guarda copia del dato original. Validar con asesoría legal si en su caso corresponde conservar o suprimir también esos registros.

## Política de privacidad

Página pública en `/privacidad` (no requiere iniciar sesión; el pie de las pantallas internas la enlaza). `ADMIN` la edita en `Cumplimiento > Política de privacidad`; cada guardado crea una versión nueva (`PoliticaPrivacidad.version`) y la anterior queda como historial. Mientras nadie la edite se muestra una plantilla de ejemplo que **debe reemplazarse** con el texto revisado por asesoría legal.

## Seguridad

- Autorización en el servidor en cada acción y ruta con `can(usuario, accion, recurso)`; validación con Zod en toda entrada.
- Contraseñas con `bcryptjs`; bloqueo temporal tras 5 intentos fallidos; sesión JWT por cookie.
- Secretos (`DATABASE_URL`, `DIRECT_URL`, `AUTH_SECRET`, `CRON_SECRET`) solo en variables de entorno del proveedor; nunca en el repositorio.
- Auditoría de altas, cambios y bajas de clientes y usuarios, importaciones, exportaciones, consentimientos y solicitudes de titulares (`/administracion/auditoria`, solo `ADMIN`).
- Respaldos: usar los del proveedor de base de datos (ver README).

## Lo que este sistema no hace

- No gestiona feriados al calcular plazos.
- No notifica al titular ni envía correos (fuera de alcance).
- No bloquea el envío de comunicaciones promocionales: muestra el contador y el estado del consentimiento.
- No elimina físicamente filas: la «baja» y la supresión anonimizan; el historial comercial se conserva.
