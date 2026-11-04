# Supuestos y decisiones

## Skills (sección 4.1)

| Skill | Decisión | Motivo |
|---|---|---|
| `awesome-design-md` | Usada (T0) | Referencia visual IBM Carbon -> `docs/DISENO.md`. |
| `ui-ux-pro-max` | Usada (T0) | Se aplicaron sus reglas de accesibilidad, formularios, tipografía y color; no se ejecutó su buscador de datos. |
| `frontend-design` | Prevista para fases con pantallas | Dar criterio propio sin recargar la interfaz. |
| `web-design-guidelines` | Prevista al cerrar cada fase con pantallas | Auditoría de accesibilidad y formularios. |
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
