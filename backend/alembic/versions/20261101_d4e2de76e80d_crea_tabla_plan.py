"""crea tabla plan con los tres planes iniciales

Revision ID: d4e2de76e80d
Revises: 2f8a0f27d071
Create Date: 2026-11-01 20:23:51.563272

Además de crear la tabla, CARGA los tres planes fijos del gimnasio (mensual, trimestral y anual),
para que existan en cualquier base de datos donde se apliquen las migraciones (la de cada integrante,
la de pruebas o la de AWS). Los precios son de EJEMPLO: el administrador los ajusta desde el sistema.
"""
from datetime import datetime, timezone
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel  # necesario porque SQLModel usa sus propios tipos (ej. AutoString)


# revision identifiers, used by Alembic.
revision: str = 'd4e2de76e80d'
down_revision: Union[str, Sequence[str], None] = '2f8a0f27d071'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# (nombre, duración en días, precio de ejemplo en pesos colombianos)
PLANES_INICIALES = [
    ("Mensual", 30, 90_000),
    ("Trimestral", 90, 240_000),
    ("Anual", 365, 850_000),
]


def upgrade() -> None:
    """Upgrade schema."""
    tabla = op.create_table('plan',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('nombre', sqlmodel.sql.sqltypes.AutoString(length=50), nullable=False),
    sa.Column('duracion_dias', sa.Integer(), nullable=False),
    sa.Column('precio', sa.Integer(), nullable=False),
    sa.Column('creado_en', sa.DateTime(timezone=True), nullable=False),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('nombre')
    )

    # Carga de datos: los tres planes fijos.
    ahora = datetime.now(timezone.utc)
    op.bulk_insert(
        tabla,
        [
            {"nombre": nombre, "duracion_dias": dias, "precio": precio, "creado_en": ahora}
            for nombre, dias, precio in PLANES_INICIALES
        ],
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table('plan')
