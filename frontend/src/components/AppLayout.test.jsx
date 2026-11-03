// Pruebas del diseño con menú lateral, usando la aplicación completa.
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { conSesionDe, dibujarApp } from "@/pruebas/ayudas";

describe("Menú lateral según el rol", () => {
  it("el administrador ve sus secciones y no las de otros roles", async () => {
    conSesionDe("admin");
    dibujarApp("/");

    const menu = await screen.findByRole("navigation", { name: "Menú principal" });
    for (const seccion of ["Dashboard", "Recepción", "Usuarios", "Planes", "Pagos", "Reportes"]) {
      expect(within(menu).getByText(seccion)).toBeInTheDocument();
    }
    expect(within(menu).queryByText("Mis clientes")).not.toBeInTheDocument();
    expect(within(menu).queryByText("Mi progreso")).not.toBeInTheDocument();
  });

  it("el entrenador ve las suyas", async () => {
    conSesionDe("entrenador");
    dibujarApp("/");

    const menu = await screen.findByRole("navigation", { name: "Menú principal" });
    for (const seccion of ["Mis clientes", "Rutinas", "Medidas"]) {
      expect(within(menu).getByText(seccion)).toBeInTheDocument();
    }
    expect(within(menu).queryByText("Usuarios")).not.toBeInTheDocument();
  });

  it("el cliente ve las suyas", async () => {
    conSesionDe("cliente");
    dibujarApp("/");

    const menu = await screen.findByRole("navigation", { name: "Menú principal" });
    for (const seccion of ["Mi progreso", "Mi historial", "Mi rutina"]) {
      expect(within(menu).getByText(seccion)).toBeInTheDocument();
    }
    expect(within(menu).getByRole("link", { name: "Pagar membresía" })).toHaveAttribute("href", "/pagar");
    expect(within(menu).queryByText("Pagos")).not.toBeInTheDocument();
    expect(within(menu).queryByText("Usuarios")).not.toBeInTheDocument();
  });

  it("las secciones sin construir aparecen deshabilitadas con la etiqueta 'Pronto' y 'Inicio' es un enlace", async () => {
    conSesionDe("admin");
    dibujarApp("/");

    const menu = await screen.findByRole("navigation", { name: "Menú principal" });
    expect(within(menu).getByRole("link", { name: "Inicio" })).toHaveAttribute("href", "/");

    // "Reportes" todavía no se construye: aparece deshabilitada y no se puede navegar.
    const reportes = within(menu).getByText("Reportes").closest("[aria-disabled]");
    expect(reportes).toHaveAttribute("aria-disabled", "true");
    expect(reportes).toHaveTextContent("Pronto");
    expect(within(menu).queryByRole("link", { name: /Reportes/ })).not.toBeInTheDocument();

    // "Usuarios", "Planes", "Pagos" y "Mi perfil" ya existen: son enlaces normales.
    expect(within(menu).getByRole("link", { name: "Pagos" })).toHaveAttribute("href", "/pagos");
    expect(within(menu).getByRole("link", { name: "Usuarios" })).toHaveAttribute("href", "/usuarios");
    expect(within(menu).getByRole("link", { name: "Planes" })).toHaveAttribute("href", "/planes");
    expect(within(menu).getByRole("link", { name: "Mi perfil" })).toHaveAttribute("href", "/perfil");
  });

  it("muestra el nombre y el rol de quien tiene sesión", async () => {
    conSesionDe("entrenador");
    dibujarApp("/");

    const menu = await screen.findByRole("navigation", { name: "Menú principal" });
    const lateral = menu.closest("aside");
    expect(within(lateral).getByText("Carlos Coach")).toBeInTheDocument();
    expect(within(lateral).getByText("Entrenador")).toBeInTheDocument();
  });
});

describe("Menú en celulares", () => {
  it("se abre con el botón de las tres rayas y se cierra con Escape", async () => {
    conSesionDe("cliente");
    dibujarApp("/");
    const abrir = await screen.findByRole("button", { name: "Abrir menú" });
    expect(abrir).toHaveAttribute("aria-expanded", "false");

    await userEvent.click(abrir);
    expect(screen.getByRole("button", { name: "Abrir menú" })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("button", { name: "Cerrar menú" })).toBeInTheDocument();

    await userEvent.keyboard("{Escape}");
    expect(screen.getByRole("button", { name: "Abrir menú" })).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("button", { name: "Cerrar menú" })).not.toBeInTheDocument();
  });

  it("el botón X también lo cierra", async () => {
    conSesionDe("cliente");
    dibujarApp("/");

    await userEvent.click(await screen.findByRole("button", { name: "Abrir menú" }));
    await userEvent.click(screen.getByRole("button", { name: "Cerrar menú" }));

    expect(screen.getByRole("button", { name: "Abrir menú" })).toHaveAttribute("aria-expanded", "false");
  });
});
