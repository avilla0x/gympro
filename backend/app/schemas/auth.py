"""Esquemas de autenticación: qué entra y qué sale en login, recuperación y cambio de contraseña."""
from pydantic import BaseModel, EmailStr, field_validator

from app.schemas.usuario import UsuarioLeer, validar_fortaleza_password


class TokenRespuesta(BaseModel):
    """Respuesta del login: el token y los datos de quien inició sesión."""

    access_token: str
    token_type: str = "bearer"  # nombre estándar: indica que el token se envía como "Bearer <token>"
    usuario: UsuarioLeer  # el frontend lo usa para mostrar el nombre y decidir qué pantallas ver


class MensajeRespuesta(BaseModel):
    mensaje: str


class RecuperarSolicitud(BaseModel):
    """Petición de 'olvidé mi contraseña'."""

    email: EmailStr


class RestablecerSolicitud(BaseModel):
    """Cambio de contraseña usando el enlace recibido."""

    token: str
    password_nueva: str

    @field_validator("password_nueva")
    @classmethod
    def password_segura(cls, valor: str) -> str:
        return validar_fortaleza_password(valor)


class CambiarPasswordSolicitud(BaseModel):
    """Cambio de contraseña estando con la sesión iniciada."""

    password_actual: str
    password_nueva: str

    @field_validator("password_nueva")
    @classmethod
    def password_segura(cls, valor: str) -> str:
        return validar_fortaleza_password(valor)
