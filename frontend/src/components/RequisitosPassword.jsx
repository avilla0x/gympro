// Lista que muestra, mientras se escribe, qué requisitos de la contraseña ya se cumplen.
import { Check, Circle } from "lucide-react";

import { cn } from "@/lib/utils";
import { evaluarPassword } from "@/lib/password";

const REQUISITOS = [
  { clave: "largo", texto: "Mínimo 8 caracteres" },
  { clave: "mayuscula", texto: "Una letra mayúscula" },
  { clave: "numero", texto: "Un número" },
];

export function RequisitosPassword({ password }) {
  const estado = evaluarPassword(password);

  return (
    <ul className="space-y-1.5" aria-label="Requisitos de la contraseña">
      {REQUISITOS.map(({ clave, texto }) => {
        const cumplido = estado[clave];
        return (
          <li key={clave} className={cn("flex items-center gap-2 text-xs", cumplido ? "text-success" : "text-muted-foreground")}>
            {cumplido ? <Check className="size-3.5" aria-hidden="true" /> : <Circle className="size-3.5" aria-hidden="true" />}
            {texto}{" "}
            {/* Texto solo para lectores de pantalla: el color no es la única señal */}
            <span className="sr-only">{cumplido ? "(cumplido)" : "(pendiente)"}</span>
          </li>
        );
      })}
    </ul>
  );
}
