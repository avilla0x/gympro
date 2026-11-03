// Llamadas de autenticación. Corresponden a los endpoints de docs/api.md (sección Autenticación).
import { peticion } from "@/api/cliente";

// El backend recibe el login como formulario: el campo "username" lleva el correo.
export function login(email, password) {
  return peticion("/auth/login", { metodo: "POST", formulario: { username: email, password } });
}

// Datos de la persona dueña de la sesión actual.
export function obtenerMiPerfil() {
  return peticion("/auth/me");
}

// Pide el enlace para cambiar la contraseña olvidada.
export function solicitarRecuperacion(email) {
  return peticion("/auth/recuperar", { metodo: "POST", cuerpo: { email } });
}

// Cambia la contraseña usando el token del enlace recibido.
export function restablecerPassword(token, passwordNueva) {
  return peticion("/auth/restablecer", { metodo: "POST", cuerpo: { token, password_nueva: passwordNueva } });
}

// Cada persona edita SUS datos de contacto (teléfono, dirección, fecha de nacimiento, contacto de emergencia).
export function actualizarMiPerfil(datos) {
  return peticion("/auth/me", { metodo: "PATCH", cuerpo: datos });
}

// Cambia la contraseña de quien tiene la sesión iniciada (pide la actual por seguridad).
export function cambiarMiPassword(passwordActual, passwordNueva) {
  return peticion("/auth/password", {
    metodo: "PUT",
    cuerpo: { password_actual: passwordActual, password_nueva: passwordNueva },
  });
}
