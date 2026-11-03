// Pruebas del flujo de inicio de sesión, usando la aplicación completa y un servidor simulado.
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { leerToken } from "@/api/sesion";
import { USUARIO_PRUEBA, dibujarApp, respuestaApi, simularServidor } from "@/pruebas/ayudas";

describe("Login", () => {
  it("quien no tiene sesión es enviado al login al entrar a la aplicación", async () => {
    dibujarApp("/");

    expect(await screen.findByRole("heading", { name: "Bienvenido de vuelta" })).toBeInTheDocument();
  });

  it("el botón está desactivado hasta que se escriben correo y contraseña", async () => {
    dibujarApp("/login");
    const boton = screen.getByRole("button", { name: "Iniciar sesión" });
    expect(boton).toBeDisabled();

    await userEvent.type(screen.getByLabelText("Correo electrónico"), "ana@gympro.com");
    await userEvent.type(screen.getByLabelText("Contraseña"), "Clave1234");

    expect(boton).toBeEnabled();
  });

  it("con datos correctos guarda la sesión y muestra la pantalla de inicio", async () => {
    const falso = simularServidor({
      "/auth/login": () => respuestaApi({ access_token: "token-123", token_type: "bearer", usuario: USUARIO_PRUEBA }),
    });
    dibujarApp("/login");

    await userEvent.type(screen.getByLabelText("Correo electrónico"), "ana@gympro.com");
    await userEvent.type(screen.getByLabelText("Contraseña"), "Clave1234");
    await userEvent.click(screen.getByRole("button", { name: "Iniciar sesión" }));

    expect(await screen.findByText(/Hola, Ana/)).toBeInTheDocument();
    expect(screen.getByText("GP-000001")).toBeInTheDocument();
    expect(leerToken()).toBe("token-123");
    // El login se envía como formulario con el correo en el campo "username"
    expect(falso.mock.calls[0][1].body.toString()).toBe("username=ana%40gympro.com&password=Clave1234");
  });

  it("con datos incorrectos muestra el mensaje y no guarda sesión", async () => {
    simularServidor({
      "/auth/login": () => respuestaApi({ detail: "Correo o contraseña incorrectos" }, 401),
    });
    dibujarApp("/login");

    await userEvent.type(screen.getByLabelText("Correo electrónico"), "ana@gympro.com");
    await userEvent.type(screen.getByLabelText("Contraseña"), "Equivocada1");
    await userEvent.click(screen.getByRole("button", { name: "Iniciar sesión" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Correo o contraseña incorrectos");
    expect(leerToken()).toBeNull();
    expect(screen.getByRole("button", { name: "Iniciar sesión" })).toBeEnabled(); // puede reintentar
  });

  it("muestra el aviso de conexión cuando el servidor está apagado", async () => {
    simularServidor({
      "/auth/login": () => {
        throw new TypeError("Failed to fetch");
      },
    });
    dibujarApp("/login");

    await userEvent.type(screen.getByLabelText("Correo electrónico"), "ana@gympro.com");
    await userEvent.type(screen.getByLabelText("Contraseña"), "Clave1234");
    await userEvent.click(screen.getByRole("button", { name: "Iniciar sesión" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo conectar con el servidor");
  });

  it("el botón del ojo muestra y oculta la contraseña", async () => {
    dibujarApp("/login");
    const campo = screen.getByLabelText("Contraseña");
    expect(campo).toHaveAttribute("type", "password");

    await userEvent.click(screen.getByRole("button", { name: "Mostrar contraseña" }));
    expect(campo).toHaveAttribute("type", "text");

    await userEvent.click(screen.getByRole("button", { name: "Ocultar contraseña" }));
    expect(campo).toHaveAttribute("type", "password");
  });

  it("con una sesión guardada y vigente entra directo, sin pasar por el login", async () => {
    localStorage.setItem("gympro-token", "token-vigente");
    simularServidor({ "/auth/me": () => respuestaApi(USUARIO_PRUEBA) });
    dibujarApp("/");

    expect(await screen.findByText(/Hola, Ana/)).toBeInTheDocument();
  });

  it("con una sesión guardada pero vencida, vuelve al login y borra el token", async () => {
    localStorage.setItem("gympro-token", "token-vencido");
    simularServidor({ "/auth/me": () => respuestaApi({ detail: "Sesión inválida" }, 401) });
    dibujarApp("/");

    expect(await screen.findByRole("heading", { name: "Bienvenido de vuelta" })).toBeInTheDocument();
    expect(leerToken()).toBeNull();
  });

  it("cerrar sesión devuelve al login", async () => {
    localStorage.setItem("gympro-token", "token-vigente");
    simularServidor({ "/auth/me": () => respuestaApi(USUARIO_PRUEBA) });
    dibujarApp("/");

    await userEvent.click(await screen.findByRole("button", { name: /Cerrar sesión/ }));

    expect(await screen.findByRole("heading", { name: "Bienvenido de vuelta" })).toBeInTheDocument();
    await waitFor(() => expect(leerToken()).toBeNull());
  });
});
