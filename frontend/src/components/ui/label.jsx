// Etiqueta de un campo. Al hacer clic en ella se enfoca el campo asociado (accesibilidad).
import * as EtiquetaRadix from "@radix-ui/react-label";

import { cn } from "@/lib/utils";

export function Label({ className, ...props }) {
  return <EtiquetaRadix.Root className={cn("text-sm font-medium leading-none text-foreground", className)} {...props} />;
}
