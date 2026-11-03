// Pantalla a la que llega la persona desde el enlace del correo: /restablecer?token=...
// Aquí elige su contraseña nueva.
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { restablecerPassword } from "@/api/auth";
import { CampoPassword } from "@/components/CampoPassword";
import { LayoutAuth } from "@/components/LayoutAuth";
import { RequisitosPassword } from "@/components/RequisitosPassword";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { evaluarPassword } from "@/lib/password";

export default function PaginaRestablecer() {
  const [parametros] = useSearchParams();
  const token = parametros.get("token"); // viene en la dirección: ...?token=XXXX

  const [password, setPassword] = useState("");
  const [confirmacion, setConfirmacion] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [listo, setListo] = useState(false);

  const coinciden = password === confirmacion;
  const puedeEnviar = evaluarPassword(password).valida && coinciden && !enviando;

  async function manejarEnvio(evento) {
    evento.preventDefault();
    setError("");
    setEnviando(true);
    try {
      await restablecerPassword(token, password);
      setListo(true);
    } catch (falla) {
      setError(falla.message); // ej. "El enlace no es válido o ya venció. Solicita uno nuevo."
    } finally {
      setEnviando(false);
    }
  }

  // Caso 1: se abrió la pantalla sin el token (dirección incompleta).
  if (!token) {
    return (
      <LayoutAuth titulo="Enlace no válido">
        <div className="space-y-5">
          <Alert variant="error">
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span>Este enlace está incompleto. Solicita uno nuevo para cambiar tu contraseña.</span>
          </Alert>
          <Button asChild className="w-full">
            <Link to="/recuperar">Solicitar un enlace nuevo</Link>
          </Button>
        </div>
      </LayoutAuth>
    );
  }

  // Caso 2: la contraseña se cambió con éxito.
  if (listo) {
    return (
      <LayoutAuth titulo="¡Contraseña actualizada!">
        <div className="space-y-5">
          <Alert variant="exito">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span>Ya puedes iniciar sesión con tu contraseña nueva.</span>
          </Alert>
          <Button asChild className="w-full" size="lg">
            <Link to="/login">Ir a iniciar sesión</Link>
          </Button>
        </div>
      </LayoutAuth>
    );
  }

  // Caso 3: formulario para elegir la contraseña nueva.
  return (
    <LayoutAuth titulo="Elige tu contraseña nueva" descripcion="Debe cumplir los requisitos de seguridad que ves abajo.">
      <form onSubmit={manejarEnvio} className="space-y-5" noValidate>
        {error && (
          <Alert variant="error">
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span>
              {error}{" "}
              <Link to="/recuperar" className="font-medium underline">
                Solicitar un enlace nuevo
              </Link>
            </span>
          </Alert>
        )}

        <div className="space-y-2">
          <Label htmlFor="password">Contraseña nueva</Label>
          <CampoPassword
            id="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoFocus
          />
          <RequisitosPassword password={password} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmacion">Repite la contraseña</Label>
          <CampoPassword
            id="confirmacion"
            autoComplete="new-password"
            value={confirmacion}
            onChange={(e) => setConfirmacion(e.target.value)}
            aria-invalid={confirmacion !== "" && !coinciden}
            required
          />
          {confirmacion !== "" && !coinciden && <p className="text-xs text-destructive">Las contraseñas no coinciden.</p>}
        </div>

        <Button type="submit" className="w-full" size="lg" disabled={!puedeEnviar}>
          {enviando && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
          {enviando ? "Guardando…" : "Guardar contraseña"}
        </Button>
      </form>
    </LayoutAuth>
  );
}
