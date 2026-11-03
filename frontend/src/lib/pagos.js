// Textos y colores compartidos por las pantallas de pagos y membresías.

export const ETIQUETAS_ESTADO_MEMBRESIA = {
  al_dia: "Al día",
  por_vencer: "Por vencer",
  en_mora: "En mora",
  sin_membresia: "Sin membresía",
};

export const VARIANTE_ESTADO_MEMBRESIA = {
  al_dia: "exito",
  por_vencer: "primario",
  en_mora: "peligro",
  sin_membresia: "neutro",
};

export const ETIQUETAS_ESTADO_PAGO = {
  pendiente: "Pendiente",
  aprobado: "Aprobado",
  rechazado: "Rechazado",
  anulado: "Anulado",
};

export const VARIANTE_ESTADO_PAGO = {
  pendiente: "primario",
  aprobado: "exito",
  rechazado: "peligro",
  anulado: "neutro",
};

export const ETIQUETAS_METODO = {
  efectivo: "Efectivo",
  transferencia: "Transferencia",
  pasarela: "Pasarela",
};

// "Vence en 5 días", "Vence hoy", "Venció hace 3 días"... a partir de los días restantes que calcula el servidor.
export function textoDiasRestantes(dias) {
  if (dias === null || dias === undefined) return "";
  if (dias === 0) return "Vence hoy";
  if (dias === 1) return "Vence mañana";
  if (dias > 1) return `Vence en ${dias} días`;
  if (dias === -1) return "Venció ayer";
  return `Venció hace ${-dias} días`;
}
