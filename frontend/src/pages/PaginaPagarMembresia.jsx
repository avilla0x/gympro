// Pantalla "Pagar membresía" (cliente): su estado actual, los planes para pagar con la pasarela simulada
// y el historial de sus pagos con el comprobante.
import { AlertCircle, CalendarClock, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { iniciarCheckout, pagosDeUsuario, verMembresia } from "@/api/pagos";
import { listarPlanes } from "@/api/planes";
import { EtiquetaEstadoMembresia, EtiquetaEstadoPago } from "@/components/EtiquetasPago";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/context/AuthContext";
import { formatearFecha, formatearPesos } from "@/lib/formato";
import { ETIQUETAS_METODO, textoDiasRestantes } from "@/lib/pagos";

export default function PaginaPagarMembresia() {
  const { usuario } = useAuth();
  const navegar = useNavigate();

  const [membresia, setMembresia] = useState(null);
  const [planes, setPlanes] = useState([]);
  const [pagos, setPagos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [pagandoPlan, setPagandoPlan] = useState(null); // id del plan cuyo botón se acaba de pulsar
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelado = false;
    Promise.all([verMembresia(usuario.id), listarPlanes(), pagosDeUsuario(usuario.id)])
      .then(([m, p, h]) => {
        if (cancelado) return;
        setMembresia(m);
        setPlanes(p);
        setPagos(h);
      })
      .catch((falla) => !cancelado && setError(falla.message))
      .finally(() => !cancelado && setCargando(false));
    return () => {
      cancelado = true;
    };
  }, [usuario.id]);

  // Crea el pago pendiente y abre la pasarela simulada.
  async function pagar(plan) {
    setPagandoPlan(plan.id);
    setError("");
    try {
      const pago = await iniciarCheckout(plan.id);
      navegar(`/pasarela/${pago.id}`);
    } catch (falla) {
      setError(falla.message);
      setPagandoPlan(null);
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-bold tracking-tight">Pagar membresía</h1>
      <p className="mt-1 text-sm text-muted-foreground">Consulta tu estado, renueva tu plan y revisa tus pagos.</p>

      {error && (
        <Alert variant="error" className="mt-6">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </Alert>
      )}

      {cargando ? (
        <p role="status" className="mt-10 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          Cargando…
        </p>
      ) : (
        <>
          {membresia && <TarjetaEstado membresia={membresia} />}

          <h2 className="mt-8 text-lg font-semibold">Elige un plan</h2>
          {membresia?.puede_entrar && (
            <p className="mt-1 text-sm text-muted-foreground">
              Si renuevas ahora, los días nuevos se suman al final de tu membresía actual.
            </p>
          )}
          <div className="mt-4 grid gap-5 md:grid-cols-3">
            {planes.map((plan) => (
              <Card key={plan.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    {plan.nombre}
                    <span className="flex items-center gap-1.5 text-xs font-normal text-muted-foreground">
                      <CalendarClock className="size-3.5" aria-hidden="true" />
                      {plan.duracion_dias} días
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-3xl font-extrabold tracking-tight">{formatearPesos(plan.precio)}</p>
                  <Button onClick={() => pagar(plan)} disabled={pagandoPlan !== null} aria-label={`Pagar plan ${plan.nombre}`}>
                    {pagandoPlan === plan.id && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
                    Pagar
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          <h2 className="mt-10 text-lg font-semibold">Mis pagos</h2>
          {pagos.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">Todavía no tienes pagos.</p>
          ) : (
            <Card className="mt-3">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Monto</TableHead>
                    <TableHead>Método</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagos.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>{formatearFecha(p.fecha)}</TableCell>
                      <TableCell>{p.plan_nombre}</TableCell>
                      <TableCell>{formatearPesos(p.monto)}</TableCell>
                      <TableCell>{ETIQUETAS_METODO[p.metodo]}</TableCell>
                      <TableCell>
                        <EtiquetaEstadoPago estado={p.estado} />
                      </TableCell>
                      <TableCell className="text-right">
                        {p.estado === "pendiente" && (
                          <Link className="text-sm text-link hover:underline" to={`/pasarela/${p.id}`} aria-label={`Continuar el pago ${p.id}`}>
                            Continuar pago
                          </Link>
                        )}
                        {p.estado === "aprobado" && (
                          <Link className="text-sm text-link hover:underline" to={`/pagos/${p.id}/comprobante`} aria-label={`Ver comprobante del pago ${p.id}`}>
                            Comprobante
                          </Link>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

// Tarjeta con el estado actual de la membresía y su vencimiento.
function TarjetaEstado({ membresia }) {
  const mensaje = {
    sin_membresia: "Aún no tienes una membresía. Elige un plan para empezar a entrenar.",
    en_mora: "Tu membresía venció. Renueva para volver a entrar al gimnasio.",
    por_vencer: "Tu membresía está por vencer. Puedes renovarla desde ya sin perder días.",
    al_dia: "Tu membresía está vigente.",
  }[membresia.estado];

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          Estado de tu membresía
          <EtiquetaEstadoMembresia estado={membresia.estado} />
        </CardTitle>
        <CardDescription>{mensaje}</CardDescription>
      </CardHeader>
      {membresia.fecha_vencimiento && (
        <CardContent className="text-sm">
          <p>
            Plan <strong>{membresia.plan}</strong> · vence el <strong>{formatearFecha(membresia.fecha_vencimiento)}</strong>
          </p>
          <p className="mt-1 text-muted-foreground">{textoDiasRestantes(membresia.dias_restantes)}</p>
        </CardContent>
      )}
    </Card>
  );
}
