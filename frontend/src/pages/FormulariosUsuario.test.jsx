// Pruebas de las pantallas "Nuevo usuario" y "Editar usuario".
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { USUARIOS_PRUEBA, conSesionDe, dibujarApp, llamadas, respuestaApi } from "@/pruebas/ayudas";

const base = { documento: null, telefono: null, fecha_nacimiento: null, direccion: null, contacto_emergencia_nombre: null, contacto_emergencia_telefono: null, entrenador_id: null, creado_en: "2026-11-01T10:00:00Z" };
const COACH = { ...base, id: 2, nombre: "Carlos Coach", email: "coach@gympro.com", rol: "entrenador", activo: true, codigo: null };
const ANA = { ...base, id: 3, nombre: "Ana Gómez", email: "ana@gympro.com", rol: "cliente", activo: true, documento: "1010", telefono: "300", entrenador_id: 2, codigo: "GP-000003" };
const ENTRENADORES = respuestaApi({ items: [COACH], total: 1, pagina: 1, por_pagina: 100 });

const escribir = (etiqueta, texto) => userEvent.type(screen.getByLabelText(etiqueta), texto);
const guardar = () => userEvent.click(screen.getByRole("button", { name: "Crear usuario" }));

describe("Nuevo usuario", () => {
  async function abrir(rutas = {}) {
    const falso = conSesionDe("admin", { "GET /usuarios": () => ENTRENADORES, ...rutas });
    dibujarApp("/usuarios/nuevo");
    await screen.findByRole("heading", { name: "Nuevo usuario" });
    return falso;
  }

  it("crea un cliente con todos sus datos y muestra su código", async () => {
    const falso = await abrir({ "POST /usuarios": () => respuestaApi({ ...ANA, id: 5, codigo: "GP-000005" }, 201) });

    await escribir(/Nombre completo/, "Ana Gómez");
    await escribir(/Correo electrónico/, "  ANA@gympro.com ");
    await escribir(/Contraseña temporal/, "Temporal123");
    await escribir(/Documento de identidad/, "1010");
    await userEvent.type(screen.getByLabelText("Teléfono", { selector: "#telefono" }), "3001112233");
    await userEvent.selectOptions(screen.getByLabelText("Entrenador asignado"), "Carlos Coach");
    await guardar();

    expect(await screen.findByText(/fue creado como cliente/)).toBeInTheDocument();
    expect(screen.getByText("GP-000005")).toBeInTheDocument();
    expect(llamadas(falso, "/usuarios").find((l) => l.metodo === "POST").cuerpo).toEqual({
      nombre: "Ana Gómez",
      email: "ana@gympro.com", // se envía recortado y en minúsculas
      rol: "cliente",
      password: "Temporal123",
      documento: "1010",
      telefono: "3001112233",
      fecha_nacimiento: null,
      direccion: null,
      contacto_emergencia_nombre: null,
      contacto_emergencia_telefono: null,
      entrenador_id: 2,
    });
  });

  it("después de crear, el formulario queda vacío para crear otro", async () => {
    await abrir({ "POST /usuarios": () => respuestaApi({ ...ANA, id: 5 }, 201) });
    await escribir(/Nombre completo/, "Ana Gómez");
    await escribir(/Correo electrónico/, "ana@gympro.com");
    await escribir(/Contraseña temporal/, "Temporal123");
    await escribir(/Documento de identidad/, "1010");
    await guardar();
    await screen.findByText(/fue creado como cliente/);

    expect(screen.getByLabelText(/Nombre completo/)).toHaveValue("");
  });

  it("exige el documento a los clientes y no envía nada hasta que se escribe", async () => {
    const falso = await abrir();
    await escribir(/Nombre completo/, "Ana Gómez");
    await escribir(/Correo electrónico/, "ana@gympro.com");
    await escribir(/Contraseña temporal/, "Temporal123");

    await guardar();

    expect(screen.getByText("El documento es obligatorio para los clientes.")).toBeInTheDocument();
    expect(llamadas(falso, "/usuarios").some((l) => l.metodo === "POST")).toBe(false);
  });

  it("para un entrenador el documento es opcional y no se pide entrenador asignado", async () => {
    const falso = await abrir({ "POST /usuarios": () => respuestaApi({ ...COACH, id: 6 }, 201) });
    await userEvent.selectOptions(screen.getByLabelText(/^Rol/), "entrenador");

    expect(screen.queryByLabelText("Entrenador asignado")).not.toBeInTheDocument();
    expect(screen.getByText("Opcional para entrenadores y administradores.")).toBeInTheDocument();

    await escribir(/Nombre completo/, "Pedro Coach");
    await escribir(/Correo electrónico/, "pedro@gympro.com");
    await escribir(/Contraseña temporal/, "Temporal123");
    await guardar();

    expect(await screen.findByText(/fue creado como entrenador/)).toBeInTheDocument();
    expect(llamadas(falso, "/usuarios").find((l) => l.metodo === "POST").cuerpo).toMatchObject({ rol: "entrenador", documento: null, entrenador_id: null });
  });

  it("valida el nombre, el correo y la contraseña temporal antes de enviar", async () => {
    const falso = await abrir();
    await escribir(/Documento de identidad/, "1010");
    await escribir(/Correo electrónico/, "no-es-un-correo");
    await escribir(/Contraseña temporal/, "debil");

    await guardar();

    expect(screen.getByText("Escribe el nombre (mínimo 2 letras).")).toBeInTheDocument();
    expect(screen.getByText("Escribe un correo válido.")).toBeInTheDocument();
    expect(screen.getByText("La contraseña no cumple los requisitos.")).toBeInTheDocument();
    expect(llamadas(falso, "/usuarios").some((l) => l.metodo === "POST")).toBe(false);
  });

  it("muestra el error del servidor (correo repetido) y conserva lo escrito", async () => {
    await abrir({ "POST /usuarios": () => respuestaApi({ detail: "Ya existe un usuario con ese correo" }, 409) });
    await escribir(/Nombre completo/, "Ana Gómez");
    await escribir(/Correo electrónico/, "ana@gympro.com");
    await escribir(/Contraseña temporal/, "Temporal123");
    await escribir(/Documento de identidad/, "1010");

    await guardar();

    expect(await screen.findByRole("alert")).toHaveTextContent("Ya existe un usuario con ese correo");
    expect(screen.getByLabelText(/Nombre completo/)).toHaveValue("Ana Gómez");
  });
});

