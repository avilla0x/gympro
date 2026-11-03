// Pruebas de las pantallas de recuperación de contraseña.
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { dibujarApp, respuestaApi, simularServidor } from "@/pruebas/ayudas";

describe("Recuperar contraseña (pedir el enlace)", () => {
  it("se llega desde el enlace '¿Olvidaste tu contraseña?' del login", async () => {
    dibujarApp("/login");

    await userEvent.click(screen.getByRole("link", { name: "¿Olvidaste tu contraseña?" }));

    expect(await screen.findByRole("heading", { name: "Recupera tu contraseña" })).toBeInTheDocument();
  });

  it("envía el correo y muestra la confirmación", async () => {
    const falso = simularServidor({
      "/auth/recuperar": () => respuestaApi({ mensaje: "Si el correo está registrado, recibirás un enlace." }),
    });
    dibujarApp("/recuperar");

    await userEvent.type(screen.getByLabelText("Correo electrónico"), "ana@gympro.com");
    await userEvent.click(screen.getByRole("button", { name: "Enviar enlace" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Si el correo está registrado");
    expect(JSON.parse(falso.mock.calls[0][1].body)).toEqual({ email: "ana@gympro.com" });
  });
});

describe("Restablecer contraseña (elegir la nueva)", () => {
  it("sin token en la dirección avisa que el enlace está incompleto", async () => {
    dibujarApp("/restablecer");

    expect(await screen.findByRole("heading", { name: "Enlace no válido" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Solicitar un enlace nuevo" })).toBeInTheDocument();
  });

  it("el botón sigue desactivado hasta cumplir los requisitos y confirmar la contraseña", async () => {
    dibujarApp("/restablecer?token=abc");
    const boton = screen.getByRole("button", { name: "Guardar contraseña" });

    await userEvent.type(screen.getByLabelText("Contraseña nueva"), "corta");
    expect(boton).toBeDisabled();

    await userEvent.clear(screen.getByLabelText("Contraseña nueva"));
    await userEvent.type(screen.getByLabelText("Contraseña nueva"), "Nueva1234");
    expect(boton).toBeDisabled(); // falta repetirla

    await userEvent.type(screen.getByLabelText("Repite la contraseña"), "Nueva1235");
    expect(screen.getByText("Las contraseñas no coinciden.")).toBeInTheDocument();
    expect(boton).toBeDisabled();

    await userEvent.clear(screen.getByLabelText("Repite la contraseña"));
    await userEvent.type(screen.getByLabelText("Repite la contraseña"), "Nueva1234");
    expect(boton).toBeEnabled();
  });

  it("la lista de requisitos marca lo que ya se cumple", async () => {
    dibujarApp("/restablecer?token=abc");

    await userEvent.type(screen.getByLabelText("Contraseña nueva"), "abc");

    const lista = screen.getByRole("list", { name: "Requisitos de la contraseña" });
    expect(lista).toHaveTextContent("Mínimo 8 caracteres (pendiente)");
    expect(lista).toHaveTextContent("Una letra mayúscula (pendiente)");

    await userEvent.type(screen.getByLabelText("Contraseña nueva"), "DEFGH1");
    expect(lista).toHaveTextContent("Mínimo 8 caracteres (cumplido)");
    expect(lista).toHaveTextContent("Una letra mayúscula (cumplido)");
    expect(lista).toHaveTextContent("Un número (cumplido)");
  });

  it("al guardar envía el token y la contraseña nueva, y ofrece ir al login", async () => {
    const falso = simularServidor({
      "/auth/restablecer": () => respuestaApi({ mensaje: "Contraseña actualizada." }),
    });
    dibujarApp("/restablecer?token=token-del-correo");

    await userEvent.type(screen.getByLabelText("Contraseña nueva"), "Nueva1234");
    await userEvent.type(screen.getByLabelText("Repite la contraseña"), "Nueva1234");
    await userEvent.click(screen.getByRole("button", { name: "Guardar contraseña" }));

    expect(await screen.findByRole("heading", { name: "¡Contraseña actualizada!" })).toBeInTheDocument();
    expect(JSON.parse(falso.mock.calls[0][1].body)).toEqual({ token: "token-del-correo", password_nueva: "Nueva1234" });
    expect(screen.getByRole("link", { name: "Ir a iniciar sesión" })).toBeInTheDocument();
  });

  it("si el enlace venció muestra el error y permite pedir uno nuevo", async () => {
    simularServidor({
      "/auth/restablecer": () => respuestaApi({ detail: "El enlace no es válido o ya venció. Solicita uno nuevo." }, 400),
    });
    dibujarApp("/restablecer?token=vencido");

    await userEvent.type(screen.getByLabelText("Contraseña nueva"), "Nueva1234");
    await userEvent.type(screen.getByLabelText("Repite la contraseña"), "Nueva1234");
    await userEvent.click(screen.getByRole("button", { name: "Guardar contraseña" }));

    const aviso = await screen.findByRole("alert");
    expect(aviso).toHaveTextContent("El enlace no es válido o ya venció");
    expect(screen.getByRole("link", { name: "Solicitar un enlace nuevo" })).toBeInTheDocument();
  });
});
