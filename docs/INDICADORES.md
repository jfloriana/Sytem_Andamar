# Indicadores, segmentación, riesgo y CLV

Las fórmulas viven en `src/domain/` (funciones puras con pruebas en `tests/domain/`) y los umbrales en `src/config.ts`. La misma ayuda aparece en pantalla, en «Cómo se calcula» de cada tarjeta del tablero (`/indicadores`).

## Filtros y alcance

- **Período:** desde y hasta (ambos inclusive, en fechas UTC). Por defecto, los 12 meses que terminan hoy; máximo 36 meses; la fecha final no puede ser futura. Un período inválido muestra un aviso y usa el período por defecto.
- **Vendedor y segmento:** acotan los clientes considerados (y, por ellos, sus pedidos, oportunidades y casos). El indicador 6 usa el filtro de vendedor pero no el de segmento.
- **Alcance por rol:** `ADMIN`, `GERENCIA` y `JEFE_SERVICIO` ven toda la empresa; `JEFE_VENTAS` solo su equipo (clientes de sus vendedores). `VENDEDOR` y `EJECUTIVO_SERVICIO` no acceden al tablero.
- **Tendencia:** seis meses de calendario que terminan en el mes del fin del período.

## Los seis indicadores

| # | Indicador | Fórmula | Línea base | Meta |
|---|---|---|---|---|
| 1 | Retención | (activos al final - nuevos del período) / activos al inicio x 100 | 78 % | 83 % |
| 2 | Conversión | oportunidades `GANADA` cerradas en el período / oportunidades creadas en el período x 100 | 18 % | 22 % |
| 3 | Resolución en primer contacto | casos con `resueltoPrimerContacto` / casos `RESUELTO` o `CERRADO` (resueltos en el período) x 100 | no se mide | 70 % |
| 4 | Tiempo medio de respuesta | promedio de (`primeraRespuestaAt` - `aperturaAt`) en horas de los casos abiertos en el período, más % dentro del SLA | no se mide | menos de 24 h |
| 5 | Completitud de datos | clientes completos / clientes activos x 100 | 55 % | 90 % |
| 6 | Usuarios activos | usuarios con al menos una acción de escritura (auditoría) en los 30 días previos al fin del período / usuarios activos x 100 | no se mide | 90 % |

Detalles:

1. **Activo** = al menos un pedido no anulado en los 12 meses previos al corte, es decir en `[corte - 12 meses, corte)`. «Nuevos» = clientes creados dentro del período que están activos al final. Si no hay activos al inicio, el valor es «Sin datos» (no se inventa un 0). En la tendencia, cada punto es la retención de los 12 meses móviles que terminan en ese mes.
2. Las oportunidades creadas y las ganadas se cuentan por separado según su fecha de creación y de cierre, tal como pide la fórmula: pueden ser de períodos distintos.
3. Los casos sin resolver no entran. «Primer contacto» solo se marca al resolver un caso sin respuesta previa.
4. Solo cuentan los casos que ya tienen primera respuesta. «Dentro del SLA» = primera respuesta a más tardar en `fechaLimite` (apertura + 24 h).
5. **Cliente completo** (regla 5) = documento, razón social, dirección, vendedor y contacto principal con teléfono o correo. «Activo» aquí significa cliente no dado de baja. Es una foto de hoy; la tendencia aplica los datos actuales a los clientes que existían en cada mes (no hay historia de ediciones).
6. Los usuarios activos son los usuarios con `activo = true` dentro del alcance. Cualquier registro de `AuditLog` cuenta como escritura (alta, cambio, importación, exportación, recálculo). La tendencia usa la lista actual de usuarios.

## Semáforo

Siempre con texto, nunca solo color: **verde** = cumple la meta; **ámbar** = entre la línea base y la meta; **rojo** = bajo la línea base. Si no hay línea base (no se mide hoy), ámbar desde el 80 % de la meta (`INDICADORES.ambarSinLineaBase`). En el tiempo de respuesta, menor es mejor: verde hasta la meta, ámbar hasta meta / 0,8 (30 h) y rojo por encima. Sin valor: «Sin datos».

## Segmentación A/B/C (RF-07)

Margen de los **últimos 12 meses** (pedidos no anulados, fecha desde hace 12 meses de calendario, inclusive): **A** >= 1.000 USD, **B** de 300 a 999,99 USD, **C** menos de 300 USD con pedidos, **SIN_CLASIFICAR** sin pedidos en la ventana. El recálculo (mensual, o «Recalcular ahora») guarda una fila en `SegmentoHistorico` por cliente y mes (el día 1 del mes, UTC; repetir el cálculo en el mismo mes reemplaza esas filas) y actualiza `Cliente.segmento`. La ficha del cliente muestra la evolución mensual.

## Clientes en riesgo (RF-08)

Un cliente con **al menos 3 pedidos** no anulados está en riesgo si lleva más de `max(30 días, 1,5 x intervalo medio)` sin comprar, donde intervalo medio = (último pedido - primer pedido) / (pedidos - 1). Pasa a `EN_RIESGO` y aparece en `/clientes/riesgo` (filtrable por vendedor y segmento, con días sin compra e intervalo habitual); vuelve a `ACTIVO` con un nuevo pedido (inmediato al registrarlo y también en el recálculo diario). Los clientes dados de baja (`INACTIVO`) no se evalúan.

## CLV simplificado (RF-09)

`CLV = m x r / (1 + d - r)` con `m` = margen de los últimos 12 meses, `r` = retención de referencia (78 %, la línea base de la empresa, `CLV.retencionReferencia`) y `d` = 10 %. Es una **aproximación**, no un pronóstico; se muestra con esa nota en la ficha del cliente y por segmento en el tablero. Entradas inválidas (margen negativo, `r` fuera de 0-1) dan «No disponible».

## Tareas programadas

| Ruta | Qué hace | Programación (`vercel.json`, UTC) |
|---|---|---|
| `/api/cron/diario` | recalcula clientes en riesgo y marca `ESCALADO` los casos sin primera respuesta cuyo plazo venció | todos los días, 08:00 |
| `/api/cron/mensual` | recalcula segmentos y guarda el histórico | día 1 de cada mes, 09:00 |

Ambas exigen `Authorization: Bearer <CRON_SECRET>` (401 en otro caso, incluso si falta la variable). En Render se crean dos Cron Jobs que llaman a estas rutas con esa cabecera. El botón **«Recalcular ahora»** (solo `ADMIN`, en `/indicadores`) ejecuta ambas tareas y deja una entrada `RECALCULAR_SEGMENTACION` en la auditoría.

## Exportación

«Exportar CSV» descarga los seis indicadores con meta, línea base y semáforo, la tendencia mensual, la distribución por segmento y el CLV; respeta los filtros y deja `EXPORTAR_INDICADORES` en la auditoría. Las celdas de texto que empiezan con `=`, `+`, `-` o `@` se neutralizan para evitar fórmulas en hojas de cálculo. «Imprimir / guardar PDF» usa la vista imprimible del navegador.

## Verificación independiente

`npm run verificar:indicadores` (`scripts/verificar-indicadores.ts`) recalcula los seis indicadores del período por defecto con SQL directo sobre los datos crudos, sin usar las funciones de `src/domain/`, y los compara con el cálculo del tablero (`src/lib/tablero.ts`). También compara la distribución por segmento y una muestra de 30 clientes (segmento, margen de 12 meses, estado de riesgo y CLV). Es de solo lectura y termina con código 1 si hay cualquier diferencia. Úsalo después de sembrar la base o de recalcular.
