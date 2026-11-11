// Las 4 tarjetas de constancia del cliente (racha, mejor racha, cumplimiento del mes y días asistidos).
// Las usan «Mi historial» y, más adelante, el dashboard de progreso.
import { Flame, Percent, Trophy, CalendarCheck } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { textoRacha } from "@/lib/asistencia";

function Tarjeta({ icono: Icono, titulo, valor, detalle }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Icono className="size-4" aria-hidden="true" />
          {titulo}
        </div>
        <p className="mt-2 text-2xl font-bold">{valor}</p>
        <p className="mt-1 text-xs text-muted-foreground">{detalle}</p>
      </CardContent>
    </Card>
  );
}

export function TarjetasConstancia({ metricas }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Tarjeta icono={Flame} titulo="Racha actual" valor={textoRacha(metricas.racha_actual)} detalle="Días seguidos que has venido" />
      <Tarjeta icono={Trophy} titulo="Mejor racha" valor={textoRacha(metricas.mejor_racha)} detalle="Tu récord de días seguidos" />
      <Tarjeta
        icono={Percent}
        titulo="Cumplimiento del mes"
        valor={`${metricas.cumplimiento_mes} %`}
        detalle={`${metricas.dias_asistidos_mes} de ${metricas.dias_transcurridos_mes} días transcurridos`}
      />
      <Tarjeta icono={CalendarCheck} titulo="Días asistidos" valor={metricas.total_dias_asistidos} detalle="En total desde que eres cliente" />
    </div>
  );
}
