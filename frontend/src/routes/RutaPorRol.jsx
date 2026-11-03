// Protege pantallas que solo ciertos roles pueden ver. Se usa dentro de una ruta protegida:
//
//   <Route element={<RutaPorRol roles={["admin"]} />}>
//     <Route path="/usuarios" element={<PaginaUsuarios />} />
//   </Route>
//
// Si la persona no tiene alguno de esos roles, ve una pantalla "Sin permiso" (en vez de la pantalla pedida).
// Los `roles` deben ser los MISMOS que se definieron para ese ítem en lib/menu.js.
//
// Recuerda: esto solo mejora la experiencia. El backend es el que realmente impide el acceso a los datos.
import { Outlet } from "react-router-dom";

import { useAuth } from "@/context/AuthContext";
import PaginaSinPermiso from "@/pages/PaginaSinPermiso";

export function RutaPorRol({ roles }) {
  const { tieneRol } = useAuth();

  if (!tieneRol(...roles)) return <PaginaSinPermiso />;
  return <Outlet />;
}
