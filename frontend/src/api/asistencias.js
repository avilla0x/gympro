// Llamadas de asistencia (check-in, historial y constancia). Ver docs/api.md (sección Asistencia).
import { peticion } from "@/api/cliente";

// Arma "?a=1&b=2" omitiendo los filtros vacíos.
function conFiltros(ruta, filtros = {}) {
  const parametros = new URLSearchParams();
  for (const [clave, valor] of Object.entries(filtros)) {
    if (valor !== "" && valor !== undefined && valor !== null) parametros.set(clave, String(valor));
  }
  const texto = parametros.toString();
  return texto ? `${ruta}?${texto}` : ruta;
}

// El cliente registra su entrada con el texto leído del QR del gimnasio.
export function registrarEntrada(codigo) {
  return peticion("/asistencias/checkin", { metodo: "POST", cuerpo: { codigo } });
}

// Recepción registra la entrada de un cliente (solo administrador).
export function registrarEntradaManual(usuario_id) {
  return peticion("/asistencias/manual", { metodo: "POST", cuerpo: { usuario_id } });
}

// Código del QR fijo y enlace que debe contener (solo administrador): { codigo, url }
export function qrGimnasio() {
  return peticion("/asistencias/qr");
}

// Historial de todos (solo administrador). `filtros`: { usuario_id, desde, hasta, limite }
export function listarAsistencias(filtros = {}) {
  return peticion(conFiltros("/asistencias", filtros));
}

// Historial de un cliente. `filtros`: { desde, hasta, limite }
export function asistenciasDeUsuario(usuarioId, filtros = {}) {
  return peticion(conFiltros(`/usuarios/${usuarioId}/asistencias`, filtros));
}

// Racha y % de cumplimiento de un cliente.
export function metricasDeUsuario(usuarioId) {
  return peticion(`/usuarios/${usuarioId}/asistencia/metricas`);
}
