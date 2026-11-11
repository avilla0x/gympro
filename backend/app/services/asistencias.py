"""
Asistencia al gimnasio (HU02): registrar entradas, consultar el historial y calcular la constancia.

Reglas (ver docs/reglas-negocio.md):
  RN3  Solo entra quien tiene membresía al día o por vencer; en mora o sin membresía se rechaza.
  RN3  Un cliente puede entrar varias veces el mismo día. Para la constancia cuenta el DÍA, no la entrada.
  RN4  Racha = días consecutivos con asistencia. Cumplimiento = días del mes con asistencia / días transcurridos.
"""
from calendar import monthrange
from datetime import date, timedelta

from sqlalchemy import func
from sqlmodel import Session, col, select

from app.core import tiempo
from app.core.config import settings
from app.core.errores import ErrorDeNegocio
from app.models import Asistencia, MetodoCheckin, Rol, Usuario
from app.services import membresias


# ---------------------------------------------------------------------------
# Registrar la entrada
# ---------------------------------------------------------------------------
def _exigir_acceso(session: Session, cliente: Usuario) -> None:
    """Rechaza la entrada si la membresía no lo permite, explicando el motivo."""
    resumen = membresias.resumen_membresia(session, cliente.id)
    if resumen["puede_entrar"]:
        return
    if resumen["estado"] == membresias.EstadoMembresia.EN_MORA:
        vencio = resumen["fecha_vencimiento"].strftime("%d/%m/%Y")
        raise ErrorDeNegocio(f"Tu membresía venció el {vencio}. Renuévala para poder entrar.", 403)
    raise ErrorDeNegocio("Aún no tienes una membresía. Paga un plan para poder entrar.", 403)


def _registrar(session: Session, cliente: Usuario, metodo: MetodoCheckin, registrada_por: Usuario) -> Asistencia:
    _exigir_acceso(session, cliente)
    ahora = tiempo.ahora()
    asistencia = Asistencia(
        usuario_id=cliente.id, fecha=tiempo.a_fecha_local(ahora), registrada_en=ahora,
        metodo=metodo, registrada_por_id=registrada_por.id,
    )
    session.add(asistencia)
    session.commit()
    session.refresh(asistencia)
    return asistencia


def checkin_qr(session: Session, cliente: Usuario, codigo: str) -> Asistencia:
    """El cliente escanea el QR fijo del gimnasio: se valida el código y su membresía."""
    if cliente.rol != Rol.CLIENTE:
        raise ErrorDeNegocio("Solo los clientes registran su entrada con el QR.", 403)
    if codigo.strip() != settings.qr_gimnasio:
        raise ErrorDeNegocio("El código QR no es válido. Escanea el QR de la entrada del gimnasio.", 400)
    return _registrar(session, cliente, MetodoCheckin.QR, cliente)


def checkin_manual(session: Session, admin: Usuario, usuario_id: int) -> Asistencia:
    """Recepción registra la entrada de un cliente (respaldo cuando no puede escanear)."""
    cliente = session.get(Usuario, usuario_id)
    if cliente is None or cliente.rol != Rol.CLIENTE:
        raise ErrorDeNegocio("El cliente no existe.", 404)
    if not cliente.activo:
        raise ErrorDeNegocio("El cliente está desactivado.", 400)
    return _registrar(session, cliente, MetodoCheckin.MANUAL, admin)


# ---------------------------------------------------------------------------
# Historial
# ---------------------------------------------------------------------------
def listar(
    session: Session, usuario_id: int | None = None, desde: date | None = None, hasta: date | None = None, limite: int = 200
) -> list[dict]:
    """Entradas con el nombre del cliente, la más reciente primero. Filtros opcionales por cliente y fechas."""
    consulta = select(Asistencia, Usuario).join(Usuario, col(Usuario.id) == col(Asistencia.usuario_id))
    if usuario_id is not None:
        consulta = consulta.where(Asistencia.usuario_id == usuario_id)
    if desde is not None:
        consulta = consulta.where(Asistencia.fecha >= desde)
    if hasta is not None:
        consulta = consulta.where(Asistencia.fecha <= hasta)
    filas = session.exec(consulta.order_by(col(Asistencia.registrada_en).desc(), col(Asistencia.id).desc()).limit(limite)).all()
    return [
        {
            "id": a.id, "usuario_id": a.usuario_id, "usuario_nombre": u.nombre, "usuario_codigo": u.codigo,
            "fecha": a.fecha, "registrada_en": a.registrada_en, "metodo": a.metodo,
        }
        for a, u in filas
    ]


def validar_rango(desde: date | None, hasta: date | None) -> None:
    if desde and hasta and desde > hasta:
        raise ErrorDeNegocio("La fecha «desde» no puede ser posterior a «hasta».", 400)


# ---------------------------------------------------------------------------
# Constancia: racha y cumplimiento
# ---------------------------------------------------------------------------
def calcular_racha(dias: set[date], hoy: date) -> tuple[int, int]:
    """
    Función pura. Devuelve (racha_actual, mejor_racha) a partir del conjunto de días con asistencia.

    La racha actual cuenta hacia atrás desde hoy; si hoy todavía no ha venido, se parte de ayer
    (el cliente aún está a tiempo de mantenerla). Si ayer tampoco vino, la racha es 0.
    """
    if not dias:
        return 0, 0
    # Mejor racha de todos los tiempos: se recorren los días en orden.
    mejor = actual_corrida = 0
    anterior: date | None = None
    for dia in sorted(dias):
        actual_corrida = actual_corrida + 1 if anterior and dia - anterior == timedelta(days=1) else 1
        mejor = max(mejor, actual_corrida)
        anterior = dia
    # Racha actual.
    punto = hoy if hoy in dias else hoy - timedelta(days=1)
    racha = 0
    while punto in dias:
        racha += 1
        punto -= timedelta(days=1)
    return racha, max(mejor, racha)


def metricas(session: Session, usuario_id: int) -> dict:
    """Constancia del cliente: racha actual, mejor racha, asistencia del mes y % de cumplimiento."""
    hoy = tiempo.hoy()
    dias = set(session.exec(select(Asistencia.fecha).where(Asistencia.usuario_id == usuario_id).distinct()).all())
    racha, mejor = calcular_racha(dias, hoy)

    inicio_mes = hoy.replace(day=1)
    dias_del_mes = {d for d in dias if d >= inicio_mes}  # (no hay entradas futuras)
    transcurridos = hoy.day
    entradas_mes = session.exec(
        select(func.count()).select_from(Asistencia).where(Asistencia.usuario_id == usuario_id, Asistencia.fecha >= inicio_mes)
    ).one()
    ultima = max(dias) if dias else None
    return {
        "racha_actual": racha,
        "mejor_racha": mejor,
        "dias_asistidos_mes": len(dias_del_mes),
        "dias_transcurridos_mes": transcurridos,
        "dias_en_el_mes": monthrange(hoy.year, hoy.month)[1],
        "cumplimiento_mes": round(len(dias_del_mes) * 100 / transcurridos),
        "entradas_mes": entradas_mes,
        "total_dias_asistidos": len(dias),
        "ultima_asistencia": ultima,
        "dias_sin_asistir": (hoy - ultima).days if ultima else None,
    }
