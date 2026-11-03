"""
Esquemas de usuario: definen QUÉ datos entran y salen de la API.

Se separan del modelo (la tabla) a propósito:
  - `UsuarioCrear` es lo que el administrador envía al crear a alguien
    (incluye la contraseña, que jamás se devuelve).
  - `UsuarioActualizar` es lo que el administrador puede cambiar de cualquier usuario.
  - `PerfilActualizar` es lo que cada persona puede cambiar de SU propio perfil.
  - `UsuarioLeer` es lo que la API responde (nunca incluye la contraseña ni su hash).

Si un dato no cumple las reglas, FastAPI responde 422 con el motivo, sin que
tengamos que escribir esa validación en cada endpoint.
"""
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, EmailStr, field_validator, model_validator

from app.models import Rol

MENSAJE_PASSWORD = "La contraseña debe tener mínimo 8 caracteres, una mayúscula y un número"


def validar_fortaleza_password(password: str) -> str:
    """Regla de contraseñas (RN10): mínimo 8 caracteres, al menos una mayúscula y un número."""
    if (
        len(password) < 8
        or not any(c.isupper() for c in password)
        or not any(c.isdigit() for c in password)
    ):
        raise ValueError(MENSAJE_PASSWORD)
    return password


def _texto_o_nulo(valor: str | None) -> str | None:
    """Quita espacios sobrantes y trata un texto vacío como 'sin dato'."""
    if valor is None:
        return None
    valor = valor.strip()
    return valor or None


class DatosContacto(BaseModel):
    """
    Los datos de contacto: los únicos que una persona puede editar de su propio perfil
    (decisión del equipo). También forman parte de crear y editar un usuario.
    """

    telefono: str | None = None
    fecha_nacimiento: date | None = None
    direccion: str | None = None
    contacto_emergencia_nombre: str | None = None
    contacto_emergencia_telefono: str | None = None

    @field_validator("telefono", "direccion", "contacto_emergencia_nombre", "contacto_emergencia_telefono")
    @classmethod
    def vacio_es_nulo(cls, valor: str | None) -> str | None:
        return _texto_o_nulo(valor)

    @field_validator("fecha_nacimiento")
    @classmethod
    def fecha_no_futura(cls, valor: date | None) -> date | None:
        if valor is not None and valor > date.today():
            raise ValueError("La fecha de nacimiento no puede ser futura")
        return valor


class UsuarioCrear(DatosContacto):
    """Datos para crear un usuario. Solo los envía el administrador."""

    nombre: str
    email: EmailStr
    rol: Rol
    password: str  # contraseña temporal que el usuario podrá cambiar después
    documento: str | None = None
    entrenador_id: int | None = None  # solo aplica a clientes

    @field_validator("email")
    @classmethod
    def email_en_minusculas(cls, valor: str) -> str:
        """El correo siempre se guarda en minúsculas para que no haya duplicados disfrazados."""
        return str(valor).strip().lower()

    @field_validator("password")
    @classmethod
    def password_segura(cls, valor: str) -> str:
        return validar_fortaleza_password(valor)

    @field_validator("nombre")
    @classmethod
    def nombre_valido(cls, valor: str) -> str:
        valor = valor.strip()
        if len(valor) < 2:
            raise ValueError("El nombre debe tener al menos 2 caracteres")
        return valor

    @field_validator("documento")
    @classmethod
    def documento_sin_espacios(cls, valor: str | None) -> str | None:
        return _texto_o_nulo(valor)

    @model_validator(mode="after")
    def reglas_por_rol(self):
        # Decisión del equipo: el documento de identidad es obligatorio para los clientes.
        if self.rol == Rol.CLIENTE and not self.documento:
            raise ValueError("El documento de identidad es obligatorio para los clientes")
        # Solo los clientes tienen un entrenador asignado.
        if self.entrenador_id is not None and self.rol != Rol.CLIENTE:
            raise ValueError("Solo los clientes pueden tener un entrenador asignado")
        return self


class UsuarioActualizar(DatosContacto):
    """
    Cambios que el administrador hace a un usuario. TODOS los campos son opcionales:
    solo se modifican los que vengan en la petición (los demás quedan como estaban).
    Enviar un campo opcional con valor nulo (null) lo deja vacío.
    """

    nombre: str | None = None
    email: EmailStr | None = None
    rol: Rol | None = None
    documento: str | None = None
    entrenador_id: int | None = None

    @field_validator("email")
    @classmethod
    def email_en_minusculas(cls, valor: str | None) -> str | None:
        return None if valor is None else str(valor).strip().lower()

    @field_validator("nombre")
    @classmethod
    def nombre_valido(cls, valor: str | None) -> str | None:
        if valor is None:
            return None  # se rechaza más abajo si se envió explícitamente como null
        valor = valor.strip()
        if len(valor) < 2:
            raise ValueError("El nombre debe tener al menos 2 caracteres")
        return valor

    @field_validator("documento")
    @classmethod
    def documento_sin_espacios(cls, valor: str | None) -> str | None:
        return _texto_o_nulo(valor)

    @model_validator(mode="after")
    def campos_obligatorios_no_se_vacian(self):
        # model_fields_set = los campos que SÍ vinieron en la petición.
        for campo in ("nombre", "email", "rol"):
            if campo in self.model_fields_set and getattr(self, campo) is None:
                raise ValueError(f"El campo '{campo}' no puede quedar vacío")
        return self


class PerfilActualizar(DatosContacto):
    """
    Lo que una persona puede cambiar de SU propio perfil: solo datos de contacto.
    El nombre, correo, documento y rol los cambia únicamente el administrador.
    Igual que arriba, solo se modifican los campos que vengan en la petición.
    """


class EstadoCambiar(BaseModel):
    """Activar o desactivar a un usuario."""

    activo: bool


class PasswordTemporal(BaseModel):
    """Contraseña temporal que el administrador define para otra persona."""

    password_nueva: str

    @field_validator("password_nueva")
    @classmethod
    def password_segura(cls, valor: str) -> str:
        return validar_fortaleza_password(valor)


class UsuarioLeer(BaseModel):
    """Datos de un usuario que la API devuelve (sin información sensible)."""

    # from_attributes permite construir este esquema directamente desde el modelo Usuario.
    model_config = ConfigDict(from_attributes=True)

    id: int
    nombre: str
    email: str
    rol: Rol
    activo: bool
    documento: str | None
    telefono: str | None
    fecha_nacimiento: date | None
    direccion: str | None
    contacto_emergencia_nombre: str | None
    contacto_emergencia_telefono: str | None
    codigo: str | None
    entrenador_id: int | None
    creado_en: datetime


class PaginaUsuarios(BaseModel):
    """Una página de resultados al listar usuarios."""

    items: list[UsuarioLeer]
    total: int  # cuántos usuarios cumplen el filtro en total (no solo los de esta página)
    pagina: int
    por_pagina: int
