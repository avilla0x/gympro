"""
Configuración de Alembic (control de versiones de la base de datos).

Alembic compara los modelos de `app/models` con las tablas reales y genera
"migraciones": archivos que describen cada cambio (crear tabla, agregar columna…).
Así los tres integrantes pueden tener la misma estructura de base de datos.

Comandos más usados (desde la carpeta backend/):
    alembic revision --autogenerate -m "descripcion"   -> crea una migración nueva
    alembic upgrade head                                -> aplica todas las migraciones pendientes
    alembic downgrade -1                                -> deshace la última migración
"""
from logging.config import fileConfig

from alembic import context
from sqlalchemy import create_engine, pool
from sqlmodel import SQLModel

from app.core.config import settings
import app.models  # noqa: F401  (importar los modelos para que Alembic los conozca)

config = context.config

# Configura el registro de mensajes (logging) según alembic.ini
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Estructura que Alembic compara contra la base de datos real
target_metadata = SQLModel.metadata


def run_migrations_offline() -> None:
    """Genera el SQL sin conectarse a la base de datos (modo poco usado)."""
    context.configure(
        url=settings.database_url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Se conecta a la base de datos y aplica las migraciones (modo normal)."""
    connectable = create_engine(settings.database_url, poolclass=pool.NullPool)
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
