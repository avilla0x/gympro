"""
Conexión a la base de datos PostgreSQL.

- `engine` es la conexión (un "pool" de conexiones reutilizables).
- `get_session` entrega una sesión a cada petición HTTP y la cierra al terminar.
  Los endpoints la piden con `Depends(get_session)` (inyección de dependencias de FastAPI).
"""
from collections.abc import Generator

from sqlmodel import Session, create_engine

from app.core.config import settings

# pool_pre_ping=True comprueba que la conexión siga viva antes de usarla; evita
# errores si la base de datos se reinició mientras la API estaba encendida.
engine = create_engine(settings.database_url, pool_pre_ping=True)


def get_session() -> Generator[Session, None, None]:
    """Abre una sesión de base de datos para una petición y la cierra al final."""
    with Session(engine) as session:
        yield session
