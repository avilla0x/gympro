"""
Lógica de las membresías: cómo se calculan sus fechas y en qué ESTADO está un cliente (RN1-RN3).

Idea central: las membresías NO se editan a mano. Siempre se RECONSTRUYEN a partir de los pagos
aprobados del cliente (`recalcular_membresias`). Así, anular un pago corrige solo todas las fechas.
"""
from datetime import date, timedelta
from enum import StrEnum

from sqlmodel import Session, col, select

from app.core.config import settings
from app.core import tiempo
from app.models import EstadoPago, Membresia, Pago, Plan


class EstadoMembresia(StrEnum):
    AL_DIA = "al_dia"  # le quedan más de `dias_por_vencer` días
    POR_VENCER = "por_vencer"  # le quedan `dias_por_vencer` días o menos (incluye el último día)
    EN_MORA = "en_mora"  # tuvo membresía y ya se venció: no puede entrar
    SIN_MEMBRESIA = "sin_membresia"  # nunca ha pagado: no puede entrar


# Estados con los que el cliente SÍ puede entrar al gimnasio.
ESTADOS_CON_ACCESO = {EstadoMembresia.AL_DIA, EstadoMembresia.POR_VENCER}


def recalcular_membresias(session: Session, usuario_id: int) -> list[Membresia]:
    """
    Borra y vuelve a crear las membresías del cliente a partir de sus pagos APROBADOS.

    Regla de renovación (RN2): los pagos se procesan en el orden en que se aprobaron.
      - Si el cliente paga con la membresía todavía vigente, la nueva EMPIEZA EL DÍA SIGUIENTE al
        vencimiento de la anterior (no pierde los días que le quedaban).
      - Si ya estaba vencida (o es su primer pago), empieza el día del pago.
    Las fechas son inclusivas: un plan de 30 días pagado el día D vale de D a D+29.
    """
    # 1) Se eliminan las membresías actuales. `flush` las borra YA, antes de insertar las nuevas
    #    (el pago_id es único y chocaría con las filas viejas).
    for vieja in session.exec(select(Membresia).where(Membresia.usuario_id == usuario_id)).all():
        session.delete(vieja)
    session.flush()

    # 2) Pagos aprobados, del primero al último (el id desempata si dos se aprobaron en el mismo instante).
    pagos = session.exec(
        select(Pago)
        .where(Pago.usuario_id == usuario_id, Pago.estado == EstadoPago.APROBADO)
        .order_by(col(Pago.aprobado_en), col(Pago.id))
    ).all()

    nuevas: list[Membresia] = []
    fin_anterior: date | None = None
    for pago in pagos:
        plan = session.get(Plan, pago.plan_id)
        inicio = tiempo.a_fecha_local(pago.aprobado_en)  # el día (en Colombia) en que se aprobó el pago
        if fin_anterior is not None and fin_anterior >= inicio:
            inicio = fin_anterior + timedelta(days=1)  # renovación anticipada: se suma al final
        fin = inicio + timedelta(days=plan.duracion_dias - 1)
        membresia = Membresia(
            usuario_id=usuario_id, plan_id=plan.id, pago_id=pago.id, fecha_inicio=inicio, fecha_fin=fin
        )
        session.add(membresia)
        nuevas.append(membresia)
        fin_anterior = fin

    session.commit()
    return nuevas


def listar_membresias(session: Session, usuario_id: int) -> list[Membresia]:
    """Historial de membresías del cliente, la más reciente primero."""
    return list(
        session.exec(
            select(Membresia).where(Membresia.usuario_id == usuario_id).order_by(col(Membresia.fecha_inicio).desc())
        ).all()
    )


def calcular_estado(fecha_vencimiento: date | None, dia: date, dias_por_vencer: int) -> tuple[EstadoMembresia, int | None]:
    """
    Función pura (sin base de datos) que decide el estado. Devuelve (estado, días_restantes).

    `dias_restantes` cuenta el día de hoy: si vence hoy, quedan 0 días y todavía puede entrar.
    En mora es negativo (cuántos días lleva vencida), y sin membresía es None.
    """
    if fecha_vencimiento is None:
        return EstadoMembresia.SIN_MEMBRESIA, None
    restantes = (fecha_vencimiento - dia).days
    if restantes < 0:
        return EstadoMembresia.EN_MORA, restantes
    if restantes <= dias_por_vencer:
        return EstadoMembresia.POR_VENCER, restantes
    return EstadoMembresia.AL_DIA, restantes


def resumen_membresia(session: Session, usuario_id: int) -> dict:
    """El estado actual del cliente: estado, fecha de vencimiento, días restantes y plan vigente."""
    ultima = session.exec(
        select(Membresia).where(Membresia.usuario_id == usuario_id).order_by(col(Membresia.fecha_fin).desc())
    ).first()
    estado, restantes = calcular_estado(
        ultima.fecha_fin if ultima else None, tiempo.hoy(), settings.dias_por_vencer
    )
    plan = session.get(Plan, ultima.plan_id) if ultima else None
    return {
        "estado": estado,
        "puede_entrar": estado in ESTADOS_CON_ACCESO,
        "fecha_vencimiento": ultima.fecha_fin if ultima else None,
        "dias_restantes": restantes,
        "plan": plan.nombre if plan else None,
    }
