// Tabla con el estilo de GymPro. Se usa como la tabla HTML normal pero con estas piezas:
//   <Table><TableHeader><TableRow><TableHead>Nombre</TableHead></TableRow></TableHeader>
//          <TableBody><TableRow><TableCell>Ana</TableCell></TableRow></TableBody></Table>
import { cn } from "@/lib/utils";

export function Table({ className, ...props }) {
  // El contenedor permite desplazar la tabla de lado en pantallas pequeñas en vez de romper el diseño.
  return (
    <div className="w-full overflow-x-auto">
      <table className={cn("w-full caption-bottom text-sm", className)} {...props} />
    </div>
  );
}

export function TableHeader({ className, ...props }) {
  return <thead className={cn("[&_tr]:border-b", className)} {...props} />;
}

export function TableBody({ className, ...props }) {
  return <tbody className={cn("[&_tr:last-child]:border-0", className)} {...props} />;
}

export function TableRow({ className, ...props }) {
  return <tr className={cn("border-b transition-colors hover:bg-muted/50", className)} {...props} />;
}

export function TableHead({ className, ...props }) {
  return <th className={cn("h-10 px-4 text-left align-middle text-xs font-semibold uppercase tracking-wide text-muted-foreground", className)} {...props} />;
}

export function TableCell({ className, ...props }) {
  return <td className={cn("px-4 py-3 align-middle", className)} {...props} />;
}
