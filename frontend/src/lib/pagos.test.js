import { describe, expect, it } from "vitest";

import { textoDiasRestantes } from "@/lib/pagos";

describe("textoDiasRestantes", () => {
  it.each([
    [null, ""],
    [0, "Vence hoy"],
    [1, "Vence mañana"],
    [5, "Vence en 5 días"],
    [-1, "Venció ayer"],
    [-4, "Venció hace 4 días"],
  ])("%s -> %s", (dias, texto) => {
    expect(textoDiasRestantes(dias)).toBe(texto);
  });
});
