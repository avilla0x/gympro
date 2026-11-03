"""
Modelo `Pago`: la tabla `pago`. Cada fila es un intento o registro de pago de una membresía.

Un pago aprobado genera una membresía (ver `Membresia`). Los pagos NUNCA se borran: un error se corrige
ANULANDO el pago (queda quién, cuándo y por qué), para conservar la trazabilidad del dinero.
"""
from datetime import date, datetime, timezone
from enum import StrEnum

from sqlalchemy import Column, DateTime
from sqlmodel import Field, SQLModel

from app.models.tipos import columna_enum


class MetodoPago(StrEnum):
    EFECTIVO = "efectivo"
    TRANSFERENCIA = "transferencia"
    PASARELA = "pasarela"  # la pasarela de pagos SIMULADA (no hay dinero real)


class EstadoPago(StrEnum):
    PENDIENTE = "pendiente"  # iniciado en la pasarela, todavía sin aprobar ni rechazar
    APROBADO = "aprobado"  # cuenta como dinero recibido y da una membresía
    RECHAZADO = "rechazado"  # la pasarela lo rechazó: no da membresía
    ANULADO = "anulado"  # un pago aprobado que el administrador anuló: ya no da membresía


def _ahora_utc() -> datetime:
    return datetime.now(timezone.utc)


class Pago(SQLModel, table=True):
    __tablename__ = "pago"

    id: int | None = Field(default=None, primary_key=True)

    # --- Qué se pagó y quién ---
    usuario_id: int = Field(foreign_key="usuario.id", index=True)  # el cliente que recibe la membresía
    plan_id: int = Field(foreign_key="plan.id")
    # Monto en pesos colombianos (entero). Es el precio del plan EN EL MOMENTO del pago: si el plan
    # cambia de precio después, este pago conserva el monto con el que se hizo (RN16).
    monto: int

    metodo: MetodoPago = Field(sa_column=columna_enum(MetodoPago))
    estado: EstadoPago = Field(sa_column=columna_enum(EstadoPago, index=True))
    referencia: str | None = Field(default=None, max_length=100)  # ej. número de la transferencia

    # --- Cuándo ---
    # Día (en Colombia) en que se creó el pago. Sirve para filtrar y para los reportes por periodo.
    fecha: date = Field(index=True)
    creado_en: datetime = Field(default_factory=_ahora_utc, sa_column=Column(DateTime(timezone=True), nullable=False))
    # Momento en que se aprobó (vacío mientras esté pendiente o rechazado). De aquí sale el inicio de la membresía.
    aprobado_en: datetime | None = Field(default=None, sa_column=Column(DateTime(timezone=True), nullable=True))

    # --- Quién ---
    registrado_por_id: int = Field(foreign_key="usuario.id")  # el administrador (o el cliente, en la pasarela)

    # --- Anulación ---
    anulado_en: datetime | None = Field(default=None, sa_column=Column(DateTime(timezone=True), nullable=True))
    anulado_por_id: int | None = Field(default=None, foreign_key="usuario.id")
    motivo_anulacion: str | None = Field(default=None, max_length=300)
