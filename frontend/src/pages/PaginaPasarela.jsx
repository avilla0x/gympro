// Pantalla de la PASARELA DE PAGOS SIMULADA (RN7). No se cobra dinero real: imita la pantalla de una
// pasarela para poder demostrar un pago aprobado y uno rechazado. La usan el cliente (su propio pago)
// y el administrador (cuando cobra a un cliente).
import { AlertCircle, CheckCircle2, Loader2, ShieldCheck, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { cancelarPago, obtenerPago, simularPago } from "@/api/pagos";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import { formatearPesos } from "@/lib/formato";

export default function PaginaPasarela() {
  const { id } = useParams();
  const { tieneRol } = useAuth();
  const navegar = useNavigate();
  const volverA = tieneRol("admin") ? "/pagos" : "/pagar"; // a dónde vuelve cada rol

  const [pago, setPago] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelado = false;
    obtenerPago(id)
      .then((datos) => !cancelado && setPago(datos))
      .catch((falla) => !cancelado && setError(falla.message))
      .finally(() => !cancelado && setCargando(false));
    return () => {
      cancelado = true;
    };
  }, [id]);

  // Aprobar o rechazar el pago pendiente.
  async function decidir(resultado) {
    setEnviando(true);
    setError("");
    try {
      setPago({ ...pago, ...(await simularPago(id, resultado)) });
    } catch (falla) {
      setError(falla.message);
    } finally {
      setEnviando(false);
    }
  }

  // Cancelar: el pago queda rechazado y se vuelve a la pantalla anterior.
  async function cancelar() {
    setEnviando(true);
    setError("");
    try {
      await cancelarPago(id);
      navegar(volverA);
    } catch (falla) {
      setError(falla.message);
      setEnviando(false);
    }
  }

  if (cargando) {
    return (
      <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        Cargando pago…
      </p>
    );
  }

  return (
    <div className="mx-auto max-w-lg">
      {error && (
        <Alert variant="error" className="mb-4">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </Alert>
      )}

      {pago && pago.estado === "pendiente" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="size-5 text-primary" aria-hidden="true" />
              Pasarela de pagos (simulada)
            </CardTitle>
            <CardDescription>Esto es una simulación: no se cobra dinero real.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <ResumenPago pago={pago} />
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => decidir("aprobado")} disabled={enviando}>
                {enviando && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
                Aprobar pago
              </Button>
              <Button variant="outline" onClick={() => decidir("rechazado")} disabled={enviando}>
                Rechazar pago
              </Button>
            </div>
            <div className="flex flex-wrap gap-4 text-sm">
              <button type="button" onClick={cancelar} disabled={enviando} className="text-link hover:underline">
                Cancelar este pago
              </button>
              <Link to={volverA} className="text-muted-foreground hover:underline">
                Decidir después
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {pago && pago.estado !== "pendiente" && <ResultadoPago pago={pago} volverA={volverA} />}

      {!pago && !cargando && (
        <Link to={volverA} className="text-sm text-link hover:underline">
          Volver
        </Link>
      )}
    </div>
  );
}

// Los datos del pago: quién, qué plan y cuánto.
function ResumenPago({ pago }) {
  const filas = [
    ["Cliente", pago.usuario_nombre],
    ["Plan", pago.plan_nombre],
    ["Referencia", pago.referencia],
  ];
  return (
    <div>
      <dl className="space-y-1 text-sm">
        {filas.map(([nombre, valor]) => (
          <div key={nombre} className="flex justify-between gap-4">
            <dt className="text-muted-foreground">{nombre}</dt>
            <dd className="font-medium">{valor}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-4 text-3xl font-extrabold tracking-tight">{formatearPesos(pago.monto)}</p>
    </div>
  );
}

// Lo que se ve cuando el pago ya no está pendiente (acaba de resolverse o se abrió uno viejo).
function ResultadoPago({ pago, volverA }) {
  const aprobado = pago.estado === "aprobado";
  const Icono = aprobado ? CheckCircle2 : XCircle;
  const titulo = { aprobado: "Pago aprobado", rechazado: "Pago rechazado", anulado: "Pago anulado" }[pago.estado];
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icono className={aprobado ? "size-5 text-success" : "size-5 text-destructive"} aria-hidden="true" />
          {titulo}
        </CardTitle>
        <CardDescription>
          {aprobado ? "La membresía ya quedó activa." : "No se cobró nada y la membresía no cambió."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <ResumenPago pago={pago} />
        <div className="flex flex-wrap gap-2">
          {aprobado && (
            <Button asChild>
              <Link to={`/pagos/${pago.id}/comprobante`}>Ver comprobante</Link>
            </Button>
          )}
          <Button asChild variant="outline">
            <Link to={volverA}>{aprobado || pago.estado === "anulado" ? "Volver" : "Intentar de nuevo"}</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
