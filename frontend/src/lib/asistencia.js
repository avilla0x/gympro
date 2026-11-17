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

const NOMBRES_MES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

// Datos para dibujar el calendario del mes de una fecha "AAAA-MM-DD".
// `huecos` = casillas vacías antes del día 1 (la semana empieza en lunes).
export function armarMes(fechaIso) {
  const [anio, mes] = fechaIso.split("-").map(Number);
  const cantidadDias = new Date(anio, mes, 0).getDate(); // día 0 del mes siguiente = último de este
  const primerDiaSemana = new Date(anio, mes - 1, 1).getDay(); // 0 = domingo
  const dias = Array.from({ length: cantidadDias }, (_, i) => `${anio}-${String(mes).padStart(2, "0")}-${String(i + 1).padStart(2, "0")}`);
  return { titulo: `${NOMBRES_MES[mes - 1]} de ${anio}`, huecos: (primerDiaSemana + 6) % 7, dias, primero: dias[0] };
}
