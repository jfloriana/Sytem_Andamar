import * as React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

interface BaseProps {
  id: string;
  etiqueta: string;
  ayuda?: string;
  error?: string | null;
  className?: string;
}

function Envoltorio({ id, etiqueta, ayuda, error, className, children }: BaseProps & { children: React.ReactNode }) {
  return (
    <div className={`flex flex-col gap-1 ${className ?? ""}`}>
      <Label htmlFor={id}>{etiqueta}</Label>
      {children}
      {ayuda ? (
        <p id={`${id}-ayuda`} className="text-xs text-muted-foreground">
          {ayuda}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} className="text-sm font-semibold text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

const describedBy = (id: string, ayuda?: string, error?: string | null) =>
  [ayuda ? `${id}-ayuda` : null, error ? `${id}-error` : null].filter(Boolean).join(" ") || undefined;

/** Campo de texto con etiqueta visible, ayuda y mensaje de error enlazados con aria-describedby. */
export function Campo({
  id,
  etiqueta,
  ayuda,
  error,
  className,
  ...props
}: BaseProps & Omit<React.InputHTMLAttributes<HTMLInputElement>, "id">) {
  return (
    <Envoltorio id={id} etiqueta={etiqueta} ayuda={ayuda} error={error} className={className}>
      <Input id={id} aria-invalid={!!error} aria-describedby={describedBy(id, ayuda, error)} {...props} />
    </Envoltorio>
  );
}

export function CampoSelect({
  id,
  etiqueta,
  ayuda,
  error,
  className,
  children,
  ...props
}: BaseProps & Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "id">) {
  return (
    <Envoltorio id={id} etiqueta={etiqueta} ayuda={ayuda} error={error} className={className}>
      <Select id={id} aria-invalid={!!error} aria-describedby={describedBy(id, ayuda, error)} {...props}>
        {children}
      </Select>
    </Envoltorio>
  );
}
