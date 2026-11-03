// Protege las pantallas que exigen sesión iniciada: quien no la tenga es enviado al login.
// Se usa en App.jsx envolviendo las rutas privadas.
//
// OJO: aquí solo se revisa que HAYA sesión. El control por ROL (qué pantallas ve cada tipo
// de usuario) se agrega en la subtarea "Roles y permisos". La seguridad real siempre la
// aplica el backend; esto solo evita mostrar pantallas que no corresponden.
import { Navigate, Outlet, useLocation } from "react-router-dom";

import { PantallaCarga } from "@/components/PantallaCarga";
import { useAuth } from "@/context/AuthContext";

export function RutaProtegida() {
  const { usuario, cargando } = useAuth();
  const ubicacion = useLocation();

  if (cargando) return <PantallaCarga />; // todavía se verifica el token guardado
  if (!usuario) {
    // `state.desde` recuerda a dónde quería ir, para llevarlo allí después de iniciar sesión.
    return <Navigate to="/login" replace state={{ desde: ubicacion }} />;
  }
  return <Outlet />; // <Outlet /> = "aquí se dibuja la pantalla hija"
}
