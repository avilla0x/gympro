// Pruebas de la pantalla "Usuarios": lista, búsqueda, filtros, paginación y activar/desactivar.
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { USUARIOS_PRUEBA, conSesionDe, dibujarApp, llamadas, respuestaApi } from "@/pruebas/ayudas";

const base = { documento: null, telefono: null, fecha_nacimiento: null, direccion: null, contacto_emergencia_nombre: null, contacto_emergencia_telefono: null, entrenador_id: null, creado_en: "2026-11-01T10:00:00Z" };
const ANA = { ...base, id: 3, nombre: "Ana Gómez", email: "ana@gympro.com", rol: "cliente", activo: true, documento: "1010", codigo: "GP-000003" };
const LUIS = { ...base, id: 4, nombre: "Luis Pérez", email: "luis@gympro.com", rol: "cliente", activo: false, documento: "2020", codigo: "GP-000004" };
const ADMIN = { ...base, ...USUARIOS_PRUEBA.admin, codigo: null };
const COACH = { ...base, id: 2, nombre: "Carlos Coach", email: "coach@gympro.com", rol: "entrenador", activo: true, codigo: null };

const pagina = (items, total = items.length, numero = 1) => respuestaApi({ items, total, pagina: numero, por_pagina: 20 });
// Se busca solo dentro de la tabla (el nombre de quien tiene sesión también aparece en el menú lateral).
const fila = (nombre) => within(screen.getByRole("table")).getByText(nombre).closest("tr");

