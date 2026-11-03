// Llamadas de gestión de usuarios. Corresponden a docs/api.md (sección Usuarios).
import { peticion } from "@/api/cliente";

// Lista paginada. `filtros`: { busqueda, rol, activo, pagina, por_pagina } (los vacíos se omiten).
export function listarUsuarios(filtros = {}) {
  const parametros = new URLSearchParams();
  for (const [clave, valor] of Object.entries(filtros)) {
    if (valor !== "" && valor !== undefined && valor !== null) parametros.set(clave, String(valor));
  }
  return peticion(`/usuarios?${parametros.toString()}`);
}

export function obtenerUsuario(id) {
  return peticion(`/usuarios/${id}`);
}

export function crearUsuario(datos) {
  return peticion("/usuarios", { metodo: "POST", cuerpo: datos });
}

export function actualizarUsuario(id, datos) {
  return peticion(`/usuarios/${id}`, { metodo: "PUT", cuerpo: datos });
}

export function cambiarEstadoUsuario(id, activo) {
  return peticion(`/usuarios/${id}/estado`, { metodo: "PATCH", cuerpo: { activo } });
}

// El administrador define una contraseña temporal para otra persona.
export function definirPasswordTemporal(id, passwordNueva) {
  return peticion(`/usuarios/${id}/password`, { metodo: "PUT", cuerpo: { password_nueva: passwordNueva } });
}
