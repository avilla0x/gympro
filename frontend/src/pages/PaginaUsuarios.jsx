// Pantalla "Usuarios" (solo administrador): lista con búsqueda, filtros y paginación.
import { AlertCircle, ChevronLeft, ChevronRight, Loader2, Plus, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { listarUsuarios } from "@/api/usuarios";
import { BotonEstadoUsuario } from "@/components/BotonEstadoUsuario";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/context/AuthContext";
import { useRetraso } from "@/lib/hooks";
import { ETIQUETAS_ROL } from "@/lib/roles";

const POR_PAGINA = 20;
const VARIANTE_ROL = { admin: "primario", entrenador: "neutro", cliente: "neutro" };

export default function PaginaUsuarios() {
  const { usuario: yo } = useAuth();

  // Filtros
  const [busqueda, setBusqueda] = useState("");
  const [rol, setRol] = useState("");
  const [estado, setEstado] = useState(""); // "" = todos · "true" = activos · "false" = desactivados
  const [pagina, setPagina] = useState(1);
  const busquedaRetrasada = useRetraso(busqueda, 300); // se busca al dejar de escribir, no en cada letra

  // Resultado
  const [resultado, setResultado] = useState({ items: [], total: 0 });
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  // Cada vez que cambia un filtro, se vuelve a la primera página.
  useEffect(() => {
    setPagina(1);
  }, [busquedaRetrasada, rol, estado]);

  // Pide la lista al servidor cuando cambia algún filtro o la página.
  useEffect(() => {
    let cancelado = false; // si llega una respuesta vieja después de una más nueva, se descarta
    setCargando(true);
    listarUsuarios({ busqueda: busquedaRetrasada.trim(), rol, activo: estado, pagina, por_pagina: POR_PAGINA })
      .then((datos) => {
        if (cancelado) return;
        setResultado(datos);
        setError("");
      })
      .catch((falla) => !cancelado && setError(falla.message))
      .finally(() => !cancelado && setCargando(false));
    return () => {
      cancelado = true;
    };
  }, [busquedaRetrasada, rol, estado, pagina]);

  // Cuando se activa o desactiva a alguien, se reemplaza esa fila sin recargar toda la lista.
  const reemplazarFila = (actualizado) => {
    setError("");
    setResultado((r) => ({ ...r, items: r.items.map((u) => (u.id === actualizado.id ? actualizado : u)) }));
  };

  const totalPaginas = Math.max(1, Math.ceil(resultado.total / POR_PAGINA));
  const desde = resultado.total === 0 ? 0 : (pagina - 1) * POR_PAGINA + 1;
  const hasta = Math.min(pagina * POR_PAGINA, resultado.total);

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Usuarios</h1>
          <p className="mt-1 text-sm text-muted-foreground">Administra clientes, entrenadores y administradores.</p>
        </div>
        <Button asChild>
          <Link to="/usuarios/nuevo">
            <Plus className="size-4" aria-hidden="true" />
            Nuevo usuario
          </Link>
        </Button>
      </div>

      {/* Búsqueda y filtros */}
      <div className="mt-6 grid gap-3 sm:grid-cols-[1fr_11rem_11rem]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            type="search"
            placeholder="Nombre, correo, documento o código"
            aria-label="Buscar usuarios"
            className="pl-9"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>
        <Select aria-label="Filtrar por rol" value={rol} onChange={(e) => setRol(e.target.value)}>
          <option value="">Todos los roles</option>
          {Object.entries(ETIQUETAS_ROL).map(([clave, etiqueta]) => (
            <option key={clave} value={clave}>
              {etiqueta}
            </option>
          ))}
        </Select>
        <Select aria-label="Filtrar por estado" value={estado} onChange={(e) => setEstado(e.target.value)}>
          <option value="">Todos los estados</option>
          <option value="true">Activos</option>
          <option value="false">Desactivados</option>
        </Select>
      </div>

      {error && (
        <Alert variant="error" className="mt-4">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </Alert>
      )}

      <Card className="mt-4 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>Documento</TableHead>
              <TableHead>Código</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {resultado.items.map((u) => (
              <TableRow key={u.id} className={u.activo ? "" : "opacity-70"}>
                <TableCell>
                  <p className="font-medium">{u.nombre}</p>
                  <p className="text-xs text-muted-foreground">{u.email}</p>
                </TableCell>
                <TableCell>
                  <Badge variant={VARIANTE_ROL[u.rol]}>{ETIQUETAS_ROL[u.rol] ?? u.rol}</Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">{u.documento ?? "—"}</TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">{u.codigo ?? "—"}</TableCell>
                <TableCell>
                  <Badge variant={u.activo ? "exito" : "peligro"}>{u.activo ? "Activo" : "Desactivado"}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-1">
                    <Button asChild variant="outline" size="sm">
                      <Link to={`/usuarios/${u.id}`} aria-label={`Editar a ${u.nombre}`}>
                        Editar
                      </Link>
                    </Button>
                    <BotonEstadoUsuario usuario={u} esUsuarioActual={u.id === yo.id} onCambio={reemplazarFila} onError={setError} />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {cargando && resultado.items.length === 0 && (
          <p role="status" className="flex items-center justify-center gap-2 p-10 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            Cargando usuarios…
          </p>
        )}
        {!cargando && resultado.items.length === 0 && !error && (
          <p className="p-10 text-center text-sm text-muted-foreground">No se encontraron usuarios con esos filtros.</p>
        )}
      </Card>

      {/* Paginación */}
      {resultado.total > 0 && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
          <p>
            Mostrando {desde}–{hasta} de {resultado.total}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setPagina((p) => p - 1)} disabled={pagina <= 1 || cargando}>
              <ChevronLeft className="size-4" aria-hidden="true" />
              Anterior
            </Button>
            <span>
              Página {pagina} de {totalPaginas}
            </span>
            <Button variant="outline" size="sm" onClick={() => setPagina((p) => p + 1)} disabled={pagina >= totalPaginas || cargando}>
              Siguiente
              <ChevronRight className="size-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
