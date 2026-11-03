"""Esquemas de los planes de membresía."""
from pydantic import BaseModel, ConfigDict, Field

# Tope de seguridad para evitar errores de digitación (un cero de más). No es una regla del negocio.
PRECIO_MAXIMO = 100_000_000


class PlanLeer(BaseModel):
    """Un plan tal como lo devuelve la API."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    nombre: str
    duracion_dias: int
    precio: int  # pesos colombianos, sin decimales


class PrecioCambiar(BaseModel):
    """Único dato que el administrador puede cambiar de un plan: su precio."""

    # strict=True: solo se aceptan números enteros. Se rechazan 0, negativos, decimales (90000.5) y textos ("90000").
    precio: int = Field(gt=0, le=PRECIO_MAXIMO, strict=True, description="Precio en pesos colombianos, sin decimales")
