"""
Seguridad: contraseñas y tokens JWT.

Esta parte NO conoce la base de datos ni los endpoints: solo sabe cifrar
contraseñas y crear / verificar tokens. Así es fácil de probar y de explicar.

Conceptos:
  - Hash: la contraseña nunca se guarda; se guarda una "huella" irreversible
    (argon2). Para verificar, se calcula la huella de lo que escribe la persona
    y se compara con la guardada.
  - JWT (JSON Web Token): un texto firmado que el servidor entrega al iniciar
    sesión. El navegador lo envía en cada petición y así el servidor sabe quién
    es sin pedir la contraseña de nuevo. Si alguien lo modifica, la firma no
    coincide y se rechaza.
"""
import hashlib
from datetime import datetime, timedelta, timezone

import jwt
from pwdlib import PasswordHash

from app.core.config import settings

ALGORITMO = "HS256"

# Tipos de token: evitan que un token de recuperación sirva para iniciar sesión (y al revés).
TIPO_ACCESO = "acceso"
TIPO_RESET = "reset"

# PasswordHash.recommended() usa argon2, el algoritmo recomendado actualmente.
_hasher = PasswordHash.recommended()


# ---------------------------------------------------------------------------
# Contraseñas
# ---------------------------------------------------------------------------
def hashear_password(password: str) -> str:
    """Convierte una contraseña en su hash argon2 (es lo que se guarda en la BD)."""
    return _hasher.hash(password)


def verificar_password(password: str, password_hash: str) -> bool:
    """Indica si la contraseña escrita corresponde al hash guardado."""
    return _hasher.verify(password, password_hash)


# ---------------------------------------------------------------------------
# Tokens JWT
# ---------------------------------------------------------------------------
def _crear_token(datos: dict, minutos: int, tipo: str) -> str:
    """Firma un token con una fecha de vencimiento (`exp`) y un tipo."""
    expira = datetime.now(timezone.utc) + timedelta(minutes=minutos)
    return jwt.encode({**datos, "tipo": tipo, "exp": expira}, settings.secret_key, algorithm=ALGORITMO)


def crear_token_acceso(usuario_id: int, rol: str) -> str:
    """Token de sesión: se entrega al iniciar sesión y dura `token_expira_minutos`."""
    # "sub" (subject) es el nombre estándar del campo que identifica a la persona.
    return _crear_token({"sub": str(usuario_id), "rol": rol}, settings.token_expira_minutos, TIPO_ACCESO)


def _huella_password(password_hash: str) -> str:
    """Resumen corto del hash actual de la contraseña (ver crear_token_reset)."""
    return hashlib.sha256(password_hash.encode()).hexdigest()[:16]


def crear_token_reset(usuario_id: int, password_hash: str) -> str:
    """
    Token del enlace "recuperar contraseña".

    Incluye una huella de la contraseña actual: cuando la persona cambia su
    contraseña, la huella ya no coincide y el enlace deja de servir. Así cada
    enlace se puede usar UNA sola vez.
    """
    return _crear_token(
        {"sub": str(usuario_id), "huella": _huella_password(password_hash)},
        settings.reset_expira_minutos,
        TIPO_RESET,
    )


def decodificar_token(token: str, tipo_esperado: str) -> dict | None:
    """
    Verifica la firma, el vencimiento y el tipo del token.
    Devuelve su contenido, o None si es inválido, vencido o de otro tipo.
    """
    try:
        datos = jwt.decode(token, settings.secret_key, algorithms=[ALGORITMO])
    except jwt.PyJWTError:  # firma incorrecta, token vencido, texto mal formado...
        return None
    if datos.get("tipo") != tipo_esperado:
        return None
    return datos


def huella_coincide(datos_token: dict, password_hash: str) -> bool:
    """Comprueba que un token de recuperación todavía corresponde a la contraseña actual."""
    return datos_token.get("huella") == _huella_password(password_hash)
