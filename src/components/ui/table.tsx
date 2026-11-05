import * as React from "react";
import { cn } from "@/lib/utils";

const Table = ({ className, ...props }: React.HTMLAttributes<HTMLTableElement>) => (
  <div className="w-full max-w-full overflow-x-auto">
    <table role="table" className={cn("tabla-apilada w-full border-collapse text-sm", className)} {...props} />
  </div>
);

const TableHeader = (props: React.HTMLAttributes<HTMLTableSectionElement>) => <thead {...props} />;
const TableBody = (props: React.HTMLAttributes<HTMLTableSectionElement>) => <tbody {...props} />;

const TableRow = ({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) => (
  <tr role="row" className={cn("border-b hover:bg-muted/50", className)} {...props} />
);

const TableHead = ({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) => (
  <th
    scope="col"
    role="columnheader"
    className={cn("h-11 bg-muted px-3 text-left align-middle font-semibold", className)}
    {...props}
  />
);

/** `etiqueta` es el encabezado de la columna; en móvil cada fila se apila y la muestra junto al valor. */
const TableCell = ({
  className,
  etiqueta,
  ...props
}: React.TdHTMLAttributes<HTMLTableCellElement> & { etiqueta?: string }) => (
  <td role="cell" data-label={etiqueta} className={cn("h-11 px-3 align-middle tabular-nums", className)} {...props} />
);

export { Table, TableHeader, TableBody, TableRow, TableHead, TableCell };
