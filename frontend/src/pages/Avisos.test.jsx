// Pruebas de la pantalla «Avisos», el contador del menú y los vencimientos del administrador.
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { conSesionDe, dibujarApp, llamadas, respuestaApi } from "@/pruebas/ayudas";

const AVISOS = {
  no_leidas: 2,
  items: [
    { id: 3, tipo: "vence_hoy", titulo: "Tu membresía vence hoy", mensaje: "Hoy es tu último día.", referencia: "2026-11-30", leida: false, creado_en: "2026-11-30T11:00:00Z" },
    { id: 2, tipo: "por_vencer", titulo: "Tu membresía está por vencer", mensaje: "Vence en 3 días.", referencia: "2026-11-30", leida: false, creado_en: "2026-11-27T11:00:00Z" },
    { id: 1, tipo: "por_vencer", titulo: "Aviso viejo", mensaje: "Ya leído.", referencia: "2026-10-30", leida: true, creado_en: "2026-10-27T11:00:00Z" },
  ],
};

describe("Avisos", () => {
  it("el menú muestra cuántos avisos hay sin leer", async () => {
    conSesionDe("cliente", { "GET /avisos": () => respuestaApi(AVISOS) });
    dibujarApp("/");
    const menu = await screen.findByRole("navigation", { name: "Menú principal" });
    expect(await within(menu).findByLabelText("2 sin leer")).toBeInTheDocument();
    expect(within(menu).getByRole("link", { name: /Avisos/ })).toHaveAttribute("href", "/avisos");
  });

  it("el entrenador no ve avisos ni los consulta", async () => {
    const falso = conSesionDe("entrenador");
    dibujarApp("/");
    const menu = await screen.findByRole("navigation", { name: "Menú principal" });
    expect(within(menu).queryByText("Avisos")).not.toBeInTheDocument();
    expect(llamadas(falso, "/avisos")).toHaveLength(0);
  });

  it("lista los avisos, marca uno como leído y actualiza el contador", async () => {
    const falso = conSesionDe("cliente", {
      "GET /avisos": () => respuestaApi(AVISOS),
      "POST /avisos/2/leer": () => respuestaApi({ ...AVISOS.items[1], leida: true }),
    });
    dibujarApp("/avisos");
    expect(await screen.findByText("Tienes 2 avisos sin leer.")).toBeInTheDocument();
    expect(screen.getByText("Hoy es tu último día.")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Renovar membresía" })[0]).toHaveAttribute("href", "/pagar");
    // el aviso ya leído no ofrece marcarlo otra vez
    expect(screen.getAllByRole("button", { name: /Marcar como leído/ })).toHaveLength(2);

    await userEvent.click(screen.getByRole("button", { name: "Marcar como leído: Tu membresía está por vencer" }));
    expect(await screen.findByText("Tienes 1 aviso sin leer.")).toBeInTheDocument();
    expect(llamadas(falso, "/avisos/2/leer")).toHaveLength(1);
  });

  it("marca todos como leídos", async () => {
    conSesionDe("cliente", {
      "GET /avisos": () => respuestaApi(AVISOS),
      "POST /avisos/leer-todos": () => respuestaApi({ marcados: 2 }),
    });
    dibujarApp("/avisos");
    await userEvent.click(await screen.findByRole("button", { name: "Marcar todos como leídos" }));
    expect(await screen.findByText("No tienes avisos sin leer.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Marcar todos como leídos" })).not.toBeInTheDocument();
  });

  it("sin avisos explica qué aparecerá aquí", async () => {
    conSesionDe("cliente");
    dibujarApp("/avisos");
    expect(await screen.findByText(/Todavía no hay avisos/)).toBeInTheDocument();
  });

  it("solo el administrador puede lanzar la revisión de vencimientos", async () => {
    conSesionDe("cliente");
    dibujarApp("/avisos");
    await screen.findByText(/Todavía no hay avisos/);
    expect(screen.queryByRole("button", { name: "Revisar vencimientos ahora" })).not.toBeInTheDocument();
  });

  it("el administrador revisa vencimientos y ve el resultado", async () => {
    let nuevo = false;
    const falso = conSesionDe("admin", {
      "GET /avisos": () => respuestaApi(nuevo ? { no_leidas: 1, items: [{ id: 9, tipo: "resumen_admin", titulo: "Resumen de vencimientos", mensaje: "Hoy hay 2 cliente(s) por vencer", referencia: "2026-11-27", leida: false, creado_en: "2026-11-27T11:00:00Z" }] } : { no_leidas: 0, items: [] }),
      "POST /avisos/generar": () => {
        nuevo = true;
        return respuestaApi({ por_vencer: 2, vence_hoy: 0, resumen_admin: 1 });
      },
    });
    dibujarApp("/avisos");
    await userEvent.click(await screen.findByRole("button", { name: "Revisar vencimientos ahora" }));
    expect(await screen.findByText("Revisión terminada: 2 por vencer, 0 vencen hoy y 1 resumen(es).")).toBeInTheDocument();
    expect(await screen.findByText("Resumen de vencimientos")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ver pagos y vencimientos" })).toHaveAttribute("href", "/pagos");
    expect(llamadas(falso, "/avisos/generar")).toHaveLength(1);
  });

  it("el administrador sin novedades ve un mensaje claro", async () => {
    conSesionDe("admin", { "POST /avisos/generar": () => respuestaApi({ por_vencer: 0, vence_hoy: 0, resumen_admin: 0 }) });
    dibujarApp("/avisos");
    await userEvent.click(await screen.findByRole("button", { name: "Revisar vencimientos ahora" }));
    expect(await screen.findByText("Revisión terminada: no había avisos nuevos.")).toBeInTheDocument();
  });
});

describe("Vencimientos en Pagos (administrador)", () => {
  const FILAS = [
    { usuario_id: 5, nombre: "Ana Gómez", telefono: "3001112222", email: "ana@x.com", estado: "en_mora", fecha_vencimiento: "2026-11-20", dias_restantes: -8 },
    { usuario_id: 6, nombre: "Beto Ruiz", telefono: null, email: "beto@x.com", estado: "por_vencer", fecha_vencimiento: "2026-12-01", dias_restantes: 3 },
  ];
  const rutas = {
    "GET /usuarios": () => respuestaApi({ items: [{ id: 5, nombre: "Ana Gómez" }, { id: 6, nombre: "Beto Ruiz" }], total: 2 }),
    "GET /planes": () => respuestaApi([{ id: 1, nombre: "Mensual", duracion_dias: 30, precio: 90000 }]),
    "GET /pagos": () => respuestaApi([]),
    "GET /vencimientos": () => respuestaApi(FILAS),
  };

  it("muestra los clientes por vencer y en mora con su teléfono y días", async () => {
    conSesionDe("admin", rutas);
    dibujarApp("/pagos");
    await userEvent.click(await screen.findByRole("button", { name: "Vencimientos" }));
    expect(await screen.findByText("Clientes por vencer y en mora")).toBeInTheDocument();
    expect(screen.getByText("3001112222")).toBeInTheDocument();
    expect(screen.getByText("Venció hace 8 días")).toBeInTheDocument();
    expect(screen.getByText("Vence en 3 días")).toBeInTheDocument();
    // se vuelve a ocultar
    await userEvent.click(screen.getByRole("button", { name: "Vencimientos" }));
    expect(screen.queryByText("Clientes por vencer y en mora")).not.toBeInTheDocument();
  });

  it("«Registrar pago» abre el pago manual con ese cliente ya elegido", async () => {
    conSesionDe("admin", rutas);
    dibujarApp("/pagos");
    await userEvent.click(await screen.findByRole("button", { name: "Vencimientos" }));
    await userEvent.click(await screen.findByRole("button", { name: "Registrar pago de Beto Ruiz" }));
    await waitFor(() => expect(screen.getByLabelText("Cliente")).toHaveValue("6"));
  });

  it("sin clientes por vencer lo dice", async () => {
    conSesionDe("admin", { ...rutas, "GET /vencimientos": () => respuestaApi([]) });
    dibujarApp("/pagos");
    await userEvent.click(await screen.findByRole("button", { name: "Vencimientos" }));
    expect(await screen.findByText("No hay clientes por vencer ni en mora.")).toBeInTheDocument();
  });
});
