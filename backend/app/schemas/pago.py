"""Esquemas de pagos y membresías."""
from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.models import EstadoPago, MetodoPago
from app.services.membresias import EstadoMembresia


class PagoManualCrear(BaseModel):
    """Datos para que el administrador registre un pago recibido en el gimnasio."""

    usuario_id: int
    plan_id: int
    # Solo efectivo o transferencia: la pasarela tiene su propio flujo (subtarea 3).
    metodo: MetodoPago
    referencia: str | None = Field(default=None, max_length=100, description="Ej. número de la transferencia")


class PagoAnular(BaseModel):
    motivo: str = Field(min_length=5, max_length=300, description="Por qué se anula (queda guardado)")


class PagoLeer(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    usuario_id: int
    usuario_nombre: str
    plan_id: int
    plan_nombre: str
    monto: int
    metodo: MetodoPago
    estado: EstadoPago
    referencia: str | None
    fecha: date
    creado_en: datetime
    registrado_por_id: int
    anulado_en: datetime | None
    anulado_por_id: int | None
    motivo_anulacion: str | None


class CheckoutCrear(BaseModel):
    plan_id: int
    # Solo lo usa el administrador (a quién cobra). Si lo manda un cliente, debe ser él mismo.
    usuario_id: int | None = None


class ResultadoSimulado(BaseModel):
    resultado: Literal["aprobado", "rechazado"]


class ComprobanteLeer(PagoLeer):
    usuario_documento: str | None
    fecha_inicio: date | None  # vigencia que otorgó (vacío si el pago no está aprobado)
    fecha_fin: date | None


class MembresiaLeer(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    plan_id: int
    pago_id: int
    fecha_inicio: date
    fecha_fin: date


class ResumenMembresia(BaseModel):
    estado: EstadoMembresia
    puede_entrar: bool
    fecha_vencimiento: date | None
    dias_restantes: int | None
    plan: str | None
    membresias: list[MembresiaLeer]
