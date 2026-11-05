# Lista de aceptación

Leyenda: **[x]** verificado con la evidencia indicada; **[~]** verificado en parte (se explica); **[ ]** pendiente. Las pruebas automáticas se ejecutan contra la base de pruebas con el seed completo (`npm run db:seed`). Fecha de la última verificación: ver el final del documento.

Comandos: `npm test` (Vitest), `npm run test:e2e` (Playwright), `npm run verificar:indicadores`, `npm run typecheck`, `npm run lint`, `npm run build`.

## A. Criterios de aceptación de la sección 12

| # | Criterio | Estado | Evidencia |
|---|---|---|---|
| 1 | Importar los 600 clientes: menos de 2 % de duplicados y completitud de al menos 90 % tras la limpieza guiada | [~] | `samples/clientes_importacion.csv` (600 filas: 30 con errores, 12 con documento repetido, 6 con nombre repetido). `tests/e2e/clientes.spec.ts` «vista previa con informe de errores y duplicados; importa solo tras confirmar» importa 558 filas válidas: los 12 documentos repetidos se omiten (0 duplicados de documento en la base) y los 6 nombres repetidos entran con advertencia (1,1 % de lo importado). Completitud medida sobre lo importado: 521 de 558 clientes con contacto principal con teléfono o correo (93,4 %), antes de cualquier limpieza. La «limpieza guiada» (corregir las 30 filas con error y completar contactos) es un paso manual que no se automatizó: la medición es sobre las filas válidas sin limpiar. |
| 2 | Los 12 requerimientos «Debe» (RF-01 a RF-07 y RF-10 a RF-14) funcionan | [x] | Ver la tabla B. |
| 3 | Los indicadores coinciden con `scripts/verificar-indicadores.ts` sobre una muestra de 30 clientes, sin diferencias | [x] | `npm run verificar:indicadores`: seis indicadores recalculados con SQL directo vs. `calcularTablero`, distribución por segmento y muestra de 30 clientes (segmento, margen de 12 meses, riesgo, CLV): «Resultado: sin diferencias.» |
| 4 | Un `VENDEDOR` no puede ver clientes de otro (ni por URL directa) | [x] | `tests/e2e/permisos.spec.ts` «no abre clientes ajenos ni por URL directa, ni los ve en la lista»; `tests/lib/permisos.test.ts` (matriz rol x acción); `tests/lib/cartera.test.ts`. |
| 5 | Registrar una visita toma 3 pasos o menos desde el celular | [x] | `tests/e2e/movil.spec.ts` «registrar una visita toma 3 pasos o menos desde «Mi día»» (390x844). |
| 6 | Las pantallas principales cargan en menos de 2 segundos con el seed completo | [ ] | No medido de forma automática. Con la base remota (Supabase, otra región) cada consulta suma latencia de red; la medición honesta requiere correr contra la base y el despliegue definitivos. Pendiente para la verificación de despliegue (capa 4). |

### Medición de la importación (criterio 1)

Medido en la base de pruebas tras `tests/e2e/clientes.spec.ts` (importación de `samples/clientes_importacion.csv`): 558 clientes importados (documentos `2099...`), 521 completos (93,4 %); 12 filas con documento repetido omitidas; 6 con nombre repetido importadas con advertencia (1,1 %). El seed borra esos clientes en la siguiente corrida. Consulta usada: clientes cuyo contacto principal tiene teléfono o correo (la regla 5 completa también exige documento, razón social, dirección y vendedor, que el importador ya exige a cada fila).

## B. Requerimientos funcionales (RF-01 a RF-14)

