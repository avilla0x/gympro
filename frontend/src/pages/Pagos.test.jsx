// Pruebas de las pantallas de pagos: Pagos (admin), Pagar membresía (cliente), pasarela y comprobante.
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { formatearPesos } from "@/lib/formato";
import { conSesionDe, dibujarApp, llamadas, respuestaApi } from "@/pruebas/ayudas";

const pesos = (valor) => formatearPesos(valor).replace(/\s/g, " ");

const PLANES = [
  { id: 1, nombre: "Mensual", duracion_dias: 30, precio: 90000 },
  { id: 2, nombre: "Trimestral", duracion_dias: 90, precio: 240000 },
];
const CLIENTES = {
  items: [
    { id: 5, nombre: "Ana Gómez", rol: "cliente", activo: true },
    { id: 6, nombre: "Beto Ruiz", rol: "cliente", activo: true },
  ],
  total: 2,
};
const pagoBase = {
  usuario_id: 5, usuario_nombre: "Ana Gómez", plan_id: 1, plan_nombre: "Mensual", monto: 90000, metodo: "efectivo",
  referencia: null, fecha: "2026-11-01", creado_en: "2026-11-01T15:00:00Z", registrado_por_id: 1,
  anulado_en: null, anulado_por_id: null, motivo_anulacion: null,
};
const PAGOS = [
  { ...pagoBase, id: 3, estado: "pendiente", metodo: "pasarela", referencia: "SIM-AB12" },
  { ...pagoBase, id: 2, estado: "aprobado", usuario_id: 6, usuario_nombre: "Beto Ruiz", plan_id: 2, plan_nombre: "Trimestral", monto: 240000 },
  { ...pagoBase, id: 1, estado: "anulado", motivo_anulacion: "Error" },
];
const COMUN_ADMIN = {
  "GET /usuarios": () => respuestaApi(CLIENTES),
  "GET /planes": () => respuestaApi(PLANES),
};

