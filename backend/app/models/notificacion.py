"""
Modelo `Notificacion`: la tabla `notificacion`. Un aviso dentro del sistema para una persona
(se ve en la pantalla «Avisos»). Hoy se generan por la tarea diaria de vencimientos (RN5).

No se repiten: la combinación (usuario, tipo, fecha de referencia) es única, así la tarea puede
correr varias veces el mismo día sin duplicar avisos.
"""
from datetime import date, datetime, timezone
from enum import StrEnum

from sqlalchemy import Column, DateTime, UniqueConstraint
from sqlmodel import Field, SQLModel

from app.models.tipos import columna_enum


class TipoAviso(StrEnum):
    POR_VENCER = "por_vencer"  # al cliente: le faltan pocos días
    VENCE_HOY = "vence_hoy"  # al cliente: hoy es su último día
    RESUMEN_ADMIN = "resumen_admin"  # al administrador: cuántos clientes están por vencer o vencen hoy


def _ahora_utc() -> datetime:
    return datetime.now(timezone.utc)


class Notificacion(SQLModel, table=True):
    __tablename__ = "notificacion"
    __table_args__ = (UniqueConstraint("usuario_id", "tipo", "referencia", name="uq_notificacion_usuario_tipo_ref"),)

    id: int | None = Field(default=None, primary_key=True)
    usuario_id: int = Field(foreign_key="usuario.id", index=True)  # a quién se le avisa
    tipo: TipoAviso = Field(sa_column=columna_enum(TipoAviso))
    titulo: str = Field(max_length=120)
    mensaje: str = Field(max_length=500)
    # Qué fecha origina el aviso: el vencimiento de la membresía (clientes) o el día del resumen (admin).
    referencia: date
    leida: bool = Field(default=False)
    creado_en: datetime = Field(default_factory=_ahora_utc, sa_column=Column(DateTime(timezone=True), nullable=False))
