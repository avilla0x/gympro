"""
Modelo `Usuario`: la tabla `usuario` de la base de datos.

Un mismo modelo representa a los tres tipos de persona del sistema; lo que
cambia es el campo `rol`:
    - admin:      administrador / recepción
    - entrenador: crea rutinas y registra medidas (Sprint 2)
    - cliente:    socio del gimnasio

Ver docs/modelo-datos.md para la descripción completa de cada campo.
"""
from datetime import date, datetime, timezone
from enum import StrEnum

from sqlalchemy import Column, DateTime
from sqlalchemy import Enum as SAEnum
from sqlmodel import Field, SQLModel


class Rol(StrEnum):
    """Roles posibles de un usuario. El valor es lo que se guarda en la base de datos."""

    ADMIN = "admin"
    ENTRENADOR = "entrenador"
    CLIENTE = "cliente"


def _ahora_utc() -> datetime:
    """Fecha y hora actual en UTC (se guarda así y el frontend la muestra en hora local)."""
    return datetime.now(timezone.utc)


class Usuario(SQLModel, table=True):
    __tablename__ = "usuario"

    id: int | None = Field(default=None, primary_key=True)

    # --- Acceso al sistema -------------------------------------------------
    # El correo se guarda SIEMPRE en minúsculas (lo garantiza el servicio de usuarios)
    # para que "Ana@x.com" y "ana@x.com" no se tomen como personas distintas.
    email: str = Field(unique=True, index=True, max_length=255)
    # Nunca se guarda la contraseña: solo su "hash" cifrado con argon2.
    password_hash: str = Field(max_length=255)
    # native_enum=False -> se guarda como texto (VARCHAR) y no como un tipo ENUM de
    # PostgreSQL. Así agregar un rol nuevo no exige una migración compleja.
    rol: Rol = Field(
        sa_column=Column(
            SAEnum(Rol, native_enum=False, length=20, values_callable=lambda e: [r.value for r in e]),
            nullable=False,
            index=True,
        )
    )
    # Un usuario desactivado no puede iniciar sesión ni hacer check-in.
    # No se borran usuarios para conservar su historial (regla RN8).
    activo: bool = Field(default=True)

    # --- Datos personales --------------------------------------------------
    nombre: str = Field(max_length=150)
    # Documento de identidad (cédula). Único por persona; puede estar vacío.
    documento: str | None = Field(default=None, unique=True, index=True, max_length=30)
    telefono: str | None = Field(default=None, max_length=30)
    fecha_nacimiento: date | None = Field(default=None)
    direccion: str | None = Field(default=None, max_length=255)

    # --- Contacto de emergencia -------------------------------------------
    contacto_emergencia_nombre: str | None = Field(default=None, max_length=150)
    contacto_emergencia_telefono: str | None = Field(default=None, max_length=30)

    # --- Datos propios del cliente ----------------------------------------
    # Código único que lleva el QR (ej. GP-000123). Solo lo tienen los clientes;
    # se genera automáticamente al crear el cliente.
    codigo: str | None = Field(default=None, unique=True, index=True, max_length=20)
    # Entrenador responsable de este cliente (apunta a otro usuario con rol entrenador).
    entrenador_id: int | None = Field(default=None, foreign_key="usuario.id")

    # --- Control ----------------------------------------------------------
    creado_en: datetime = Field(
        default_factory=_ahora_utc,
        sa_column=Column(DateTime(timezone=True), nullable=False),
    )
