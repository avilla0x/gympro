// Aviso destacado (errores, confirmaciones). role="alert" hace que los lectores de pantalla lo anuncien.
// Para avisos que no son urgentes se puede reemplazar: <Alert role="note">.
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils";

const estilosAviso = cva("flex items-start gap-3 rounded-md border px-4 py-3 text-sm", {
  variants: {
    variant: {
      error: "border-destructive/40 bg-destructive/10 text-destructive",
      exito: "border-success/40 bg-success/10 text-success",
      info: "border-border bg-muted text-muted-foreground",
    },
  },
  defaultVariants: { variant: "info" },
});

export function Alert({ className, variant, ...props }) {
  return <div role="alert" className={cn(estilosAviso({ variant }), className)} {...props} />;
}
