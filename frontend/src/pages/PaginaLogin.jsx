// Pantalla de inicio de sesión.
// No hay "registro" público: el administrador crea las cuentas (decisión D8 en docs/decisiones.md).
import { AlertCircle, Loader2 } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

import { CampoPassword } from "@/components/CampoPassword";
import { LayoutAuth } from "@/components/LayoutAuth";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";

export default function PaginaLogin() {
  const { iniciarSesion } = useAuth();

  // "Estado" de la pantalla: cada vez que cambia uno, React vuelve a dibujarla.
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function manejarEnvio(evento) {
    evento.preventDefault(); // evita que el navegador recargue la página al enviar el formulario
    setError("");
    setEnviando(true);
    try {
      // Si el login es correcto, AuthContext guarda la sesión y <RutaPublica> envía a la persona
      // a la aplicación automáticamente (no hace falta navegar desde aquí).
      await iniciarSesion(email.trim(), password);
    } catch (falla) {
      setError(falla.message); // mensaje listo para mostrar (ej. "Correo o contraseña incorrectos")
      setEnviando(false);
    }
  }

  return (
    <LayoutAuth titulo="Bienvenido de vuelta" descripcion="Ingresa con tu correo y tu contraseña para continuar.">
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
            autoComplete="username"
            placeholder="tucorreo@ejemplo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={Boolean(error)}
            required
            autoFocus
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Contraseña</Label>
            <Link to="/recuperar" className="text-xs font-medium text-link hover:underline">
              ¿Olvidaste tu contraseña?
            </Link>
          </div>
          <CampoPassword
            id="password"
            autoComplete="current-password"
            placeholder="Tu contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={Boolean(error)}
            required
          />
        </div>

        <Button type="submit" className="w-full" size="lg" disabled={enviando || !email || !password}>
          {enviando && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
          {enviando ? "Ingresando…" : "Iniciar sesión"}
        </Button>

        <p className="text-center text-xs text-muted-foreground">
          ¿Aún no tienes cuenta? Pídele al administrador del gimnasio que te la cree.
        </p>
      </form>
    </LayoutAuth>
  );
}
