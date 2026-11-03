"""
Modelo `Plan`: la tabla `plan`, con los planes de membresía que vende el gimnasio.

Decisión del equipo: hay exactamente TRES planes fijos (mensual, trimestral y anual).
No se crean ni se borran desde el sistema; se cargan al aplicar las migraciones
(ver alembic/versions) y el administrador solo puede cambiar su PRECIO.
"""
from datetime import datetime, timezone

from sqlalchemy import Column, DateTime
from sqlmodel import Field, SQLModel


def _ahora_utc() -> datetime:
    return datetime.now(timezone.utc)


class Plan(SQLModel, table=True):
    __tablename__ = "plan"

    id: int | None = Field(default=None, primary_key=True)

    nombre: str = Field(unique=True, max_length=50)  # "Mensual", "Trimestral", "Anual"
    # Cuántos días dura la membresía que se compra con este plan.
    duracion_dias: int = Field(gt=0)
    # Precio en PESOS COLOMBIANOS, sin decimales (ej. 90000 = $90.000).
    # Se guarda como entero para evitar errores de redondeo con el dinero.
    precio: int = Field(gt=0)

    creado_en: datetime = Field(
        default_factory=_ahora_utc,
        sa_column=Column(DateTime(timezone=True), nullable=False),
    )
