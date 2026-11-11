// Pantalla «Registrar entrada» (cliente): aquí llega al escanear el QR fijo del gimnasio con el celular
// (el QR abre /checkin?codigo=...). Si entra sin código, puede escribirlo o usar el botón de simulación.
import { AlertCircle, CheckCircle2, Loader2, ScanLine } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { metricasDeUsuario, registrarEntrada } from "@/api/asistencias";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { formatearFecha, formatearHora } from "@/lib/formato";
import { mensajeMotivacion, textoRacha } from "@/lib/asistencia";

// Código del QR de demostración (el mismo que trae el servidor por defecto). Solo se usa en el botón de simulación.
const CODIGO_DEMO = "GYMPRO-ENTRADA";

export default function PaginaCheckin() {
  const { usuario } = useAuth();
  const [parametros] = useSearchParams();
  const codigoDelEnlace = parametros.get("codigo");

  const [codigo, setCodigo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const [rechazadoPorMembresia, setRechazadoPorMembresia] = useState(false);
  const [entrada, setEntrada] = useState(null); // la entrada registrada
  const [metricas, setMetricas] = useState(null);
  const yaIntentado = useRef(false); // evita registrar dos veces si React redibuja la pantalla

  async function registrar(texto) {
    setEnviando(true);
    setError("");
    setRechazadoPorMembresia(false);
    try {
      const nueva = await registrarEntrada(texto);
      setEntrada(nueva);
      // La racha es un extra: si falla, la entrada igual quedó registrada.
      metricasDeUsuario(usuario.id).then(setMetricas).catch(() => {});
    } catch (falla) {
      setError(falla.message);
      setRechazadoPorMembresia(falla.estado === 403);
    } finally {
      setEnviando(false);
    }
  }

  // Si llegó escaneando el QR, el registro es automático.
  useEffect(() => {
    if (codigoDelEnlace && !yaIntentado.current) {
      yaIntentado.current = true;
      registrar(codigoDelEnlace);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function alEnviar(evento) {
    evento.preventDefault();
    if (codigo.trim()) registrar(codigo.trim());
  }

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-2xl font-bold tracking-tight">Registrar entrada</h1>
      <p className="mt-1 text-sm text-muted-foreground">Escanea el QR de la entrada del gimnasio con tu celular para registrar tu asistencia.</p>

      {enviando && (
        <p role="status" className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          Registrando tu entrada…
        </p>
      )}

      {entrada && (
        <Card className="mt-6 border-success/40">
          <CardContent className="p-6 text-center">
            <CheckCircle2 className="mx-auto size-10 text-success" aria-hidden="true" />
            <p className="mt-3 text-xl font-bold">¡Entrada registrada!</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {formatearFecha(entrada.fecha)} · {formatearHora(entrada.registrada_en)}
            </p>
            {metricas && (
              <p className="mt-4 text-sm">
                Racha actual: <strong>{textoRacha(metricas.racha_actual)}</strong>. {mensajeMotivacion(metricas.racha_actual)}
              </p>
            )}
            <Link to="/mi-historial" className="mt-4 inline-block text-sm text-link hover:underline">
              Ver mi historial
            </Link>
          </CardContent>
        </Card>
      )}

      {error && (
        <Alert variant="error" className="mt-6">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>
            {error}
            {rechazadoPorMembresia && (
              <>
                {" "}
                <Link to="/pagar" className="font-medium underline">
                  Ir a pagar mi membresía
                </Link>
              </>
            )}
          </span>
        </Alert>
      )}

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>¿No puedes escanear?</CardTitle>
          <CardDescription>Escribe el código que aparece junto al QR, o usa la simulación de la demostración.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={alEnviar} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="codigo">Código del QR</Label>
              <Input id="codigo" value={codigo} onChange={(e) => setCodigo(e.target.value)} placeholder="Ej. GYMPRO-ENTRADA" autoComplete="off" />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={enviando || !codigo.trim()}>
                Registrar entrada
              </Button>
              <Button type="button" variant="outline" disabled={enviando} onClick={() => registrar(CODIGO_DEMO)}>
                <ScanLine className="size-4" aria-hidden="true" />
                Simular escaneo del QR
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
