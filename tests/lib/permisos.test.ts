import { describe, expect, it } from "vitest";
import { can, type Accion, type TipoRecurso } from "@/lib/permisos";
import { ROLES, type Rol } from "@/lib/roles";

const ACCIONES: Accion[] = [
  "ver",
  "crear",
  "editar",
  "eliminar",
  "reasignar",
  "asignar",
  "resolver",
  "exportar",
  "aprobar",
  "recalcular",
];

const RECURSOS: TipoRecurso[] = [
  "usuario",
  "auditoria",
  "importacion",
  "calidad_datos",
  "consentimiento",
  "solicitud_titular",
  "cliente",
  "contacto",
  "oportunidad",
  "actividad",
  "pedido",
  "caso",
  "indicadores",
  "segmentacion",
  "condiciones_especiales",
  "politica_privacidad",
];

// Matriz esperada (capacidad sin alcance): "accion:recurso" permitidas por rol.
const PERMITIDO: Record<Rol, string[]> = {
  ADMIN: [
    "ver:usuario", "crear:usuario", "editar:usuario",
    "ver:auditoria",
    "ver:importacion", "crear:importacion",
    "ver:calidad_datos", "editar:calidad_datos",
    "ver:consentimiento", "crear:consentimiento", "editar:consentimiento",
    "ver:solicitud_titular", "crear:solicitud_titular", "editar:solicitud_titular",
    "ver:cliente", "crear:cliente", "editar:cliente", "exportar:cliente",
    "ver:contacto", "crear:contacto", "editar:contacto",
    "ver:indicadores", "exportar:indicadores",
    "recalcular:segmentacion",
    "ver:politica_privacidad", "editar:politica_privacidad",
  ],
  GERENCIA: [
    "ver:cliente", "ver:contacto", "ver:oportunidad", "ver:actividad", "ver:pedido", "ver:caso",
    "ver:indicadores", "exportar:indicadores",
    "aprobar:condiciones_especiales",
    "ver:politica_privacidad",
  ],
  JEFE_VENTAS: [
    "ver:cliente", "crear:cliente", "editar:cliente", "reasignar:cliente",
    "ver:contacto", "crear:contacto", "editar:contacto",
    "ver:oportunidad", "crear:oportunidad", "editar:oportunidad", "reasignar:oportunidad",
    "ver:actividad", "crear:actividad", "editar:actividad",
    "ver:pedido", "crear:pedido", "editar:pedido",
    "ver:indicadores", "exportar:indicadores",
    "ver:politica_privacidad",
  ],
  VENDEDOR: [
    "ver:cliente", "crear:cliente", "editar:cliente",
    "ver:contacto", "crear:contacto", "editar:contacto",
    "ver:oportunidad", "crear:oportunidad", "editar:oportunidad",
    "ver:actividad", "crear:actividad", "editar:actividad",
    "ver:pedido", "crear:pedido", "editar:pedido",
    "ver:politica_privacidad",
  ],
  JEFE_SERVICIO: [
    "ver:cliente", "ver:contacto", "ver:oportunidad", "ver:actividad", "ver:pedido",
    "ver:consentimiento",
    "ver:caso", "crear:caso", "editar:caso", "asignar:caso", "resolver:caso",
    "ver:indicadores", "exportar:indicadores",
    "ver:politica_privacidad",
  ],
  EJECUTIVO_SERVICIO: [
    "ver:cliente", "ver:contacto", "ver:oportunidad", "ver:actividad", "ver:pedido",
    "ver:consentimiento",
    "ver:caso", "crear:caso", "editar:caso", "resolver:caso",
    "ver:politica_privacidad",
  ],
};

describe("can(): matriz rol x accion x recurso", () => {
  for (const rol of ROLES) {
    describe(rol, () => {
      const usuario = { id: "u1", rol };
      for (const recurso of RECURSOS) {
        for (const accion of ACCIONES) {
          const esperado = PERMITIDO[rol].includes(`${accion}:${recurso}`);
          it(`${accion} ${recurso} -> ${esperado ? "permitido" : "denegado"}`, () => {
            expect(can(usuario, accion, recurso)).toBe(esperado);
          });
        }
      }
    });
  }

  it("cubre los seis roles", () => {
    expect(ROLES).toHaveLength(6);
  });
});

describe("can(): alcance por propietario", () => {
  const vendedor = { id: "v1", rol: "VENDEDOR" as const };
  const jefe = { id: "j1", rol: "JEFE_VENTAS" as const };

  it("VENDEDOR solo ve clientes de su cartera", () => {
    expect(can(vendedor, "ver", { tipo: "cliente", propietarioId: "v1" })).toBe(true);
    expect(can(vendedor, "ver", { tipo: "cliente", propietarioId: "v2" })).toBe(false);
  });

  it("VENDEDOR no puede editar ni crear para otro vendedor", () => {
    expect(can(vendedor, "editar", { tipo: "oportunidad", propietarioId: "v2" })).toBe(false);
    expect(can(vendedor, "crear", { tipo: "pedido", propietarioId: "v2" })).toBe(false);
    expect(can(vendedor, "crear", { tipo: "pedido", propietarioId: "v1" })).toBe(true);
  });

  it("falla cerrado cuando el recurso con alcance no trae propietario", () => {
    expect(can(vendedor, "ver", { tipo: "cliente" })).toBe(false);
    expect(can(vendedor, "ver", { tipo: "cliente", propietarioId: null })).toBe(false);
  });

  it("JEFE_VENTAS ve lo propio y lo de su equipo, no el de otros equipos", () => {
    expect(can(jefe, "ver", { tipo: "cliente", propietarioId: "v1", jefeDelPropietarioId: "j1" })).toBe(true);
    expect(can(jefe, "ver", { tipo: "cliente", propietarioId: "j1" })).toBe(true);
    expect(can(jefe, "ver", { tipo: "cliente", propietarioId: "v9", jefeDelPropietarioId: "j2" })).toBe(false);
    expect(can(jefe, "reasignar", { tipo: "cliente", propietarioId: "v9", jefeDelPropietarioId: "j2" })).toBe(false);
  });

  it("GERENCIA ve toda la empresa", () => {
    const g = { id: "g1", rol: "GERENCIA" as const };
    expect(can(g, "ver", { tipo: "cliente", propietarioId: "cualquiera" })).toBe(true);
    expect(can(g, "editar", { tipo: "cliente", propietarioId: "cualquiera" })).toBe(false);
  });

  it("EJECUTIVO_SERVICIO solo edita y resuelve sus casos", () => {
    const e = { id: "e1", rol: "EJECUTIVO_SERVICIO" as const };
    expect(can(e, "resolver", { tipo: "caso", propietarioId: "e1" })).toBe(true);
    expect(can(e, "resolver", { tipo: "caso", propietarioId: "e2" })).toBe(false);
    expect(can(e, "crear", { tipo: "caso" })).toBe(true);
  });

  it("JEFE_SERVICIO supervisa todos los casos", () => {
    const j = { id: "s1", rol: "JEFE_SERVICIO" as const };
    expect(can(j, "asignar", { tipo: "caso", propietarioId: "e2" })).toBe(true);
    expect(can(j, "resolver", { tipo: "caso", propietarioId: "e2" })).toBe(true);
  });

  it("deniega sin usuario o con rol desconocido", () => {
    expect(can(null, "ver", "cliente")).toBe(false);
    expect(can(undefined, "ver", "cliente")).toBe(false);
    expect(can({ id: "x", rol: "INVENTADO" as never }, "ver", "cliente")).toBe(false);
  });
});
