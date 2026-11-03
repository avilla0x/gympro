// Utilidad para combinar clases de Tailwind sin que se pisen entre sí.
// Ejemplo: cn("px-2", condicion && "px-4") -> "px-4" (se queda solo la última).
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...clases) {
  return twMerge(clsx(clases));
}
