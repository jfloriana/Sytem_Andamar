// Genera samples/clientes_importacion.csv de forma determinista (faker es + seed 42).
// 600 filas: 30 con errores (5 %), 12 con documento repetido y 6 con nombre repetido (3 % de duplicados).
// Todos los datos son inventados. Uso: npx tsx scripts/generar-muestra-clientes.ts
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { fakerES as faker } from "@faker-js/faker";
import Papa from "papaparse";
import { COLUMNAS_CSV, type FilaCsv } from "../src/domain/importacion";
import { normalizarNombre } from "../src/domain/normalizacion";

const SALIDA = "samples/clientes_importacion.csv";
const TOTAL = 600;
const ERRORES = 30;
const DUP_DOCUMENTO = 12;
const DUP_NOMBRE = 6;
/** Los documentos de muestra empiezan con este prefijo; el seed los limpia para poder reimportar. */
export const PREFIJO_DOCUMENTO_MUESTRA = "2099";
const VENDEDORES = ["vendedor@andamar.test", "bloqueo@andamar.test"];

faker.seed(42);

const documentosUsados = new Set<string>();
const nombresUsados = new Set<string>();
const telefonosUsados = new Set<string>();

function unico(generar: () => string, usados: Set<string>, clave: (v: string) => string = (v) => v): string {
  for (let i = 0; i < 1000; i++) {
    const valor = generar();
    if (!usados.has(clave(valor))) {
      usados.add(clave(valor));
      return valor;
    }
  }
  throw new Error("No se pudo generar un valor único.");
}

const documento = () => unico(() => PREFIJO_DOCUMENTO_MUESTRA + faker.string.numeric(7), documentosUsados);
const telefono = () => unico(() => "9" + faker.string.numeric(8), telefonosUsados);
const razonSocial = () =>
  unico(
    () => `${faker.company.name()}${faker.helpers.arrayElement(["", " S.A.C.", " E.I.R.L.", " S.R.L."])}`,
    nombresUsados,
    normalizarNombre,
  );

function filaValida(i: number): FilaCsv {
  const conContacto = faker.number.float() < 0.93;
  return {
    documento: documento(),
    razonSocial: razonSocial(),
    direccion: `${faker.location.streetAddress()}, ${faker.location.city()}`,
    telefono: telefono(),
    email: faker.number.float() < 0.7 ? `contacto${i}@${faker.internet.domainName()}` : "",
    vendedorEmail: VENDEDORES[i % VENDEDORES.length],
    contactoNombre: conContacto ? faker.person.fullName() : "",
    contactoTelefono: conContacto ? "9" + faker.string.numeric(8) : "",
    contactoEmail: "",
  };
}

const ROTURAS: ((f: FilaCsv) => FilaCsv)[] = [
  (f) => ({ ...f, documento: "123" }),
  (f) => ({ ...f, documento: "" }),
  (f) => ({ ...f, razonSocial: "" }),
  (f) => ({ ...f, direccion: "x" }),
  (f) => ({ ...f, email: "correo-sin-arroba" }),
  (f) => ({ ...f, telefono: "12" }),
  (f) => ({ ...f, vendedorEmail: "nadie@andamar.test" }),
  (f) => ({ ...f, contactoNombre: "", contactoEmail: "no-es-correo" }),
];

const filas: FilaCsv[] = Array.from({ length: TOTAL }, (_, i) => filaValida(i));

// Posiciones fijas y repartidas: errores, luego duplicados (los duplicados copian una fila anterior).
const paso = Math.floor(TOTAL / (ERRORES + DUP_DOCUMENTO + DUP_NOMBRE));
const posicion = (n: number) => 20 + n * paso;
for (let n = 0; n < ERRORES; n++) {
  const p = posicion(n);
  filas[p] = ROTURAS[n % ROTURAS.length](filas[p]);
}
for (let n = 0; n < DUP_DOCUMENTO; n++) {
  const p = posicion(ERRORES + n);
  filas[p] = { ...filas[p], documento: filas[p - 10].documento };
}
for (let n = 0; n < DUP_NOMBRE; n++) {
  const p = posicion(ERRORES + DUP_DOCUMENTO + n);
  filas[p] = { ...filas[p], razonSocial: filas[p - 10].razonSocial.toUpperCase() };
}

mkdirSync(dirname(SALIDA), { recursive: true });
writeFileSync(SALIDA, Papa.unparse({ fields: [...COLUMNAS_CSV], data: filas.map((f) => COLUMNAS_CSV.map((c) => f[c])) }) + "\n", "utf8");
console.log(`Escritas ${filas.length} filas en ${SALIDA}.`);