describe("Pantalla Pagos (administrador)", () => {
  async function abrirAdmin(extra = {}) {
    const falso = conSesionDe("admin", { ...COMUN_ADMIN, "GET /pagos": () => respuestaApi(PAGOS), ...extra });
    dibujarApp("/pagos");
    await screen.findByText("Beto Ruiz", { selector: "td" });
    return falso;
  }

  it("lista los pagos con su estado y las acciones que corresponden a cada uno", async () => {
    await abrirAdmin();
    expect(screen.getByRole("heading", { name: "Pagos" })).toBeInTheDocument();
    expect(screen.getByText(pesos(240000))).toBeInTheDocument();
    // pendiente -> continuar · aprobado -> comprobante y anular · anulado -> nada
    expect(screen.getByRole("link", { name: "Continuar el pago 3" })).toHaveAttribute("href", "/pasarela/3");
    expect(screen.getByRole("link", { name: "Ver comprobante del pago 2" })).toHaveAttribute("href", "/pagos/2/comprobante");
    expect(screen.getByRole("button", { name: "Anular el pago 2" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Anular el pago 1" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Anular el pago 3" })).not.toBeInTheDocument();
  });

  it("filtra por cliente y por estado enviando los filtros al servidor", async () => {
    const falso = await abrirAdmin();
    await userEvent.selectOptions(screen.getByLabelText("Filtrar por cliente"), "5");
    await userEvent.selectOptions(screen.getByLabelText("Filtrar por estado"), "aprobado");
    await waitFor(() => expect(llamadas(falso, "/pagos?").at(-1).ruta).toBe("/pagos?usuario_id=5&estado=aprobado"));
  });

  it("registra un pago manual y avisa que la membresía quedó actualizada", async () => {
    const falso = await abrirAdmin({ "POST /pagos/manual": () => respuestaApi({ ...pagoBase, id: 9, estado: "aprobado" }, 201) });
    await userEvent.click(screen.getByRole("button", { name: "Registrar pago manual" }));

    const enviar = screen.getByRole("button", { name: "Registrar pago" });
    expect(enviar).toBeDisabled(); // faltan cliente y plan
    await userEvent.selectOptions(screen.getByLabelText("Cliente"), "5");
    await userEvent.selectOptions(screen.getByLabelText("Plan"), "1");
    await userEvent.selectOptions(screen.getByLabelText("Método de pago"), "transferencia");
    await userEvent.type(screen.getByLabelText("Referencia (opcional)"), "TR-77");
    await userEvent.click(screen.getByRole("button", { name: /^Registrar pago de/ }));

    expect(await screen.findByText(/Pago registrado/)).toBeInTheDocument();
    expect(llamadas(falso, "/pagos/manual")[0].cuerpo).toEqual({ usuario_id: 5, plan_id: 1, metodo: "transferencia", referencia: "TR-77" });
  });

  it("muestra el error del servidor al registrar", async () => {
    await abrirAdmin({ "POST /pagos/manual": () => respuestaApi({ detail: "El cliente está desactivado" }, 400) });
    await userEvent.click(screen.getByRole("button", { name: "Registrar pago manual" }));
    await userEvent.selectOptions(screen.getByLabelText("Cliente"), "5");
    await userEvent.selectOptions(screen.getByLabelText("Plan"), "1");
    await userEvent.click(screen.getByRole("button", { name: /^Registrar pago de/ }));
    expect(await screen.findByText("El cliente está desactivado")).toBeInTheDocument();
  });

  it("cobra por la pasarela: crea el pago pendiente y abre la pasarela", async () => {
    const falso = await abrirAdmin({
      "POST /pagos/checkout": () => respuestaApi({ ...PAGOS[0], id: 10 }, 201),
      "GET /pagos/10": () => respuestaApi({ ...PAGOS[0], id: 10, usuario_documento: null, fecha_inicio: null, fecha_fin: null }),
    });
    await userEvent.click(screen.getByRole("button", { name: "Cobrar por pasarela" }));
    expect(screen.queryByLabelText("Método de pago")).not.toBeInTheDocument(); // la pasarela no pide método
    await userEvent.selectOptions(screen.getByLabelText("Cliente"), "5");
    await userEvent.selectOptions(screen.getByLabelText("Plan"), "2");
    await userEvent.click(screen.getByRole("button", { name: "Ir a la pasarela" }));

    expect(await screen.findByText("Pasarela de pagos (simulada)")).toBeInTheDocument();
    expect(llamadas(falso, "/pagos/checkout")[0].cuerpo).toEqual({ plan_id: 2, usuario_id: 5 });
  });

  it("anula un pago pidiendo un motivo de al menos 5 caracteres", async () => {
    const falso = await abrirAdmin({ "POST /pagos/2/anular": () => respuestaApi({ ...PAGOS[1], estado: "anulado" }) });
    await userEvent.click(screen.getByRole("button", { name: "Anular el pago 2" }));
    const confirmar = screen.getByRole("button", { name: "Confirmar anulación" });
    expect(confirmar).toBeDisabled();
    await userEvent.type(screen.getByLabelText("Motivo de la anulación"), "ab");
    expect(confirmar).toBeDisabled();
    await userEvent.type(screen.getByLabelText("Motivo de la anulación"), "cde");
    await userEvent.click(confirmar);

    expect(await screen.findByText(/Pago anulado/)).toBeInTheDocument();
    expect(llamadas(falso, "/pagos/2/anular")[0].cuerpo).toEqual({ motivo: "abcde" });
  });

  it("un cliente no puede abrir la pantalla de Pagos", async () => {
    conSesionDe("cliente");
    dibujarApp("/pagos");
    expect(await screen.findByRole("heading", { name: /permiso/i })).toBeInTheDocument();
  });
});

