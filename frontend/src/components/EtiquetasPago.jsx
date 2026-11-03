// Etiquetas de color para el estado de un pago y el estado de una membresía.
import { Badge } from "@/components/ui/badge";
import {
  ETIQUETAS_ESTADO_MEMBRESIA,
  ETIQUETAS_ESTADO_PAGO,
  VARIANTE_ESTADO_MEMBRESIA,
  VARIANTE_ESTADO_PAGO,
} from "@/lib/pagos";

export function EtiquetaEstadoPago({ estado }) {
  return <Badge variant={VARIANTE_ESTADO_PAGO[estado]}>{ETIQUETAS_ESTADO_PAGO[estado] ?? estado}</Badge>;
}

export function EtiquetaEstadoMembresia({ estado }) {
  return <Badge variant={VARIANTE_ESTADO_MEMBRESIA[estado]}>{ETIQUETAS_ESTADO_MEMBRESIA[estado] ?? estado}</Badge>;
}