| ID | Criterio del spec | Estado | Evidencia |
|---|---|---|---|
| RF-01 | Documento repetido da error claro; nombre muy parecido da advertencia confirmable | [x] | `tests/e2e/clientes.spec.ts` «documento repetido da error y nombre parecido avisa y deja confirmar»; `tests/domain/duplicados.test.ts`, `normalizacion.test.ts`. Rutas `/clientes/nuevo`, `/clientes/[id]/editar`. |
| RF-02 | Una página con datos, pedidos, oportunidades, actividades, casos y consentimientos, y línea de tiempo combinada | [x] | `tests/e2e/clientes.spec.ts` «valida en línea, crea el cliente y muestra la vista 360» (ocho secciones); `tests/domain/linea-tiempo.test.ts`. Ruta `/clientes/[id]`. |
| RF-03 | Vista previa, informe de errores y duplicados, importación solo tras confirmar | [x] | `tests/e2e/clientes.spec.ts` «vista previa con informe de errores y duplicados; importa solo tras confirmar», «rechaza un archivo sin las columnas obligatorias»; `tests/domain/importacion.test.ts`, `csv.test.ts`. Ruta `/clientes/importar`. |
| RF-04 | Tablero por columnas y lista; bloqueo de avance sin actividad; motivo obligatorio en perdidas | [x] | `tests/e2e/oportunidades.spec.ts` «no avanza de etapa sin actividad y avanza después de registrar una», «marcar una oportunidad como perdida exige el motivo», «el tablero muestra las seis etapas y la lista filtra»; `tests/domain/oportunidades.test.ts`. |
| RF-05 | Registrar una visita en 3 pasos o menos; «Mi día» con tareas pendientes y vencidas | [x] | `tests/e2e/movil.spec.ts` (tres pruebas); `tests/domain/actividades.test.ts`. Ruta `/`. |
| RF-06 | Actualiza la ficha, el último pedido y el cálculo de riesgo | [x] | `tests/e2e/pedidos.spec.ts` «registra un pedido, actualiza la ficha y el pedido anulado no cuenta»; `tests/domain/pedidos.test.ts`, `riesgo.test.ts`. |
| RF-07 | «Recalcular ahora» genera filas en `SegmentoHistorico` y se ve la evolución por cliente | [x] | `tests/e2e/riesgo.spec.ts` «recalcula para generar la alerta»; `tests/e2e/cron.spec.ts`; `tests/domain/segmentacion.test.ts`; la ficha muestra «Evolución del segmento» (el seed deja 6 meses de histórico por cliente). |
| RF-08 | Filtrable por vendedor y segmento, con días sin compra e intervalo habitual | [x] | `tests/e2e/riesgo.spec.ts` (VENDEDOR: días e intervalo y filtro de segmento; JEFE_VENTAS: filtro de vendedor); `tests/domain/riesgo.test.ts`. Ruta `/clientes/riesgo`. |
| RF-09 | CLV visible en la ficha y por segmento, con nota de aproximación | [x] | `tests/domain/clv.test.ts`; `tests/e2e/indicadores.spec.ts` «cada gráfico tiene texto alternativo y tabla de datos» (nota «Aproximación simplificada: CLV»); la ficha muestra la nota. (Prioridad «Podría».) |
| RF-10 | Un caso vencido aparece como escalado en la bandeja del jefe de servicio | [x] | `tests/e2e/casos.spec.ts` «un caso vencido sin primera respuesta aparece como escalado», «el filtro de escalados deja solo los vencidos»; `tests/domain/sla.test.ts`. |
| RF-11 | Tiempos calculados con apertura, primera respuesta y resolución | [x] | `tests/e2e/casos.spec.ts` «registra un caso y lo resuelve en el primer contacto», «registra la primera respuesta y luego resuelve sin marcar primer contacto»; `tests/domain/sla.test.ts`, `indicadores.test.ts`. |
| RF-12 | Seis indicadores con filtros; exporta CSV y vista imprimible | [x] | `tests/e2e/indicadores.spec.ts` (seis tarjetas con meta, línea base y semáforo; filtros; «exporta el tablero en CSV»; vista imprimible); `tests/domain/indicadores.test.ts`; `npm run verificar:indicadores`. |
| RF-13 | Retirar un consentimiento en un clic; la supresión anonimiza los datos y queda en auditoría | [x] | `tests/e2e/cumplimiento.spec.ts`: «retirar un consentimiento toma un clic, sin confirmación, y queda en la auditoría», «la supresión anonimiza los datos personales y queda en la auditoría», «acceso: descarga los datos del titular...», «edita la política de privacidad...», pruebas por rol; `tests/domain/consentimientos.test.ts`, `solicitudes.test.ts`, `anonimizacion.test.ts`. Rutas `/cumplimiento`, `/cumplimiento/consentimientos`, `/cumplimiento/politica`, `/privacidad`. Ver `docs/PRIVACIDAD.md`. |
| RF-14 | Alta, baja y cambio de rol de usuarios; bloqueo tras 5 intentos; visor de auditoría con filtros | [x] | `tests/e2e/auth.spec.ts` (inicio de sesión, clave incorrecta, bloqueo tras 5 intentos); `tests/e2e/administracion.spec.ts`; `tests/domain/bloqueo.test.ts`, `tests/lib/permisos.test.ts`, `tests/lib/auditoria.test.ts`. |

