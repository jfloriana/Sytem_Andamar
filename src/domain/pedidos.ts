// Reglas de pedidos (RF-06): los anulados no cuentan en ningún cálculo.

export type EstadoPedido = "REGISTRADO" | "ENTREGADO" | "ANULADO";
export type EstadoClientePedido = "ACTIVO" | "INACTIVO" | "EN_RIESGO";

export interface PedidoCalculo {
  id?: string;
  estado: EstadoPedido;
  monto: number;
  margen: number;
  fecha: Date;
}

export const esPedidoValido = (p: { estado: EstadoPedido }): boolean => p.estado !== "ANULADO";

const aCentavos = (n: number) => Math.round(n * 100);
const deCentavos = (c: number) => c / 100;

export interface TotalesPedidos {
  cantidad: number;
  monto: number;
  margen: number;
  ultimoPedidoAt: Date | null;
}

/** Último pedido no anulado (el de fecha más reciente). */
export function ultimoPedido<T extends Pick<PedidoCalculo, "estado" | "fecha">>(pedidos: T[]): T | null {
  return pedidos.filter(esPedidoValido).reduce<T | null>((mejor, p) => (!mejor || p.fecha > mejor.fecha ? p : mejor), null);
}

/** Cantidad, monto, margen y último pedido, sin contar los anulados. */
export function totalesPedidos(pedidos: PedidoCalculo[]): TotalesPedidos {
  const validos = pedidos.filter(esPedidoValido);
  return {
    cantidad: validos.length,
    monto: deCentavos(validos.reduce((s, p) => s + aCentavos(p.monto), 0)),
    margen: deCentavos(validos.reduce((s, p) => s + aCentavos(p.margen), 0)),
    ultimoPedidoAt: ultimoPedido(validos)?.fecha ?? null,
  };
}

/** Mensajes de error de monto y margen; lista vacía si son válidos. */
export function validarMontosPedido(monto: number, margen: number): string[] {
  if (!Number.isFinite(monto) || !Number.isFinite(margen)) return ["El monto y el margen deben ser números."];
  const errores: string[] = [];
  if (monto <= 0) errores.push("El monto debe ser mayor que cero.");
  if (margen < 0) errores.push("El margen no puede ser negativo.");
  else if (monto > 0 && margen > monto) errores.push("El margen no puede superar el monto.");
  return errores;
}

const TRANSICIONES: Record<EstadoPedido, EstadoPedido[]> = {
  REGISTRADO: ["ENTREGADO", "ANULADO"],
  ENTREGADO: ["ANULADO"],
  ANULADO: [],
};

export const estadosSiguientesPedido = (actual: EstadoPedido): EstadoPedido[] => TRANSICIONES[actual];

export const puedeCambiarEstadoPedido = (actual: EstadoPedido, nuevo: EstadoPedido): boolean =>
  TRANSICIONES[actual].includes(nuevo);

/** Un pedido nuevo devuelve a ACTIVO al cliente en riesgo (regla 2); un cliente dado de baja no cambia. */
export function estadoClienteTrasPedido(estado: EstadoClientePedido): EstadoClientePedido {
  return estado === "EN_RIESGO" ? "ACTIVO" : estado;
}
