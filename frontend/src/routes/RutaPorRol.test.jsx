// Pruebas de la protección de pantallas por rol.
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { AppLayout } from "@/components/AppLayout";
import { AuthProvider } from "@/context/AuthContext";
import { TemaProvider } from "@/context/TemaContext";
import { conSesionDe } from "@/pruebas/ayudas";
import { RutaPorRol } from "@/routes/RutaPorRol";
import { RutaProtegida } from "@/routes/RutaProtegida";

// Aplicación mínima con dos pantallas de ejemplo: una solo para administradores y otra para admin o entrenador.
function dibujarRutas(ruta) {
  return render(
    <MemoryRouter initialEntries={[ruta]}>
      <TemaProvider>
        <AuthProvider>
          <Routes>
            <Route element={<RutaProtegida />}>
              <Route element={<AppLayout />}>
                <Route path="/" element={<p>Pantalla de inicio</p>} />
                <Route element={<RutaPorRol roles={["admin"]} />}>
                  <Route path="/solo-admin" element={<p>Panel del administrador</p>} />
                </Route>
                <Route element={<RutaPorRol roles={["admin", "entrenador"]} />}>
                  <Route path="/equipo" element={<p>Pantalla del equipo</p>} />
                </Route>
              </Route>
            </Route>
          </Routes>
        </AuthProvider>
      </TemaProvider>
    </MemoryRouter>,
  );
}

describe("RutaPorRol", () => {
  it("deja pasar al rol permitido", async () => {
    conSesionDe("admin");
    dibujarRutas("/solo-admin");

    expect(await screen.findByText("Panel del administrador")).toBeInTheDocument();
  });

  it("al rol no permitido le muestra 'sin permiso' y NO la pantalla", async () => {
    conSesionDe("cliente");
    dibujarRutas("/solo-admin");

    expect(await screen.findByRole("heading", { name: "No tienes permiso para ver esta sección" })).toBeInTheDocument();
    expect(screen.queryByText("Panel del administrador")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Volver al inicio" })).toHaveAttribute("href", "/");
  });

  it("el entrenador tampoco entra a lo exclusivo del administrador", async () => {
    conSesionDe("entrenador");
    dibujarRutas("/solo-admin");

    expect(await screen.findByRole("heading", { name: "No tienes permiso para ver esta sección" })).toBeInTheDocument();
  });

  it("una pantalla para varios roles deja pasar a cada uno de ellos y bloquea al resto", async () => {
    conSesionDe("entrenador");
    const { unmount } = dibujarRutas("/equipo");
    expect(await screen.findByText("Pantalla del equipo")).toBeInTheDocument();
    unmount();

    conSesionDe("cliente");
    dibujarRutas("/equipo");
    expect(await screen.findByRole("heading", { name: "No tienes permiso para ver esta sección" })).toBeInTheDocument();
  });

  it("sin sesión no se llega ni siquiera a la pantalla de 'sin permiso': se pide iniciar sesión", async () => {
    dibujarRutas("/solo-admin"); // sin token guardado

    expect(screen.queryByText("Panel del administrador")).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "No tienes permiso para ver esta sección" })).not.toBeInTheDocument();
  });
});
