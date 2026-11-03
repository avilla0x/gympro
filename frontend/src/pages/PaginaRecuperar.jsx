// Pantalla "Olvidé mi contraseña": pide el correo y solicita el enlace de recuperación.
import { AlertCircle, ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

import { solicitarRecuperacion } from "@/api/auth";
import { LayoutAuth } from "@/components/LayoutAuth";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function PaginaRecuperar() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [mensajeEnviado, setMensajeEnviado] = useState(""); // si tiene texto, se muestra la confirmación

  async function manejarEnvio(evento) {
    evento.preventDefault();
    setError("");
    setEnviando(true);
    try {
      const respuesta = await solicitarRecuperacion(email.trim());
      // El backend responde lo mismo exista o no el correo (así no se revela qué correos están registrados).
      setMensajeEnviado(respuesta.mensaje);
    } catch (falla) {
      setError(falla.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <LayoutAuth titulo="Recupera tu contraseña" descripcion="Escribe tu correo y te enviaremos un enlace para elegir una contraseña nueva.">
      {mensajeEnviado ? (
        <div className="space-y-5">
          <Alert variant="exito">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span>{mensajeEnviado}</span>
          </Alert>
          {/* import.meta.env.DEV es verdadero solo al desarrollar (npm run dev), nunca en la versión final */}
          {import.meta.env.DEV && (
            <Alert variant="info" role="note">
              <span>
                <strong>Modo desarrollo:</strong> todavía no se envían correos. El enlace aparece en la consola del
                servidor (la terminal donde corre <code>uvicorn</code>).
              </span>
            </Alert>
          )}
          <Button asChild variant="outline" className="w-full">
            <Link to="/login">Volver a iniciar sesión</Link>
          </Button>
        </div>
      ) : (
        <form onSubmit={manejarEnvio} className="space-y-5" noValidate>
          {error && (
            <Alert variant="error">
              <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <span>{error}</span>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Correo electrónico</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="tucorreo@ejemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
          </div>

          <Button type="submit" className="w-full" size="lg" disabled={enviando || !email}>
            {enviando && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
            {enviando ? "Enviando…" : "Enviar enlace"}
          </Button>

          <Link to="/login" className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" aria-hidden="true" />
            Volver a iniciar sesión
          </Link>
        </form>
      )}
    </LayoutAuth>
  );
}
