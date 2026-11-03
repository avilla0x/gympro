// Diseño compartido por las pantallas de acceso (login, recuperar y restablecer contraseña):
// en pantallas grandes, un panel de marca a la izquierda y el formulario a la derecha;
// en celulares, solo el formulario con el logo arriba.
import { CalendarCheck, QrCode, TrendingUp } from "lucide-react";

import { Logo } from "@/components/Logo";
import { ToggleTema } from "@/components/ToggleTema";

const BENEFICIOS = [
  { icono: QrCode, texto: "Entrada rápida con tu código QR" },
  { icono: CalendarCheck, texto: "Tu asistencia y tu racha, siempre a la vista" },
  { icono: TrendingUp, texto: "Membresía y pagos bajo control" },
];

export function LayoutAuth({ titulo, descripcion, children }) {
  return (
    <div className="grid min-h-svh lg:grid-cols-[1.05fr_1fr]">
      {/* Panel de marca: solo se ve en pantallas grandes */}
      <aside className="relative hidden overflow-hidden bg-[#0b0b0f] p-12 text-white lg:flex lg:flex-col lg:justify-between">
        {/* Resplandores naranjas decorativos */}
        <div aria-hidden="true" className="pointer-events-none absolute -left-24 -top-24 size-96 rounded-full bg-orange-500/25 blur-3xl" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-32 -right-16 size-[28rem] rounded-full bg-orange-600/20 blur-3xl" />

        <Logo className="relative text-white" />

        <div className="relative max-w-md">
          <h2 className="text-4xl font-extrabold leading-tight tracking-tight">
            Entrena. Mide.
            <br />
            <span className="text-orange-400">Supera tus metas.</span>
          </h2>
          <p className="mt-4 text-base text-zinc-400">
            La plataforma de GymPro Fitness Center para gestionar tu membresía y seguir tu constancia.
          </p>
          <ul className="mt-8 space-y-4">
            {BENEFICIOS.map(({ icono: Icono, texto }) => (
              <li key={texto} className="flex items-center gap-3 text-sm text-zinc-300">
                <span className="flex size-9 items-center justify-center rounded-lg bg-white/5 ring-1 ring-white/10">
                  <Icono className="size-4 text-orange-400" aria-hidden="true" />
                </span>
                {texto}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-zinc-500">© {new Date().getFullYear()} GymPro Fitness Center</p>
      </aside>

      {/* Zona del formulario */}
      <main className="relative flex flex-col items-center justify-center px-6 py-12">
        <div className="absolute right-4 top-4">
          <ToggleTema />
        </div>

        <div className="w-full max-w-sm">
          {/* El logo de arriba solo aparece en celulares (en pantallas grandes ya está en el panel) */}
          <Logo className="mb-10 lg:hidden" />

          <h1 className="text-2xl font-bold tracking-tight">{titulo}</h1>
          {descripcion && <p className="mt-2 text-sm text-muted-foreground">{descripcion}</p>}

          <div className="mt-8">{children}</div>
        </div>
      </main>
    </div>
  );
}
