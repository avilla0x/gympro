// Tarjeta para que el ADMINISTRADOR defina una contraseña temporal a otra persona
// (por ejemplo, un cliente que la olvidó y no tiene acceso a su correo).
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { useState } from "react";

import { definirPasswordTemporal } from "@/api/usuarios";
import { Campo } from "@/components/Campo";
import { CampoPassword } from "@/components/CampoPassword";
import { RequisitosPassword } from "@/components/RequisitosPassword";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { evaluarPassword } from "@/lib/password";

export function TarjetaPasswordTemporal({ usuario }) {
  const [password, setPassword] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const [listo, setListo] = useState(false);

  async function manejarEnvio(evento) {
    evento.preventDefault();
    setError("");
    setListo(false);
    setEnviando(true);
    try {
      await definirPasswordTemporal(usuario.id, password);
      setListo(true);
      setPassword("");
    } catch (falla) {
      setError(falla.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Contraseña temporal</CardTitle>
        <CardDescription>
          Define una contraseña nueva para {usuario.nombre}. Compártesela de forma segura y pídele que la cambie al entrar desde «Mi perfil».
        </CardDescription>
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
          <Campo id="password_temporal" etiqueta="Contraseña temporal">
            <CampoPassword id="password_temporal" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
          </Campo>
          <RequisitosPassword password={password} />
          <Button type="submit" disabled={enviando || !evaluarPassword(password).valida}>
            {enviando && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
            Definir contraseña
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
