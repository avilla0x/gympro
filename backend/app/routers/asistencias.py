"""
Endpoints de asistencia (HU02).

  - El cliente registra su entrada escaneando el QR fijo del gimnasio.
  - El administrador (recepción) ve el QR, registra entradas a mano y consulta el historial con filtros.
  - Cada cliente ve SU historial y SU constancia (el entrenador, los de sus clientes asignados).
"""
from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlmodel import Session

from app.core.config import settings
from app.core.database import get_session
from app.core.dependencias import get_usuario_actual, solo_admin
from app.core.errores import ErrorDeNegocio
from app.models import Usuario
from app.schemas.asistencia import AsistenciaLeer, CheckinManual, CheckinQR, MetricasLeer, QRGimnasio
from app.services import asistencias as servicio
from app.services.permisos import exigir_ver_usuario

router = APIRouter(tags=["Asistencia"])


def _con_nombre(session: Session, asistencia) -> dict:
    return servicio.listar(session, usuario_id=asistencia.usuario_id, desde=asistencia.fecha, hasta=asistencia.fecha, limite=1)[0]


@router.get("/asistencias/qr", response_model=QRGimnasio)
def qr_del_gimnasio(_admin: Usuario = Depends(solo_admin)):
    """El código del QR fijo y el enlace que debe contener (solo administrador, para mostrarlo o imprimirlo)."""
    return {"codigo": settings.qr_gimnasio, "url": f"{settings.frontend_url}/checkin?codigo={settings.qr_gimnasio}"}


@router.post("/asistencias/checkin", response_model=AsistenciaLeer, status_code=201)
def checkin(datos: CheckinQR, actual: Usuario = Depends(get_usuario_actual), session: Session = Depends(get_session)):
    """El cliente registra su entrada con el código del QR del gimnasio. Se rechaza si está en mora o sin membresía."""
    return _con_nombre(session, servicio.checkin_qr(session, actual, datos.codigo))


@router.post("/asistencias/manual", response_model=AsistenciaLeer, status_code=201)
def checkin_manual(datos: CheckinManual, admin: Usuario = Depends(solo_admin), session: Session = Depends(get_session)):
    """Recepción registra la entrada de un cliente (solo administrador). Misma regla de membresía."""
    return _con_nombre(session, servicio.checkin_manual(session, admin, datos.usuario_id))


@router.get("/asistencias", response_model=list[AsistenciaLeer])
def listar_asistencias(
    usuario_id: int | None = None,
    desde: date | None = None,
    hasta: date | None = None,
    limite: int = Query(default=200, ge=1, le=1000),
    _admin: Usuario = Depends(solo_admin),
    session: Session = Depends(get_session),
):
    """Historial de entradas de todos los clientes (solo administrador), filtrable por cliente y rango de fechas."""
    servicio.validar_rango(desde, hasta)
    return servicio.listar(session, usuario_id, desde, hasta, limite)


def _usuario_visible(session: Session, actual: Usuario, usuario_id: int) -> Usuario:
    objetivo = session.get(Usuario, usuario_id)
    if objetivo is None:
        raise ErrorDeNegocio("El usuario no existe.", 404)
    exigir_ver_usuario(actual, objetivo)
    return objetivo


@router.get("/usuarios/{usuario_id}/asistencias", response_model=list[AsistenciaLeer])
def asistencias_de_usuario(
    usuario_id: int,
    desde: date | None = None,
    hasta: date | None = None,
    limite: int = Query(default=200, ge=1, le=1000),
    actual: Usuario = Depends(get_usuario_actual),
    session: Session = Depends(get_session),
):
    """Historial de entradas de un cliente (él mismo, su entrenador o el administrador)."""
    _usuario_visible(session, actual, usuario_id)
    servicio.validar_rango(desde, hasta)
    return servicio.listar(session, usuario_id, desde, hasta, limite)


@router.get("/usuarios/{usuario_id}/asistencia/metricas", response_model=MetricasLeer)
def metricas_de_usuario(usuario_id: int, actual: Usuario = Depends(get_usuario_actual), session: Session = Depends(get_session)):
    """Racha y % de cumplimiento de un cliente (él mismo, su entrenador o el administrador)."""
    _usuario_visible(session, actual, usuario_id)
    return servicio.metricas(session, usuario_id)
