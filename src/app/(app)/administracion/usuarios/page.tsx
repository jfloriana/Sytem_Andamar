import type { Metadata } from "next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { prisma } from "@/lib/prisma";
import { requerir } from "@/lib/sesion";
import { esRol } from "@/lib/roles";
import { FormularioUsuario } from "./formulario-usuario";
import { FilaUsuario, type UsuarioFila } from "./fila-usuario";

export const metadata: Metadata = { title: "Usuarios" };
export const dynamic = "force-dynamic";

export default async function PaginaUsuarios() {
  const admin = await requerir("ver", "usuario");
  const usuarios = await prisma.usuario.findMany({
    orderBy: [{ activo: "desc" }, { nombre: "asc" }],
    include: { jefe: { select: { nombre: true } } },
  });

  const filas: UsuarioFila[] = usuarios.flatMap((u) =>
    esRol(u.rol)
      ? [
          {
            id: u.id,
            nombre: u.nombre,
            email: u.email,
            rol: u.rol,
            activo: u.activo,
            jefe: u.jefe?.nombre ?? null,
            esYo: u.id === admin.id,
          },
        ]
      : [],
  );
  const jefes = usuarios.filter((u) => u.rol === "JEFE_VENTAS" && u.activo).map((u) => ({ id: u.id, nombre: u.nombre }));

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-[28px] font-semibold leading-tight">Usuarios</h1>
      <Card>
        <CardHeader>
          <CardTitle>Nuevo usuario</CardTitle>
        </CardHeader>
        <CardContent>
          <FormularioUsuario jefes={jefes} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Usuarios registrados ({filas.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Correo</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Jefe</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filas.map((u) => (
                <FilaUsuario key={u.id} usuario={u} />
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
