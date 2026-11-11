// Tabla de entradas al gimnasio. `mostrarCliente` agrega la columna del cliente (vista del administrador).
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ETIQUETAS_METODO_CHECKIN } from "@/lib/asistencia";
import { formatearFecha, formatearHora } from "@/lib/formato";

export function TablaAsistencias({ filas, mostrarCliente = false }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Fecha</TableHead>
          <TableHead>Hora</TableHead>
          {mostrarCliente && <TableHead>Cliente</TableHead>}
          <TableHead>Registrada con</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {filas.map((a) => (
          <TableRow key={a.id}>
            <TableCell>{formatearFecha(a.fecha)}</TableCell>
            <TableCell>{formatearHora(a.registrada_en)}</TableCell>
            {mostrarCliente && (
              <TableCell>
                {a.usuario_nombre}
                {a.usuario_codigo && <span className="ml-2 text-xs text-muted-foreground">{a.usuario_codigo}</span>}
              </TableCell>
            )}
            <TableCell>
              <Badge variant={a.metodo === "qr" ? "primario" : "neutro"}>{ETIQUETAS_METODO_CHECKIN[a.metodo] ?? a.metodo}</Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
