# Diseño de CRM-Andamar

Interfaz de trabajo, sobria y en azules, sin adornos ni animaciones decorativas.

## Referencia elegida

`/awesome-design-md` -> **IBM (Carbon)**: lienzo blanco, texto carbón, un único azul de acento (`#0f62fe`), esquinas casi cuadradas (0-4 px), tarjetas con borde fino y sin sombra, tablas densas. Encaja con un CRM interno de gestión. Descartadas: Linear (oscuro, pensado para marketing), Mercury (violeta, tono fintech), Stripe/Vercel (más decorativos).
Se toma solo el criterio visual (tokens y reglas), sin logos ni tipografía propietaria.

## Reglas aplicadas de `/ui-ux-pro-max`

Prioridades 1-2, 5, 6 y 8: contraste >= 4,5:1, foco visible siempre, objetivos táctiles >= 44 px, móvil primero sin scroll horizontal, base 16 px, tokens semánticos (nunca hex en componentes), etiquetas visibles en formularios y error junto al campo, el color nunca es la única señal (los estados llevan texto/icono). Animación: solo transiciones de color de 150 ms; respetar `prefers-reduced-motion`.

## Tokens de color (HSL en `src/app/globals.css`)

| Token | Valor | Uso |
|---|---|---|
| `--primary` | `#0f62fe` | Acciones principales, enlaces, foco |
| `--primary-hover` | `#0050e6` | Hover/activo |
| `--foreground` | `#161616` | Texto |
| `--muted-foreground` | `#525252` | Texto secundario (7,8:1 sobre blanco) |
| `--background` | `#ffffff` | Lienzo |
| `--surface` / `--muted` | `#f4f4f4` | Fondos de tabla, barra lateral |
| `--border` | `#e0e0e0` | Bordes finos |
| `--success` | `#24a148` | Semáforo verde (texto sobre fondo claro: `#198038`) |
| `--warning` | `#f1c21b` | Semáforo ámbar (texto: `#8e6a00`) |
| `--destructive` | `#da1e28` | Errores, acciones destructivas |

Semáforo de indicadores: verde >= meta, ámbar entre línea base y meta, rojo bajo la línea base; siempre con etiqueta de texto.

## Tipografía

Fuente del sistema (`ui-sans-serif, system-ui, "Segoe UI", Roboto`), sin descargas. Escala: 12 (leyenda), 14 (tablas, controles), 16 (cuerpo, mínimo en móvil para inputs), 20 (título de sección), 28 (título de página). Pesos 400 y 600. Cifras con `tabular-nums` en tablas y tarjetas.

## Espaciado y forma

Base de 4 px: 4, 8, 12, 16, 24, 32, 48. Radios: 4 px (controles y tarjetas), 9999 px solo para insignias de estado. Sin sombras; la jerarquía se marca con bordes y fondo `--surface`.

## Componentes

- **Botones:** altura 40 px escritorio / 44 px móvil; primario azul, secundario con borde, destructivo rojo con confirmación previa.
- **Formularios:** etiqueta arriba, ayuda en gris, error en rojo bajo el campo con `aria-describedby`; validación en línea; botón de envío deshabilitado y con texto «Guardando...» mientras envía.
- **Tablas:** cabecera `--surface` en 14 px semibold, filas de 44 px, hover sutil, ordenar/filtrar arriba. En móvil (< 768 px) cada fila es una tarjeta con borde y pares «etiqueta: valor» (`data-label` en `TableCell`); la cabecera queda solo para lectores de pantalla. Sin recortes laterales.
- **Insignias de estado:** texto + color (p. ej. «En riesgo» rojo, «Activo» verde).
- **Navegación:** barra lateral fija en escritorio (por rol); en móvil, menú desplegable con botón de 44 px.
- **Tablero:** tarjetas de indicador con valor, meta, línea base y semáforo; gráficos Recharts en azules (`#0f62fe`, `#4589ff`, `#a6c8ff`) con leyenda y tabla alternativa.
- **Impresión:** `@media print` oculta menú y botones; fondo blanco.

## Pantallas de clientes (fase 2)

- Lista: buscador arriba (nombre, documento, teléfono), contador con `role="status"`, paginación de 25. Acciones primarias a la derecha del título («Nuevo cliente», «Importar CSV»).
- Formulario: dos grupos (`fieldset` + `legend`): datos del cliente y contacto principal opcional. Validación en línea al salir del campo con el mismo esquema Zod del servidor; al enviar con errores el foco va al primer campo inválido. El aviso de duplicado es un bloque ámbar con texto («Posible duplicado») y el botón «Guardar de todos modos».
- Ficha 360: título con insignias de estado y segmento, y secciones en tarjetas: Datos (con calidad de datos), Contactos, Pedidos, Oportunidades, Actividades, Casos, Consentimientos y Línea de tiempo. Cada sección vacía explica por qué está vacía. Acciones destructivas (baja, eliminar contacto) piden confirmación.
- Importación: tres pasos visibles (archivo, informe, confirmar) con cifras en tarjetas y tablas de errores, duplicados y advertencias.
