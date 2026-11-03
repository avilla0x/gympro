// Diseño de la aplicación para quien ya inició sesión: menú lateral a la izquierda y la pantalla a la derecha.
// En celulares el menú se esconde y se abre con el botón de las tres rayas.
import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";

import { Logo } from "@/components/Logo";
import { MenuLateral } from "@/components/MenuLateral";
import { Button } from "@/components/ui/button";
import { AvisosProvider } from "@/context/AvisosContext";
import { cn } from "@/lib/utils";

export function AppLayout() {
  const [menuAbierto, setMenuAbierto] = useState(false); // solo importa en celulares
  const ubicacion = useLocation();

  // Al cambiar de pantalla, el menú del celular se cierra solo.
  useEffect(() => {
    setMenuAbierto(false);
  }, [ubicacion.pathname]);

  // Con el menú abierto, la tecla Escape lo cierra.
  useEffect(() => {
    if (!menuAbierto) return;
    const alPresionar = (evento) => evento.key === "Escape" && setMenuAbierto(false);
    document.addEventListener("keydown", alPresionar);
    return () => document.removeEventListener("keydown", alPresionar);
  }, [menuAbierto]);

  return (
    <AvisosProvider>
    <div className="min-h-svh lg:flex">
      {/* Barra superior: solo en celulares */}
      <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b bg-background px-4 lg:hidden print:hidden">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMenuAbierto(true)}
          aria-label="Abrir menú"
          aria-expanded={menuAbierto}
          aria-controls="menu-lateral"
        >
          <Menu className="size-5" />
        </Button>
        <Logo />
        <span className="size-9" aria-hidden="true" /> {/* espacio para centrar el logo */}
      </header>

      {/* Fondo oscuro detrás del menú abierto (celulares): al tocarlo se cierra */}
      {menuAbierto && <div className="fixed inset-0 z-30 bg-black/60 lg:hidden" onClick={() => setMenuAbierto(false)} aria-hidden="true" />}

      {/* Menú lateral: fijo a la izquierda en pantallas grandes; deslizable en celulares */}
      <aside
        id="menu-lateral"
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 border-r bg-card transition-transform duration-200 print:hidden",
          "lg:sticky lg:top-0 lg:z-auto lg:h-svh lg:shrink-0 lg:translate-x-0",
          menuAbierto ? "translate-x-0" : "-translate-x-full max-lg:invisible", // cerrado: fuera de pantalla y sin foco
        )}
      >
        {menuAbierto && (
          <Button variant="ghost" size="icon" className="absolute right-2 top-3 lg:hidden" onClick={() => setMenuAbierto(false)} aria-label="Cerrar menú">
            <X className="size-5" />
          </Button>
        )}
        <MenuLateral />
      </aside>

      {/* Aquí se dibuja la pantalla elegida */}
      <main className="min-w-0 flex-1 px-5 py-8 sm:px-8 lg:px-10">
        <Outlet />
      </main>
    </div>
    </AvisosProvider>
  );
}
