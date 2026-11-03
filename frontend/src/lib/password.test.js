// Pruebas de la regla de contraseñas (debe coincidir con la del backend).
import { describe, expect, it } from "vitest";

import { evaluarPassword } from "@/lib/password";

describe("evaluarPassword", () => {
  it("acepta una contraseña con 8+ caracteres, mayúscula y número", () => {
    expect(evaluarPassword("Clave1234").valida).toBe(true);
  });

  it("rechaza si es muy corta", () => {
    const r = evaluarPassword("Corta1");
    expect(r.largo).toBe(false);
    expect(r.valida).toBe(false);
  });

  it("rechaza si no tiene mayúscula", () => {
    const r = evaluarPassword("sinmayuscula1");
    expect(r.mayuscula).toBe(false);
    expect(r.valida).toBe(false);
  });

  it("rechaza si no tiene número", () => {
    const r = evaluarPassword("SinNumeroAqui");
    expect(r.numero).toBe(false);
    expect(r.valida).toBe(false);
  });

  it("rechaza el texto vacío", () => {
    expect(evaluarPassword("").valida).toBe(false);
  });
});
