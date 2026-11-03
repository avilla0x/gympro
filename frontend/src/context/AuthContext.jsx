// Sesión de la persona que usa el sistema: quién es, su rol, e iniciar / cerrar sesión.
// Cualquier pantalla la consulta con `useAuth()`.
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { login, obtenerMiPerfil } from "@/api/auth";
import { registrarAlSesionExpirada } from "@/api/cliente";
import { borrarToken, guardarToken, leerToken } from "@/api/sesion";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  // "cargando" es verdadero mientras se comprueba si el token guardado todavía sirve.
  // Así evitamos mostrar la pantalla de login por un instante a quien ya tenía sesión.
  const [cargando, setCargando] = useState(() => Boolean(leerToken()));

  const cerrarSesion = useCallback(() => {
    borrarToken();
    setUsuario(null);
  }, []);

  // Si en cualquier petición el backend responde "sesión inválida", se cierra la sesión aquí.
  useEffect(() => {
    registrarAlSesionExpirada(() => setUsuario(null));
  }, []);

  // Al abrir la aplicación: si hay un token guardado, se pide el perfil para confirmar que sigue vigente.
  useEffect(() => {
    if (!leerToken()) return;
    obtenerMiPerfil()
      .then(setUsuario)
      .catch(() => {
        borrarToken(); // token vencido o usuario desactivado
        setUsuario(null);
      })
      .finally(() => setCargando(false));
  }, []);

  const iniciarSesion = useCallback(async (email, password) => {
    const respuesta = await login(email, password); // si falla, lanza ErrorApi y la pantalla lo muestra
    guardarToken(respuesta.access_token);
    setUsuario(respuesta.usuario);
    return respuesta.usuario;
  }, []);

  // ¿La persona con sesión tiene alguno de estos roles? Ej: tieneRol("admin", "entrenador")
  // Sirve para mostrar u ocultar partes de una pantalla. La seguridad real la aplica el backend.
  const tieneRol = useCallback((...roles) => Boolean(usuario) && roles.includes(usuario.rol), [usuario]);

  // Cuando la persona edita su perfil, se actualizan los datos de la sesión sin volver a iniciar sesión.
  const actualizarSesion = useCallback((usuarioNuevo) => setUsuario(usuarioNuevo), []);

  const valor = useMemo(
    () => ({ usuario, cargando, iniciarSesion, cerrarSesion, tieneRol, actualizarSesion }),
    [usuario, cargando, iniciarSesion, cerrarSesion, tieneRol, actualizarSesion],
  );

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const contexto = useContext(AuthContext);
  if (!contexto) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return contexto;
}
