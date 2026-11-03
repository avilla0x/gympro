// Un campo de formulario completo: etiqueta + control + ayuda o error.
// El control (Input, Select...) se pasa como contenido y debe tener el mismo `id`.
//
//   <Campo id="telefono" etiqueta="Teléfono" ayuda="Con indicativo si es del exterior">
//     <Input id="telefono" value={...} onChange={...} />
//   </Campo>
import { Label } from "@/components/ui/label";

export function Campo({ id, etiqueta, obligatorio = false, ayuda, error, children }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>
        {etiqueta}
        {obligatorio && (
          <span className="ml-0.5 text-destructive" aria-hidden="true">
            *
          </span>
        )}
      </Label>
      {children}
      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : (
        ayuda && <p className="text-xs text-muted-foreground">{ayuda}</p>
      )}
    </div>
  );
}
