// Pruebas de la pantalla "Mi perfil".
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { USUARIOS_PRUEBA, conSesionDe, dibujarApp, llamadas, respuestaApi } from "@/pruebas/ayudas";

// Cada rol entra con sus datos; aquí un cliente completo.
const CLIENTE = {
  ...USUARIOS_PRUEBA.cliente,
  documento: "1010101010",
  telefono: "3000000000",
  fecha_nacimiento: "1995-03-02",
  direccion: null,
  contacto_emergencia_nombre: null,
  contacto_emergencia_telefono: null,
  creado_en: "2026-11-01T10:00:00Z",
};

async function abrir(rutas = {}) {
  USUARIOS_PRUEBA.cliente = CLIENTE; // el servidor simulado devuelve estos datos en /auth/me
  const falso = conSesionDe("cliente", rutas);
  dibujarApp("/perfil");
  await screen.findByRole("heading", { name: "Mi perfil" });
  return falso;
}

describe("Mi perfil · datos de la cuenta", () => {
  it("muestra los datos de identidad en solo lectura", async () => {
    await abrir();

    const cuenta = within(screen.getByText("Datos de tu cuenta").closest("div").parentElement);
    expect(cuenta.getByText("Ana Gómez")).toBeInTheDocument();
    expect(cuenta.getByText("ana@gympro.com")).toBeInTheDocument();
    expect(cuenta.getByText("1010101010")).toBeInTheDocument();
    expect(cuenta.getByText("Cliente")).toBeInTheDocument();
    expect(cuenta.getByText("GP-000001")).toBeInTheDocument();
    expect(screen.getByText(/habla con el administrador/)).toBeInTheDocument();
    // No hay campos para editar el nombre, el correo, el documento ni el rol.
    expect(screen.queryByLabelText(/Nombre completo/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Correo/)).not.toBeInTheDocument();
  });

  it("el menú la marca como la pantalla actual", async () => {
    await abrir();

    expect(screen.getByRole("link", { name: "Mi perfil" })).toHaveAttribute("aria-current", "page");
  });

  it("cualquier rol puede abrirla", async () => {
    for (const rol of ["admin", "entrenador"]) {
      conSesionDe(rol);
      const { unmount } = dibujarApp("/perfil");
      expect(await screen.findByRole("heading", { name: "Mi perfil" })).toBeInTheDocument();
      unmount();
    }
  });
});

describe("Mi perfil · información de contacto", () => {
  it("carga los datos de contacto actuales", async () => {
    await abrir();

    expect(screen.getByLabelText("Teléfono")).toHaveValue("3000000000");
    expect(screen.getByLabelText("Fecha de nacimiento")).toHaveValue("1995-03-02");
    expect(screen.getByLabelText("Dirección")).toHaveValue("");
  });

  it("'Guardar cambios' está desactivado si no hay cambios", async () => {
    await abrir();

    expect(screen.getByRole("button", { name: "Guardar cambios" })).toBeDisabled();
  });

  it("envía solo lo que cambió y confirma", async () => {
    const falso = await abrir({
      "PATCH /auth/me": () => respuestaApi({ ...CLIENTE, direccion: "Calle 1 # 2-3", contacto_emergencia_nombre: "María Gómez" }),
    });

    await userEvent.type(screen.getByLabelText("Dirección"), "  Calle 1 # 2-3 ");
    await userEvent.type(screen.getByLabelText("Contacto de emergencia"), "María Gómez");
    await userEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(await screen.findByText("Tus datos fueron actualizados.")).toBeInTheDocument();
    expect(llamadas(falso, "/auth/me").find((l) => l.metodo === "PATCH").cuerpo).toEqual({
      direccion: "Calle 1 # 2-3", // sin los espacios sobrantes
      contacto_emergencia_nombre: "María Gómez",
    });
    expect(screen.getByRole("button", { name: "Guardar cambios" })).toBeDisabled(); // ya no hay nada pendiente
  });

  it("vaciar un dato lo envía como null", async () => {
    const falso = await abrir({ "PATCH /auth/me": () => respuestaApi({ ...CLIENTE, telefono: null }) });

    await userEvent.clear(screen.getByLabelText("Teléfono"));
    await userEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await screen.findByText("Tus datos fueron actualizados.");
    expect(llamadas(falso, "/auth/me").find((l) => l.metodo === "PATCH").cuerpo).toEqual({ telefono: null });
  });

  it("muestra el error del servidor", async () => {
    await abrir({ "PATCH /auth/me": () => respuestaApi({ detail: "La fecha de nacimiento no puede ser futura" }, 422) });

    await userEvent.type(screen.getByLabelText("Dirección"), "Calle 1");
    await userEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("La fecha de nacimiento no puede ser futura");
  });
});

describe("Mi perfil · cambiar contraseña", () => {
  const escribir = (etiqueta, texto) => userEvent.type(screen.getByLabelText(etiqueta, { selector: "input" }), texto);
  const boton = () => screen.getByRole("button", { name: "Cambiar contraseña" });

  it("cambia la contraseña con la actual y una nueva válida", async () => {
    const falso = await abrir({ "PUT /auth/password": () => respuestaApi({ mensaje: "Contraseña actualizada." }) });
    expect(boton()).toBeDisabled();

    await escribir("Contraseña actual", "Clave1234");
    await escribir("Contraseña nueva", "NuevaClave9");
    await escribir("Repite la contraseña nueva", "NuevaClave9");
    await userEvent.click(boton());

    expect(await screen.findByText("Contraseña actualizada.")).toBeInTheDocument();
    expect(llamadas(falso, "/auth/password")[0].cuerpo).toEqual({ password_actual: "Clave1234", password_nueva: "NuevaClave9" });
    expect(screen.getByLabelText("Contraseña actual", { selector: "input" })).toHaveValue(""); // los campos se limpian
  });

  it("no deja enviar si la nueva no cumple las reglas o no coincide", async () => {
    await abrir();
    await escribir("Contraseña actual", "Clave1234");

    await escribir("Contraseña nueva", "debil");
    expect(boton()).toBeDisabled();

    await userEvent.clear(screen.getByLabelText("Contraseña nueva", { selector: "input" }));
    await escribir("Contraseña nueva", "NuevaClave9");
    await escribir("Repite la contraseña nueva", "NuevaClave8");
    expect(screen.getByText("Las contraseñas no coinciden.")).toBeInTheDocument();
    expect(boton()).toBeDisabled();
  });

  it("avisa si la contraseña actual es incorrecta", async () => {
    await abrir({ "PUT /auth/password": () => respuestaApi({ detail: "La contraseña actual no es correcta" }, 400) });

    await escribir("Contraseña actual", "Equivocada1");
    await escribir("Contraseña nueva", "NuevaClave9");
    await escribir("Repite la contraseña nueva", "NuevaClave9");
    await userEvent.click(boton());

    expect(await screen.findByRole("alert")).toHaveTextContent("La contraseña actual no es correcta");
  });
});
