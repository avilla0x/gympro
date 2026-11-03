// Formulario para CREAR o EDITAR un usuario (lo usa el administrador).
//
//   <FormularioUsuario modo="crear" onGuardado={...} />
//   <FormularioUsuario modo="editar" usuarioInicial={usuario} onGuardado={...} />
//
// En modo editar solo se envían al servidor los campos que la persona realmente cambió.
// Así guardar nunca pisa datos que no se tocaron (por ejemplo, un entrenador que luego fue desactivado).
import { AlertCircle, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { actualizarUsuario, crearUsuario, listarUsuarios } from "@/api/usuarios";
import { Campo } from "@/components/Campo";
import { CampoPassword } from "@/components/CampoPassword";
import { RequisitosPassword } from "@/components/RequisitosPassword";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { evaluarPassword } from "@/lib/password";
import { ETIQUETAS_ROL } from "@/lib/roles";

// Campos de texto opcionales: si se dejan vacíos, se envían como null (= "sin dato").
const CAMPOS_TEXTO_OPCIONALES = ["documento", "telefono", "direccion", "contacto_emergencia_nombre", "contacto_emergencia_telefono"];

// Convierte un usuario (como lo devuelve la API) en los valores que muestra el formulario.
function aValores(usuario) {
  return {
    nombre: usuario?.nombre ?? "",
    email: usuario?.email ?? "",
    rol: usuario?.rol ?? "cliente",
    password: "",
    documento: usuario?.documento ?? "",
    fecha_nacimiento: usuario?.fecha_nacimiento ?? "",
    telefono: usuario?.telefono ?? "",
    direccion: usuario?.direccion ?? "",
    contacto_emergencia_nombre: usuario?.contacto_emergencia_nombre ?? "",
    contacto_emergencia_telefono: usuario?.contacto_emergencia_telefono ?? "",
    entrenador_id: usuario?.entrenador_id ? String(usuario.entrenador_id) : "",
  };
}

// Convierte los valores del formulario en lo que espera la API (textos recortados, vacíos -> null).
function aPayload(valores) {
  const payload = {
    nombre: valores.nombre.trim(),
    email: valores.email.trim().toLowerCase(),
    rol: valores.rol,
    fecha_nacimiento: valores.fecha_nacimiento || null,
    // Solo los clientes tienen entrenador.
    entrenador_id: valores.rol === "cliente" && valores.entrenador_id ? Number(valores.entrenador_id) : null,
  };
  for (const campo of CAMPOS_TEXTO_OPCIONALES) payload[campo] = valores[campo].trim() || null;
  return payload;
}

export function FormularioUsuario({ modo, usuarioInicial = null, esUsuarioActual = false, onGuardado }) {
  const editando = modo === "editar";
  const [valores, setValores] = useState(() => aValores(usuarioInicial));
  const [entrenadores, setEntrenadores] = useState([]);
  const [errores, setErrores] = useState({}); // errores por campo, ej. { documento: "..." }
  const [errorGeneral, setErrorGeneral] = useState(""); // error que responde el servidor
  const [enviando, setEnviando] = useState(false);

  const cambiar = (campo) => (evento) => setValores((v) => ({ ...v, [campo]: evento.target.value }));

  // Carga los entrenadores activos para poder asignarlos a un cliente.
  useEffect(() => {
    let cancelado = false; // evita actualizar la pantalla si ya se cerró
    listarUsuarios({ rol: "entrenador", activo: "true", por_pagina: 100 })
      .then((pagina) => !cancelado && setEntrenadores(pagina.items))
      .catch(() => {}); // si falla, el selector queda solo con "Sin entrenador"
    return () => {
      cancelado = true;
    };
  }, []);

  // En edición: solo los campos que cambiaron respecto a lo que había.
  const completo = aPayload(valores);
  const original = editando ? aPayload(aValores(usuarioInicial)) : null;
  const cambios = editando ? Object.fromEntries(Object.entries(completo).filter(([clave, valor]) => valor !== original[clave])) : completo;
  const hayCambios = !editando || Object.keys(cambios).length > 0;

  function validar() {
    const e = {};
    if (valores.nombre.trim().length < 2) e.nombre = "Escribe el nombre (mínimo 2 letras).";
    if (!/^\S+@\S+\.\S+$/.test(valores.email.trim())) e.email = "Escribe un correo válido.";
    if (valores.rol === "cliente" && !valores.documento.trim()) e.documento = "El documento es obligatorio para los clientes.";
    if (!editando && !evaluarPassword(valores.password).valida) e.password = "La contraseña no cumple los requisitos.";
    return e;
  }

  async function manejarEnvio(evento) {
    evento.preventDefault();
    setErrorGeneral("");
    const erroresNuevos = validar();
    setErrores(erroresNuevos);
    if (Object.keys(erroresNuevos).length > 0) return;

    setEnviando(true);
    try {
      const guardado = editando
        ? await actualizarUsuario(usuarioInicial.id, cambios)
        : await crearUsuario({ ...completo, password: valores.password });
      onGuardado(guardado);
    } catch (falla) {
      setErrorGeneral(falla.message); // ej. "Ya existe un usuario con ese correo"
    } finally {
      setEnviando(false);
    }
  }

  const esCliente = valores.rol === "cliente";

  return (
    <form onSubmit={manejarEnvio} className="space-y-8" noValidate>
      {errorGeneral && (
        <Alert variant="error">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>{errorGeneral}</span>
        </Alert>
      )}

      <Seccion titulo="Cuenta">
        <Campo id="nombre" etiqueta="Nombre completo" obligatorio error={errores.nombre}>
          <Input id="nombre" value={valores.nombre} onChange={cambiar("nombre")} aria-invalid={Boolean(errores.nombre)} autoComplete="off" />
        </Campo>
        <Campo id="email" etiqueta="Correo electrónico" obligatorio error={errores.email}>
          <Input id="email" type="email" value={valores.email} onChange={cambiar("email")} aria-invalid={Boolean(errores.email)} autoComplete="off" />
        </Campo>
        <Campo id="rol" etiqueta="Rol" obligatorio ayuda={esUsuarioActual ? "No puedes cambiar tu propio rol." : undefined}>
          <Select id="rol" value={valores.rol} onChange={cambiar("rol")} disabled={esUsuarioActual}>
            {Object.entries(ETIQUETAS_ROL).map(([clave, etiqueta]) => (
              <option key={clave} value={clave}>
                {etiqueta}
              </option>
            ))}
          </Select>
        </Campo>
        {!editando && (
          <div className="space-y-2">
            <Campo id="password" etiqueta="Contraseña temporal" obligatorio error={errores.password}>
              <CampoPassword id="password" value={valores.password} onChange={cambiar("password")} autoComplete="new-password" aria-invalid={Boolean(errores.password)} />
            </Campo>
            <RequisitosPassword password={valores.password} />
          </div>
        )}
      </Seccion>

      <Seccion titulo="Datos personales">
        <Campo
          id="documento"
          etiqueta="Documento de identidad"
          obligatorio={esCliente}
          ayuda={esCliente ? undefined : "Opcional para entrenadores y administradores."}
          error={errores.documento}
        >
          <Input id="documento" value={valores.documento} onChange={cambiar("documento")} aria-invalid={Boolean(errores.documento)} inputMode="numeric" />
        </Campo>
        <Campo id="fecha_nacimiento" etiqueta="Fecha de nacimiento">
          <Input id="fecha_nacimiento" type="date" value={valores.fecha_nacimiento} onChange={cambiar("fecha_nacimiento")} max={new Date().toISOString().slice(0, 10)} />
        </Campo>
        <Campo id="telefono" etiqueta="Teléfono">
          <Input id="telefono" type="tel" value={valores.telefono} onChange={cambiar("telefono")} />
        </Campo>
        <Campo id="direccion" etiqueta="Dirección">
          <Input id="direccion" value={valores.direccion} onChange={cambiar("direccion")} />
        </Campo>
      </Seccion>

      <Seccion titulo="Contacto de emergencia" descripcion="Persona a quien avisar en caso de un accidente.">
        <Campo id="contacto_emergencia_nombre" etiqueta="Nombre del contacto">
          <Input id="contacto_emergencia_nombre" value={valores.contacto_emergencia_nombre} onChange={cambiar("contacto_emergencia_nombre")} />
        </Campo>
        <Campo id="contacto_emergencia_telefono" etiqueta="Teléfono del contacto">
          <Input id="contacto_emergencia_telefono" type="tel" value={valores.contacto_emergencia_telefono} onChange={cambiar("contacto_emergencia_telefono")} />
        </Campo>
      </Seccion>

      {esCliente && (
        <Seccion titulo="Entrenador" descripcion="Opcional. El entrenador podrá ver al cliente y asignarle rutinas.">
          <Campo id="entrenador_id" etiqueta="Entrenador asignado">
            <Select id="entrenador_id" value={valores.entrenador_id} onChange={cambiar("entrenador_id")}>
              <option value="">Sin entrenador</option>
              {entrenadores.map((entrenador) => (
                <option key={entrenador.id} value={entrenador.id}>
                  {entrenador.nombre}
                </option>
              ))}
              {/* Si el entrenador actual fue desactivado, no está en la lista: se muestra igual para no perderlo de vista. */}
              {valores.entrenador_id && !entrenadores.some((e) => String(e.id) === valores.entrenador_id) && (
                <option value={valores.entrenador_id}>Entrenador actual (desactivado)</option>
              )}
            </Select>
          </Campo>
        </Seccion>
      )}

      <div className="flex flex-wrap items-center justify-end gap-3 border-t pt-6">
        <Button asChild variant="outline">
          <Link to="/usuarios">Cancelar</Link>
        </Button>
        <Button type="submit" disabled={enviando || !hayCambios}>
          {enviando && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
          {editando ? "Guardar cambios" : "Crear usuario"}
        </Button>
      </div>
    </form>
  );
}

// Un grupo de campos con su título (agrupa visualmente el formulario).
function Seccion({ titulo, descripcion, children }) {
  return (
    <section>
      <h2 className="text-base font-semibold">{titulo}</h2>
      {descripcion && <p className="mt-1 text-sm text-muted-foreground">{descripcion}</p>}
      <div className="mt-4 grid gap-5 sm:grid-cols-2">{children}</div>
    </section>
  );
}
