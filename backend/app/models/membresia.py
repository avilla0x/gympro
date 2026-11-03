"""
Modelo `Membresia`: la tabla `membresia`. Un periodo durante el cual un cliente puede entrar al gimnasio.

Cada pago APROBADO tiene exactamente una membresía. Las fechas NO se escriben a mano: se calculan a partir
de los pagos aprobados del cliente (ver `recalcular_membresias` en services/membresias.py), así que si un
pago se anula, las membresías se vuelven a calcular solas.
"""
from datetime import date, datetime, timezone

from sqlalchemy import Column, DateTime
from sqlmodel import Field, SQLModel


def _ahora_utc() -> datetime:
    return datetime.now(timezone.utc)


class Membresia(SQLModel, table=True):
    __tablename__ = "membresia"

    id: int | None = Field(default=None, primary_key=True)

    usuario_id: int = Field(foreign_key="usuario.id", index=True)
    plan_id: int = Field(foreign_key="plan.id")
    pago_id: int = Field(foreign_key="pago.id", unique=True)  # el pago que la originó (uno a uno)

    # Ambas fechas son INCLUSIVAS: son el primer y el último día en que el cliente puede entrar.
    # Un plan de 30 días pagado el 1 de noviembre vale del 1 al 30 de noviembre (30 días en total).
    fecha_inicio: date
    fecha_fin: date

    creado_en: datetime = Field(default_factory=_ahora_utc, sa_column=Column(DateTime(timezone=True), nullable=False))
