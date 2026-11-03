// Pantalla "Mi perfil" (todos los roles): ver los datos de la cuenta, editar los de contacto y cambiar la contraseña.
// Los datos de identidad (nombre, correo, documento, rol) solo los cambia el administrador.
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { useState } from "react";

import { actualizarMiPerfil } from "@/api/auth";
import { Campo } from "@/components/Campo";
import { TarjetaCambiarPassword } from "@/components/TarjetaCambiarPassword";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";
import { formatearFechaHora } from "@/lib/formato";
import { ETIQUETAS_ROL } from "@/lib/roles";

// Los campos que la persona SÍ puede editar de su propio perfil.
const CAMPOS_EDITABLES = ["telefono", "fecha_nacimiento", "direccion", "contacto_emergencia_nombre", "contacto_emergencia_telefono"];

const aValores = (usuario) => Object.fromEntries(CAMPOS_EDITABLES.map((campo) => [campo, usuario[campo] ?? ""]));

export default function PaginaPerfil() {
  const { usuario, actualizarSesion } = useAuth();

  const [valores, setValores] = useState(() => aValores(usuario));
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const [guardado, setGuardado] = useState(false);

  const cambiar = (campo) => (evento) => {
    setGuardado(false);
    setValores((v) => ({ ...v, [campo]: evento.target.value }));
  };

  // Solo se envía lo que cambió (vacío = null = "sin dato").
  const normalizar = (v) => Object.fromEntries(CAMPOS_EDITABLES.map((campo) => [campo, v[campo].trim() || null]));
  const original = normalizar(aValores(usuario));
  const actual = normalizar(valores);
  const cambios = Object.fromEntries(Object.entries(actual).filter(([campo, valor]) => valor !== original[campo]));
  const hayCambios = Object.keys(cambios).length > 0;

  async function manejarEnvio(evento) {
    evento.preventDefault();
    setError("");
    setEnviando(true);
    try {
      const actualizado = await actualizarMiPerfil(cambios);
      actualizarSesion(actualizado); // el resto de la aplicación ve los datos nuevos
      setValores(aValores(actualizado));
      setGuardado(true);
    } catch (falla) {
      setError(falla.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Mi perfil</h1>
        <p className="mt-1 text-sm text-muted-foreground">Consulta los datos de tu cuenta y mantén al día tu información de contacto.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Datos de tu cuenta</CardTitle>
          <CardDescription>Para cambiar estos datos habla con el administrador del gimnasio.</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-x-8 gap-y-4 text-sm sm:grid-cols-2">
            <Dato etiqueta="Nombre" valor={usuario.nombre} />
            <Dato etiqueta="Correo" valor={usuario.email} />
            <Dato etiqueta="Documento de identidad" valor={usuario.documento ?? "—"} />
            <Dato etiqueta="Rol" valor={<Badge variant="primario">{ETIQUETAS_ROL[usuario.rol] ?? usuario.rol}</Badge>} />
            {usuario.codigo && <Dato etiqueta="Código QR" valor={<span className="font-mono">{usuario.codigo}</span>} />}
            <Dato etiqueta="Cuenta creada el" valor={formatearFechaHora(usuario.creado_en)} />
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Información de contacto</CardTitle>
          <CardDescription>Estos datos sí los puedes editar tú.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={manejarEnvio} className="space-y-5" noValidate>
            {error && (
              <Alert variant="error">
                <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <span>{error}</span>
              </Alert>
            )}
            {guardado && (
              <Alert variant="exito">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <span>Tus datos fueron actualizados.</span>
              </Alert>
            )}

            <div className="grid gap-5 sm:grid-cols-2">
              <Campo id="telefono" etiqueta="Teléfono">
                <Input id="telefono" type="tel" value={valores.telefono} onChange={cambiar("telefono")} />
              </Campo>
              <Campo id="fecha_nacimiento" etiqueta="Fecha de nacimiento">
                <Input id="fecha_nacimiento" type="date" value={valores.fecha_nacimiento} onChange={cambiar("fecha_nacimiento")} max={new Date().toISOString().slice(0, 10)} />
              </Campo>
              <div className="sm:col-span-2">
                <Campo id="direccion" etiqueta="Dirección">
                  <Input id="direccion" value={valores.direccion} onChange={cambiar("direccion")} />
                </Campo>
              </div>
              <Campo id="contacto_emergencia_nombre" etiqueta="Contacto de emergencia" ayuda="Persona a quien avisar en caso de un accidente.">
                <Input id="contacto_emergencia_nombre" value={valores.contacto_emergencia_nombre} onChange={cambiar("contacto_emergencia_nombre")} />
              </Campo>
              <Campo id="contacto_emergencia_telefono" etiqueta="Teléfono del contacto de emergencia">
                <Input id="contacto_emergencia_telefono" type="tel" value={valores.contacto_emergencia_telefono} onChange={cambiar("contacto_emergencia_telefono")} />
              </Campo>
            </div>

            <Button type="submit" disabled={enviando || !hayCambios}>
              {enviando && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
              Guardar cambios
            </Button>
          </form>
        </CardContent>
      </Card>

      <TarjetaCambiarPassword />
    </div>
  );
}

// Un dato de solo lectura: etiqueta pequeña arriba y el valor debajo.
function Dato({ etiqueta, valor }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{etiqueta}</dt>
      <dd className="mt-1 font-medium">{valor}</dd>
    </div>
  );
}
