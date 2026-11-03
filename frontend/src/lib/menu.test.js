// Pruebas de la definición del menú por rol.
import { describe, expect, it } from "vitest";

import { ITEMS_MENU, itemsParaRol } from "@/lib/menu";

const etiquetas = (rol) => itemsParaRol(rol).map((item) => item.etiqueta);

describe("menú por rol", () => {
  it("el administrador ve las secciones de gestión", () => {
    expect(etiquetas("admin")).toEqual(["Inicio", "Dashboard", "Recepción", "Usuarios", "Planes", "Pagos", "Reportes", "Avisos", "Mi perfil"]);
  });

  it("el entrenador ve sus clientes, rutinas y medidas", () => {
    expect(etiquetas("entrenador")).toEqual(["Inicio", "Mis clientes", "Rutinas", "Medidas", "Mi perfil"]);
  });

  it("el cliente ve su seguimiento personal", () => {
    expect(etiquetas("cliente")).toEqual(["Inicio", "Mi progreso", "Mi historial", "Mi rutina", "Pagar membresía", "Avisos", "Mi perfil"]);
  });

  it("nadie ve secciones de otro rol", () => {
    expect(etiquetas("cliente")).not.toContain("Usuarios");
    expect(etiquetas("cliente")).not.toContain("Pagos");
    expect(etiquetas("entrenador")).not.toContain("Reportes");
    expect(etiquetas("admin")).not.toContain("Mis clientes");
  });

  it("'Inicio' es siempre lo primero", () => {
    for (const rol of ["admin", "entrenador", "cliente"]) expect(etiquetas(rol)[0]).toBe("Inicio");
  });

  it("un rol desconocido solo ve lo que es para todos", () => {
    expect(etiquetas("otro")).toEqual(["Inicio", "Mi perfil"]);
  });

  it("no hay dos ítems con la misma dirección y los roles son válidos", () => {
    const rutas = ITEMS_MENU.map((item) => item.ruta);
    expect(new Set(rutas).size).toBe(rutas.length);

    for (const item of ITEMS_MENU) {
      if (item.roles !== null) for (const rol of item.roles) expect(["admin", "entrenador", "cliente"]).toContain(rol);
    }
  });
});
