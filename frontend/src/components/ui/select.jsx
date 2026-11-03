// Lista desplegable (el <select> del navegador con el estilo de GymPro).
// Se usa igual que un <select> normal:
//   <Select value={rol} onChange={(e) => setRol(e.target.value)}>
//     <option value="">Todos</option>
//   </Select>
import { cn } from "@/lib/utils";

export function Select({ className, children, ...props }) {
  return (
    <select
      className={cn(
        "flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm text-foreground",
        "outline-none transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40",
        "aria-invalid:border-destructive disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}
