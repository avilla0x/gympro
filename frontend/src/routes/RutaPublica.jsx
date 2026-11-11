// Envuelve el login: si la persona YA tiene sesión, no tiene sentido mostrarlo y se la envía a la aplicación.
// También se encarga de llevarla a donde quería ir (o a "/") justo después de iniciar sesión.
import { Navigate, Outlet, useLocation } from "react-router-dom";

import { PantallaCarga } from "@/components/PantallaCarga";
import { useAuth } from "@/context/AuthContext";

export function RutaPublica() {
  const { usuario, cargando } = useAuth();
  const ubicacion = useLocation();

  if (cargando) return <PantallaCarga />;
  if (usuario) {
    // Se conserva también la parte "?codigo=..." (el QR del gimnasio abre /checkin?codigo=...).
    const desde = ubicacion.state?.desde;
    return <Navigate to={desde ? `${desde.pathname}${desde.search ?? ""}` : "/"} replace />;
  }
  return <Outlet />;
}
