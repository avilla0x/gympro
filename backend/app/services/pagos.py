"""Lógica de los pagos: manuales, pasarela simulada, listado y anulación (RN1-RN3, RN7, RN16)."""
import secrets

from sqlmodel import Session, col, select

from app.core.errores import ErrorDeNegocio
from app.core import tiempo
from app.models import EstadoPago, Membresia, MetodoPago, Pago, Rol, Usuario
from app.services import membresias
from app.services.permisos import exigir_ver_usuario
from app.services.planes import obtener_plan


def registrar_pago_manual(
    session: Session, admin: Usuario, usuario_id: int, plan_id: int, metodo: MetodoPago, referencia: str | None
) -> Pago:
    """
    El administrador registra un pago en efectivo o transferencia. Queda APROBADO de inmediato
    (el dinero ya se recibió) y le da al cliente una membresía nueva.
    """
    if metodo == MetodoPago.PASARELA:
        raise ErrorDeNegocio("Los pagos por pasarela se hacen desde el flujo de pago, no manualmente.", 400)

    cliente = _obtener_cliente_activo(session, usuario_id)
    plan = obtener_plan(session, plan_id)
    referencia = (referencia or "").strip() or None

    pago = Pago(
        usuario_id=cliente.id,
        plan_id=plan.id,
        monto=plan.precio,  # se COPIA el precio de hoy; si el plan cambia después, este pago no cambia (RN16)
        metodo=metodo,
        estado=EstadoPago.APROBADO,
        referencia=referencia,
        fecha=tiempo.hoy(),
        aprobado_en=tiempo.ahora(),
        registrado_por_id=admin.id,
    )
    session.add(pago)
    session.commit()
    session.refresh(pago)
    membresias.recalcular_membresias(session, cliente.id)
    return pago


def anular_pago(session: Session, admin: Usuario, pago_id: int, motivo: str) -> Pago:
    """
    Anula un pago aprobado. El pago NO se borra: queda como "anulado" con quién, cuándo y por qué,
    y las membresías del cliente se recalculan sin él.
    """
    pago = session.get(Pago, pago_id)
    if pago is None:
        raise ErrorDeNegocio("El pago no existe.", 404)
    if pago.estado != EstadoPago.APROBADO:
        raise ErrorDeNegocio("Solo se pueden anular pagos aprobados.", 409)

    pago.estado = EstadoPago.ANULADO
    pago.anulado_en = tiempo.ahora()
    pago.anulado_por_id = admin.id
    pago.motivo_anulacion = motivo.strip()
    session.add(pago)
    session.commit()
    membresias.recalcular_membresias(session, pago.usuario_id)
    session.refresh(pago)
    return pago


def listar_pagos(
    session: Session, usuario_id: int | None = None, estado: EstadoPago | None = None
) -> list[Pago]:
    """Pagos del más reciente al más antiguo, opcionalmente de un cliente o en un estado."""
    consulta = select(Pago).order_by(col(Pago.id).desc())
    if usuario_id is not None:
        consulta = consulta.where(Pago.usuario_id == usuario_id)
    if estado is not None:
        consulta = consulta.where(Pago.estado == estado)
    return list(session.exec(consulta).all())


def pagos_con_nombres(session: Session, pagos: list[Pago]) -> list[dict]:
    """Agrega el nombre del cliente y del plan a cada pago, para mostrarlos en las tablas."""
    resultado = []
    for p in pagos:
        cliente = session.get(Usuario, p.usuario_id)
        plan = obtener_plan(session, p.plan_id)
        resultado.append({**p.model_dump(), "usuario_nombre": cliente.nombre, "plan_nombre": plan.nombre})
    return resultado


# ---------------------------------------------------------------------------
# Pasarela de pagos SIMULADA (RN7): no hay dinero real, solo se imita el flujo
# "crear pago pendiente -> pantalla de la pasarela -> aprobar o rechazar".
# ---------------------------------------------------------------------------
def _obtener_cliente_activo(session: Session, usuario_id: int) -> Usuario:
    cliente = session.get(Usuario, usuario_id)
    if cliente is None or cliente.rol != Rol.CLIENTE:
        raise ErrorDeNegocio("El cliente no existe.", 404)
    if not cliente.activo:
        raise ErrorDeNegocio("El cliente está desactivado; actívalo antes de registrarle un pago.", 400)
    return cliente


def _exigir_dueno_o_admin(actor: Usuario, pago: Pago) -> None:
    """Solo el administrador o el propio cliente dueño del pago pueden operarlo en la pasarela."""
    if actor.rol != Rol.ADMIN and actor.id != pago.usuario_id:
        raise ErrorDeNegocio("No tienes permiso para operar este pago.", 403)


