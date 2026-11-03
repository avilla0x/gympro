"""
Avisos automáticos de vencimiento (RN5) y su consulta.

`generar_avisos_vencimiento` es la tarea que corre cada día (ver `app/core/tareas.py`). Es IDEMPOTENTE:
se puede ejecutar varias veces el mismo día (o después de un día en que el servidor estuvo apagado) sin
repetir avisos, porque cada aviso es único por (persona, tipo, fecha de referencia).
"""
from datetime import date

from sqlalchemy import func
from sqlmodel import Session, col, select

from app.core import tiempo
from app.core.config import settings
from app.core.errores import ErrorDeNegocio
from app.models import Membresia, Notificacion, Rol, TipoAviso, Usuario
from app.services import correo
from app.services.membresias import calcular_estado, EstadoMembresia


def _vencimientos_por_cliente(session: Session) -> list[tuple[Usuario, date]]:
    """Cada cliente ACTIVO con la fecha en que vence su membresía (la que vence más tarde)."""
    filas = session.exec(
        select(Usuario, func.max(Membresia.fecha_fin))
        .join(Membresia, col(Membresia.usuario_id) == col(Usuario.id))
        .where(Usuario.rol == Rol.CLIENTE, Usuario.activo == True)  # noqa: E712
        .group_by(col(Usuario.id))
    ).all()
    return [(usuario, fin) for usuario, fin in filas]


def _crear_si_no_existe(session: Session, usuario: Usuario, tipo: TipoAviso, titulo: str, mensaje: str, referencia: date) -> bool:
    """Crea el aviso y manda el correo, salvo que ya exista. Devuelve True si lo creó."""
    existe = session.exec(
        select(Notificacion).where(
            Notificacion.usuario_id == usuario.id, Notificacion.tipo == tipo, Notificacion.referencia == referencia
        )
    ).first()
    if existe:
        return False
    session.add(Notificacion(usuario_id=usuario.id, tipo=tipo, titulo=titulo, mensaje=mensaje, referencia=referencia))
    session.commit()
    correo.enviar_aviso(usuario.email, titulo, mensaje)
    return True


def generar_avisos_vencimiento(session: Session, dia: date | None = None) -> dict:
    """
    Revisa a todos los clientes activos y crea los avisos que correspondan HOY:
      - «Por vencer»: faltan entre 1 y `dias_aviso_vencimiento` días y aún no se avisó de este vencimiento.
        (Se avisa una sola vez por vencimiento; el rango, y no un día exacto, permite recuperar un aviso
        si la tarea no corrió ese día.)
      - «Vence hoy»: hoy es el último día de la membresía.
    Además crea un resumen para cada administrador activo si hay clientes por vencer o que vencen hoy.
    Devuelve cuántos avisos creó de cada tipo.
    """
    dia = dia or tiempo.hoy()
    por_vencer: list[Usuario] = []
    vencen_hoy: list[Usuario] = []
    creados = {"por_vencer": 0, "vence_hoy": 0, "resumen_admin": 0}

    for cliente, fin in _vencimientos_por_cliente(session):
        restantes = (fin - dia).days
        if restantes == 0:
            vencen_hoy.append(cliente)
            if _crear_si_no_existe(
                session, cliente, TipoAviso.VENCE_HOY, "Tu membresía vence hoy",
                f"Hola {cliente.nombre}, hoy es el último día de tu membresía. Renuévala para seguir entrenando sin interrupciones.",
                fin,
            ):
                creados["vence_hoy"] += 1
        elif 0 < restantes <= settings.dias_aviso_vencimiento:
            por_vencer.append(cliente)
            cuando = "mañana" if restantes == 1 else f"en {restantes} días"
            if _crear_si_no_existe(
                session, cliente, TipoAviso.POR_VENCER, "Tu membresía está por vencer",
                f"Hola {cliente.nombre}, tu membresía vence {cuando} ({fin.strftime('%d/%m/%Y')}). Renuévala desde «Pagar membresía» y no pierdes ningún día.",
                fin,
            ):
                creados["por_vencer"] += 1

    if por_vencer or vencen_hoy:
        admins = session.exec(select(Usuario).where(Usuario.rol == Rol.ADMIN, Usuario.activo == True)).all()  # noqa: E712
        texto = f"Hoy hay {len(por_vencer)} cliente(s) por vencer y {len(vencen_hoy)} que vencen hoy. Revísalos en Pagos > Vencimientos."
        for admin in admins:
            if _crear_si_no_existe(session, admin, TipoAviso.RESUMEN_ADMIN, "Resumen de vencimientos", texto, dia):
                creados["resumen_admin"] += 1
    return creados


def seguimiento_vencimientos(session: Session) -> list[dict]:
    """Clientes activos 'por vencer' o 'en mora' (los más urgentes primero), para que el admin los contacte."""
    hoy = tiempo.hoy()
    filas = []
    for cliente, fin in _vencimientos_por_cliente(session):
        estado, restantes = calcular_estado(fin, hoy, settings.dias_por_vencer)
        if estado in (EstadoMembresia.POR_VENCER, EstadoMembresia.EN_MORA):
            filas.append({
                "usuario_id": cliente.id, "nombre": cliente.nombre, "telefono": cliente.telefono, "email": cliente.email,
                "estado": estado, "fecha_vencimiento": fin, "dias_restantes": restantes,
            })
    return sorted(filas, key=lambda f: f["dias_restantes"])


# ---------------------------------------------------------------------------
# Consulta de los avisos de cada persona (siempre los suyos)
# ---------------------------------------------------------------------------
def listar_avisos(session: Session, usuario: Usuario) -> dict:
    items = session.exec(
        select(Notificacion).where(Notificacion.usuario_id == usuario.id).order_by(col(Notificacion.id).desc()).limit(50)
    ).all()
    no_leidas = session.exec(
        select(func.count()).select_from(Notificacion).where(Notificacion.usuario_id == usuario.id, Notificacion.leida == False)  # noqa: E712
    ).one()
    return {"no_leidas": no_leidas, "items": list(items)}


def marcar_leido(session: Session, usuario: Usuario, aviso_id: int) -> Notificacion:
    aviso = session.get(Notificacion, aviso_id)
    # Un aviso ajeno se responde como "no existe" para no revelar que existe.
    if aviso is None or aviso.usuario_id != usuario.id:
        raise ErrorDeNegocio("El aviso no existe.", 404)
    aviso.leida = True
    session.add(aviso)
    session.commit()
    session.refresh(aviso)
    return aviso


def marcar_todos_leidos(session: Session, usuario: Usuario) -> int:
    pendientes = session.exec(
        select(Notificacion).where(Notificacion.usuario_id == usuario.id, Notificacion.leida == False)  # noqa: E712
    ).all()
    for aviso in pendientes:
        aviso.leida = True
        session.add(aviso)
    session.commit()
    return len(pendientes)