## C. Pruebas de extremo a extremo exigidas (sección 4.2)

| Archivo | Estado | Nota |
|---|---|---|
| `auth.spec.ts` | [x] | Una sola vez, en escritorio (bloquea una cuenta real). |
| `permisos.spec.ts` | [x] | Menú por rol, carteras y Administración. |
| `clientes.spec.ts` | [x] | Crear, duplicados, 360, importación con informe. |
| `oportunidades.spec.ts` | [x] | |
| `casos.spec.ts` | [x] | |
| `indicadores.spec.ts` | [x] | |
| `cumplimiento.spec.ts` | [x] | Fase 5. |
| `movil.spec.ts` | [x] | |
| `humo-produccion.spec.ts` | [ ] | Solo contra la URL publicada (`npm run test:e2e:humo` con `BASE_URL`); pendiente hasta el despliegue. |

## D. Otros requisitos transversales

| Requisito | Estado | Evidencia |
|---|---|---|
| Autorización en el servidor con `can()` en cada acción y ruta | [x] | `src/lib/permisos.ts`, `src/lib/sesion.ts` (`requerir`), `tests/lib/permisos.test.ts`; las rutas de Cumplimiento y la descarga de datos del titular llaman a `requerir` / `can`. |
| Cobertura de `src/domain/` de al menos 70 % | [x] | `npx vitest run --coverage` (umbral configurado en `vitest.config.ts`). |
| Auditoría de altas, cambios, importaciones, exportaciones y solicitudes de titulares | [x] | Visor `/administracion/auditoria`; `tests/e2e/administracion.spec.ts`, `cumplimiento.spec.ts`. |
| Datos de ejemplo inventados | [x] | `prisma/seed.ts`, `prisma/seed-completo.ts`, `scripts/generar-muestra-clientes.ts` (faker `es`, seed 42). |
| Política de privacidad editable y nota legal | [x] | `/privacidad`, `/cumplimiento/politica`, `docs/PRIVACIDAD.md`. |
| `.env.example` sin valores reales | [ ] | No incluido por decisión del propietario del repositorio (público); las variables se documentan en el README. |
| Cron protegido con `CRON_SECRET` | [x] | `tests/e2e/cron.spec.ts`. |
| Despliegue de prueba en Vercel o Render, «Recalcular ahora» y prueba de humo | [ ] | Pendiente: requiere autorización del propietario (T6). |
| Revisión de las capturas de `docs/capturas/` con `/web-design-guidelines` | [~] | Capturas de las fases 1 a 3 revisadas. Fase 5: se generaron `cumplimiento-*`, `cumplimiento-consentimientos-*` y `privacidad-*` (escritorio y móvil, con `CAPTURAS=1 npx playwright test tests/e2e/cumplimiento.spec.ts -g "guarda las pantallas"`); falta la revisión formal con la skill. |

## Resultado de la verificación

Fecha: 2026-11-05 (fase 5). Base de pruebas remota (Supabase) con el seed completo.

| Capa | Comando | Resultado |
|---|---|---|
| Estática | `npm run typecheck`, `npm run lint`, `npm run build` | Sin errores |
| Reglas y permisos | `npm test` (con cobertura) | 27 archivos, 1.221 pruebas en verde; cobertura de `src/domain/` 100 % de líneas |
| Indicadores | `npm run verificar:indicadores` | Seis indicadores, distribución por segmento y muestra de 30 clientes: sin diferencias |
| E2E (esta fase) | `npx playwright test cumplimiento.spec.ts auth.spec.ts clientes.spec.ts` | 58 pasaron, 2 omitidas por diseño (importación solo en escritorio; celdas cortadas solo en móvil), 0 fallaron |
| E2E (fases 1 a 4) | Suite completa | Pasó en cada fase (ver `odd/tasks/crm-andamar.md`); no se volvió a correr completa tras ampliar el seed a 600 clientes. |
| Despliegue | Vercel o Render + `npm run test:e2e:humo` | Pendiente (requiere autorización) |

Pendientes honestos: criterio 6 (tiempos de carga), `humo-produccion.spec.ts`, despliegue, revisión formal de capturas, y volver a correr la suite E2E completa con el seed definitivo.
