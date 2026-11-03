// Pantalla "Pagos" (administrador): lista de pagos con filtros, registrar un pago manual,
// cobrar por la pasarela simulada y anular pagos.
import { AlertCircle, CheckCircle2, Loader2, Plus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { seguimientoVencimientos } from "@/api/avisos";
import { anularPago, iniciarCheckout, listarPagos, registrarPagoManual } from "@/api/pagos";
import { listarPlanes } from "@/api/planes";
import { listarUsuarios } from "@/api/usuarios";
import { EtiquetaEstadoMembresia, EtiquetaEstadoPago } from "@/components/EtiquetasPago";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatearFecha, formatearPesos } from "@/lib/formato";
import { ETIQUETAS_ESTADO_PAGO, ETIQUETAS_METODO, textoDiasRestantes } from "@/lib/pagos";

const MOTIVO_MINIMO = 5; // el mismo mínimo que exige el servidor

export default function PaginaPagos() {
  const navegar = useNavigate();

  // Datos de apoyo para los filtros y formularios
  const [clientes, setClientes] = useState([]);
  const [planes, setPlanes] = useState([]);

  // Filtros y resultado
  const [filtroCliente, setFiltroCliente] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");
  const [pagos, setPagos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");

  // Qué formulario está abierto: null · "manual" · "pasarela"
  const [formulario, setFormulario] = useState(null);
  // Pago que se está por anular (para pedirle el motivo)
  const [anulando, setAnulando] = useState(null);
  // Seguimiento de vencimientos (clientes por vencer y en mora): null = oculto
  const [vencimientos, setVencimientos] = useState(null);
  const [clientePreseleccionado, setClientePreseleccionado] = useState("");

  // Clientes activos y planes, una sola vez.
  useEffect(() => {
    listarUsuarios({ rol: "cliente", activo: "true", por_pagina: 100 })
      .then((r) => setClientes(r.items))
      .catch((falla) => setError(falla.message));
    listarPlanes()
      .then(setPlanes)
      .catch((falla) => setError(falla.message));
  }, []);

  const cargarPagos = useCallback(() => {
    setCargando(true);
    return listarPagos({ usuario_id: filtroCliente, estado: filtroEstado })
      .then((datos) => {
        setPagos(datos);
        setError("");
      })
      .catch((falla) => setError(falla.message))
      .finally(() => setCargando(false));
  }, [filtroCliente, filtroEstado]);

  useEffect(() => {
    cargarPagos();
  }, [cargarPagos]);

  // Muestra u oculta la lista de clientes por vencer y en mora.
  async function alternarVencimientos() {
    if (vencimientos) return setVencimientos(null);
    try {
      setVencimientos(await seguimientoVencimientos());
    } catch (falla) {
      setError(falla.message);
    }
  }

  // Desde la lista de vencimientos: abre el pago manual con ese cliente ya elegido.
  function cobrarA(usuarioId) {
    setClientePreseleccionado(String(usuarioId));
    setFormulario("manual");
    setAnulando(null);
    setAviso("");
    window.scrollTo?.({ top: 0 });
  }

  function abrir(tipo) {
    setClientePreseleccionado("");
    setFormulario(formulario === tipo ? null : tipo);
    setAnulando(null);
    setAviso("");
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pagos</h1>
          <p className="mt-1 text-sm text-muted-foreground">Registra pagos, cóbrales a los clientes y revisa el historial.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => abrir("manual")}>
            <Plus className="size-4" aria-hidden="true" />
            Registrar pago manual
          </Button>
          <Button variant="outline" onClick={() => abrir("pasarela")}>
            Cobrar por pasarela
          </Button>
          <Button variant="outline" onClick={alternarVencimientos} aria-expanded={vencimientos !== null}>
            Vencimientos
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="error" className="mt-6">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </Alert>
      )}
      {aviso && (
        <Alert variant="exito" role="status" className="mt-6">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>{aviso}</span>
        </Alert>
      )}

      {vencimientos && <TablaVencimientos filas={vencimientos} onCobrar={cobrarA} />}

      {formulario && (
        <FormularioCobro
          key={`${formulario}-${clientePreseleccionado}`}
          tipo={formulario}
          clienteInicial={clientePreseleccionado}
          clientes={clientes}
          planes={planes}
          onCancelar={() => setFormulario(null)}
          onError={setError}
          onManualRegistrado={() => {
            setFormulario(null);
            setAviso("Pago registrado. La membresía del cliente ya está actualizada.");
            cargarPagos();
          }}
          onCheckoutIniciado={(pago) => navegar(`/pasarela/${pago.id}`)}
        />
      )}

      {anulando && (
        <FormularioAnular
          pago={anulando}
          onCancelar={() => setAnulando(null)}
          onError={setError}
          onAnulado={() => {
            setAnulando(null);
            setAviso("Pago anulado. Las fechas de la membresía se recalcularon.");
            cargarPagos();
          }}
        />
      )}

      {/* Filtros */}
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="filtro-cliente">Filtrar por cliente</Label>
          <Select id="filtro-cliente" value={filtroCliente} onChange={(e) => setFiltroCliente(e.target.value)}>
            <option value="">Todos los clientes</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="filtro-estado">Filtrar por estado</Label>
          <Select id="filtro-estado" value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
            <option value="">Todos los estados</option>
            {Object.entries(ETIQUETAS_ESTADO_PAGO).map(([valor, texto]) => (
              <option key={valor} value={valor}>
                {texto}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <Card className="mt-4">
        {cargando ? (
          <p role="status" className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            Cargando pagos…
          </p>
        ) : pagos.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">No hay pagos con esos filtros.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>N.º</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Monto</TableHead>
                <TableHead>Método</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagos.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{p.id}</TableCell>
                  <TableCell>{formatearFecha(p.fecha)}</TableCell>
                  <TableCell>{p.usuario_nombre}</TableCell>
                  <TableCell>{p.plan_nombre}</TableCell>
                  <TableCell>{formatearPesos(p.monto)}</TableCell>
                  <TableCell>{ETIQUETAS_METODO[p.metodo]}</TableCell>
                  <TableCell>
                    <EtiquetaEstadoPago estado={p.estado} />
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap items-center justify-end gap-3 text-sm">
                      {p.estado === "pendiente" && (
                        <Link className="text-link hover:underline" to={`/pasarela/${p.id}`} aria-label={`Continuar el pago ${p.id}`}>
                          Continuar
                        </Link>
                      )}
                      {p.estado === "aprobado" && (
                        <>
                          <Link className="text-link hover:underline" to={`/pagos/${p.id}/comprobante`} aria-label={`Ver comprobante del pago ${p.id}`}>
                            Comprobante
                          </Link>
                          <button
                            type="button"
                            className="text-destructive hover:underline"
                            aria-label={`Anular el pago ${p.id}`}
                            onClick={() => {
                              setAnulando(p);
                              setFormulario(null);
                              setAviso("");
                            }}
                          >
                            Anular
                          </button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}

// Formulario para registrar un pago manual o para cobrar por la pasarela simulada.
function FormularioCobro({ tipo, clienteInicial, clientes, planes, onCancelar, onError, onManualRegistrado, onCheckoutIniciado }) {
  const manual = tipo === "manual";
  const [usuarioId, setUsuarioId] = useState(clienteInicial ?? "");
  const [planId, setPlanId] = useState("");
  const [metodo, setMetodo] = useState("efectivo");
  const [referencia, setReferencia] = useState("");
  const [enviando, setEnviando] = useState(false);

  const plan = planes.find((p) => String(p.id) === planId);

  async function enviar(evento) {
    evento.preventDefault();
    setEnviando(true);
    onError("");
    try {
      if (manual) {
        await registrarPagoManual({ usuario_id: Number(usuarioId), plan_id: Number(planId), metodo, referencia: referencia.trim() });
        onManualRegistrado();
      } else {
        onCheckoutIniciado(await iniciarCheckout(Number(planId), Number(usuarioId)));
      }
    } catch (falla) {
      onError(falla.message);
      setEnviando(false);
    }
  }

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>{manual ? "Registrar pago manual" : "Cobrar por la pasarela simulada"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={enviar} className="grid gap-4 sm:grid-cols-2" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="cobro-cliente">Cliente</Label>
            <Select id="cobro-cliente" value={usuarioId} onChange={(e) => setUsuarioId(e.target.value)}>
              <option value="">Selecciona un cliente</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cobro-plan">Plan</Label>
            <Select id="cobro-plan" value={planId} onChange={(e) => setPlanId(e.target.value)}>
              <option value="">Selecciona un plan</option>
              {planes.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre} · {formatearPesos(p.precio)}
                </option>
              ))}
            </Select>
          </div>
          {manual && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="cobro-metodo">Método de pago</Label>
                <Select id="cobro-metodo" value={metodo} onChange={(e) => setMetodo(e.target.value)}>
                  <option value="efectivo">Efectivo</option>
                  <option value="transferencia">Transferencia</option>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cobro-referencia">Referencia (opcional)</Label>
                <Input id="cobro-referencia" maxLength={100} value={referencia} onChange={(e) => setReferencia(e.target.value)} />
              </div>
            </>
          )}
          <div className="flex items-center gap-2 sm:col-span-2">
            <Button type="submit" disabled={!usuarioId || !planId || enviando}>
              {enviando && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
              {manual ? `Registrar pago${plan ? ` de ${formatearPesos(plan.precio)}` : ""}` : "Ir a la pasarela"}
            </Button>
            <Button type="button" variant="ghost" onClick={onCancelar} disabled={enviando}>
              Cancelar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// Pide el motivo antes de anular un pago.
function FormularioAnular({ pago, onCancelar, onError, onAnulado }) {
  const [motivo, setMotivo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const valido = motivo.trim().length >= MOTIVO_MINIMO;

  async function enviar(evento) {
    evento.preventDefault();
    setEnviando(true);
    onError("");
    try {
      await anularPago(pago.id, motivo.trim());
      onAnulado();
    } catch (falla) {
      onError(falla.message);
      setEnviando(false);
    }
  }

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>
          Anular el pago {pago.id} de {pago.usuario_nombre}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={enviar} className="space-y-3" noValidate>
          <p className="text-sm text-muted-foreground">
            El pago de {formatearPesos(pago.monto)} dejará de dar días de membresía. No se borra: queda registrado con tu nombre y el motivo.
          </p>
          <div className="space-y-1.5">
            <Label htmlFor="motivo-anulacion">Motivo de la anulación</Label>
            <Input id="motivo-anulacion" maxLength={300} value={motivo} onChange={(e) => setMotivo(e.target.value)} autoFocus />
            <p className="text-xs text-muted-foreground">Mínimo {MOTIVO_MINIMO} caracteres.</p>
          </div>
          <div className="flex gap-2">
            <Button type="submit" variant="destructive" disabled={!valido || enviando}>
              {enviando && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
              Confirmar anulación
            </Button>
            <Button type="button" variant="ghost" onClick={onCancelar} disabled={enviando}>
              Cancelar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// Clientes por vencer y en mora, los más urgentes primero, con su teléfono para contactarlos.
function TablaVencimientos({ filas, onCobrar }) {
  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Clientes por vencer y en mora</CardTitle>
      </CardHeader>
      {filas.length === 0 ? (
        <p className="px-6 pb-6 text-sm text-muted-foreground">No hay clientes por vencer ni en mora.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Vence</TableHead>
              <TableHead className="text-right">Acción</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filas.map((f) => (
              <TableRow key={f.usuario_id}>
                <TableCell>{f.nombre}</TableCell>
                <TableCell>{f.telefono ?? "—"}</TableCell>
                <TableCell>
                  <EtiquetaEstadoMembresia estado={f.estado} />
                </TableCell>
                <TableCell>
                  {formatearFecha(f.fecha_vencimiento)}
                  <span className="ml-2 text-xs text-muted-foreground">{textoDiasRestantes(f.dias_restantes)}</span>
                </TableCell>
                <TableCell className="text-right">
                  <button type="button" className="text-sm text-link hover:underline" aria-label={`Registrar pago de ${f.nombre}`} onClick={() => onCobrar(f.usuario_id)}>
                    Registrar pago
                  </button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Card>
  );
}
