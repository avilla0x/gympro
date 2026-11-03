// Pantalla "Editar usuario" (solo administrador): datos, estado y contraseña temporal de una persona.
import { AlertCircle, ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { obtenerUsuario } from "@/api/usuarios";
import { BotonEstadoUsuario } from "@/components/BotonEstadoUsuario";
import { FormularioUsuario } from "@/components/FormularioUsuario";
import { TarjetaPasswordTemporal } from "@/components/TarjetaPasswordTemporal";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/AuthContext";
import { formatearFechaHora } from "@/lib/formato";
import { ETIQUETAS_ROL } from "@/lib/roles";

export default function PaginaUsuarioEditar() {
  const { id } = useParams(); // el número que viene en la dirección: /usuarios/12
  const { usuario: yo, actualizarSesion } = useAuth();

  const [usuario, setUsuario] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [guardado, setGuardado] = useState(false);

  useEffect(() => {
    let cancelado = false;
    setCargando(true);
    obtenerUsuario(id)
      .then((datos) => !cancelado && setUsuario(datos))
      .catch((falla) => !cancelado && setError(falla.message))
      .finally(() => !cancelado && setCargando(false));
    return () => {
      cancelado = true;
    };
  }, [id]);

  // Si el administrador se edita a sí mismo, también se actualizan los datos de su sesión (menú, nombre...).
  const alActualizar = (actualizado) => {
    setUsuario(actualizado);
    if (actualizado.id === yo.id) actualizarSesion(actualizado);
  };

  const volver = (
    <Link to="/usuarios" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
      <ArrowLeft className="size-4" aria-hidden="true" />
      Volver a usuarios
    </Link>
  );

  if (cargando) {
    return (
      <div role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        Cargando usuario…
      </div>
    );
  }

  if (!usuario) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        {volver}
        <Alert variant="error">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>{error || "No se pudo cargar el usuario."}</span>
        </Alert>
      </div>
    );
  }

  const esYo = usuario.id === yo.id;

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        {volver}
        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{usuario.nombre}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="primario">{ETIQUETAS_ROL[usuario.rol] ?? usuario.rol}</Badge>
              <Badge variant={usuario.activo ? "exito" : "peligro"}>{usuario.activo ? "Activo" : "Desactivado"}</Badge>
              {usuario.codigo && <span className="font-mono text-xs">{usuario.codigo}</span>}
              <span>· Creado el {formatearFechaHora(usuario.creado_en)}</span>
            </div>
          </div>
          <BotonEstadoUsuario usuario={usuario} esUsuarioActual={esYo} onCambio={alActualizar} onError={setError} size="default" />
        </div>
      </div>

      {error && (
        <Alert variant="error">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </Alert>
      )}
      {guardado && (
        <Alert variant="exito">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>Cambios guardados.</span>
        </Alert>
      )}

      {/* `key` hace que el formulario se reinicie con los datos nuevos después de guardar o de cambiar el estado */}
      <FormularioUsuario
        key={JSON.stringify(usuario)}
        modo="editar"
        usuarioInicial={usuario}
        esUsuarioActual={esYo}
        onGuardado={(actualizado) => {
          setError("");
          setGuardado(true);
          alActualizar(actualizado);
        }}
      />

      <TarjetaPasswordTemporal usuario={usuario} />
    </div>
  );
}
