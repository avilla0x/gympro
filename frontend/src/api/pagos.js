// Llamadas de pagos y membresías. Corresponden a docs/api.md (sección Planes, membresías y pagos).
import { peticion } from "@/api/cliente";

// Lista de pagos (solo administrador). `filtros`: { usuario_id, estado } (los vacíos se omiten).
export function listarPagos(filtros = {}) {
  const parametros = new URLSearchParams();
  for (const [clave, valor] of Object.entries(filtros)) {
    if (valor !== "" && valor !== undefined && valor !== null) parametros.set(clave, String(valor));
  }
  const texto = parametros.toString();
  return peticion(`/pagos${texto ? `?${texto}` : ""}`);
}

// Pago en efectivo o transferencia, registrado por el administrador (nace aprobado).
export function registrarPagoManual({ usuario_id, plan_id, metodo, referencia }) {
  return peticion("/pagos/manual", { metodo: "POST", cuerpo: { usuario_id, plan_id, metodo, referencia: referencia || null } });
}

// Anula un pago aprobado, con motivo (solo administrador).
export function anularPago(id, motivo) {
  return peticion(`/pagos/${id}/anular`, { metodo: "POST", cuerpo: { motivo } });
}

// Inicia un pago en la pasarela simulada (queda pendiente). El cliente no envía `usuario_id`.
export function iniciarCheckout(plan_id, usuario_id) {
  return peticion("/pagos/checkout", { metodo: "POST", cuerpo: { plan_id, ...(usuario_id ? { usuario_id } : {}) } });
}

// Decide el resultado de un pago pendiente de la pasarela: "aprobado" o "rechazado".
export function simularPago(id, resultado) {
  return peticion(`/pagos/${id}/simular`, { metodo: "POST", cuerpo: { resultado } });
}

export function cancelarPago(id) {
  return peticion(`/pagos/${id}/cancelar`, { metodo: "POST" });
}

// Un pago con los datos del comprobante (documento del cliente y vigencia que otorgó).
export function obtenerPago(id) {
  return peticion(`/pagos/${id}`);
}

// Estado de la membresía de un cliente + su historial de membresías.
export function verMembresia(usuarioId) {
  return peticion(`/usuarios/${usuarioId}/membresia`);
}

export function pagosDeUsuario(usuarioId) {
  return peticion(`/usuarios/${usuarioId}/pagos`);
}
