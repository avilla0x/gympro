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

import { armarMes } from "@/lib/asistencia";

describe("armarMes", () => {
  it("noviembre de 2026 empieza en domingo (6 huecos si la semana inicia en lunes) y tiene 30 días", () => {
    const mes = armarMes("2026-11-17");
    expect(mes.titulo).toBe("noviembre de 2026");
    expect(mes.huecos).toBe(6);
    expect(mes.dias).toHaveLength(30);
    expect(mes.primero).toBe("2026-11-01");
    expect(mes.dias[29]).toBe("2026-11-30");
  });
  it("febrero de 2028 (bisiesto) tiene 29 días y empieza en martes", () => {
    const mes = armarMes("2028-02-10");
    expect(mes.dias).toHaveLength(29);
    expect(mes.huecos).toBe(1);
  });
});
