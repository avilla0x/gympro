// Menú lateral: la lista de secciones según el rol, más los datos de la persona y el botón de salir.
import { LogOut } from "lucide-react";
import { NavLink } from "react-router-dom";

import { Logo } from "@/components/Logo";
import { ToggleTema } from "@/components/ToggleTema";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { useAvisos } from "@/context/AvisosContext";
import { itemsParaRol } from "@/lib/menu";
import { ETIQUETAS_ROL } from "@/lib/roles";
import { cn } from "@/lib/utils";

export function MenuLateral() {
  const { usuario, cerrarSesion } = useAuth();
  const items = itemsParaRol(usuario.rol);
  const { noLeidas } = useAvisos(); // contador de avisos sin leer (junto a «Avisos»)

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 shrink-0 items-center border-b px-5">
        <Logo />
      </div>

      <nav aria-label="Menú principal" className="flex-1 space-y-1 overflow-y-auto p-3">
        {items.map((item) => {
          const Icono = item.icono;

          // Pantalla todavía no construida: se muestra deshabilitada, con la etiqueta "Pronto".
          if (!item.disponible) {
            return (
              <div
                key={item.ruta}
                aria-disabled="true"
                title="Disponible próximamente"
                className="flex cursor-not-allowed items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground/60"
              >
                <Icono className="size-4 shrink-0" aria-hidden="true" />
                <span className="flex-1">{item.etiqueta}</span>
                <span className="rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide">Pronto</span>
              </div>
            );
          }

          return (
            <NavLink
              key={item.ruta}
              to={item.ruta}
              end={item.ruta === "/"} // "Inicio" solo se marca activo en "/" y no en cualquier ruta que empiece por "/"
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium outline-none transition-colors",
                  "focus-visible:ring-2 focus-visible:ring-ring",
                  isActive ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted",
                )
              }
            >
              <Icono className="size-4 shrink-0" aria-hidden="true" />
              <span className="flex-1">{item.etiqueta}</span>
              {item.ruta === "/avisos" && noLeidas > 0 && (
                <span
                  aria-label={`${noLeidas} sin leer`}
                  className="min-w-5 rounded-full bg-destructive px-1.5 text-center text-[11px] font-semibold leading-5 text-white"
                >
                  {noLeidas}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className="shrink-0 space-y-3 border-t p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{usuario.nombre}</p>
            <p className="text-xs text-muted-foreground">{ETIQUETAS_ROL[usuario.rol] ?? usuario.rol}</p>
          </div>
          <ToggleTema />
        </div>
        <Button variant="outline" size="sm" className="w-full" onClick={cerrarSesion}>
          <LogOut className="size-4" aria-hidden="true" />
          Cerrar sesión
        </Button>
      </div>
    </div>
  );
}
