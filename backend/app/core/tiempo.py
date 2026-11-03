"""
La ÚNICA fuente de "qué hora y qué día es" para todo el negocio.

Por qué existe: la base de datos guarda las horas en UTC, pero el gimnasio vive en Colombia (UTC-5).
A las 8:30 p. m. en Bogotá ya es "mañana" en UTC; si el sistema usara la fecha de UTC, una membresía
vencería un día antes de lo debido. Por eso TODO el código de negocio pide el día con `hoy()` y nunca
con `date.today()` o `datetime.now()` sueltos.

Además, tener un único lugar para el reloj permite "congelar" el tiempo en las pruebas
(ver `reloj` en tests/conftest.py).
"""
from datetime import date, datetime, timezone
from zoneinfo import ZoneInfo

from app.core.config import settings

ZONA = ZoneInfo(settings.zona_horaria)


def ahora() -> datetime:
    """El instante actual, con zona horaria UTC (así es como se guarda en la base de datos)."""
    return datetime.now(timezone.utc)


def hoy() -> date:
    """El día de hoy EN COLOMBIA (no en UTC)."""
    return ahora().astimezone(ZONA).date()


def a_fecha_local(momento: datetime) -> date:
    """Convierte un instante guardado en la base de datos al día que era en Colombia."""
    if momento.tzinfo is None:
        # SQLite (usado solo en las pruebas) devuelve las horas sin zona; en PostgreSQL siempre vienen con zona.
        # Todo se guarda en UTC, así que se interpreta como UTC.
        momento = momento.replace(tzinfo=timezone.utc)
    return momento.astimezone(ZONA).date()
