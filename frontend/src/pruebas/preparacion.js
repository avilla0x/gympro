// Preparación común de las pruebas (Vitest la carga antes de cada archivo de pruebas).
import "@testing-library/jest-dom/vitest"; // agrega comprobaciones como expect(...).toBeInTheDocument()
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

afterEach(() => {
  cleanup(); // desmonta lo dibujado en la prueba anterior
  vi.restoreAllMocks(); // deshace los "fetch" simulados
  localStorage.clear(); // cada prueba empieza sin sesión ni tema guardados
});
