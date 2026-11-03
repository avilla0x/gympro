// Pantalla que se muestra cuando alguien intenta entrar a una sección que su rol no permite.
import { ShieldAlert } from "lucide-react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";

export default function PaginaSinPermiso() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <ShieldAlert className="size-7" aria-hidden="true" />
      </span>
      <h1 className="mt-6 text-2xl font-bold tracking-tight">No tienes permiso para ver esta sección</h1>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        Tu rol no incluye esta pantalla. Si crees que es un error, habla con el administrador del gimnasio.
      </p>
      <Button asChild className="mt-6">
        <Link to="/">Volver al inicio</Link>
      </Button>
    </div>
  );
}