describe("Pantalla Pagar membresía (cliente)", () => {
  const MEMBRESIA = {
    estado: "por_vencer", puede_entrar: true, fecha_vencimiento: "2026-11-30", dias_restantes: 3, plan: "Mensual", membresias: [],
  };
  const MIS_PAGOS = [
    { ...pagoBase, id: 8, estado: "pendiente", metodo: "pasarela" },
    { ...pagoBase, id: 7, estado: "aprobado" },
  ];

  async function abrirCliente(extra = {}) {
    const falso = conSesionDe("cliente", {
      "GET /usuarios/1/membresia": () => respuestaApi(MEMBRESIA),
      "GET /usuarios/1/pagos": () => respuestaApi(MIS_PAGOS),
      "GET /planes": () => respuestaApi(PLANES),
      ...extra,
    });
    dibujarApp("/pagar");
    await screen.findByText("Estado de tu membresía");
    return falso;
  }

  it("muestra el estado, el vencimiento y los días restantes", async () => {
    await abrirCliente();
    expect(screen.getByText("Por vencer")).toBeInTheDocument();
    expect(screen.getByText("30/11/2026")).toBeInTheDocument();
    expect(screen.getByText("Vence en 3 días")).toBeInTheDocument();
    expect(screen.getByText(/se suman al final/)).toBeInTheDocument();
  });

  it("sin pagos explica que aún no tiene membresía", async () => {
    await abrirCliente({
      "GET /usuarios/1/membresia": () => respuestaApi({ estado: "sin_membresia", puede_entrar: false, fecha_vencimiento: null, dias_restantes: null, plan: null, membresias: [] }),
      "GET /usuarios/1/pagos": () => respuestaApi([]),
    });
    expect(screen.getByText("Sin membresía")).toBeInTheDocument();
    expect(screen.getByText(/Aún no tienes una membresía/)).toBeInTheDocument();
    expect(screen.getByText("Todavía no tienes pagos.")).toBeInTheDocument();
  });

  it("al pagar un plan crea el pago y abre la pasarela (sin enviar usuario_id)", async () => {
    const falso = await abrirCliente({
      "POST /pagos/checkout": () => respuestaApi({ ...PAGOS[0], id: 11 }, 201),
      "GET /pagos/11": () => respuestaApi({ ...PAGOS[0], id: 11, usuario_documento: null, fecha_inicio: null, fecha_fin: null }),
    });
    await userEvent.click(screen.getByRole("button", { name: "Pagar plan Trimestral" }));
    expect(await screen.findByText("Pasarela de pagos (simulada)")).toBeInTheDocument();
    expect(llamadas(falso, "/pagos/checkout")[0].cuerpo).toEqual({ plan_id: 2 });
  });

  it("el historial ofrece continuar un pago pendiente y ver el comprobante de uno aprobado", async () => {
    await abrirCliente();
    expect(screen.getByRole("link", { name: "Continuar el pago 8" })).toHaveAttribute("href", "/pasarela/8");
    expect(screen.getByRole("link", { name: "Ver comprobante del pago 7" })).toHaveAttribute("href", "/pagos/7/comprobante");
  });

  it("un administrador no puede abrir esta pantalla", async () => {
    conSesionDe("admin");
    dibujarApp("/pagar");
    expect(await screen.findByRole("heading", { name: /permiso/i })).toBeInTheDocument();
  });
});