def iniciar_checkout(session: Session, actor: Usuario, plan_id: int, usuario_id: int | None) -> Pago:
    """
    Crea un pago PENDIENTE por la pasarela simulada.

    - Un cliente solo puede pagar para sí mismo (si manda otro `usuario_id`, se rechaza).
    - El administrador debe indicar de qué cliente se trata.
    - Si el cliente ya tenía un pago pendiente del MISMO plan, se reutiliza (reintentar);
      los pendientes de otros planes se cancelan, para no dejar varios abiertos a la vez.
    """
    if actor.rol == Rol.CLIENTE:
        if usuario_id is not None and usuario_id != actor.id:
            raise ErrorDeNegocio("Solo puedes pagar tu propia membresía.", 403)
        usuario_id = actor.id
    elif actor.rol == Rol.ADMIN:
        if usuario_id is None:
            raise ErrorDeNegocio("Indica el cliente al que se le cobra.", 400)
    else:
        raise ErrorDeNegocio("No tienes permiso para realizar esta acción.", 403)

    cliente = _obtener_cliente_activo(session, usuario_id)
    plan = obtener_plan(session, plan_id)

    pendientes = session.exec(
        select(Pago).where(
            Pago.usuario_id == cliente.id, Pago.estado == EstadoPago.PENDIENTE, Pago.metodo == MetodoPago.PASARELA
        )
    ).all()
    reutilizable = None
    for p in pendientes:
        if p.plan_id == plan.id and reutilizable is None:
            reutilizable = p
        else:
            p.estado = EstadoPago.RECHAZADO  # cancelado: otro plan o duplicado
            session.add(p)
    if reutilizable is not None:
        # El precio puede haber cambiado desde que se abrió: el pago pendiente toma el vigente.
        reutilizable.monto = plan.precio
        session.add(reutilizable)
        session.commit()
        session.refresh(reutilizable)
        return reutilizable

    pago = Pago(
        usuario_id=cliente.id,
        plan_id=plan.id,
        monto=plan.precio,
        metodo=MetodoPago.PASARELA,
        estado=EstadoPago.PENDIENTE,
        referencia="SIM-" + secrets.token_hex(4).upper(),  # número de operación inventado por la pasarela simulada
        fecha=tiempo.hoy(),
        registrado_por_id=actor.id,
    )
    session.add(pago)
    session.commit()
    session.refresh(pago)
    return pago


def resolver_pago_simulado(session: Session, actor: Usuario, pago_id: int, aprobar: bool) -> Pago:
    """
    Decide el resultado de un pago pendiente de la pasarela simulada.
    Aprobado -> cuenta como dinero recibido y da membresía. Rechazado (o cancelado) -> no cambia nada.
    """
    pago = obtener_pago(session, actor, pago_id)
    _exigir_dueno_o_admin(actor, pago)
    if pago.metodo != MetodoPago.PASARELA:
        raise ErrorDeNegocio("Este pago no es de la pasarela.", 400)
    if pago.estado != EstadoPago.PENDIENTE:
        raise ErrorDeNegocio("Este pago ya no está pendiente.", 409)

    if aprobar:
        pago.estado = EstadoPago.APROBADO
        pago.aprobado_en = tiempo.ahora()
    else:
        pago.estado = EstadoPago.RECHAZADO
    session.add(pago)
    session.commit()
    if aprobar:
        membresias.recalcular_membresias(session, pago.usuario_id)
    session.refresh(pago)
    return pago


def obtener_pago(session: Session, actor: Usuario, pago_id: int) -> Pago:
    """Busca un pago y comprueba que `actor` pueda verlo (dueño, su entrenador o admin)."""
    pago = session.get(Pago, pago_id)
    if pago is None:
        raise ErrorDeNegocio("El pago no existe.", 404)
    exigir_ver_usuario(actor, session.get(Usuario, pago.usuario_id))
    return pago


def comprobante(session: Session, actor: Usuario, pago_id: int) -> dict:
    """Datos del comprobante: el pago con nombres, documento del cliente y la vigencia que otorgó."""
    pago = obtener_pago(session, actor, pago_id)
    datos = pagos_con_nombres(session, [pago])[0]
    cliente = session.get(Usuario, pago.usuario_id)
    mem = session.exec(select(Membresia).where(Membresia.pago_id == pago.id)).first()
    datos["usuario_documento"] = cliente.documento
    datos["fecha_inicio"] = mem.fecha_inicio if mem else None
    datos["fecha_fin"] = mem.fecha_fin if mem else None
    return datos
