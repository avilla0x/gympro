// Mapa de pantallas de la aplicación: qué dirección (URL) muestra qué pantalla.
import { Navigate, Route, Routes } from "react-router-dom";

import { AppLayout } from "@/components/AppLayout";
import PaginaAsistencias from "@/pages/PaginaAsistencias";
import PaginaAvisos from "@/pages/PaginaAvisos";
import PaginaCheckin from "@/pages/PaginaCheckin";
import PaginaComprobante from "@/pages/PaginaComprobante";
import PaginaInicio from "@/pages/PaginaInicio";
import PaginaLogin from "@/pages/PaginaLogin";
import PaginaMiHistorial from "@/pages/PaginaMiHistorial";
import PaginaPagarMembresia from "@/pages/PaginaPagarMembresia";
import PaginaPagos from "@/pages/PaginaPagos";
import PaginaPasarela from "@/pages/PaginaPasarela";
import PaginaPerfil from "@/pages/PaginaPerfil";
import PaginaPlanes from "@/pages/PaginaPlanes";
import PaginaRecepcion from "@/pages/PaginaRecepcion";
import PaginaRecuperar from "@/pages/PaginaRecuperar";
import PaginaRestablecer from "@/pages/PaginaRestablecer";
import PaginaSinPermiso from "@/pages/PaginaSinPermiso";
import PaginaUsuarioEditar from "@/pages/PaginaUsuarioEditar";
import PaginaUsuarioNuevo from "@/pages/PaginaUsuarioNuevo";
import PaginaUsuarios from "@/pages/PaginaUsuarios";
import { RutaPorRol } from "@/routes/RutaPorRol";
import { RutaProtegida } from "@/routes/RutaProtegida";
import { RutaPublica } from "@/routes/RutaPublica";

export default function App() {
  return (
    <Routes>
      {/* Pantallas para quien NO ha iniciado sesión */}
      <Route element={<RutaPublica />}>
        <Route path="/login" element={<PaginaLogin />} />
      </Route>
      {/* Recuperar contraseña: abierta a cualquiera (el enlace llega por correo) */}
      <Route path="/recuperar" element={<PaginaRecuperar />} />
      <Route path="/restablecer" element={<PaginaRestablecer />} />

      {/* Pantallas que exigen sesión iniciada. Todas se dibujan dentro del menú lateral (<AppLayout>). */}
      <Route element={<RutaProtegida />}>
        <Route element={<AppLayout />}>
          {/* Pantallas para cualquier rol */}
          <Route path="/" element={<PaginaInicio />} />
          <Route path="/perfil" element={<PaginaPerfil />} />
          <Route path="/sin-permiso" element={<PaginaSinPermiso />} />

          {/* Solo administrador. Los mismos roles que los ítems "Usuarios" y "Planes" de lib/menu.js. */}
          <Route element={<RutaPorRol roles={["admin"]} />}>
            <Route path="/usuarios" element={<PaginaUsuarios />} />
            <Route path="/usuarios/nuevo" element={<PaginaUsuarioNuevo />} />
            <Route path="/usuarios/:id" element={<PaginaUsuarioEditar />} />
            <Route path="/planes" element={<PaginaPlanes />} />
            <Route path="/pagos" element={<PaginaPagos />} />
            <Route path="/recepcion" element={<PaginaRecepcion />} />
            <Route path="/asistencias" element={<PaginaAsistencias />} />
          </Route>

          {/* Solo cliente: pagar su membresía, registrar su entrada (/checkin es la dirección del QR) y ver su historial. */}
          <Route element={<RutaPorRol roles={["cliente"]} />}>
            <Route path="/pagar" element={<PaginaPagarMembresia />} />
            <Route path="/checkin" element={<PaginaCheckin />} />
            <Route path="/mi-historial" element={<PaginaMiHistorial />} />
          </Route>

          {/* Administrador y cliente: la pasarela simulada y el comprobante (el servidor valida de quién es cada pago). */}
          <Route element={<RutaPorRol roles={["admin", "cliente"]} />}>
            <Route path="/avisos" element={<PaginaAvisos />} />
            <Route path="/pasarela/:id" element={<PaginaPasarela />} />
            <Route path="/pagos/:id/comprobante" element={<PaginaComprobante />} />
          </Route>

          {/* Las pantallas de las próximas HU se agregan aquí, junto con su ítem en lib/menu.js.
              Ejemplo:
              <Route element={<RutaPorRol roles={["entrenador"]} />}>
                <Route path="/rutinas" element={<PaginaRutinas />} />
              </Route>
          */}
        </Route>
      </Route>

      {/* Cualquier otra dirección vuelve al inicio */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
