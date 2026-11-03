// Pantalla "Nuevo usuario" (solo administrador).
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

import { FormularioUsuario } from "@/components/FormularioUsuario";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ETIQUETAS_ROL } from "@/lib/roles";

export default function PaginaUsuarioNuevo() {
  const [creado, setCreado] = useState(null); // el usuario recién creado
  const [version, setVersion] = useState(0); // al cambiar, el formulario se vacía (se vuelve a crear desde cero)

  return (
    <div className="mx-auto max-w-3xl">
      <Link to="/usuarios" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden="true" />
        Volver a usuarios
      </Link>
      <h1 className="mt-4 text-2xl font-bold tracking-tight">Nuevo usuario</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        La persona podrá iniciar sesión con su correo y la contraseña temporal que definas aquí.
      </p>

      {creado && (
        <Alert variant="exito" className="mt-6">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <div className="space-y-3">
            <p>
              <strong>{creado.nombre}</strong> fue creado como {ETIQUETAS_ROL[creado.rol]?.toLowerCase()}.
              {creado.codigo && (
                <>
                  {" "}
                  Su código es <strong className="font-mono">{creado.codigo}</strong>.
                </>
              )}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button asChild size="sm" variant="outline">
                <Link to={`/usuarios/${creado.id}`}>Ver usuario</Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link to="/usuarios">Ir a la lista</Link>
              </Button>
            </div>
          </div>
        </Alert>
      )}

      <div className="mt-8">
        {/* `key` fuerza a React a crear un formulario nuevo y vacío después de cada usuario creado */}
        <FormularioUsuario
          key={version}
          modo="crear"
          onGuardado={(usuario) => {
            setCreado(usuario);
            setVersion((v) => v + 1);
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        />
      </div>
    </div>
  );
}
