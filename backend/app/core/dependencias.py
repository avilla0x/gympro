"""
Dependencias de FastAPI para proteger endpoints.

Un endpoint las usa con `Depends(...)` y FastAPI las ejecuta ANTES de la función:

    @router.get("/algo")
    def algo(usuario: Usuario = Depends(get_usuario_actual)):      # requiere sesión iniciada
        ...

    @router.post("/otra-cosa")
    def otra(usuario: Usuario = Depends(requiere_roles(Rol.ADMIN))):   # solo administradores
        ...
"""
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlmodel import Session

from app.core.database import get_session
from app.core.security import TIPO_ACCESO, decodificar_token
from app.models import Rol, Usuario

# Indica a FastAPI de dónde sale el token (encabezado "Authorization: Bearer ...") y
# cuál es la ruta de login; con eso la página /docs muestra el botón "Authorize".
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def get_usuario_actual(
    token: str = Depends(oauth2_scheme),
    session: Session = Depends(get_session),
) -> Usuario:
    """Devuelve el usuario dueño del token; si el token no sirve, responde 401."""
    no_autenticado = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Sesión inválida o vencida. Inicia sesión de nuevo.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    datos = decodificar_token(token, TIPO_ACCESO)
    if datos is None:
        raise no_autenticado

    # Se consulta la base de datos en CADA petición (y no solo se confía en el token)
    # para que desactivar a un usuario tenga efecto inmediato.
    usuario = session.get(Usuario, int(datos["sub"]))
    if usuario is None or not usuario.activo:
        raise no_autenticado
    return usuario


def requiere_roles(*roles_permitidos: Rol):
    """Crea una dependencia que solo deja pasar a usuarios con alguno de los roles indicados."""

    def verificar(usuario: Usuario = Depends(get_usuario_actual)) -> Usuario:
        if usuario.rol not in roles_permitidos:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,  # 403 = estás identificado, pero no tienes permiso
                detail="No tienes permiso para realizar esta acción.",
            )
        return usuario

    return verificar


# ---------------------------------------------------------------------------
# Atajos con nombre. Los endpoints usan estos nombres en lugar de repetir los roles,
# así los permisos quedan legibles y centralizados (matriz completa en docs/permisos.md):
#     usuario: Usuario = Depends(solo_admin)
# ---------------------------------------------------------------------------
solo_admin = requiere_roles(Rol.ADMIN)
admin_o_entrenador = requiere_roles(Rol.ADMIN, Rol.ENTRENADOR)
solo_cliente = requiere_roles(Rol.CLIENTE)
