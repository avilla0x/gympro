// Comprobante de un pago (cliente dueño o administrador). Se puede imprimir o guardar como PDF
// con el botón "Imprimir" (el menú lateral y los botones no salen en la impresión).
import { AlertCircle, Loader2, Printer } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { obtenerPago } from "@/api/pagos";
import { EtiquetaEstadoPago } from "@/components/EtiquetasPago";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import { formatearFecha, formatearPesos } from "@/lib/formato";
import { ETIQUETAS_METODO } from "@/lib/pagos";

export default function PaginaComprobante() {
  const { id } = useParams();
  const { tieneRol } = useAuth();
  const [pago, setPago] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelado = false;
    obtenerPago(id)
      .then((datos) => !cancelado && setPago(datos))
      .catch((falla) => !cancelado && setError(falla.message));
    return () => {
      cancelado = true;
    };
  }, [id]);

  const volverA = tieneRol("admin") ? "/pagos" : "/pagar";

  if (error) {
    return (
      <Alert variant="error" className="mx-auto max-w-lg">
        <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <span>{error}</span>
      </Alert>
    );
  }
  if (!pago) {
    return (
      <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        Cargando comprobante…
      </p>
    );
  }

  const filas = [
    ["Cliente", pago.usuario_nombre],
    ["Documento", pago.usuario_documento ?? "—"],
    ["Plan", pago.plan_nombre],
    ["Método de pago", ETIQUETAS_METODO[pago.metodo]],
    ["Referencia", pago.referencia ?? "—"],
    ["Fecha del pago", formatearFecha(pago.fecha)],
    ["Vigencia", pago.fecha_inicio ? `${formatearFecha(pago.fecha_inicio)} al ${formatearFecha(pago.fecha_fin)}` : "—"],
  ];

  return (
    <div className="mx-auto max-w-lg">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Comprobante de pago N.º {pago.id}
            <EtiquetaEstadoPago estado={pago.estado} />
          </CardTitle>
          <CardDescription>GymPro</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <dl className="space-y-2 text-sm">
            {filas.map(([nombre, valor]) => (
              <div key={nombre} className="flex justify-between gap-4">
                <dt className="text-muted-foreground">{nombre}</dt>
                <dd className="font-medium">{valor}</dd>
              </div>
            ))}
          </dl>
          <p className="text-3xl font-extrabold tracking-tight">{formatearPesos(pago.monto)}</p>
          {pago.estado === "anulado" && (
            <p className="text-sm text-destructive">Anulado: {pago.motivo_anulacion}</p>
          )}
          <div className="flex gap-2 print:hidden">
            <Button onClick={() => window.print()}>
              <Printer className="size-4" aria-hidden="true" />
              Imprimir
            </Button>
            <Button asChild variant="outline">
              <Link to={volverA}>Volver</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
