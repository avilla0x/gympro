// Guarda el token de la sesión en el navegador para que la persona siga dentro al recargar la página.
//
// Se usa localStorage (queda guardado hasta cerrar sesión). Trade-off: si algún día hubiera
// una falla de seguridad que permita ejecutar código ajeno en la página, ese código podría
// leer el token. Para este proyecto es una decisión razonable y sencilla (ver docs/decisiones.md D14).
//
// Todo va dentro de try/catch porque algunos navegadores (modo privado, políticas estrictas)
// bloquean localStorage; en ese caso la sesión simplemente no se recuerda.
const CLAVE_TOKEN = "gympro-token";

export function leerToken() {
  try {
    return localStorage.getItem(CLAVE_TOKEN);
  } catch {
    return null;
  }
}

export function guardarToken(token) {
  try {
    localStorage.setItem(CLAVE_TOKEN, token);
  } catch {
    /* sin almacenamiento: la sesión no se recordará al recargar */
  }
}

export function borrarToken() {
  try {
    localStorage.removeItem(CLAVE_TOKEN);
  } catch {
    /* nada que borrar */
  }
}