describe("Pantalla Usuarios", () => {
  it("muestra los usuarios con su rol, documento, código y estado", async () => {
    conSesionDe("admin", { "GET /usuarios": () => pagina([ADMIN, ANA, COACH, LUIS]) });
    dibujarApp("/usuarios");

    expect(await screen.findByText("Ana Gómez")).toBeInTheDocument();
    const filaAna = within(fila("Ana Gómez"));
    expect(filaAna.getByText("ana@gympro.com")).toBeInTheDocument();
    expect(filaAna.getByText("Cliente")).toBeInTheDocument();
    expect(filaAna.getByText("1010")).toBeInTheDocument();
    expect(filaAna.getByText("GP-000003")).toBeInTheDocument();
    expect(filaAna.getByText("Activo")).toBeInTheDocument();
    expect(within(fila("Luis Pérez")).getByText("Desactivado")).toBeInTheDocument();
    expect(screen.getByText("Mostrando 1–4 de 4")).toBeInTheDocument();
  });

  it("tiene el botón 'Nuevo usuario' y un enlace de edición por fila", async () => {
    conSesionDe("admin", { "GET /usuarios": () => pagina([ANA]) });
    dibujarApp("/usuarios");

    expect(await screen.findByRole("link", { name: /Nuevo usuario/ })).toHaveAttribute("href", "/usuarios/nuevo");
    expect(await screen.findByRole("link", { name: "Editar a Ana Gómez" })).toHaveAttribute("href", "/usuarios/3");
  });

  it("busca en el servidor al dejar de escribir", async () => {
    const falso = conSesionDe("admin", { "GET /usuarios": () => pagina([ANA]) });
    dibujarApp("/usuarios");
    await screen.findByText("Ana Gómez");

    await userEvent.type(screen.getByLabelText("Buscar usuarios"), "ana");

    await waitFor(() => expect(llamadas(falso, "/usuarios").at(-1).ruta).toContain("busqueda=ana"));
    // No se pidió una consulta por cada letra: se esperó a que terminara de escribir.
    expect(llamadas(falso, "/usuarios").filter((l) => l.ruta.includes("busqueda="))).toHaveLength(1);
  });

  it("filtra por rol y por estado", async () => {
    const falso = conSesionDe("admin", { "GET /usuarios": () => pagina([COACH]) });
    dibujarApp("/usuarios");
    await screen.findByText("Carlos Coach");

    await userEvent.selectOptions(screen.getByLabelText("Filtrar por rol"), "entrenador");
    await waitFor(() => expect(llamadas(falso, "/usuarios").at(-1).ruta).toContain("rol=entrenador"));

    await userEvent.selectOptions(screen.getByLabelText("Filtrar por estado"), "false");
    await waitFor(() => expect(llamadas(falso, "/usuarios").at(-1).ruta).toContain("activo=false"));
  });

  it("pagina los resultados", async () => {
    const falso = conSesionDe("admin", { "GET /usuarios": () => pagina([ANA], 45) });
    dibujarApp("/usuarios");

    expect(await screen.findByText("Mostrando 1–20 de 45")).toBeInTheDocument();
    expect(screen.getByText("Página 1 de 3")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Anterior/ })).toBeDisabled();

    await userEvent.click(screen.getByRole("button", { name: /Siguiente/ }));

    await waitFor(() => expect(llamadas(falso, "/usuarios").at(-1).ruta).toContain("pagina=2"));
    expect(await screen.findByText("Página 2 de 3")).toBeInTheDocument();
  });

  it("avisa cuando no hay resultados", async () => {
    conSesionDe("admin", { "GET /usuarios": () => pagina([]) });
    dibujarApp("/usuarios");

    expect(await screen.findByText("No se encontraron usuarios con esos filtros.")).toBeInTheDocument();
  });

  it("muestra el error si el servidor falla", async () => {
    conSesionDe("admin", { "GET /usuarios": () => respuestaApi({ detail: "Error del servidor" }, 500) });
    dibujarApp("/usuarios");

    expect(await screen.findByRole("alert")).toHaveTextContent("Error del servidor");
  });

  describe("activar y desactivar", () => {
    it("desactivar pide confirmación y luego actualiza la fila", async () => {
      const falso = conSesionDe("admin", {
        "GET /usuarios": () => pagina([ADMIN, ANA]),
        "PATCH /usuarios/3/estado": () => respuestaApi({ ...ANA, activo: false }),
      });
      dibujarApp("/usuarios");
      await screen.findByText("Ana Gómez");

      await userEvent.click(within(fila("Ana Gómez")).getByRole("button", { name: "Desactivar" }));
      expect(llamadas(falso).some((l) => l.metodo === "PATCH")).toBe(false); // todavía no se envió nada
      await userEvent.click(screen.getByRole("button", { name: "Sí, desactivar" }));

      expect(await within(fila("Ana Gómez")).findByText("Desactivado")).toBeInTheDocument();
      expect(llamadas(falso).find((l) => l.metodo === "PATCH").cuerpo).toEqual({ activo: false });
      expect(within(fila("Ana Gómez")).getByRole("button", { name: "Activar" })).toBeInTheDocument();
    });

    it("se puede cancelar la confirmación", async () => {
      const falso = conSesionDe("admin", { "GET /usuarios": () => pagina([ADMIN, ANA]) });
      dibujarApp("/usuarios");
      await screen.findByText("Ana Gómez");

      await userEvent.click(within(fila("Ana Gómez")).getByRole("button", { name: "Desactivar" }));
      await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));

      expect(within(fila("Ana Gómez")).getByRole("button", { name: "Desactivar" })).toBeInTheDocument();
      expect(llamadas(falso).some((l) => l.metodo === "PATCH")).toBe(false);
    });

    it("activar a alguien desactivado es inmediato", async () => {
      conSesionDe("admin", {
        "GET /usuarios": () => pagina([ADMIN, LUIS]),
        "PATCH /usuarios/4/estado": () => respuestaApi({ ...LUIS, activo: true }),
      });
      dibujarApp("/usuarios");
      await screen.findByText("Luis Pérez");

      await userEvent.click(within(fila("Luis Pérez")).getByRole("button", { name: "Activar" }));

      expect(await within(fila("Luis Pérez")).findByText("Activo")).toBeInTheDocument();
    });

    it("el administrador no puede desactivarse a sí mismo", async () => {
      conSesionDe("admin", { "GET /usuarios": () => pagina([ADMIN, ANA]) });
      dibujarApp("/usuarios");
      await screen.findByText("Ana Gómez");

      expect(within(fila("Laura Admin")).getByRole("button", { name: "Desactivar" })).toBeDisabled();
    });

    it("muestra el motivo si el servidor rechaza el cambio", async () => {
      conSesionDe("admin", {
        "GET /usuarios": () => pagina([ADMIN, ANA]),
        "PATCH /usuarios/3/estado": () => respuestaApi({ detail: "Debe quedar al menos un administrador activo." }, 400),
      });
      dibujarApp("/usuarios");
      await screen.findByText("Ana Gómez");

      await userEvent.click(within(fila("Ana Gómez")).getByRole("button", { name: "Desactivar" }));
      await userEvent.click(screen.getByRole("button", { name: "Sí, desactivar" }));

      expect(await screen.findByRole("alert")).toHaveTextContent("Debe quedar al menos un administrador activo.");
      expect(within(fila("Ana Gómez")).getByText("Activo")).toBeInTheDocument(); // la fila no cambió
    });
  });
});

describe("Acceso a la gestión de usuarios según el rol", () => {
  it.each(["entrenador", "cliente"])("el %s ve 'sin permiso' en vez de la pantalla y no se piden los datos", async (rol) => {
    const falso = conSesionDe(rol, { "GET /usuarios": () => pagina([ANA]) });
    dibujarApp("/usuarios");

    expect(await screen.findByRole("heading", { name: "No tienes permiso para ver esta sección" })).toBeInTheDocument();
    expect(llamadas(falso, "/usuarios")).toHaveLength(0); // ni siquiera se consultó la lista
  });

  it.each(["/usuarios/nuevo", "/usuarios/3"])("el cliente tampoco entra a %s", async (ruta) => {
    conSesionDe("cliente");
    dibujarApp(ruta);

    expect(await screen.findByRole("heading", { name: "No tienes permiso para ver esta sección" })).toBeInTheDocument();
  });
});
