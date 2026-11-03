// Pruebas del cambio de tema claro/oscuro.
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { dibujarApp } from "@/pruebas/ayudas";

describe("Tema claro/oscuro", () => {
  it("el sistema es oscuro por defecto", () => {
    dibujarApp("/login");

    expect(document.documentElement).toHaveClass("dark");
  });

  it("el botón alterna el tema y lo recuerda", async () => {
    dibujarApp("/login");

    await userEvent.click(screen.getByRole("button", { name: "Cambiar a modo claro" }));
    expect(document.documentElement).not.toHaveClass("dark");
    expect(localStorage.getItem("gympro-tema")).toBe("light");

    await userEvent.click(screen.getByRole("button", { name: "Cambiar a modo oscuro" }));
    expect(document.documentElement).toHaveClass("dark");
    expect(localStorage.getItem("gympro-tema")).toBe("dark");
  });

  it("respeta el tema claro guardado de una visita anterior", () => {
    localStorage.setItem("gympro-tema", "light");

    dibujarApp("/login");

    expect(document.documentElement).not.toHaveClass("dark");
  });
});
