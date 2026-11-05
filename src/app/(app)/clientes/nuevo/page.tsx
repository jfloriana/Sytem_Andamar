import type { Metadata } from "next";
import { vendedoresAsignables } from "@/lib/clientes";
import { requerir } from "@/lib/sesion";
import { crearCliente } from "../actions";
import { FormularioCliente } from "../formulario-cliente";

export const metadata: Metadata = { title: "Nuevo cliente" };
export const dynamic = "force-dynamic";

export default async function PaginaNuevoCliente() {
  const usuario = await requerir("crear", "cliente");
  const vendedores = await vendedoresAsignables(usuario);
  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <h1 className="text-[28px] font-semibold leading-tight">Nuevo cliente</h1>
      {vendedores.length === 0 ? (
        <p>No hay vendedores activos a quienes asignar el cliente.</p>
      ) : (
        <FormularioCliente
          accion={crearCliente}
          modo="crear"
          vendedores={vendedores.map((v) => ({ id: v.id, nombre: v.nombre }))}
          puedeElegirVendedor={usuario.rol !== "VENDEDOR"}
          cancelar="/clientes"
        />
      )}
    </div>
  );
}
