"""
Reglas de PERTENENCIA: quién puede ver los datos de quién.

`requiere_roles` (core/dependencias.py) responde a "¿puede este ROL usar este endpoint?".
Pero hay endpoints que cualquier rol permitido puede usar, y aun así cada persona
solo debe ver SUS datos. Por ejemplo, el endpoint de detalle de un usuario lo usan el
administrador y el entrenador, pero el entrenador solo debe ver a SUS clientes.
Esas reglas viven aquí (ver docs/permisos.md).
"""
from app.core.errores import ErrorDeNegocio
from app.models import Rol, Usuario


def puede_ver_usuario(actual: Usuario, objetivo: Usuario) -> bool:
    """¿Puede `actual` ver los datos de `objetivo`?"""
    if actual.rol == Rol.ADMIN:
        return True  # el administrador ve a todos
    if actual.id == objetivo.id:
        return True  # cualquiera puede verse a sí mismo
    # El entrenador solo ve a los clientes que tiene asignados.
    return (
        actual.rol == Rol.ENTRENADOR
        and objetivo.rol == Rol.CLIENTE
        and objetivo.entrenador_id == actual.id
    )


def exigir_ver_usuario(actual: Usuario, objetivo: Usuario) -> None:
    """Igual que `puede_ver_usuario`, pero lanza un error 403 si no tiene permiso."""
    if not puede_ver_usuario(actual, objetivo):
        raise ErrorDeNegocio("No tienes permiso para ver los datos de este usuario.", 403)
