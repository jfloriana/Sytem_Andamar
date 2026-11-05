// Consultas y textos del módulo de cumplimiento (RF-13).
import { prisma } from "@/lib/prisma";

export const POLITICA_POR_DEFECTO = `Política de privacidad de Andamar

Este texto es una plantilla de ejemplo y debe revisarse con asesoría legal antes de usarse.

1. Qué datos tratamos
Datos de identificación y contacto de nuestros clientes (tiendas y supermercados) y de sus contactos: documento, razón social, dirección, teléfono y correo.

2. Para qué los usamos
Servicio: atender pedidos, entregas y reclamos.
Promociones: enviar ofertas, solo si diste tu consentimiento.
Analítica: medir y mejorar nuestro servicio comercial.

3. Tus derechos
Puedes pedir acceso, rectificación o supresión de tus datos personales, y retirar un consentimiento cuando quieras. Atendemos cada solicitud dentro de los plazos legales.

4. Cómo ejercerlos
Escríbenos o díselo a tu vendedor. Registraremos tu solicitud y te responderemos.`;

/** Texto vigente de la política (la versión más alta) o la plantilla si nadie la editó. */
export async function politicaVigente() {
  const p = await prisma.politicaPrivacidad.findFirst({
    orderBy: { version: "desc" },
    include: { autor: { select: { nombre: true } } },
  });
  return p
    ? { version: p.version, contenido: p.contenido, actualizadaAt: p.createdAt, autor: p.autor.nombre }
    : { version: 0, contenido: POLITICA_POR_DEFECTO, actualizadaAt: null, autor: null };
}
