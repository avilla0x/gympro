// Atajos para escribir pruebas: dibujar una pantalla con todo lo que necesita y simular al servidor.
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";

import App from "@/App";
import { AuthProvider } from "@/context/AuthContext";
import { TemaProvider } from "@/context/TemaContext";

// Dibuja la aplicación completa en la dirección indicada (sin navegador real).
export function dibujarApp(ruta = "/") {
  return render(
    <MemoryRouter initialEntries={[ruta]}>
      <TemaProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </TemaProvider>
    </MemoryRouter>,
  );
}

// Respuesta simulada del servidor.
export function respuestaApi(cuerpo, estado = 200) {
  return { ok: estado >= 200 && estado < 300, status: estado, json: async () => cuerpo };
}

// Reemplaza `fetch` por una versión falsa. `rutas` dice qué responder a cada dirección:
//   simularServidor({ "/auth/login": () => respuestaApi({...}) })
// Se puede distinguir por método: { "PUT /usuarios/2": ..., "GET /usuarios/2": ... }
export function simularServidor(rutas) {
  const falso = vi.fn(async (url, opciones = {}) => {
    const ruta = url.replace(/^https?:\/\/[^/]+\/api/, "");
    // Se busca primero la ruta exacta y, si no está, la ruta sin parámetros ("/usuarios?pagina=2" -> "/usuarios").
    const base = ruta.split("?")[0]; // la ruta sin parámetros
    const metodo = opciones.method ?? "GET";
    const manejador = rutas[`${metodo} ${ruta}`] ?? rutas[`${metodo} ${base}`] ?? rutas[ruta] ?? rutas[base];
    if (!manejador) throw new Error(`Prueba: no hay respuesta simulada para ${ruta}`);
    return manejador(opciones, ruta); // el manejador también recibe la ruta completa (con parámetros)
  });
  vi.stubGlobal("fetch", falso);
  return falso;
}

export const USUARIO_PRUEBA = {
  id: 1,
  nombre: "Ana Gómez",
  email: "ana@gympro.com",
  rol: "cliente",
  activo: true,
  codigo: "GP-000001",
};

// Un usuario de prueba por cada rol.
export const USUARIOS_PRUEBA = {
  admin: { id: 1, nombre: "Laura Admin", email: "admin@gympro.com", rol: "admin", activo: true, codigo: null },
  entrenador: { id: 2, nombre: "Carlos Coach", email: "coach@gympro.com", rol: "entrenador", activo: true, codigo: null },
  cliente: { ...USUARIO_PRUEBA },
};

// Deja la aplicación como si esa persona ya tuviera sesión iniciada (token guardado + servidor que lo acepta).
// `rutasExtra` agrega respuestas simuladas para otras direcciones y devuelve el `fetch` falso para inspeccionarlo.
export function conSesionDe(rol, rutasExtra = {}) {
  localStorage.setItem("gympro-token", `token-${rol}`);
  return simularServidor({
    "/auth/me": () => respuestaApi(USUARIOS_PRUEBA[rol]),
    "GET /avisos": () => respuestaApi({ no_leidas: 0, items: [] }), // el menú siempre consulta los avisos
    ...rutasExtra,
  });
}

// Las llamadas que se hicieron a una dirección: [{ metodo, ruta, cuerpo }]. Sirve para verificar qué se envió.
export function llamadas(falso, filtroRuta) {
  return falso.mock.calls
    .map(([url, opciones = {}]) => ({
      metodo: opciones.method ?? "GET",
      ruta: url.replace(/^https?:\/\/[^/]+\/api/, ""),
      cuerpo: typeof opciones.body === "string" ? JSON.parse(opciones.body) : opciones.body,
    }))
    .filter((llamada) => !filtroRuta || llamada.ruta.startsWith(filtroRuta));
}
