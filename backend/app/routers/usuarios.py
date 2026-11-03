"""
Endpoints de usuarios (HU01): el administrador gestiona a todas las personas del sistema.

No hay registro público: únicamente el administrador crea, edita y desactiva usuarios.
Cada endpoint solo recibe la petición y delega la lógica en `services/usuarios.py`.
Quién puede usar cada uno: ver docs/permisos.md.
"""
from fastapi import APIRouter, Depends, Query, status
from sqlmodel import Session

from app.core.database import get_session
from app.core.dependencias import get_usuario_actual, solo_admin
from app.models import Rol, Usuario
from app.schemas.auth import MensajeRespuesta
from app.schemas.usuario import (
    EstadoCambiar,
    PaginaUsuarios,
    PasswordTemporal,
    UsuarioActualizar,
    UsuarioCrear,
    UsuarioLeer,
)
from app.services import usuarios as servicio
from app.services.permisos import exigir_ver_usuario

router = APIRouter(prefix="/usuarios", tags=["Usuarios"])


@router.get("", response_model=PaginaUsuarios)
def listar_usuarios(
    busqueda: str | None = Query(None, description="Texto a buscar en nombre, correo, documento o código"),
    rol: Rol | None = Query(None, description="Filtrar por rol"),
    activo: bool | None = Query(None, description="Filtrar por estado: true = activos, false = desactivados"),
    pagina: int = Query(1, ge=1),
    por_pagina: int = Query(20, ge=1, le=100),
    _admin: Usuario = Depends(solo_admin),
    session: Session = Depends(get_session),
):
    """Lista los usuarios con búsqueda, filtros y paginación. Solo el administrador."""
    usuarios, total = servicio.listar_usuarios(session, busqueda, rol, activo, pagina, por_pagina)
    return PaginaUsuarios(items=usuarios, total=total, pagina=pagina, por_pagina=por_pagina)


@router.post("", response_model=UsuarioLeer, status_code=status.HTTP_201_CREATED)
def crear_usuario(
    datos: UsuarioCrear,
    _admin: Usuario = Depends(solo_admin),  # solo un administrador puede crear usuarios
    session: Session = Depends(get_session),
):
    """Crea un cliente, entrenador o administrador. Los clientes reciben su código QR automáticamente."""
    return servicio.crear_usuario(session, datos)


@router.get("/{usuario_id}", response_model=UsuarioLeer)
def detalle_usuario(
    usuario_id: int,
    actual: Usuario = Depends(get_usuario_actual),
    session: Session = Depends(get_session),
):
    """
    Datos de un usuario. El administrador ve a todos; el entrenador, solo a sus clientes;
    el cliente, solo a sí mismo (regla en services/permisos.py).
    """
    usuario = servicio.obtener_usuario(session, usuario_id)
    exigir_ver_usuario(actual, usuario)
    return usuario


@router.put("/{usuario_id}", response_model=UsuarioLeer)
def editar_usuario(
    usuario_id: int,
    datos: UsuarioActualizar,
    admin: Usuario = Depends(solo_admin),
    session: Session = Depends(get_session),
):
    """Modifica datos de un usuario (solo cambian los campos enviados). Solo el administrador."""
    return servicio.actualizar_usuario(session, admin, usuario_id, datos)


@router.patch("/{usuario_id}/estado", response_model=UsuarioLeer)
def cambiar_estado_usuario(
    usuario_id: int,
    datos: EstadoCambiar,
    admin: Usuario = Depends(solo_admin),
    session: Session = Depends(get_session),
):
    """Activa o desactiva a un usuario. Desactivar le quita el acceso sin borrar su historial."""
    return servicio.cambiar_estado(session, admin, usuario_id, datos.activo)


@router.put("/{usuario_id}/password", response_model=MensajeRespuesta)
def definir_password_temporal(
    usuario_id: int,
    datos: PasswordTemporal,
    _admin: Usuario = Depends(solo_admin),
    session: Session = Depends(get_session),
):
    """El administrador define una contraseña temporal para otra persona (que luego puede cambiarla)."""
    servicio.definir_password_temporal(session, usuario_id, datos.password_nueva)
    return MensajeRespuesta(mensaje="Contraseña actualizada.")
