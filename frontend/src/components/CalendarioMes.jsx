// Calendario del mes con los días de asistencia marcados. `diasAsistidos` es un Set de "AAAA-MM-DD".
import { armarMes } from "@/lib/asistencia";

const SEMANA = ["L", "M", "X", "J", "V", "S", "D"];

export function CalendarioMes({ hoy, diasAsistidos }) {
  const mes = armarMes(hoy);
  return (
    <div>
      <p className="mb-3 text-sm font-medium first-letter:uppercase">{mes.titulo}</p>
      <div className="grid max-w-xs grid-cols-7 gap-1 text-center text-xs" role="grid" aria-label={`Asistencia de ${mes.titulo}`}>
        {SEMANA.map((d) => (
          <span key={d} className="pb-1 text-muted-foreground">
            {d}
          </span>
        ))}
        {Array.from({ length: mes.huecos }, (_, i) => (
          <span key={`h${i}`} />
        ))}
        {mes.dias.map((dia) => {
          const vino = diasAsistidos.has(dia);
          const esHoy = dia === hoy;
          return (
            <span
              key={dia}
              data-asistio={vino ? "si" : "no"}
              title={vino ? `Asististe el ${dia}` : dia}
              className={[
                "flex aspect-square items-center justify-center rounded-md",
                vino ? "bg-primary font-semibold text-primary-foreground" : dia > hoy ? "text-muted-foreground/50" : "bg-muted/50",
                esHoy ? "ring-2 ring-primary ring-offset-1 ring-offset-background" : "",
              ].join(" ")}
            >
              {Number(dia.slice(8))}
            </span>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">Los días resaltados son los que viniste.</p>
    </div>
  );
}
