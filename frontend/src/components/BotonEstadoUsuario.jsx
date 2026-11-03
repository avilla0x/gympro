// Botón para activar o desactivar a un usuario.
// Desactivar pide una confirmación en el mismo lugar (porque le quita el acceso a la persona);
// activar se hace de inmediato.
import { Loader2 } from "lucide-react";
import { useState } from "react";

import { cambiarEstadoUsuario } from "@/api/usuarios";
import { Button } from "@/components/ui/button";

export function BotonEstadoUsuario({ usuario, esUsuarioActual = false, onCambio, onError, size = "sm" }) {
  const [confirmando, setConfirmando] = useState(false);
  const [cambiando, setCambiando] = useState(false);

  async function aplicar(activo) {
    setCambiando(true);
    try {
      onCambio(await cambiarEstadoUsuario(usuario.id, activo));
    } catch (falla) {
      onError?.(falla.message); // ej. "Debe quedar al menos un administrador activo."
    } finally {
      setCambiando(false);
      setConfirmando(false);
    }
  }

  // Nadie puede desactivarse a sí mismo (el servidor tampoco lo permite).
  if (usuario.activo && esUsuarioActual) {
    return (
      <Button variant="ghost" size={size} disabled title="No puedes desactivar tu propia cuenta">
        Desactivar
      </Button>
    );
  }

  if (!usuario.activo) {
    return (
      <Button variant="outline" size={size} onClick={() => aplicar(true)} disabled={cambiando}>
        {cambiando && <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />}
        Activar
      </Button>
    );
  }

  if (confirmando) {
    return (
      <span className="inline-flex items-center gap-2" role="group" aria-label={`Confirmar desactivación de ${usuario.nombre}`}>
        <span className="text-xs text-muted-foreground">¿Desactivar?</span>
        <Button variant="outline" size={size} className="border-destructive/50 text-destructive hover:bg-destructive/10" onClick={() => aplicar(false)} disabled={cambiando}>
          {cambiando && <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />}
          Sí, desactivar
        </Button>
        <Button variant="ghost" size={size} onClick={() => setConfirmando(false)} disabled={cambiando}>
          Cancelar
        </Button>
      </span>
    );
  }

  return (
    <Button variant="ghost" size={size} onClick={() => setConfirmando(true)}>
      Desactivar
    </Button>
  );
}
