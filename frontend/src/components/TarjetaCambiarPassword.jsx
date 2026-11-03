// Tarjeta para que cada persona cambie SU contraseña (pide la actual por seguridad).
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { useState } from "react";

import { cambiarMiPassword } from "@/api/auth";
import { Campo } from "@/components/Campo";
import { CampoPassword } from "@/components/CampoPassword";
import { RequisitosPassword } from "@/components/RequisitosPassword";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { evaluarPassword } from "@/lib/password";

export function TarjetaCambiarPassword() {
  const [actual, setActual] = useState("");
  const [nueva, setNueva] = useState("");
  const [confirmacion, setConfirmacion] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const [listo, setListo] = useState(false);

  const coinciden = nueva === confirmacion;
  const puedeEnviar = actual !== "" && evaluarPassword(nueva).valida && coinciden && !enviando;

  async function manejarEnvio(evento) {
    evento.preventDefault();
    setError("");
    setListo(false);
    setEnviando(true);
    try {
      await cambiarMiPassword(actual, nueva);
      setListo(true);
      setActual("");
      setNueva("");
      setConfirmacion("");
    } catch (falla) {
      setError(falla.message); // ej. "La contraseña actual no es correcta"
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cambiar contraseña</CardTitle>
        <CardDescription>Por seguridad, escribe primero tu contraseña actual.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={manejarEnvio} className="max-w-sm space-y-4" noValidate>
          {error && (
            <Alert variant="error">
              <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <span>{error}</span>
            </Alert>
          )}
          {listo && (
            <Alert variant="exito">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <span>Contraseña actualizada.</span>
            </Alert>
          )}
          <Campo id="password_actual" etiqueta="Contraseña actual">
            <CampoPassword id="password_actual" value={actual} onChange={(e) => setActual(e.target.value)} autoComplete="current-password" />
          </Campo>
          <Campo id="password_nueva" etiqueta="Contraseña nueva">
            <CampoPassword id="password_nueva" value={nueva} onChange={(e) => setNueva(e.target.value)} autoComplete="new-password" />
          </Campo>
          <RequisitosPassword password={nueva} />
          <Campo id="password_confirmacion" etiqueta="Repite la contraseña nueva" error={confirmacion !== "" && !coinciden ? "Las contraseñas no coinciden." : undefined}>
            <CampoPassword
              id="password_confirmacion"
              value={confirmacion}
              onChange={(e) => setConfirmacion(e.target.value)}
              autoComplete="new-password"
              aria-invalid={confirmacion !== "" && !coinciden}
            />
          </Campo>
          <Button type="submit" disabled={!puedeEnviar}>
            {enviando && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
            Cambiar contraseña
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
