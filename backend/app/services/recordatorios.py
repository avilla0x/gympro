"""
Recordatorios de asistencia (HU02, RN6): le avisa al cliente que lleva varios días sin ir al gimnasio.

Corre en la misma tarea diaria que los avisos de vencimiento y es IDEMPOTENTE: el aviso es único por
(cliente, tipo, fecha de su última asistencia). Es decir, se avisa UNA vez por cada ausencia; cuando el
cliente vuelve y luego vuelve a ausentarse, la fecha de referencia cambia y se le puede avisar de nuevo.
"""
from datetime import date

from sqlalchemy import func
from sqlmodel import Session, col, select

from app.core import tiempo
from app.core.config import settings
from app.models import Asistencia, Membresia, Rol, TipoAviso, Usuario
from app.services.avisos import _crear_si_no_existe


def generar_recordatorios_asistencia(session: Session, dia: date | None = None) -> int:
    """
    Crea el recordatorio para cada cliente activo, con membresía vigente, que lleva
    `dias_sin_asistir_recordatorio` días o más sin asistir. Devuelve cuántos creó.

    Si el cliente nunca ha asistido, se cuentan los días desde que empezó su primera membresía.
    """
    dia = dia or tiempo.hoy()
    clientes = session.exec(
        select(Usuario, func.max(Membresia.fecha_fin), func.min(Membresia.fecha_inicio))
        .join(Membresia, col(Membresia.usuario_id) == col(Usuario.id))
        .where(Usuario.rol == Rol.CLIENTE, Usuario.activo == True)  # noqa: E712
        .group_by(col(Usuario.id))
    ).all()

    creados = 0
    for cliente, fin, primer_inicio in clientes:
        if fin < dia:
            continue  # sin membresía vigente: ya lo cubren los avisos de vencimiento/mora
        ultima = session.exec(select(func.max(Asistencia.fecha)).where(Asistencia.usuario_id == cliente.id)).one()
        referencia = ultima or primer_inicio
        sin_asistir = (dia - referencia).days
        if sin_asistir < settings.dias_sin_asistir_recordatorio:
            continue
        if ultima:
            mensaje = f"Hola {cliente.nombre}, llevas {sin_asistir} días sin entrenar (tu última visita fue el {ultima.strftime('%d/%m/%Y')}). ¡Te esperamos para retomar tu racha!"
        else:
            mensaje = f"Hola {cliente.nombre}, tu membresía está activa pero aún no has registrado tu primera visita. ¡Anímate a empezar, te esperamos!"
        if _crear_si_no_existe(session, cliente, TipoAviso.RECORDATORIO_ASISTENCIA, "Te extrañamos en el gimnasio", mensaje, referencia):
            creados += 1
    return creados
