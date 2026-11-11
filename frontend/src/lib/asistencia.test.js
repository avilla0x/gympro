import { describe, expect, it } from "vitest";

import { mensajeMotivacion, textoRacha } from "@/lib/asistencia";

describe("textoRacha", () => {
  it("escribe la racha en singular, plural o sin racha", () => {
    expect(textoRacha(0)).toBe("Sin racha");
    expect(textoRacha(1)).toBe("1 día");
    expect(textoRacha(5)).toBe("5 días");
  });
});

describe("mensajeMotivacion", () => {
  it("cambia según la racha", () => {
    expect(mensajeMotivacion(0)).toMatch(/empezar/);
    expect(mensajeMotivacion(2)).toMatch(/comienzo/);
    expect(mensajeMotivacion(4)).toMatch(/muy bien/);
    expect(mensajeMotivacion(9)).toMatch(/constancia/);
  });
});