describe("Editar usuario", () => {
  async function abrir(usuario = ANA, rutas = {}, rol = "admin") {
    const falso = conSesionDe(rol, {
      "GET /usuarios": () => ENTRENADORES,
      [`GET /usuarios/${usuario.id}`]: () => respuestaApi(usuario),
      ...rutas,
    });
    dibujarApp(`/usuarios/${usuario.id}`);
    await screen.findByRole("heading", { name: usuario.nombre });
    return falso;
  }
  const guardarCambios = () => userEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

  it("carga los datos de la persona en el formulario", async () => {
    await abrir();

    expect(screen.getByLabelText(/Nombre completo/)).toHaveValue("Ana Gómez");
    expect(screen.getByLabelText(/Correo electrónico/)).toHaveValue("ana@gympro.com");
    expect(screen.getByLabelText(/Documento de identidad/)).toHaveValue("1010");
    expect(screen.getByLabelText("Teléfono", { selector: "#telefono" })).toHaveValue("300");
    expect(screen.getByText("GP-000003")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByLabelText("Entrenador asignado")).toHaveValue("2"));
  });

  it("'Guardar cambios' está desactivado mientras no se cambie nada", async () => {
    await abrir();

    expect(screen.getByRole("button", { name: "Guardar cambios" })).toBeDisabled();

    await userEvent.type(screen.getByLabelText(/Dirección/), "Calle 1");
    expect(screen.getByRole("button", { name: "Guardar cambios" })).toBeEnabled();
  });

  it("envía SOLO los campos que cambiaron", async () => {
    const falso = await abrir(ANA, { "PUT /usuarios/3": () => respuestaApi({ ...ANA, telefono: "3109998877", direccion: "Calle 1" }) });

    await userEvent.clear(screen.getByLabelText("Teléfono", { selector: "#telefono" }));
    await userEvent.type(screen.getByLabelText("Teléfono", { selector: "#telefono" }), "3109998877");
    await userEvent.type(screen.getByLabelText(/Dirección/), "Calle 1");
    await guardarCambios();

    expect(await screen.findByText("Cambios guardados.")).toBeInTheDocument();
    expect(llamadas(falso, "/usuarios/3").find((l) => l.metodo === "PUT").cuerpo).toEqual({
      telefono: "3109998877",
      direccion: "Calle 1",
    });
  });

  it("vaciar un dato opcional lo envía como null", async () => {
    const falso = await abrir(ANA, { "PUT /usuarios/3": () => respuestaApi({ ...ANA, telefono: null }) });

    await userEvent.clear(screen.getByLabelText("Teléfono", { selector: "#telefono" }));
    await guardarCambios();

    await screen.findByText("Cambios guardados.");
    expect(llamadas(falso, "/usuarios/3").find((l) => l.metodo === "PUT").cuerpo).toEqual({ telefono: null });
  });

  it("no pierde al entrenador asignado aunque ya esté desactivado (no aparece en la lista)", async () => {
    const falso = await abrir(ANA, {
      "GET /usuarios": () => respuestaApi({ items: [], total: 0, pagina: 1, por_pagina: 100 }), // sin entrenadores activos
      "PUT /usuarios/3": () => respuestaApi({ ...ANA, direccion: "Calle 1" }),
    });
    await waitFor(() => expect(screen.getByRole("option", { name: "Entrenador actual (desactivado)" })).toBeInTheDocument());

    await userEvent.type(screen.getByLabelText(/Dirección/), "Calle 1");
    await guardarCambios();

    await screen.findByText("Cambios guardados.");
    // El entrenador no se tocó, así que NO viaja en la petición.
    expect(llamadas(falso, "/usuarios/3").find((l) => l.metodo === "PUT").cuerpo).toEqual({ direccion: "Calle 1" });
  });

  it("reasignar el entrenador envía el entrenador nuevo", async () => {
    const otro = { ...COACH, id: 9, nombre: "Otro Coach" };
    const falso = await abrir(ANA, {
      "GET /usuarios": () => respuestaApi({ items: [COACH, otro], total: 2, pagina: 1, por_pagina: 100 }),
      "PUT /usuarios/3": () => respuestaApi({ ...ANA, entrenador_id: 9 }),
    });
    await screen.findByRole("option", { name: "Otro Coach" });

    await userEvent.selectOptions(screen.getByLabelText("Entrenador asignado"), "Otro Coach");
    await guardarCambios();

    await screen.findByText("Cambios guardados.");
    expect(llamadas(falso, "/usuarios/3").find((l) => l.metodo === "PUT").cuerpo).toEqual({ entrenador_id: 9 });
  });

  it("muestra el error del servidor sin perder lo escrito", async () => {
    await abrir(ANA, { "PUT /usuarios/3": () => respuestaApi({ detail: "Ya existe un usuario con ese correo" }, 409) });

    await userEvent.clear(screen.getByLabelText(/Correo electrónico/));
    await userEvent.type(screen.getByLabelText(/Correo electrónico/), "luis@gympro.com");
    await guardarCambios();

    expect(await screen.findByRole("alert")).toHaveTextContent("Ya existe un usuario con ese correo");
    expect(screen.getByLabelText(/Correo electrónico/)).toHaveValue("luis@gympro.com");
  });

  it("el administrador no puede cambiar su propio rol ni desactivarse", async () => {
    const yo = { ...base, ...USUARIOS_PRUEBA.admin, codigo: null };
    await abrir(yo);

    expect(screen.getByLabelText(/^Rol/)).toBeDisabled();
    expect(screen.getByText("No puedes cambiar tu propio rol.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Desactivar" })).toBeDisabled();
  });

  it("desactiva a la persona desde su ficha", async () => {
    await abrir(ANA, { "PATCH /usuarios/3/estado": () => respuestaApi({ ...ANA, activo: false }) });

    await userEvent.click(screen.getByRole("button", { name: "Desactivar" }));
    await userEvent.click(screen.getByRole("button", { name: "Sí, desactivar" }));

    expect(await screen.findByRole("button", { name: "Activar" })).toBeInTheDocument();
    expect(screen.getAllByText("Desactivado").length).toBeGreaterThan(0);
  });

  it("si el usuario no existe muestra el error y un enlace para volver", async () => {
    conSesionDe("admin", { "GET /usuarios/99": () => respuestaApi({ detail: "El usuario no existe" }, 404) });
    dibujarApp("/usuarios/99");

    expect(await screen.findByRole("alert")).toHaveTextContent("El usuario no existe");
    expect(screen.getByRole("link", { name: /Volver a usuarios/ })).toHaveAttribute("href", "/usuarios");
  });

  describe("contraseña temporal", () => {
    it("el administrador define una contraseña nueva para la persona", async () => {
      const falso = await abrir(ANA, { "PUT /usuarios/3/password": () => respuestaApi({ mensaje: "Contraseña actualizada." }) });
      const boton = screen.getByRole("button", { name: "Definir contraseña" });
      expect(boton).toBeDisabled();

      await userEvent.type(screen.getByLabelText("Contraseña temporal"), "Temporal2026");
      await userEvent.click(boton);

      expect(await screen.findByText("Contraseña actualizada.")).toBeInTheDocument();
      expect(llamadas(falso, "/usuarios/3/password")[0].cuerpo).toEqual({ password_nueva: "Temporal2026" });
      expect(screen.getByLabelText("Contraseña temporal")).toHaveValue(""); // el campo se limpia
    });

    it("no deja enviar una contraseña que no cumple las reglas", async () => {
      await abrir();

      await userEvent.type(screen.getByLabelText("Contraseña temporal"), "debil");

      expect(screen.getByRole("button", { name: "Definir contraseña" })).toBeDisabled();
      const requisitos = within(screen.getByRole("list", { name: "Requisitos de la contraseña" }));
      expect(requisitos.getByText(/Mínimo 8 caracteres/)).toHaveTextContent("(pendiente)");
    });
  });
});
