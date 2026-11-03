// Logo provisional de GymPro: un ícono de mancuerna sobre naranja + el nombre.
// Cuando el gimnasio entregue su logo oficial, solo hay que reemplazar el contenido de este archivo.
import { Dumbbell } from "lucide-react";

import { cn } from "@/lib/utils";

export function Logo({ className }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
        <Dumbbell className="size-5" strokeWidth={2.5} aria-hidden="true" />
      </span>
      <span className="text-xl font-extrabold tracking-tight">
        Gym<span className="text-link">Pro</span>
      </span>
    </div>
  );
}
