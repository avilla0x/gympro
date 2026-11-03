// Botón para cambiar entre modo claro y oscuro.
import { Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useTema } from "@/context/TemaContext";

export function ToggleTema() {
  const { tema, alternarTema } = useTema();
  const esOscuro = tema === "dark";

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={alternarTema}
      // aria-label: texto que leen los lectores de pantalla (el botón solo tiene un ícono)
      aria-label={esOscuro ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      title={esOscuro ? "Modo claro" : "Modo oscuro"}
    >
      {esOscuro ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </Button>
  );
}
