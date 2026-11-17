// Pantalla «Mi progreso» (cliente): resumen personal con el estado de su membresía,
// su constancia (racha y cumplimiento) y el calendario de asistencia del mes.
import { AlertCircle, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { asistenciasDeUsuario, metricasDeUsuario } from "@/api/asistencias";
import { verMembresia } from "@/api/pagos";
import { CalendarioMes } from "@/components/CalendarioMes";
import { EtiquetaEstadoMembresia } from "@/components/EtiquetasPago";
import { TablaAsistencias } from "@/components/TablaAsistencias";
import { TarjetasConstancia } from "@/components/TarjetasConstancia";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import { mensajeMotivacion } from "@/lib/asistencia";
import { formatearFecha, hoyIso } from "@/lib/formato";
import { textoDiasRestantes } from "@/lib/pagos";

export default function PaginaMiProgreso() {
  const { usuario } = useAuth();
  const hoy = hoyIso();
  const [datos, setDatos] = useState(null); // { membresia, metricas, delMes }
  const [error, setError] = useState("");

  useEffect(() => {
    // Las tres consultas son independientes: se piden juntas.
    Promise.all([
      verMembresia(usuario.id),
      metricasDeUsuario(usuario.id),
      asistenciasDeUsuario(usuario.id, { desde: `${hoy.slice(0, 8)}01`, hasta: hoy }),
    ])
      .then(([membresia, metricas, delMes]) => setDatos({ membresia, metricas, delMes }))
      .catch((falla) => setError(falla.message));
  }, [usuario.id, hoy]);

  if (error) {
    return (
      <Alert variant="error" className="max-w-xl">
        <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <span>{error}</span>
      </Alert>
    );
  }
  if (!datos) {
    return (
      <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        Cargando tu progreso…
      </p>
    );
  }

  const { membresia, metricas, delMes } = datos;
  const diasAsistidos = new Set(delMes.map((a) => a.fecha));

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-2xl font-bold tracking-tight">Mi progreso</h1>
      <p className="mt-1 text-sm text-muted-foreground">{mensajeMotivacion(metricas.racha_actual)}</p>

      <Card className="mt-6">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
          <CardTitle>Mi membresía</CardTitle>
          <EtiquetaEstadoMembresia estado={membresia.estado} />
        </CardHeader>
        <CardContent className="flex flex-wrap items-center justify-between gap-4 text-sm">
          {membresia.fecha_vencimiento ? (
            <div>
              <p>
                Plan <strong>{membresia.plan}</strong> · vence el <strong>{formatearFecha(membresia.fecha_vencimiento)}</strong>
              </p>
              <p className="mt-1 text-muted-foreground">{textoDiasRestantes(membresia.dias_restantes)}</p>
            </div>
          ) : (
            <p className="text-muted-foreground">Aún no tienes una membresía.</p>
          )}
          {membresia.puede_entrar ? (
            <Button asChild variant="outline">
              <Link to="/checkin">Registrar entrada</Link>
            </Button>
          ) : (
            <Button asChild>
              <Link to="/pagar">Pagar membresía</Link>
            </Button>
          )}
        </CardContent>
      </Card>

      <div className="mt-6">
        <TarjetasConstancia metricas={metricas} />
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <Card>
          <CardContent className="p-6">
            <CalendarioMes hoy={hoy} diasAsistidos={diasAsistidos} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Este mes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p>
              Viniste <strong>{metricas.dias_asistidos_mes}</strong> de {metricas.dias_transcurridos_mes} días ({metricas.cumplimiento_mes} %).
            </p>
            <p className="text-muted-foreground">
              {metricas.dias_sin_asistir === null
                ? "Todavía no registras tu primera visita."
                : metricas.dias_sin_asistir === 0
                  ? "Hoy ya entrenaste. ¡Buen trabajo!"
                  : `Tu última visita fue hace ${metricas.dias_sin_asistir} día${metricas.dias_sin_asistir === 1 ? "" : "s"}.`}
            </p>
            <Link to="/mi-historial" className="inline-block pt-2 text-link hover:underline">
              Ver todo mi historial
            </Link>
          </CardContent>
        </Card>
      </div>

      {delMes.length > 0 && (
        <>
          <h2 className="mt-8 text-lg font-semibold">Últimas visitas</h2>
          <Card className="mt-3">
            <TablaAsistencias filas={delMes.slice(0, 5)} />
          </Card>
        </>
      )}
    </div>
  );
}
