// Pruebas del cliente de la API: manejo de errores y del token.
import { describe, expect, it, vi } from "vitest";

import { ErrorApi, peticion, registrarAlSesionExpirada } from "@/api/cliente";
import { guardarToken, leerToken } from "@/api/sesion";
import { respuestaApi, simularServidor } from "@/pruebas/ayudas";

describe("peticion", () => {
  it("devuelve el JSON cuando la respuesta es correcta", async () => {
    simularServidor({ "/auth/me": () => respuestaApi({ nombre: "Ana" }) });

    expect(await peticion("/auth/me")).toEqual({ nombre: "Ana" });
  });

  it("envía el token guardado en el encabezado Authorization", async () => {
    guardarToken("abc123");
    const falso = simularServidor({ "/auth/me": () => respuestaApi({}) });

    await peticion("/auth/me");

    expect(falso.mock.calls[0][1].headers.Authorization).toBe("Bearer abc123");
  });

  it("usa el mensaje que manda el backend cuando falla", async () => {
    simularServidor({ "/usuarios": () => respuestaApi({ detail: "Ya existe un usuario con ese correo" }, 409) });

    await expect(peticion("/usuarios", { metodo: "POST", cuerpo: {} })).rejects.toMatchObject({
      message: "Ya existe un usuario con ese correo",
      estado: 409,
    });
  });

  it("limpia el motivo técnico de los errores de validación (422)", async () => {
    simularServidor({
      "/usuarios": () => respuestaApi({ detail: [{ msg: "Value error, La contraseña debe tener mínimo 8 caracteres" }] }, 422),
    });

    await expect(peticion("/usuarios")).rejects.toThrow("La contraseña debe tener mínimo 8 caracteres");
  });

  it("explica que no hay conexión cuando el servidor no responde", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));

    const error = await peticion("/auth/me").catch((e) => e);

    expect(error).toBeInstanceOf(ErrorApi);
    expect(error.message).toMatch(/No se pudo conectar con el servidor/);
  });

  it("si la sesión caducó (401 con token), borra el token y avisa a la aplicación", async () => {
    guardarToken("vencido");
    const aviso = vi.fn();
    registrarAlSesionExpirada(aviso);
    simularServidor({ "/auth/me": () => respuestaApi({ detail: "Sesión inválida" }, 401) });

    await expect(peticion("/auth/me")).rejects.toMatchObject({ estado: 401 });

    expect(leerToken()).toBeNull();
    expect(aviso).toHaveBeenCalledOnce();
  });

  it("un 401 sin token (login con clave errónea) NO se considera sesión caducada", async () => {
    const aviso = vi.fn();
    registrarAlSesionExpirada(aviso);
    simularServidor({ "/auth/login": () => respuestaApi({ detail: "Correo o contraseña incorrectos" }, 401) });

    await expect(peticion("/auth/login", { metodo: "POST", formulario: {} })).rejects.toThrow("Correo o contraseña incorrectos");

    expect(aviso).not.toHaveBeenCalled();
  });
});
