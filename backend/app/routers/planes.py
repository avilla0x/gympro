"""
Endpoints de los planes de membresía (HU03).

Los planes son tres y fijos: aquí solo se pueden CONSULTAR (cualquier persona con sesión, porque
el cliente necesita ver los precios para pagar) y CAMBIAR SU PRECIO (solo el administrador).
Quién puede usar cada uno: ver docs/permisos.md.
"""
from fastapi import APIRouter, Depends
from sqlmodel import Session

from app.core.database import get_session
from app.core.dependencias import get_usuario_actual, solo_admin
from app.models import Usuario
from app.schemas.plan import PlanLeer, PrecioCambiar
from app.services import planes as servicio

router = APIRouter(prefix="/planes", tags=["Planes"])


@router.get("", response_model=list[PlanLeer])
def listar_planes(
    _usuario: Usuario = Depends(get_usuario_actual),  # cualquier rol con sesión iniciada
    session: Session = Depends(get_session),
):
    """Lista los planes de membresía, del más corto al más largo."""
    return servicio.listar_planes(session)


@router.patch("/{plan_id}", response_model=PlanLeer)
def cambiar_precio_plan(
    plan_id: int,
    datos: PrecioCambiar,
    _admin: Usuario = Depends(solo_admin),
    session: Session = Depends(get_session),
):
    """Cambia el precio de un plan (solo el administrador). Aplica únicamente a pagos nuevos."""
    return servicio.cambiar_precio(session, plan_id, datos.precio)
