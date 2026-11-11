// Pantalla «Avisos» (administrador y cliente): los avisos del sistema, como los de vencimiento de la membresía.
import { AlertCircle, BellRing, CheckCircle2, CheckCheck, Loader2 } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

import { generarAvisos } from "@/api/avisos";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import { useAvisos } from "@/context/AvisosContext";
import { formatearFechaHora } from "@/lib/formato";

// A dónde lleva cada tipo de aviso para actuar sobre él.
const ENLACES = {
  por_vencer: { ruta: "/pagar", texto: "Renovar membresía" },
  vence_hoy: { ruta: "/pagar", texto: "Renovar membresía" },
  resumen_admin: { ruta: "/pagos", texto: "Ver pagos y vencimientos" },
  recordatorio_asistencia: { ruta: "/checkin", texto: "Registrar mi entrada" },
};

export default function PaginaAvisos() {
  const { tieneRol } = useAuth();
  const { avisos, noLeidas, cargando, recargar, marcarLeido, marcarTodos } = useAvisos();
  const [error, setError] = useState("");
  const [resultado, setResultado] = useState("");
  const [revisando, setRevisando] = useState(false);

  async function accion(funcion) {
    setError("");
    try {
      await funcion();
    } catch (falla) {
      setError(falla.message);
    }
  }

  // Solo administrador: lanza ya la revisión que normalmente corre sola cada día.
  async function revisarAhora() {
    setRevisando(true);
    setError("");
    setResultado("");
    try {
      const r = await generarAvisos();
      const recordatorios = r.recordatorio_asistencia ?? 0;
      const total = r.por_vencer + r.vence_hoy + r.resumen_admin + recordatorios;
      setResultado(
        total === 0
          ? "Revisión terminada: no había avisos nuevos."
          : `Revisión terminada: ${r.por_vencer} por vencer, ${r.vence_hoy} vencen hoy, ${r.resumen_admin} resumen(es) y ${recordatorios} recordatorio(s) de asistencia.`,
      );
      await recargar();
    } catch (falla) {
      setError(falla.message);
    } finally {
      setRevisando(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Avisos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {noLeidas === 0 ? "No tienes avisos sin leer." : `Tienes ${noLeidas} aviso${noLeidas === 1 ? "" : "s"} sin leer.`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {noLeidas > 0 && (
            <Button variant="outline" onClick={() => accion(marcarTodos)}>
              <CheckCheck className="size-4" aria-hidden="true" />
              Marcar todos como leídos
            </Button>
          )}
          {tieneRol("admin") && (
            <Button variant="outline" onClick={revisarAhora} disabled={revisando}>
              {revisando && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
              Revisar vencimientos ahora
            </Button>
          )}
        </div>
      </div>

      {error && (
        <Alert variant="error" className="mt-6">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </Alert>
      )}
      {resultado && (
        <Alert variant="exito" role="status" className="mt-6">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>{resultado}</span>
        </Alert>
      )}

      {cargando ? (
        <p role="status" className="mt-10 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          Cargando avisos…
        </p>
      ) : avisos.length === 0 ? (
        <p className="mt-10 text-sm text-muted-foreground">Todavía no hay avisos. Aquí aparecerán los de vencimiento de tu membresía.</p>
      ) : (
        <ul className="mt-6 space-y-3">
          {avisos.map((aviso) => {
            const enlace = ENLACES[aviso.tipo];
            return (
              <li key={aviso.id}>
                <Card className={aviso.leida ? "opacity-70" : "border-primary/50"}>
                  <CardContent className="flex items-start gap-3 pt-6">
                    <BellRing className={aviso.leida ? "mt-0.5 size-4 shrink-0 text-muted-foreground" : "mt-0.5 size-4 shrink-0 text-primary"} aria-hidden="true" />
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-2 font-semibold">
                        {aviso.titulo}
                        {!aviso.leida && <Badge variant="primario">Nuevo</Badge>}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">{aviso.mensaje}</p>
                      <p className="mt-2 text-xs text-muted-foreground">{formatearFechaHora(aviso.creado_en)}</p>
                      <div className="mt-3 flex flex-wrap gap-4 text-sm">
                        {enlace && (
                          <Link to={enlace.ruta} className="text-link hover:underline">
                            {enlace.texto}
                          </Link>
                        )}
                        {!aviso.leida && (
                          <button
                            type="button"
                            className="text-muted-foreground hover:underline"
                            aria-label={`Marcar como leído: ${aviso.titulo}`}
                            onClick={() => accion(() => marcarLeido(aviso.id))}
                          >
                            Marcar como leído
                          </button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
