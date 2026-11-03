// Pantalla "Planes" (solo administrador): los tres planes de membresía y su precio.
// Los planes son fijos (mensual, trimestral y anual): aquí solo se puede cambiar el PRECIO.
import { AlertCircle, CalendarClock, CheckCircle2, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

import { cambiarPrecioPlan, listarPlanes } from "@/api/planes";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatearPesos } from "@/lib/formato";

const PRECIO_MAXIMO = 100_000_000; // el mismo tope de seguridad que el servidor

export default function PaginaPlanes() {
  const [planes, setPlanes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [guardadoId, setGuardadoId] = useState(null); // el plan cuyo precio se acaba de guardar

  useEffect(() => {
    let cancelado = false;
    listarPlanes()
      .then((datos) => !cancelado && setPlanes(datos))
      .catch((falla) => !cancelado && setError(falla.message))
      .finally(() => !cancelado && setCargando(false));
    return () => {
      cancelado = true;
    };
  }, []);

  // Cuando se guarda un precio, se reemplaza ese plan en la lista.
  const alGuardar = (actualizado) => {
    setPlanes((lista) => lista.map((p) => (p.id === actualizado.id ? actualizado : p)));
    setGuardadoId(actualizado.id);
    setError("");
  };

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-bold tracking-tight">Planes de membresía</h1>
      <p className="mt-1 text-sm text-muted-foreground">Los tres planes del gimnasio. Aquí puedes ajustar el precio de cada uno.</p>

      {error && (
        <Alert variant="error" className="mt-6">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </Alert>
      )}

      {cargando ? (
        <p role="status" className="mt-10 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          Cargando planes…
        </p>
      ) : (
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {planes.map((plan) => (
            <TarjetaPlan
              key={plan.id}
              plan={plan}
              recienGuardado={guardadoId === plan.id}
              onGuardado={alGuardar}
              onError={setError}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Un plan: su nombre, duración y precio, con el botón para cambiar el precio.
function TarjetaPlan({ plan, recienGuardado, onGuardado, onError }) {
  const [editando, setEditando] = useState(false);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);

  const nuevoPrecio = texto === "" ? null : Number(texto);
  const valido = nuevoPrecio !== null && nuevoPrecio >= 1 && nuevoPrecio <= PRECIO_MAXIMO && nuevoPrecio !== plan.precio;

  function empezarEdicion() {
    onError("");
    setTexto(String(plan.precio));
    setEditando(true);
  }

  async function guardar(evento) {
    evento.preventDefault();
    setEnviando(true);
    try {
      onGuardado(await cambiarPrecioPlan(plan.id, nuevoPrecio));
      setEditando(false);
    } catch (falla) {
      onError(falla.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          {plan.nombre}
          <span className="flex items-center gap-1.5 text-xs font-normal text-muted-foreground">
            <CalendarClock className="size-3.5" aria-hidden="true" />
            {plan.duracion_dias} días
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {editando ? (
          <form onSubmit={guardar} className="space-y-3" noValidate>
            <div className="space-y-2">
              <Label htmlFor={`precio-${plan.id}`}>Nuevo precio de {plan.nombre} (en pesos)</Label>
              <Input
                id={`precio-${plan.id}`}
                inputMode="numeric"
                value={texto}
                // Solo se aceptan dígitos: cualquier otro carácter se descarta al escribir.
                onChange={(e) => setTexto(e.target.value.replace(/\D/g, ""))}
                autoFocus
              />
              <p className="text-sm text-muted-foreground" aria-live="polite">
                {nuevoPrecio ? formatearPesos(nuevoPrecio) : "Escribe un precio"}
              </p>
            </div>
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={!valido || enviando}>
                {enviando && <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />}
                Guardar
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setEditando(false)} disabled={enviando}>
                Cancelar
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <p className="text-3xl font-extrabold tracking-tight">{formatearPesos(plan.precio)}</p>
            {recienGuardado && (
              <p className="flex items-center gap-1.5 text-xs text-success" role="status">
                <CheckCircle2 className="size-3.5" aria-hidden="true" />
                Precio actualizado
              </p>
            )}
            <Button variant="outline" size="sm" onClick={empezarEdicion} aria-label={`Cambiar el precio de ${plan.nombre}`}>
              Cambiar precio
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
