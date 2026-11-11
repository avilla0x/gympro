// Textos y ayudas de la asistencia, compartidos por las pantallas.

export const ETIQUETAS_METODO_CHECKIN = { qr: "Código QR", manual: "Recepción" };

// 0 -> "Sin racha", 1 -> "1 día", 5 -> "5 días"
export function textoRacha(dias) {
  if (!dias) return "Sin racha";
  return dias === 1 ? "1 día" : `${dias} días`;
}

// Mensaje corto según la racha, para motivar al cliente.
export function mensajeMotivacion(racha) {
  if (racha >= 7) return "¡Increíble constancia! Sigue así.";
  if (racha >= 3) return "¡Vas muy bien, no rompas la racha!";
  if (racha >= 1) return "¡Buen comienzo! Vuelve mañana para sumar.";
  return "Hoy es un buen día para empezar tu racha.";
}
