import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Sin permiso" };

export default function SinPermiso() {
  return (
    <div className="flex max-w-lg flex-col gap-4">
      <h1 className="text-[28px] font-semibold leading-tight">Sin permiso</h1>
      <p className="text-muted-foreground">No tienes permiso para ver esta página.</p>
      <div>
        <Button asChild>
          <Link href="/">Volver al inicio</Link>
        </Button>
      </div>
    </div>
  );
}
