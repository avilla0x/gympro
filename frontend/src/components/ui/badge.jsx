// Etiqueta pequeña de color (para el rol, el estado activo/desactivado, etc.).
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils";

const estilosEtiqueta = cva("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap", {
  variants: {
    variant: {
      neutro: "border-border bg-muted text-muted-foreground",
      primario: "border-primary/40 bg-primary/10 text-link",
      exito: "border-success/40 bg-success/10 text-success",
      peligro: "border-destructive/40 bg-destructive/10 text-destructive",
    },
  },
  defaultVariants: { variant: "neutro" },
});

export function Badge({ className, variant, ...props }) {
  return <span className={cn(estilosEtiqueta({ variant }), className)} {...props} />;
}
