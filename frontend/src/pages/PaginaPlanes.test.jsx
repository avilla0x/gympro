// Pruebas de la pantalla "Planes".
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { formatearPesos } from "@/lib/formato";
import { conSesionDe, dibujarApp, llamadas, respuestaApi } from "@/pruebas/ayudas";

// El formato colombiano separa "$" y el número con un espacio "duro" (U+00A0). Testing Library cambia los
// espacios del texto de la página por espacios normales, así que aquí se hace lo mismo con lo que se busca.
const pesos = (valor) => formatearPesos(valor).replace(/\s/g, " ");

const PLANES = [
  { id: 1, nombre: "Mensual", duracion_dias: 30, precio: 90000 },
  { id: 2, nombre: "Trimestral", duracion_dias: 90, precio: 240000 },
  { id: 3, nombre: "Anual", duracion_dias: 365, precio: 850000 },
];

async function abrir(rutas = {}) {
  const falso = conSesionDe("admin", { "GET /planes": () => respuestaApi(PLANES), ...rutas });
  dibujarApp("/planes");
  await screen.findByText(pesos(90000));
  return falso;
}
const cambiarPrecio = (nombre) => userEvent.click(screen.getByRole("button", { name: `Cambiar el precio de ${nombre}` }));
const campo = (nombre) => screen.getByLabelText(`Nuevo precio de ${nombre} (en pesos)`);
const guardar = () => screen.getByRole("button", { name: "Guardar" });

describe("Pantalla Planes", () => {
  it("muestra los tres planes con su duración y su precio en pesos", async () => {
    await abrir();

    expect(screen.getByRole("heading", { name: "Planes de membresía" })).toBeInTheDocument();
    for (const [nombre, dias, precio] of [["Mensual", 30, 90000], ["Trimestral", 90, 240000], ["Anual", 365, 850000]]) {
      expect(screen.getByText(nombre)).toBeInTheDocument();
      expect(screen.getByText(`${dias} días`)).toBeInTheDocument();
      expect(screen.getByText(pesos(precio))).toBeInTheDocument();
    }
    expect(formatearPesos(90000)).toMatch(/^\$\s?90\.000$/); // formato colombiano: punto de miles, sin decimales
  });

  it("no ofrece crear ni borrar planes: solo cambiar el precio", async () => {
    await abrir();

    expect(screen.getAllByRole("button", { name: /Cambiar el precio de/ })).toHaveLength(3);
    expect(screen.queryByRole("button", { name: /Nuevo plan|Crear|Eliminar|Borrar/ })).not.toBeInTheDocument();
  });

  it("cambia el precio de un plan y actualiza la tarjeta", async () => {
    const falso = await abrir({ "PATCH /planes/1": () => respuestaApi({ ...PLANES[0], precio: 95000 }) });

    await cambiarPrecio("Mensual");
    expect(campo("Mensual")).toHaveValue("90000"); // arranca con el precio actual
    expect(guardar()).toBeDisabled(); // todavía no hay cambio
    await userEvent.clear(campo("Mensual"));
    await userEvent.type(campo("Mensual"), "95000");
    expect(screen.getByText(pesos(95000))).toBeInTheDocument(); // vista previa con formato
    await userEvent.click(guardar());

    expect(await screen.findByText("Precio actualizado")).toBeInTheDocument();
    expect(screen.getByText(pesos(95000))).toBeInTheDocument();
    expect(llamadas(falso, "/planes/1").find((l) => l.metodo === "PATCH").cuerpo).toEqual({ precio: 95000 });
    // Los otros planes no cambian.
    expect(screen.getByText(pesos(240000))).toBeInTheDocument();
    expect(screen.getByText(pesos(850000))).toBeInTheDocument();
  });

  it("solo acepta dígitos al escribir el precio", async () => {
    await abrir();
    await cambiarPrecio("Anual");

    await userEvent.clear(campo("Anual"));
    await userEvent.type(campo("Anual"), "9a5.0,0-0 pesos");

    expect(campo("Anual")).toHaveValue("95000");
  });

  it.each([["vacío", ""], ["cero", "0"], ["más del tope", "100000001"], ["el mismo precio", "90000"]])(
    "no deja guardar un precio inválido (%s)",
    async (_nombre, texto) => {
      await abrir();
      await cambiarPrecio("Mensual");

      await userEvent.clear(campo("Mensual"));
      if (texto) await userEvent.type(campo("Mensual"), texto);

      expect(guardar()).toBeDisabled();
    },
  );

  it("cancelar descarta el cambio", async () => {
    const falso = await abrir();
    await cambiarPrecio("Mensual");
    await userEvent.clear(campo("Mensual"));
    await userEvent.type(campo("Mensual"), "123");

    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(screen.getByText(pesos(90000))).toBeInTheDocument();
    expect(llamadas(falso).some((l) => l.metodo === "PATCH")).toBe(false);
  });

  it("si el servidor rechaza el cambio, muestra el motivo y deja seguir editando", async () => {
    await abrir({ "PATCH /planes/1": () => respuestaApi({ detail: "El plan no existe" }, 404) });
    await cambiarPrecio("Mensual");
    await userEvent.clear(campo("Mensual"));
    await userEvent.type(campo("Mensual"), "95000");

    await userEvent.click(guardar());

    expect(await screen.findByRole("alert")).toHaveTextContent("El plan no existe");
    expect(campo("Mensual")).toHaveValue("95000"); // sigue en edición con lo escrito
  });

  it("muestra el error si no se pueden cargar los planes", async () => {
    conSesionDe("admin", { "GET /planes": () => respuestaApi({ detail: "Error del servidor" }, 500) });
    dibujarApp("/planes");

    expect(await screen.findByRole("alert")).toHaveTextContent("Error del servidor");
  });

  it("el menú la marca como la pantalla actual", async () => {
    await abrir();

    expect(within(screen.getByRole("navigation", { name: "Menú principal" })).getByRole("link", { name: "Planes" })).toHaveAttribute("aria-current", "page");
  });

  it.each(["entrenador", "cliente"])("el %s no puede entrar: ve 'sin permiso' y no se piden los planes", async (rol) => {
    const falso = conSesionDe(rol, { "GET /planes": () => respuestaApi(PLANES) });
    dibujarApp("/planes");

    expect(await screen.findByRole("heading", { name: "No tienes permiso para ver esta sección" })).toBeInTheDocument();
    expect(llamadas(falso, "/planes")).toHaveLength(0);
  });
});
