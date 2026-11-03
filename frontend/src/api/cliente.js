// Cliente de la API: la ÚNICA función que hace llamadas HTTP al backend.
// Todos los módulos (auth, pagos, asistencia...) usan `peticion`, así el manejo de
// errores y del token está en un solo lugar.
import { borrarToken, leerToken } from "@/api/sesion";

// Dirección del backend. Se puede cambiar con VITE_API_URL en el archivo .env del frontend.
export const URL_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000/api";

// Error con el mensaje listo para mostrar a la persona y el código HTTP (401, 400, 409...).
export class ErrorApi extends Error {
  constructor(mensaje, estado) {
    super(mensaje);
    this.estado = estado;
  }
}

// Función que registra la aplicación para enterarse cuando la sesión caduca (ver AuthContext).
let alSesionExpirada = null;
export function registrarAlSesionExpirada(funcion) {
  alSesionExpirada = funcion;
}

// Convierte el error que responde el backend en un texto legible.
function extraerMensaje(cuerpo) {
  const detalle = cuerpo?.detail;
  if (typeof detalle === "string") return detalle; // errores de reglas de negocio: ya vienen en español
  if (Array.isArray(detalle) && detalle.length > 0) {
    // Errores de validación (422): se muestra el primer motivo sin el prefijo técnico.
    return String(detalle[0].msg ?? "").replace(/^Value error, /, "") || "Revisa los datos ingresados.";
  }
  return "Ocurrió un error inesperado. Intenta de nuevo.";
}

/**
 * Hace una petición a la API.
 *   peticion("/auth/me")                                        -> GET
 *   peticion("/usuarios", { metodo: "POST", cuerpo: {...} })    -> envía JSON
 *   peticion("/auth/login", { metodo: "POST", formulario: {...} }) -> envía un formulario
 * Si la respuesta es un error, lanza un ErrorApi con el mensaje para la persona.
 */
export async function peticion(ruta, { metodo = "GET", cuerpo, formulario } = {}) {
  const encabezados = {};
  const token = leerToken();
  if (token) encabezados.Authorization = `Bearer ${token}`; // así el backend sabe quién es

  let datos;
  if (formulario) {
    datos = new URLSearchParams(formulario); // formato de formulario (lo exige el login)
  } else if (cuerpo !== undefined) {
    encabezados["Content-Type"] = "application/json";
    datos = JSON.stringify(cuerpo);
  }

  let respuesta;
  try {
    respuesta = await fetch(`${URL_BASE}${ruta}`, { method: metodo, headers: encabezados, body: datos });
  } catch {
    // fetch solo falla así cuando no hay conexión con el servidor (apagado, dirección errónea, CORS).
    throw new ErrorApi("No se pudo conectar con el servidor. Verifica que la API esté encendida.", 0);
  }

  const cuerpoRespuesta = await respuesta.json().catch(() => null);

  if (!respuesta.ok) {
    // 401 con token guardado = la sesión caducó o fue cerrada: se limpia y se avisa a la aplicación.
    // (El login también responde 401 si la clave es incorrecta, pero ahí todavía no hay token.)
    if (respuesta.status === 401 && token) {
      borrarToken();
      alSesionExpirada?.();
    }
    throw new ErrorApi(extraerMensaje(cuerpoRespuesta), respuesta.status);
  }
  return cuerpoRespuesta;
}
