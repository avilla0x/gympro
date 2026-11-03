"""Ayuda para declarar columnas de tipo "lista de opciones" (enum) de forma uniforme."""
from enum import Enum

from sqlalchemy import Column
from sqlalchemy import Enum as SAEnum


def columna_enum(clase_enum: type[Enum], largo: int = 20, **opciones) -> Column:
    """
    Columna que guarda la opción como TEXTO (VARCHAR) y no como un tipo ENUM de PostgreSQL.
    Así agregar una opción nueva no exige una migración compleja; la validación la hace Python.
    (Misma decisión que el campo `rol` de los usuarios: ver D13 en docs/decisiones.md.)
    """
    return Column(
        SAEnum(clase_enum, native_enum=False, length=largo, values_callable=lambda e: [m.value for m in e]),
        nullable=False,
        **opciones,
    )
