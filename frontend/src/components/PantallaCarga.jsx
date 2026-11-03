// Pantalla mostrada mientras se verifica la sesión guardada al abrir la aplicación.
import { Loader2 } from "lucide-react";

export function PantallaCarga() {
  return (
    // role="status": los lectores de pantalla anuncian el mensaje sin interrumpir
    <div role="status" className="flex min-h-svh items-center justify-center text-muted-foreground">
      <Loader2 className="size-6 animate-spin" aria-hidden="true" />
      <span className="sr-only">Cargando…</span>
    </div>
  );
}
