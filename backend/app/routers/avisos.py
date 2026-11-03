"""
Endpoints de avisos (HU03, alertas de vencimiento).

Cada persona solo ve y marca SUS avisos. El administrador, además, puede lanzar la revisión de
vencimientos a mano (útil para demostrar el sistema sin esperar a la tarea diaria) y ver el
seguimiento de clientes por vencer y en mora.
"""
from fastapi import APIRouter, Depends
from sqlmodel import Session

from app.core.database import get_session
from app.core.dependencias import get_usuario_actual, solo_admin
from app.models import Usuario
from app.schemas.aviso import AvisoLeer, ListaAvisos, ResultadoGeneracion, SeguimientoLeer
from app.services import avisos as servicio

router = APIRouter(tags=["Avisos"])


@router.get("/avisos", response_model=ListaAvisos)
def listar_avisos(actual: Usuario = Depends(get_usuario_actual), session: Session = Depends(get_session)):
    """Mis 50 avisos más recientes y cuántos tengo sin leer."""
    return servicio.listar_avisos(session, actual)


@router.post("/avisos/leer-todos")
def marcar_todos(actual: Usuario = Depends(get_usuario_actual), session: Session = Depends(get_session)):
    """Marca todos mis avisos como leídos."""
    return {"marcados": servicio.marcar_todos_leidos(session, actual)}


@router.post("/avisos/{aviso_id}/leer", response_model=AvisoLeer)
def marcar_leido(aviso_id: int, actual: Usuario = Depends(get_usuario_actual), session: Session = Depends(get_session)):
    """Marca uno de mis avisos como leído."""
    return servicio.marcar_leido(session, actual, aviso_id)


@router.post("/avisos/generar", response_model=ResultadoGeneracion)
def generar_avisos(_admin: Usuario = Depends(solo_admin), session: Session = Depends(get_session)):
    """Revisa los vencimientos y crea los avisos de hoy (solo administrador). No repite avisos ya creados."""
    return servicio.generar_avisos_vencimiento(session)


@router.get("/vencimientos", response_model=list[SeguimientoLeer])
def seguimiento(_admin: Usuario = Depends(solo_admin), session: Session = Depends(get_session)):
    """Clientes activos por vencer o en mora, los más urgentes primero (solo administrador)."""
    return servicio.seguimiento_vencimientos(session)
