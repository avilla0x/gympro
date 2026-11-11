// Funciones para mostrar datos con formato legible.

// "1995-03-02" -> "02/03/1995". Se separa el texto a mano (en vez de usar `new Date`)
// para que la zona horaria no corra la fecha un día.
export function formatearFecha(fechaIso) {
  if (!fechaIso) return "—";
  const [anio, mes, dia] = fechaIso.slice(0, 10).split("-");
  return `${dia}/${mes}/${anio}`;
}

// "2026-11-01T19:20:00Z" -> "01/11/2026" en la hora local del navegador.
export function formatearFechaHora(fechaHoraIso) {
  if (!fechaHoraIso) return "—";
  return new Date(fechaHoraIso).toLocaleDateString("es-CO");
}

// 90000 -> "$ 90.000". Pesos colombianos, sin decimales.
const formateadorPesos = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
export function formatearPesos(valor) {
  return formateadorPesos.format(valor);
}

// "2026-11-01T19:20:00Z" -> "02:20 p. m." en la hora local del navegador.
export function formatearHora(fechaHoraIso) {
  if (!fechaHoraIso) return "—";
  return new Date(fechaHoraIso).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
}

// El día de hoy en Colombia como "AAAA-MM-DD" (el formato que usan los filtros de fecha de la API).
// Se fija la zona horaria para que coincida con el servidor sin importar dónde esté el navegador.
export function hoyIso() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }).format(new Date());
}
