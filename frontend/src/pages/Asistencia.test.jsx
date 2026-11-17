// Pruebas de asistencia: recepción, historial del administrador, registro de entrada y historial del cliente.
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { USUARIOS_PRUEBA, conSesionDe, dibujarApp, llamadas, respuestaApi, simularServidor } from "@/pruebas/ayudas";

const ENTRADAS = [
  { id: 2, usuario_id: 5, usuario_nombre: "Beto Pérez", usuario_codigo: "GP-000005", fecha: "2026-11-10", registrada_en: "2026-11-10T14:30:00Z", metodo: "qr" },
  { id: 1, usuario_id: 6, usuario_nombre: "Carla Ruiz", usuario_codigo: "GP-000006", fecha: "2026-11-09", registrada_en: "2026-11-09T12:00:00Z", metodo: "manual" },
];
const CLIENTES = { items: [{ id: 5, nombre: "Beto Pérez", codigo: "GP-000005" }, { id: 6, nombre: "Carla Ruiz", codigo: "GP-000006" }] };
const METRICAS = {
  racha_actual: 3, mejor_racha: 5, dias_asistidos_mes: 6, dias_transcurridos_mes: 10, dias_en_el_mes: 30,
  cumplimiento_mes: 60, entradas_mes: 7, total_dias_asistidos: 12, ultima_asistencia: "2026-11-10", dias_sin_asistir: 0,
};

describe("Menú", () => {
  it("el administrador ve Recepción y Asistencias; el cliente, Registrar entrada y Mi historial", async () => {
    conSesionDe("admin");
    const { unmount } = dibujarApp("/");
    let menu = await screen.findByRole("navigation", { name: "Menú principal" });
    expect(within(menu).getByRole("link", { name: "Recepción" })).toHaveAttribute("href", "/recepcion");
    expect(within(menu).getByRole("link", { name: "Asistencias" })).toHaveAttribute("href", "/asistencias");
    unmount();

    conSesionDe("cliente");
    dibujarApp("/");
    menu = await screen.findByRole("navigation", { name: "Menú principal" });
    expect(within(menu).getByRole("link", { name: "Registrar entrada" })).toHaveAttribute("href", "/checkin");
    expect(within(menu).getByRole("link", { name: "Mi historial" })).toHaveAttribute("href", "/mi-historial");
  });
});

describe("Recepción (administrador)", () => {
  const rutas = (extra = {}) => ({
    "GET /asistencias/qr": () => respuestaApi({ codigo: "GYMPRO-ENTRADA", url: "http://localhost:5173/checkin?codigo=GYMPRO-ENTRADA" }),
    "GET /usuarios": () => respuestaApi(CLIENTES),
    "GET /asistencias": () => respuestaApi(ENTRADAS),
    ...extra,
  });

  it("muestra el QR con su código y las entradas de hoy", async () => {
    conSesionDe("admin", rutas());
    dibujarApp("/recepcion");
    expect(await screen.findByTitle("QR de entrada de GymPro")).toBeInTheDocument();
    expect(screen.getByText("GYMPRO-ENTRADA")).toBeInTheDocument();
    expect(await screen.findByText("2 entradas hoy")).toBeInTheDocument();
    expect(screen.getByText("Beto Pérez")).toBeInTheDocument();
  });

  it("pide solo las entradas de hoy", async () => {
    const falso = conSesionDe("admin", rutas());
    dibujarApp("/recepcion");
    await screen.findByText("2 entradas hoy");
    const consulta = llamadas(falso, "/asistencias?")[0];
    expect(consulta.ruta).toMatch(/desde=(\d{4}-\d{2}-\d{2})&hasta=\1/); // mismo día en ambos
  });

  it("registra una entrada a mano y recarga la lista", async () => {
    const falso = conSesionDe("admin", rutas({
      "POST /asistencias/manual": () => respuestaApi({ ...ENTRADAS[0] }, 201),
    }));
    dibujarApp("/recepcion");
    await screen.findByText("2 entradas hoy");
    const boton = screen.getByRole("button", { name: "Registrar entrada" });
    expect(boton).toBeDisabled();
    await userEvent.selectOptions(screen.getByLabelText("Cliente"), "5");
    await userEvent.click(boton);
    expect(await screen.findByText("Entrada registrada: Beto Pérez.")).toBeInTheDocument();
    expect(llamadas(falso, "/asistencias/manual")[0].cuerpo).toEqual({ usuario_id: 5 });
  });

  it("muestra el motivo cuando el cliente no puede entrar", async () => {
    conSesionDe("admin", rutas({
      "POST /asistencias/manual": () => respuestaApi({ detail: "Tu membresía venció el 30/11/2026. Renuévala para poder entrar." }, 403),
    }));
    dibujarApp("/recepcion");
    await screen.findByText("2 entradas hoy");
    await userEvent.selectOptions(screen.getByLabelText("Cliente"), "6");
    await userEvent.click(screen.getByRole("button", { name: "Registrar entrada" }));
    expect(await screen.findByText(/venció el 30\/11\/2026/)).toBeInTheDocument();
  });

  it("el cliente no puede abrir Recepción", async () => {
    conSesionDe("cliente");
    dibujarApp("/recepcion");
    expect(await screen.findByText(/no tienes permiso/i)).toBeInTheDocument();
  });
});

