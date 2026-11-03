"""Lógica de negocio de los planes de membresía."""
from sqlmodel import Session, col, select

from app.core.errores import ErrorDeNegocio
from app.models import Plan


def listar_planes(session: Session) -> list[Plan]:
    """Todos los planes, del más corto al más largo (mensual, trimestral, anual)."""
    return list(session.exec(select(Plan).order_by(col(Plan.duracion_dias))).all())


def obtener_plan(session: Session, plan_id: int) -> Plan:
    """Devuelve el plan con ese id, o lanza un error 404 si no existe."""
    plan = session.get(Plan, plan_id)
    if plan is None:
        raise ErrorDeNegocio("El plan no existe", 404)
    return plan


def cambiar_precio(session: Session, plan_id: int, precio: int) -> Plan:
    """
    Cambia el precio de un plan.

    El precio nuevo se aplica solo a los pagos FUTUROS: cada pago guarda el monto con el que
    se hizo (ver docs/reglas-negocio.md, RN16), así que los pagos anteriores no se modifican.
    """
    plan = obtener_plan(session, plan_id)
    plan.precio = precio
    session.add(plan)
    session.commit()
    session.refresh(plan)
    return plan
