"""
Modelo `Asistencia`: la tabla `asistencia`. Una fila por cada ENTRADA al gimnasio (check-in).

Un cliente puede entrar varias veces el mismo día (cada entrada es una fila); para la racha y el
porcentaje de cumplimiento solo cuenta si ese DÍA tuvo al menos una entrada.
"""
from datetime import date, datetime, timezone
from enum import StrEnum

from sqlalchemy import Column, DateTime, Index
from sqlmodel import Field, SQLModel

from app.models.tipos import columna_enum


class MetodoCheckin(StrEnum):
    QR = "qr"  # el cliente escaneó el QR fijo del gimnasio con su celular
    MANUAL = "manual"  # recepción lo registró a mano (respaldo si el cliente no puede escanear)


def _ahora_utc() -> datetime:
    return datetime.now(timezone.utc)


class Asistencia(SQLModel, table=True):
    __tablename__ = "asistencia"
    __table_args__ = (Index("ix_asistencia_usuario_fecha", "usuario_id", "fecha"),)

    id: int | None = Field(default=None, primary_key=True)
    usuario_id: int = Field(foreign_key="usuario.id")  # el cliente que entró
    # El día de la entrada EN COLOMBIA (se guarda aparte para filtrar y contar días sin cálculos de zona).
    fecha: date = Field(index=True)
    registrada_en: datetime = Field(default_factory=_ahora_utc, sa_column=Column(DateTime(timezone=True), nullable=False))
    metodo: MetodoCheckin = Field(sa_column=columna_enum(MetodoCheckin))
    # Quién lo registró: el mismo cliente (QR) o el administrador (manual).
    registrada_por_id: int = Field(foreign_key="usuario.id")
