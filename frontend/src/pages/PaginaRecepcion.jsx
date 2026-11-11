// Pantalla «Recepción» (administrador): el QR fijo del gimnasio (para mostrarlo o imprimirlo),
// el registro manual de entradas (respaldo) y las entradas de hoy.
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useCallback, useEffect, useState } from "react";

import { listarAsistencias, qrGimnasio, registrarEntradaManual } from "@/api/asistencias";
import { listarUsuarios } from "@/api/usuarios";
import { TablaAsistencias } from "@/components/TablaAsistencias";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { hoyIso } from "@/lib/formato";

export default function PaginaRecepcion() {
  const [qr, setQr] = useState(null);
  const [clientes, setClientes] = useState([]);
  const [clienteElegido, setClienteElegido] = useState("");
  const [hoy, setHoy] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [registrando, setRegistrando] = useState(false);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");

  const cargarHoy = useCallback(() => {
    const dia = hoyIso();
    return listarAsistencias({ desde: dia, hasta: dia })
      .then(setHoy)
      .catch((falla) => setError(falla.message))
      .finally(() => setCargando(false));
  }, []);

  useEffect(() => {
    qrGimnasio()
      .then(setQr)
      .catch((falla) => setError(falla.message));
    listarUsuarios({ rol: "cliente", activo: "true", por_pagina: 100 })
      .then((r) => setClientes(r.items))
      .catch((falla) => setError(falla.message));
    cargarHoy();
  }, [cargarHoy]);

  async function registrar(evento) {
    evento.preventDefault();
    setRegistrando(true);
    setError("");
    setAviso("");
    try {
      const entrada = await registrarEntradaManual(Number(clienteElegido));
      setAviso(`Entrada registrada: ${entrada.usuario_nombre}.`);
      setClienteElegido("");
      await cargarHoy();
    } catch (falla) {
      setError(falla.message); // ej. «Tu membresía venció el …»: recepción ve el motivo del rechazo
    } finally {
      setRegistrando(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-bold tracking-tight">Recepción</h1>
      <p className="mt-1 text-sm text-muted-foreground">Registro de entradas al gimnasio.</p>

      {error && (
        <Alert variant="error" className="mt-6">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </Alert>
      )}
      {aviso && (
        <Alert variant="exito" role="status" className="mt-6">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>{aviso}</span>
        </Alert>
      )}

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>QR de la entrada</CardTitle>
            <CardDescription>Los clientes lo escanean con su celular para registrar su asistencia. Imprímelo o muéstralo en pantalla.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-3">
            {qr ? (
              <>
                {/* Fondo blanco fijo: un QR necesita contraste aunque la página esté en modo oscuro. */}
                <div className="rounded-lg bg-white p-4">
                  <QRCodeSVG value={qr.url} size={200} title="QR de entrada de GymPro" />
                </div>
                <p className="text-sm">
                  Código: <strong>{qr.codigo}</strong>
                </p>
              </>
            ) : (
              <Loader2 className="size-5 animate-spin text-muted-foreground" aria-label="Cargando el QR" />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Registrar entrada a mano</CardTitle>
            <CardDescription>Para un cliente que no puede escanear. Se aplica la misma regla: sin membresía vigente no entra.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={registrar} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="cliente-manual">Cliente</Label>
                <Select id="cliente-manual" value={clienteElegido} onChange={(e) => setClienteElegido(e.target.value)}>
                  <option value="">Selecciona un cliente…</option>
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                      {c.codigo ? ` (${c.codigo})` : ""}
                    </option>
                  ))}
                </Select>
              </div>
              <Button type="submit" disabled={!clienteElegido || registrando}>
                {registrando && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
                Registrar entrada
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <h2 className="mt-8 text-lg font-semibold">Entradas de hoy</h2>
      <Card className="mt-3">
        {cargando ? (
          <p role="status" className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            Cargando entradas…
          </p>
        ) : hoy.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">Todavía no hay entradas hoy.</p>
        ) : (
          <>
            <p className="px-4 pt-4 text-sm text-muted-foreground">{hoy.length} entrada{hoy.length === 1 ? "" : "s"} hoy</p>
            <TablaAsistencias filas={hoy} mostrarCliente />
          </>
        )}
      </Card>
    </div>
  );
}
