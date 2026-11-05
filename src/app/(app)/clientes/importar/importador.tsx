"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { confirmarImportacion, previsualizarImportacion, type InformeVista, type ResultadoImportacion } from "./actions";

const MOTIVO = { nombre: "nombre parecido", telefono: "teléfono repetido" } as const;

function Resumen({ informe }: { informe: InformeVista }) {
  const filas: [string, number][] = [
    ["Filas leídas", informe.total],
    ["Listas para importar", informe.validas],
    ["Con errores (no se importan)", informe.errores.length],
    ["Duplicadas por documento (no se importan)", informe.duplicados.length],
    ["Con advertencia (se importan)", informe.advertencias.length],
  ];
  return (
    <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {filas.map(([etiqueta, valor]) => (
        <div key={etiqueta} className="rounded border p-3">
          <dt className="text-xs text-muted-foreground">{etiqueta}</dt>
          <dd className="text-2xl font-semibold tabular-nums">{valor}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Importador() {
  const entrada = useRef<HTMLInputElement>(null);
  const [resultado, setResultado] = useState<ResultadoImportacion>({});
  const [pendiente, empezar] = useTransition();

  const datos = () => {
    const archivo = entrada.current?.files?.[0];
    if (!archivo) return null;
    const fd = new FormData();
    fd.set("archivo", archivo);
    return fd;
  };

  function revisar() {
    const fd = datos();
    if (!fd) return setResultado({ error: "Elige un archivo CSV." });
    empezar(async () => setResultado(await previsualizarImportacion(fd)));
  }

  function importar() {
    const fd = datos();
    if (!fd) return;
    if (!window.confirm(`¿Importar ${resultado.informe?.validas ?? 0} clientes?`)) return;
    empezar(async () => setResultado(await confirmarImportacion(fd)));
  }

  const informe = resultado.informe;
  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>1. Elige el archivo</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            Columnas: documento, razonSocial, direccion, telefono, email, vendedorEmail, contactoNombre, contactoTelefono,
            contactoEmail. Obligatorias: documento, razonSocial, direccion y vendedorEmail. Máximo 1000 filas.
          </p>
          <div className="flex flex-col gap-1 md:max-w-md">
            <Label htmlFor="archivo">Archivo CSV</Label>
            <input
              ref={entrada}
              id="archivo"
              type="file"
              accept=".csv,text/csv"
              onChange={() => setResultado({})}
              className="min-h-11 rounded border border-input p-2 text-sm"
            />
          </div>
          <div>
            <Button type="button" onClick={revisar} disabled={pendiente}>
              {pendiente && !informe ? "Revisando..." : "Revisar archivo"}
            </Button>
          </div>
          {resultado.error ? (
            <p role="alert" className="text-sm font-semibold text-destructive">
              {resultado.error}
            </p>
          ) : null}
        </CardContent>
      </Card>

      {resultado.importados !== undefined ? (
        <Card>
          <CardContent className="flex flex-col gap-3 pt-4 md:pt-6" role="status">
            <p className="text-xl font-semibold text-success">
              Importación terminada: {resultado.importados} clientes importados.
            </p>
            {resultado.omitidos ? <p>{resultado.omitidos} filas no se importaron (errores o duplicados).</p> : null}
            <div>
              <Button asChild>
                <Link href="/clientes">Ver clientes</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {informe && resultado.importados === undefined ? (
        <Card>
          <CardHeader>
            <CardTitle>2. Revisa el informe</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            <Resumen informe={informe} />

            {informe.errores.length > 0 ? (
              <section aria-labelledby="t-errores">
                <h3 id="t-errores" className="mb-2 font-semibold">
                  Errores por fila
                </h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fila</TableHead>
                      <TableHead>Documento</TableHead>
                      <TableHead>Problemas</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {informe.errores.map((e) => (
                      <TableRow key={e.fila}>
                        <TableCell etiqueta="Fila">{e.fila}</TableCell>
                        <TableCell etiqueta="Documento">{e.documento || "-"}</TableCell>
                        <TableCell etiqueta="Problemas" className="md:whitespace-normal">
                          {e.mensajes.join(" ")}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </section>
            ) : null}

            {informe.duplicados.length > 0 ? (
              <section aria-labelledby="t-duplicados">
                <h3 id="t-duplicados" className="mb-2 font-semibold">
                  Duplicados por documento
                </h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fila</TableHead>
                      <TableHead>Documento</TableHead>
                      <TableHead>Razón social</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {informe.duplicados.map((d) => (
                      <TableRow key={d.fila}>
                        <TableCell etiqueta="Fila">{d.fila}</TableCell>
                        <TableCell etiqueta="Documento">{d.documento}</TableCell>
                        <TableCell etiqueta="Razón social">{d.razonSocial}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </section>
            ) : null}

            {informe.advertencias.length > 0 ? (
              <section aria-labelledby="t-advertencias">
                <h3 id="t-advertencias" className="mb-2 font-semibold">
                  Advertencias (se importan igual)
                </h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fila</TableHead>
                      <TableHead>Razón social</TableHead>
                      <TableHead>Motivo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {informe.advertencias.map((a) => (
                      <TableRow key={a.fila}>
                        <TableCell etiqueta="Fila">{a.fila}</TableCell>
                        <TableCell etiqueta="Razón social">{a.razonSocial}</TableCell>
                        <TableCell etiqueta="Motivo">{a.motivos.map((m) => MOTIVO[m]).join(", ")}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </section>
            ) : null}

            {informe.muestra.length > 0 ? (
              <section aria-labelledby="t-muestra">
                <h3 id="t-muestra" className="mb-2 font-semibold">
                  Vista previa (primeras {informe.muestra.length} filas listas)
                </h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fila</TableHead>
                      <TableHead>Documento</TableHead>
                      <TableHead>Razón social</TableHead>
                      <TableHead>Vendedor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {informe.muestra.map((m) => (
                      <TableRow key={m.fila}>
                        <TableCell etiqueta="Fila">{m.fila}</TableCell>
                        <TableCell etiqueta="Documento">{m.documento}</TableCell>
                        <TableCell etiqueta="Razón social">{m.razonSocial}</TableCell>
                        <TableCell etiqueta="Vendedor">{m.vendedorEmail}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </section>
            ) : null}

            <div>
              <h3 className="mb-2 font-semibold">3. Confirma</h3>
              <Button type="button" onClick={importar} disabled={pendiente || informe.validas === 0}>
                {pendiente ? "Importando..." : `Importar ${informe.validas} clientes`}
              </Button>
              <p className="mt-2 text-sm text-muted-foreground">
                Nada se guarda hasta que confirmes. Las filas con errores o duplicadas se omiten.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
