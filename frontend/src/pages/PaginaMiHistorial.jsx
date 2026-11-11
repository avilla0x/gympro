// Pantalla «Mi historial» (cliente): sus constancia (racha y cumplimiento) y la lista de sus entradas, con filtro por fechas.
import { AlertCircle, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { asistenciasDeUsuario, metricasDeUsuario } from "@/api/asistencias";
import { TablaAsistencias } from "@/components/TablaAsistencias";
import { TarjetasConstancia } from "@/components/TarjetasConstancia";
import { Alert } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { mensajeMotivacion } from "@/lib/asistencia";

export default function PaginaMiHistorial() {
  const { usuario } = useAuth();
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [filas, setFilas] = useState([]);
  const [metricas, setMetricas] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  // La constancia no depende de los filtros: se pide una sola vez.
  useEffect(() => {
    metricasDeUsuario(usuario.id)
      .then(setMetricas)
      .catch((falla) => setError(falla.message));
  }, [usuario.id]);

  useEffect(() => {
    setCargando(true);
    asistenciasDeUsuario(usuario.id, { desde, hasta })
      .then((datos) => {
        setFilas(datos);
        setError("");
      })
      .catch((falla) => setError(falla.message))
      .finally(() => setCargando(false));
  }, [usuario.id, desde, hasta]);

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Mi historial</h1>
          <p className="mt-1 text-sm text-muted-foreground">{metricas ? mensajeMotivacion(metricas.racha_actual) : "Tus visitas al gimnasio."}</p>
        </div>
        <Link to="/checkin" className="text-sm text-link hover:underline">
          Registrar entrada
        </Link>
      </div>

      {error && (
        <Alert variant="error" className="mt-6">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </Alert>
      )}

      {metricas && (
        <div className="mt-6">
          <TarjetasConstancia metricas={metricas} />
        </div>
      )}

      <div className="mt-6 grid max-w-md gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="desde">Desde</Label>
          <Input id="desde" type="date" value={desde} max={hasta || undefined} onChange={(e) => setDesde(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="hasta">Hasta</Label>
          <Input id="hasta" type="date" value={hasta} min={desde || undefined} onChange={(e) => setHasta(e.target.value)} />
        </div>
      </div>

      <Card className="mt-4">
        {cargando ? (
          <p role="status" className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            Cargando tu historial…
          </p>
        ) : filas.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">No hay entradas registradas en ese periodo.</p>
        ) : (
          <TablaAsistencias filas={filas} />
        )}
      </Card>
    </div>
  );
}
