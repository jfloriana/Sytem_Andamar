import { esRol, type Rol } from "@/lib/roles";

export type Accion =
  | "ver"
  | "crear"
  | "editar"
  | "eliminar"
  | "reasignar"
  | "asignar"
  | "resolver"
  | "exportar"
  | "aprobar"
  | "recalcular";

export type TipoRecurso =
  | "usuario"
  | "auditoria"
  | "importacion"
  | "calidad_datos"
  | "consentimiento"
  | "solicitud_titular"
  | "cliente"
  | "contacto"
  | "oportunidad"
  | "actividad"
  | "pedido"
  | "caso"
  | "indicadores"
  | "segmentacion"
  | "condiciones_especiales"
  | "politica_privacidad";

/**
 * Recurso concreto. `propietarioId` es el dueño (vendedor de la cartera o
 * responsable del caso); `jefeDelPropietarioId` es el `jefeId` de ese dueño.
 */
export interface RecursoConDueno {
  tipo: TipoRecurso;
  propietarioId?: string | null;
  jefeDelPropietarioId?: string | null;
}

export type Recurso = TipoRecurso | RecursoConDueno;

export interface UsuarioPermisos {
  id: string;
  rol: Rol;
}

/** todo: sin restricción; equipo: lo propio y lo de sus subordinados; propio: solo lo propio. */
type Alcance = "todo" | "equipo" | "propio";
type Reglas = Partial<Record<TipoRecurso, Partial<Record<Accion, Alcance>>>>;

const SOLO_LECTURA_CLIENTE: Reglas = {
  cliente: { ver: "todo" },
  contacto: { ver: "todo" },
  oportunidad: { ver: "todo" },
  actividad: { ver: "todo" },
  pedido: { ver: "todo" },
};

const REGLAS: Record<Rol, Reglas> = {
  ADMIN: {
    usuario: { ver: "todo", crear: "todo", editar: "todo" },
    auditoria: { ver: "todo" },
    importacion: { ver: "todo", crear: "todo" },
    calidad_datos: { ver: "todo", editar: "todo" },
    consentimiento: { ver: "todo", crear: "todo", editar: "todo" },
    solicitud_titular: { ver: "todo", crear: "todo", editar: "todo" },
    cliente: { ver: "todo", crear: "todo", editar: "todo", exportar: "todo" },
    contacto: { ver: "todo", crear: "todo", editar: "todo" },
    indicadores: { ver: "todo", exportar: "todo" },
    segmentacion: { recalcular: "todo" },
    politica_privacidad: { ver: "todo", editar: "todo" },
  },
  GERENCIA: {
    cliente: { ver: "todo" },
    contacto: { ver: "todo" },
    oportunidad: { ver: "todo" },
    actividad: { ver: "todo" },
    pedido: { ver: "todo" },
    caso: { ver: "todo" },
    indicadores: { ver: "todo", exportar: "todo" },
    condiciones_especiales: { aprobar: "todo" },
    politica_privacidad: { ver: "todo" },
  },
  JEFE_VENTAS: {
    cliente: { ver: "equipo", crear: "equipo", editar: "equipo", reasignar: "equipo" },
    contacto: { ver: "equipo", crear: "equipo", editar: "equipo" },
    oportunidad: { ver: "equipo", crear: "equipo", editar: "equipo", reasignar: "equipo" },
    actividad: { ver: "equipo", crear: "equipo", editar: "equipo" },
    pedido: { ver: "equipo", crear: "equipo", editar: "equipo" },
    indicadores: { ver: "equipo", exportar: "equipo" },
    politica_privacidad: { ver: "todo" },
  },
  VENDEDOR: {
    cliente: { ver: "propio", crear: "propio", editar: "propio" },
    contacto: { ver: "propio", crear: "propio", editar: "propio" },
    oportunidad: { ver: "propio", crear: "propio", editar: "propio" },
    actividad: { ver: "propio", crear: "propio", editar: "propio" },
    pedido: { ver: "propio", crear: "propio", editar: "propio" },
    politica_privacidad: { ver: "todo" },
  },
  JEFE_SERVICIO: {
    ...SOLO_LECTURA_CLIENTE,
    consentimiento: { ver: "todo" },
    caso: { ver: "todo", crear: "todo", editar: "todo", asignar: "todo", resolver: "todo" },
    indicadores: { ver: "todo", exportar: "todo" },
    politica_privacidad: { ver: "todo" },
  },
  EJECUTIVO_SERVICIO: {
    ...SOLO_LECTURA_CLIENTE,
    consentimiento: { ver: "todo" },
    // Crear no tiene dueño todavía: el responsable se asigna al registrar.
    caso: { ver: "propio", crear: "todo", editar: "propio", resolver: "propio" },
    politica_privacidad: { ver: "todo" },
  },
};

function dentroDelAlcance(
  alcance: Alcance,
  usuario: UsuarioPermisos,
  recurso: Recurso,
): boolean {
  if (alcance === "todo") return true;
  // Consulta de capacidad (sin recurso concreto): hay alcance restringido, se permite entrar.
  if (typeof recurso === "string") return true;
  const dueno = recurso.propietarioId;
  if (!dueno) return false; // falla cerrado
  if (dueno === usuario.id) return true;
  return alcance === "equipo" && recurso.jefeDelPropietarioId === usuario.id;
}

/**
 * Autorización central. Pasar el recurso concreto (con dueño) en toda acción
 * sobre un registro; el tipo suelto sirve solo para decidir menús y pantallas.
 */
export function can(
  usuario: { id: string; rol: Rol } | null | undefined,
  accion: Accion,
  recurso: Recurso,
): boolean {
  if (!usuario || !esRol(usuario.rol)) return false;
  const tipo = typeof recurso === "string" ? recurso : recurso.tipo;
  const alcance = REGLAS[usuario.rol][tipo]?.[accion];
  if (!alcance) return false;
  return dentroDelAlcance(alcance, usuario, recurso);
}