describe("Asistencias (administrador)", () => {
  it("filtra por cliente y fechas", async () => {
    const falso = conSesionDe("admin", {
      "GET /usuarios": () => respuestaApi(CLIENTES),
      "GET /asistencias": () => respuestaApi(ENTRADAS),
    });
    dibujarApp("/asistencias");
    expect(await screen.findByText("2 entradas")).toBeInTheDocument();
    await userEvent.selectOptions(screen.getByLabelText("Cliente"), "5");
    await waitFor(() => expect(llamadas(falso, "/asistencias?").some((l) => l.ruta.includes("usuario_id=5"))).toBe(true));
    await userEvent.type(screen.getByLabelText("Desde"), "2026-11-01");
    await waitFor(() => expect(llamadas(falso, "/asistencias?").some((l) => l.ruta.includes("desde=2026-11-01"))).toBe(true));
  });

  it("avisa cuando no hay resultados", async () => {
    conSesionDe("admin", { "GET /usuarios": () => respuestaApi(CLIENTES), "GET /asistencias": () => respuestaApi([]) });
    dibujarApp("/asistencias");
    expect(await screen.findByText("No hay entradas con esos filtros.")).toBeInTheDocument();
  });
});

describe("Registrar entrada (cliente)", () => {
  const ENTRADA = { id: 9, usuario_id: 1, usuario_nombre: "Ana Gómez", usuario_codigo: "GP-000001", fecha: "2026-11-11", registrada_en: "2026-11-11T14:00:00Z", metodo: "qr" };

  it("al llegar desde el QR registra la entrada sola y muestra la racha", async () => {
    const falso = conSesionDe("cliente", {
      "POST /asistencias/checkin": () => respuestaApi(ENTRADA, 201),
      "GET /usuarios/1/asistencia/metricas": () => respuestaApi(METRICAS),
    });
    dibujarApp("/checkin?codigo=GYMPRO-ENTRADA");
    expect(await screen.findByText("¡Entrada registrada!")).toBeInTheDocument();
    expect(await screen.findByText("3 días")).toBeInTheDocument();
    expect(llamadas(falso, "/asistencias/checkin")).toHaveLength(1);
    expect(llamadas(falso, "/asistencias/checkin")[0].cuerpo).toEqual({ codigo: "GYMPRO-ENTRADA" });
  });

  it("sin código en el enlace no registra nada hasta que la persona lo pida", async () => {
    const falso = conSesionDe("cliente", {
      "POST /asistencias/checkin": () => respuestaApi(ENTRADA, 201),
      "GET /usuarios/1/asistencia/metricas": () => respuestaApi(METRICAS),
    });
    dibujarApp("/checkin");
    await screen.findByRole("heading", { name: "Registrar entrada" });
    expect(llamadas(falso, "/asistencias/checkin")).toHaveLength(0);
    expect(screen.getByRole("button", { name: "Registrar entrada" })).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: /Simular escaneo/ }));
    expect(await screen.findByText("¡Entrada registrada!")).toBeInTheDocument();
  });

  it("escribe el código a mano", async () => {
    const falso = conSesionDe("cliente", {
      "POST /asistencias/checkin": () => respuestaApi(ENTRADA, 201),
      "GET /usuarios/1/asistencia/metricas": () => respuestaApi(METRICAS),
    });
    dibujarApp("/checkin");
    await userEvent.type(await screen.findByLabelText("Código del QR"), "GYMPRO-ENTRADA");
    await userEvent.click(screen.getByRole("button", { name: "Registrar entrada" }));
    await screen.findByText("¡Entrada registrada!");
    expect(llamadas(falso, "/asistencias/checkin")[0].cuerpo).toEqual({ codigo: "GYMPRO-ENTRADA" });
  });

  it("si está en mora muestra el motivo y un enlace para pagar", async () => {
    conSesionDe("cliente", {
      "POST /asistencias/checkin": () => respuestaApi({ detail: "Tu membresía venció el 30/11/2026. Renuévala para poder entrar." }, 403),
    });
    dibujarApp("/checkin?codigo=GYMPRO-ENTRADA");
    expect(await screen.findByText(/venció el 30\/11\/2026/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ir a pagar mi membresía" })).toHaveAttribute("href", "/pagar");
    expect(screen.queryByText("¡Entrada registrada!")).not.toBeInTheDocument();
  });

  it("con un QR inválido muestra el error sin enlace de pago", async () => {
    conSesionDe("cliente", {
      "POST /asistencias/checkin": () => respuestaApi({ detail: "El código QR no es válido. Escanea el QR de la entrada del gimnasio." }, 400),
    });
    dibujarApp("/checkin?codigo=FALSO");
    expect(await screen.findByText(/código QR no es válido/)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Ir a pagar mi membresía" })).not.toBeInTheDocument();
  });

  it("el administrador no puede abrir el check-in", async () => {
    conSesionDe("admin");
    dibujarApp("/checkin");
    expect(await screen.findByText(/no tienes permiso/i)).toBeInTheDocument();
  });
});

describe("Mi historial (cliente)", () => {
  it("muestra la constancia y la lista de entradas", async () => {
    conSesionDe("cliente", {
      "GET /usuarios/1/asistencia/metricas": () => respuestaApi(METRICAS),
      "GET /usuarios/1/asistencias": () => respuestaApi(ENTRADAS),
    });
    dibujarApp("/mi-historial");
    expect(await screen.findByText("Racha actual")).toBeInTheDocument();
    expect(screen.getByText("60 %")).toBeInTheDocument();
    expect(screen.getByText("6 de 10 días transcurridos")).toBeInTheDocument();
    expect(screen.getByText("5 días")).toBeInTheDocument(); // mejor racha
    expect(await screen.findAllByText("Código QR")).not.toHaveLength(0);
    expect(screen.getByText("Recepción")).toBeInTheDocument();
  });

  it("filtra por fechas", async () => {
    const falso = conSesionDe("cliente", {
      "GET /usuarios/1/asistencia/metricas": () => respuestaApi(METRICAS),
      "GET /usuarios/1/asistencias": () => respuestaApi(ENTRADAS),
    });
    dibujarApp("/mi-historial");
    await screen.findByText("Racha actual");
    await userEvent.type(screen.getByLabelText("Hasta"), "2026-11-09");
    await waitFor(() => expect(llamadas(falso, "/usuarios/1/asistencias?").some((l) => l.ruta.includes("hasta=2026-11-09"))).toBe(true));
  });

  it("sin entradas lo dice", async () => {
    conSesionDe("cliente", {
      "GET /usuarios/1/asistencia/metricas": () => respuestaApi({ ...METRICAS, racha_actual: 0, total_dias_asistidos: 0, cumplimiento_mes: 0, dias_asistidos_mes: 0 }),
      "GET /usuarios/1/asistencias": () => respuestaApi([]),
    });
    dibujarApp("/mi-historial");
    expect(await screen.findByText("No hay entradas registradas en ese periodo.")).toBeInTheDocument();
    expect(screen.getByText(/empezar tu racha/)).toBeInTheDocument();
  });
});

describe("Aviso de recordatorio de asistencia", () => {
  it("lleva a registrar la entrada", async () => {
    const aviso = { id: 4, tipo: "recordatorio_asistencia", titulo: "Te extrañamos en el gimnasio", mensaje: "Llevas 7 días sin entrenar.", referencia: "2026-11-02", leida: false, creado_en: "2026-11-09T11:00:00Z" };
    conSesionDe("cliente", { "GET /avisos": () => respuestaApi({ no_leidas: 1, items: [aviso] }) });
    dibujarApp("/avisos");
    expect(await screen.findByText("Te extrañamos en el gimnasio")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Registrar mi entrada" })).toHaveAttribute("href", "/checkin");
  });
});

describe("Entrar con el QR sin sesión", () => {
  it("después de iniciar sesión conserva el código del QR y registra la entrada", async () => {
    const ENTRADA = { id: 9, usuario_id: 1, usuario_nombre: "Ana Gómez", usuario_codigo: "GP-000001", fecha: "2026-11-11", registrada_en: "2026-11-11T14:00:00Z", metodo: "qr" };
    const falso = simularServidorSinSesion(ENTRADA);
    dibujarApp("/checkin?codigo=GYMPRO-ENTRADA");
    await userEvent.type(await screen.findByLabelText("Correo electrónico"), "ana@gympro.com");
    await userEvent.type(document.querySelector("#password"), "Clave1234");
    await userEvent.click(screen.getByRole("button", { name: /Iniciar sesión|Ingresar|Entrar/ }));
    expect(await screen.findByText("¡Entrada registrada!")).toBeInTheDocument();
    expect(llamadas(falso, "/asistencias/checkin")[0].cuerpo).toEqual({ codigo: "GYMPRO-ENTRADA" });
  });
});

function simularServidorSinSesion(entrada) {
  localStorage.clear();
  return simularServidor({
    "POST /auth/login": () => respuestaApi({ access_token: "token-cliente", token_type: "bearer", usuario: USUARIOS_PRUEBA.cliente }),
    "/auth/me": () => respuestaApi(USUARIOS_PRUEBA.cliente),
    "GET /avisos": () => respuestaApi({ no_leidas: 0, items: [] }),
    "POST /asistencias/checkin": () => respuestaApi(entrada, 201),
    "GET /usuarios/1/asistencia/metricas": () => respuestaApi(METRICAS),
  });
}

describe("Mi progreso (cliente)", () => {
  const MEMBRESIA = { estado: "al_dia", puede_entrar: true, fecha_vencimiento: "2026-12-30", dias_restantes: 43, plan: "Mensual" };
  const rutas = (membresia = MEMBRESIA, entradas = ENTRADAS) => ({
    "GET /usuarios/1/membresia": () => respuestaApi(membresia),
    "GET /usuarios/1/asistencia/metricas": () => respuestaApi(METRICAS),
    "GET /usuarios/1/asistencias": () => respuestaApi(entradas),
  });

  it("junta membresía, constancia y calendario del mes", async () => {
    conSesionDe("cliente", rutas());
    dibujarApp("/mi-progreso");
    expect(await screen.findByText("Mi membresía")).toBeInTheDocument();
    expect(screen.getByText("Al día")).toBeInTheDocument();
    expect(screen.getByText("Mensual")).toBeInTheDocument();
    expect(screen.getByText("Racha actual")).toBeInTheDocument();
    expect(screen.getByText("60 %")).toBeInTheDocument();
    const calendario = screen.getByRole("grid");
    expect(within(calendario).getAllByTitle(/^Asististe el/).length).toBeGreaterThan(0);
    expect(within(screen.getByRole("main")).getByRole("link", { name: "Registrar entrada" })).toHaveAttribute("href", "/checkin");
  });

  it("pide solo las visitas del mes actual", async () => {
    const falso = conSesionDe("cliente", rutas());
    dibujarApp("/mi-progreso");
    await screen.findByText("Mi membresía");
    const consulta = llamadas(falso, "/usuarios/1/asistencias?")[0];
    expect(consulta.ruta).toMatch(/desde=\d{4}-\d{2}-01&hasta=\d{4}-\d{2}-\d{2}/);
  });

  it("si está en mora ofrece pagar en vez de registrar entrada", async () => {
    conSesionDe("cliente", rutas({ estado: "en_mora", puede_entrar: false, fecha_vencimiento: "2026-10-30", dias_restantes: -12, plan: "Mensual" }, []));
    dibujarApp("/mi-progreso");
    await screen.findByText("Mi membresía");
    const principal = within(screen.getByRole("main"));
    expect(principal.getByRole("link", { name: "Pagar membresía" })).toHaveAttribute("href", "/pagar");
    expect(principal.queryByRole("link", { name: "Registrar entrada" })).not.toBeInTheDocument();
    expect(screen.queryByText("Últimas visitas")).not.toBeInTheDocument();
  });

  it("sin membresía lo dice", async () => {
    conSesionDe("cliente", rutas({ estado: "sin_membresia", puede_entrar: false, fecha_vencimiento: null, dias_restantes: null, plan: null }, []));
    dibujarApp("/mi-progreso");
    expect(await screen.findByText("Aún no tienes una membresía.")).toBeInTheDocument();
  });

  it("muestra el error si falla la carga", async () => {
    conSesionDe("cliente", { ...rutas(), "GET /usuarios/1/membresia": () => respuestaApi({ detail: "No se pudo cargar" }, 500) });
    dibujarApp("/mi-progreso");
    expect(await screen.findByText("No se pudo cargar")).toBeInTheDocument();
  });

  it("el administrador no puede abrir Mi progreso", async () => {
    conSesionDe("admin");
    dibujarApp("/mi-progreso");
    expect(await screen.findByText(/no tienes permiso/i)).toBeInTheDocument();
  });
});
