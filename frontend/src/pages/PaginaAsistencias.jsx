// Pantalla «Asistencias» (administrador): historial de entradas de todos los clientes, con filtros por cliente y fechas.
import { AlertCircle, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

import { listarAsistencias } from "@/api/asistencias";
import { listarUsuarios } from "@/api/usuarios";
import { TablaAsistencias } from "@/components/TablaAsistencias";
import { Alert } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

export default function PaginaAsistencias() {
  const [clientes, setClientes] = useState([]);
  const [cliente, setCliente] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [filas, setFilas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    listarUsuarios({ rol: "cliente", por_pagina: 100 })
      .then((r) => setClientes(r.items))
      .catch((falla) => setError(falla.message));
  }, []);

  useEffect(() => {
    setCargando(true);
    listarAsistencias({ usuario_id: cliente, desde, hasta })
      .then((datos) => {
        setFilas(datos);
        setError("");
      })
      .catch((falla) => setError(falla.message))
      .finally(() => setCargando(false));
  }, [cliente, desde, hasta]);

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-bold tracking-tight">Asistencias</h1>
      <p className="mt-1 text-sm text-muted-foreground">Historial de entradas al gimnasio. Se muestran las 200 más recientes.</p>

      {error && (
        <Alert variant="error" className="mt-6">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </Alert>
      )}

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="filtro-cliente">Cliente</Label>
          <Select id="filtro-cliente" value={cliente} onChange={(e) => setCliente(e.target.value)}>
            <option value="">Todos los clientes</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </Select>
        </div>
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
            Cargando asistencias…
          </p>
        ) : filas.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">No hay entradas con esos filtros.</p>
        ) : (
          <>
            <p className="px-4 pt-4 text-sm text-muted-foreground">{filas.length} entrada{filas.length === 1 ? "" : "s"}</p>
            <TablaAsistencias filas={filas} mostrarCliente />
          </>
        )}
      </Card>
    </div>
  );
}
