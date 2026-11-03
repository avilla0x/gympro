// Llamadas de avisos (notificaciones) y seguimiento de vencimientos. Ver docs/api.md.
import { peticion } from "@/api/cliente";

// Mis avisos más recientes: { no_leidas, items }
export function listarAvisos() {
  return peticion("/avisos");
}

export function marcarAvisoLeido(id) {
  return peticion(`/avisos/${id}/leer`, { metodo: "POST" });
}

export function marcarTodosLeidos() {
  return peticion("/avisos/leer-todos", { metodo: "POST" });
}

// Solo administrador: revisa los vencimientos y crea los avisos de hoy. Devuelve cuántos creó de cada tipo.
export function generarAvisos() {
  return peticion("/avisos/generar", { metodo: "POST" });
}

// Solo administrador: clientes por vencer y en mora.
export function seguimientoVencimientos() {
  return peticion("/vencimientos");
}