describe("Pasarela simulada y comprobante", () => {
  const PENDIENTE = { ...pagoBase, id: 8, estado: "pendiente", metodo: "pasarela", referencia: "SIM-AB12", usuario_documento: "1010", fecha_inicio: null, fecha_fin: null };

  it("aprueba el pago pendiente y ofrece el comprobante", async () => {
    const falso = conSesionDe("cliente", {
      "GET /pagos/8": () => respuestaApi(PENDIENTE),
      "POST /pagos/8/simular": () => respuestaApi({ ...pagoBase, id: 8, estado: "aprobado", metodo: "pasarela" }),
    });
    dibujarApp("/pasarela/8");

    expect(await screen.findByText("Pasarela de pagos (simulada)")).toBeInTheDocument();
    expect(screen.getByText(/no se cobra dinero real/)).toBeInTheDocument();
    expect(screen.getByText("SIM-AB12")).toBeInTheDocument();
    expect(screen.getByText(pesos(90000))).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Aprobar pago" }));
    expect(await screen.findByText("Pago aprobado")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ver comprobante" })).toHaveAttribute("href", "/pagos/8/comprobante");
    expect(llamadas(falso, "/pagos/8/simular")[0].cuerpo).toEqual({ resultado: "aprobado" });
  });

  it("rechaza el pago y deja intentar de nuevo", async () => {
    const falso = conSesionDe("cliente", {
      "GET /pagos/8": () => respuestaApi(PENDIENTE),
      "POST /pagos/8/simular": () => respuestaApi({ ...pagoBase, id: 8, estado: "rechazado", metodo: "pasarela" }),
    });
    dibujarApp("/pasarela/8");
    await userEvent.click(await screen.findByRole("button", { name: "Rechazar pago" }));
    expect(await screen.findByText("Pago rechazado")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Intentar de nuevo" })).toHaveAttribute("href", "/pagar");
    expect(llamadas(falso, "/pagos/8/simular")[0].cuerpo).toEqual({ resultado: "rechazado" });
  });

  it("cancelar el pago lo rechaza y vuelve a Pagar membresía; 'Decidir después' no cambia nada", async () => {
    const falso = conSesionDe("cliente", {
      "GET /pagos/8": () => respuestaApi(PENDIENTE),
      "POST /pagos/8/cancelar": () => respuestaApi({ ...pagoBase, id: 8, estado: "rechazado" }),
      "GET /usuarios/1/membresia": () => respuestaApi({ estado: "sin_membresia", puede_entrar: false, fecha_vencimiento: null, dias_restantes: null, plan: null, membresias: [] }),
      "GET /usuarios/1/pagos": () => respuestaApi([]),
      "GET /planes": () => respuestaApi(PLANES),
    });
    dibujarApp("/pasarela/8");
    expect(await screen.findByRole("link", { name: "Decidir después" })).toHaveAttribute("href", "/pagar");
    await userEvent.click(screen.getByRole("button", { name: "Cancelar este pago" }));
    expect(await screen.findByRole("heading", { name: "Pagar membresía" })).toBeInTheDocument();
    expect(llamadas(falso, "/pagos/8/cancelar")).toHaveLength(1);
  });

  it("muestra el error si el pago no se puede decidir", async () => {
    conSesionDe("cliente", {
      "GET /pagos/8": () => respuestaApi(PENDIENTE),
      "POST /pagos/8/simular": () => respuestaApi({ detail: "Este pago ya no está pendiente." }, 409),
    });
    dibujarApp("/pasarela/8");
    await userEvent.click(await screen.findByRole("button", { name: "Aprobar pago" }));
    expect(await screen.findByText("Este pago ya no está pendiente.")).toBeInTheDocument();
  });

  it("para el administrador la pasarela vuelve a la pantalla Pagos", async () => {
    conSesionDe("admin", { "GET /pagos/8": () => respuestaApi({ ...PENDIENTE }) });
    dibujarApp("/pasarela/8");
    expect(await screen.findByRole("link", { name: "Decidir después" })).toHaveAttribute("href", "/pagos");
  });

  it("el comprobante muestra los datos del pago y la vigencia", async () => {
    conSesionDe("cliente", {
      "GET /pagos/7": () => respuestaApi({ ...pagoBase, id: 7, estado: "aprobado", usuario_documento: "1010", fecha_inicio: "2026-11-01", fecha_fin: "2026-11-30" }),
    });
    dibujarApp("/pagos/7/comprobante");
    expect(await screen.findByText("Comprobante de pago N.º 7")).toBeInTheDocument();
    expect(screen.getByText("1010")).toBeInTheDocument();
    expect(screen.getByText("01/11/2026 al 30/11/2026")).toBeInTheDocument();
    expect(screen.getByText(pesos(90000))).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Imprimir" })).toBeInTheDocument();
  });

  it("el comprobante de un pago anulado muestra el motivo y no tiene vigencia", async () => {
    conSesionDe("admin", {
      "GET /pagos/1": () => respuestaApi({ ...pagoBase, id: 1, estado: "anulado", motivo_anulacion: "Duplicado", usuario_documento: null, fecha_inicio: null, fecha_fin: null }),
    });
    dibujarApp("/pagos/1/comprobante");
    expect(await screen.findByText("Anulado: Duplicado")).toBeInTheDocument();
    expect(within(screen.getByText("Vigencia").parentElement).getByText("—")).toBeInTheDocument();
  });

  it("si el pago es de otra persona muestra el error del servidor", async () => {
    conSesionDe("cliente", { "GET /pagos/99": () => respuestaApi({ detail: "No tienes permiso para ver los datos de este usuario." }, 403) });
    dibujarApp("/pagos/99/comprobante");
    expect(await screen.findByText("No tienes permiso para ver los datos de este usuario.")).toBeInTheDocument();
  });
});
