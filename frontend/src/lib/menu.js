// Definición del MENÚ LATERAL: qué ve cada rol. Es el único lugar donde se decide.
//
// Cómo agregar una pantalla nueva al menú cuando se construya su HU:
//   1. Cambiar `disponible: false` por `disponible: true` en su ítem de abajo.
//   2. Agregar su <Route> en App.jsx, envuelta en <RutaPorRol roles={[...]}> con los MISMOS roles.
//   3. Crear la pantalla en src/pages/.
//
// Campos de cada ítem:
//   ruta        → dirección de la pantalla
//   etiqueta    → texto que se ve en el menú
//   icono       → ícono de lucide-react
//   roles       → quién lo ve (null = todos los roles)
//   disponible  → true: ya existe la pantalla · false: se muestra deshabilitado con la etiqueta "Pronto"
//
// IMPORTANTE: esto solo decide qué se MUESTRA. El backend es quien realmente impide el acceso
// (ver docs/permisos.md); nunca se confía en el frontend para la seguridad.
import {
  Bell,
  CalendarCheck,
  ChartColumn,
  ClipboardList,
  CreditCard,
  Dumbbell,
  History,
  House,
  LayoutDashboard,
  Activity,
  Ruler,
  ScanLine,
  Tags,
  UserRound,
  Users,
} from "lucide-react";

export const ITEMS_MENU = [
  // --- Para todos ---
  { ruta: "/", etiqueta: "Inicio", icono: House, roles: null, disponible: true },

  // --- Administrador ---
  { ruta: "/dashboard", etiqueta: "Dashboard", icono: LayoutDashboard, roles: ["admin"], disponible: false },
  { ruta: "/recepcion", etiqueta: "Recepción", icono: ScanLine, roles: ["admin"], disponible: true },
  { ruta: "/asistencias", etiqueta: "Asistencias", icono: CalendarCheck, roles: ["admin"], disponible: true },
  { ruta: "/usuarios", etiqueta: "Usuarios", icono: Users, roles: ["admin"], disponible: true },
  { ruta: "/planes", etiqueta: "Planes", icono: Tags, roles: ["admin"], disponible: true },
  { ruta: "/pagos", etiqueta: "Pagos", icono: CreditCard, roles: ["admin"], disponible: true },
  { ruta: "/reportes", etiqueta: "Reportes", icono: ChartColumn, roles: ["admin"], disponible: false },

  // --- Entrenador ---
  { ruta: "/mis-clientes", etiqueta: "Mis clientes", icono: Users, roles: ["entrenador"], disponible: false },
  { ruta: "/rutinas", etiqueta: "Rutinas", icono: ClipboardList, roles: ["entrenador"], disponible: false },
  { ruta: "/medidas", etiqueta: "Medidas", icono: Ruler, roles: ["entrenador"], disponible: false },

  // --- Cliente ---
  { ruta: "/mi-progreso", etiqueta: "Mi progreso", icono: Activity, roles: ["cliente"], disponible: true },
  { ruta: "/checkin", etiqueta: "Registrar entrada", icono: ScanLine, roles: ["cliente"], disponible: true },
  { ruta: "/mi-historial", etiqueta: "Mi historial", icono: History, roles: ["cliente"], disponible: true },
  { ruta: "/mi-rutina", etiqueta: "Mi rutina", icono: Dumbbell, roles: ["cliente"], disponible: false },
  { ruta: "/pagar", etiqueta: "Pagar membresía", icono: CreditCard, roles: ["cliente"], disponible: true },

  // --- Administrador y cliente: avisos del sistema (vencimientos) ---
  { ruta: "/avisos", etiqueta: "Avisos", icono: Bell, roles: ["admin", "cliente"], disponible: true },

  // --- Para todos ---
  { ruta: "/perfil", etiqueta: "Mi perfil", icono: UserRound, roles: null, disponible: true },
];

// Los ítems del menú que le corresponden a un rol, en el orden de la lista.
export function itemsParaRol(rol) {
  return ITEMS_MENU.filter((item) => item.roles === null || item.roles.includes(rol));
}
