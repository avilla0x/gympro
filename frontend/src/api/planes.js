// Llamadas de los planes de membresía. Corresponden a docs/api.md (sección Planes).
import { peticion } from "@/api/cliente";

// Los tres planes, del más corto al más largo.
export function listarPlanes() {
  return peticion("/planes");
}

// Cambia el precio de un plan (solo administrador). `precio` en pesos, entero.
export function cambiarPrecioPlan(id, precio) {
  return peticion(`/planes/${id}`, { metodo: "PATCH", cuerpo: { precio } });
}
