"""
Endpoints de pagos y membresías (HU03).

  - El administrador registra pagos manuales, los consulta y los anula.
  - Un cliente ve SU estado de membresía y SUS pagos (el entrenador, los de sus clientes asignados).
Quién puede usar cada uno: ver docs/permisos.md.
"""
from fastapi import APIRouter, Depends
from sqlmodel import Session

from app.core.database import get_session
from app.core.dependencias import get_usuario_actual, solo_admin
from app.core.errores import ErrorDeNegocio
from app.models import EstadoPago, Usuario
from app.schemas.pago import (
    CheckoutCrear, ComprobanteLeer, PagoAnular, PagoLeer, PagoManualCrear, ResultadoSimulado, ResumenMembresia,
)
from app.services import membresias, pagos as servicio
from app.services.permisos import exigir_ver_usuario

router = APIRouter(tags=["Pagos"])


@router.post("/pagos/manual", response_model=PagoLeer, status_code=201)
def registrar_pago_manual(
    datos: PagoManualCrear,
    admin: Usuario = Depends(solo_admin),
    session: Session = Depends(get_session),
):
    """Registra un pago en efectivo o transferencia (solo administrador). Queda aprobado y da una membresía."""
    pago = servicio.registrar_pago_manual(session, admin, datos.usuario_id, datos.plan_id, datos.metodo, datos.referencia)
    return servicio.pagos_con_nombres(session, [pago])[0]


@router.get("/pagos", response_model=list[PagoLeer])
def listar_pagos(
    usuario_id: int | None = None,
    estado: EstadoPago | None = None,
    _admin: Usuario = Depends(solo_admin),
    session: Session = Depends(get_session),
):
    """Lista todos los pagos (solo administrador), con filtros opcionales por cliente y estado."""
    return servicio.pagos_con_nombres(session, servicio.listar_pagos(session, usuario_id, estado))


@router.post("/pagos/checkout", response_model=PagoLeer, status_code=201)
def iniciar_checkout(
    datos: CheckoutCrear,
    actual: Usuario = Depends(get_usuario_actual),
    session: Session = Depends(get_session),
):
    """Inicia un pago en la pasarela simulada (queda pendiente). Lo usa el cliente para sí o el administrador para un cliente."""
    pago = servicio.iniciar_checkout(session, actual, datos.plan_id, datos.usuario_id)
    return servicio.pagos_con_nombres(session, [pago])[0]


@router.post("/pagos/{pago_id}/simular", response_model=PagoLeer)
def simular_pago(
    pago_id: int,
    datos: ResultadoSimulado,
    actual: Usuario = Depends(get_usuario_actual),
    session: Session = Depends(get_session),
):
    """Aprueba o rechaza un pago pendiente de la pasarela simulada (dueño del pago o administrador)."""
    pago = servicio.resolver_pago_simulado(session, actual, pago_id, datos.resultado == "aprobado")
    return servicio.pagos_con_nombres(session, [pago])[0]


@router.post("/pagos/{pago_id}/cancelar", response_model=PagoLeer)
def cancelar_pago(
    pago_id: int,
    actual: Usuario = Depends(get_usuario_actual),
    session: Session = Depends(get_session),
):
    """Cancela un pago pendiente de la pasarela (queda como rechazado y no da membresía)."""
    pago = servicio.resolver_pago_simulado(session, actual, pago_id, False)
    return servicio.pagos_con_nombres(session, [pago])[0]


@router.get("/pagos/{pago_id}", response_model=ComprobanteLeer)
def ver_pago(
    pago_id: int,
    actual: Usuario = Depends(get_usuario_actual),
    session: Session = Depends(get_session),
):
    """Detalle de un pago con los datos del comprobante (dueño, su entrenador asignado o administrador)."""
    return servicio.comprobante(session, actual, pago_id)


@router.post("/pagos/{pago_id}/anular", response_model=PagoLeer)
def anular_pago(
    pago_id: int,
    datos: PagoAnular,
    admin: Usuario = Depends(solo_admin),
    session: Session = Depends(get_session),
):
    """Anula un pago aprobado indicando el motivo (solo administrador). Las membresías se recalculan."""
    pago = servicio.anular_pago(session, admin, pago_id, datos.motivo)
    return servicio.pagos_con_nombres(session, [pago])[0]


def _cliente_visible(session: Session, actual: Usuario, usuario_id: int) -> Usuario:
    """Busca al usuario y comprueba que `actual` pueda ver sus datos."""
    objetivo = session.get(Usuario, usuario_id)
    if objetivo is None:
        raise ErrorDeNegocio("El usuario no existe.", 404)
    exigir_ver_usuario(actual, objetivo)
    return objetivo


@router.get("/usuarios/{usuario_id}/membresia", response_model=ResumenMembresia)
def ver_membresia(
    usuario_id: int,
    actual: Usuario = Depends(get_usuario_actual),
    session: Session = Depends(get_session),
):
    """Estado de la membresía de un cliente (al día, por vencer, en mora o sin membresía) y su historial."""
    objetivo = _cliente_visible(session, actual, usuario_id)
    return {**membresias.resumen_membresia(session, objetivo.id), "membresias": membresias.listar_membresias(session, objetivo.id)}


@router.get("/usuarios/{usuario_id}/pagos", response_model=list[PagoLeer])
def ver_pagos_de_usuario(
    usuario_id: int,
    actual: Usuario = Depends(get_usuario_actual),
    session: Session = Depends(get_session),
):
    """Pagos de un cliente: él mismo, su entrenador asignado o el administrador."""
    objetivo = _cliente_visible(session, actual, usuario_id)
    return servicio.pagos_con_nombres(session, servicio.listar_pagos(session, objetivo.id))
