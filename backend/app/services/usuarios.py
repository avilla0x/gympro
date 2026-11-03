"""
Lógica de negocio de los usuarios: crear, autenticar y manejar contraseñas.

Regla del proyecto: los routers solo reciben y responden; las decisiones
(¿se puede crear este usuario? ¿la contraseña es correcta?) se toman aquí.
"""
from sqlalchemy import func, or_
from sqlmodel import Session, col, select

from app.core.config import settings
from app.core.errores import ErrorDeNegocio
from app.core.security import (
    TIPO_RESET,
    crear_token_reset,
    decodificar_token,
    hashear_password,
    huella_coincide,
    verificar_password,
)
from app.models import Rol, Usuario
from app.schemas.usuario import PerfilActualizar, UsuarioActualizar, UsuarioCrear
from app.services import correo


def obtener_por_email(session: Session, email: str) -> Usuario | None:
    """Busca un usuario por correo (sin importar mayúsculas)."""
    return session.exec(select(Usuario).where(Usuario.email == email.strip().lower())).first()


def crear_usuario(session: Session, datos: UsuarioCrear) -> Usuario:
    """Crea un usuario nuevo. Si es cliente, le genera su código único (el del QR)."""
    # --- Validaciones que necesitan consultar la base de datos ---
    if obtener_por_email(session, datos.email):
        raise ErrorDeNegocio("Ya existe un usuario con ese correo", 409)
    if datos.documento and session.exec(select(Usuario).where(Usuario.documento == datos.documento)).first():
        raise ErrorDeNegocio("Ya existe un usuario con ese documento de identidad", 409)
    if datos.entrenador_id is not None:
        entrenador = session.get(Usuario, datos.entrenador_id)
        if entrenador is None or entrenador.rol != Rol.ENTRENADOR or not entrenador.activo:
            raise ErrorDeNegocio("El entrenador indicado no existe o no está activo", 400)

    usuario = Usuario(
        **datos.model_dump(exclude={"password"}),
        password_hash=hashear_password(datos.password),  # se guarda el hash, nunca la contraseña
    )
    session.add(usuario)
    session.flush()  # envía el INSERT para que la base de datos asigne el id (lo necesita el código)
    if usuario.rol == Rol.CLIENTE:
        usuario.codigo = f"GP-{usuario.id:06d}"  # ej. GP-000123
    session.commit()
    session.refresh(usuario)
    return usuario


def autenticar(session: Session, email: str, password: str) -> Usuario | None:
    """Devuelve el usuario si el correo y la contraseña son correctos; si no, None."""
    usuario = obtener_por_email(session, email)
    if usuario is None or not verificar_password(password, usuario.password_hash):
        return None
    return usuario


def cambiar_password(session: Session, usuario: Usuario, password_nueva: str) -> None:
    """Guarda una contraseña nueva (siempre cifrada)."""
    usuario.password_hash = hashear_password(password_nueva)
    session.add(usuario)
    session.commit()


def solicitar_recuperacion(session: Session, email: str) -> None:
    """
    Genera el enlace para restablecer la contraseña y lo "envía" (por ahora, a la consola).
    Si el correo no existe no hace nada ni avisa: así nadie puede descubrir qué correos están registrados.
    """
    usuario = obtener_por_email(session, email)
    if usuario is None or not usuario.activo:
        return
    token = crear_token_reset(usuario.id, usuario.password_hash)
    enlace = f"{settings.frontend_url}/restablecer?token={token}"
    correo.enviar_correo(
        destino=usuario.email,
        asunto="GymPro · Restablecer tu contraseña",
        cuerpo=(
            f"Hola {usuario.nombre},\n\n"
            f"Para elegir una contraseña nueva abre este enlace (vale {settings.reset_expira_minutos} minutos "
            f"y se puede usar una sola vez):\n{enlace}\n\n"
            "Si no lo pediste tú, ignora este mensaje."
        ),
    )


def restablecer_password(session: Session, token: str, password_nueva: str) -> None:
    """Cambia la contraseña usando el token del enlace de recuperación."""
    datos = decodificar_token(token, TIPO_RESET)
    error = ErrorDeNegocio("El enlace no es válido o ya venció. Solicita uno nuevo.", 400)
    if datos is None:
        raise error
    usuario = session.get(Usuario, int(datos["sub"]))
    # La huella comprueba que el enlace no se haya usado ya (la contraseña cambió desde entonces).
    if usuario is None or not usuario.activo or not huella_coincide(datos, usuario.password_hash):
        raise error
    cambiar_password(session, usuario, password_nueva)


def asegurar_admin_demo(session: Session) -> bool:
    """
    Crea el administrador de demostración si todavía no existe (decisión D11).
    Sus datos vienen del .env. Devuelve True si lo creó, False si ya existía.

    Se inserta directamente, sin pasar por las reglas de contraseña de `UsuarioCrear`,
    para que la clave de demostración pueda ser simple.
    """
    if obtener_por_email(session, settings.admin_email):
        return False
    session.add(
        Usuario(
            email=settings.admin_email.strip().lower(),
            password_hash=hashear_password(settings.admin_password),
            rol=Rol.ADMIN,
            nombre=settings.admin_nombre,
        )
    )
    session.commit()
    return True


# ===========================================================================
# Gestión de usuarios (la usa el administrador) y perfil propio  ·  HU01
# ===========================================================================
def obtener_usuario(session: Session, usuario_id: int) -> Usuario:
    """Devuelve el usuario con ese id, o lanza un error 404 si no existe."""
    usuario = session.get(Usuario, usuario_id)
    if usuario is None:
        raise ErrorDeNegocio("El usuario no existe", 404)
    return usuario


def listar_usuarios(
    session: Session,
    busqueda: str | None = None,
    rol: Rol | None = None,
    activo: bool | None = None,
    pagina: int = 1,
    por_pagina: int = 20,
) -> tuple[list[Usuario], int]:
    """
    Lista usuarios con filtros y paginación. Devuelve (usuarios de la página, total que cumple el filtro).

    - busqueda: texto que se busca en nombre, correo, documento o código (sin distinguir mayúsculas).
      Nota: no ignora las tildes ("gomez" no encuentra "Gómez").
    - rol / activo: filtros exactos; si son None, no filtran.
    """
    condiciones = []
    if busqueda and busqueda.strip():
        patron = f"%{busqueda.strip()}%"
        condiciones.append(
            or_(
                col(Usuario.nombre).ilike(patron),
                col(Usuario.email).ilike(patron),
                col(Usuario.documento).ilike(patron),
                col(Usuario.codigo).ilike(patron),
            )
        )
    if rol is not None:
        condiciones.append(Usuario.rol == rol)
    if activo is not None:
        condiciones.append(Usuario.activo == activo)

    total = session.exec(select(func.count()).select_from(Usuario).where(*condiciones)).one()
    consulta = (
        select(Usuario)
        .where(*condiciones)
        .order_by(col(Usuario.nombre), col(Usuario.id))
        .offset((pagina - 1) * por_pagina)
        .limit(por_pagina)
    )
    return list(session.exec(consulta).all()), total


def _validar_entrenador(session: Session, entrenador_id: int) -> None:
    """El entrenador que se asigna a un cliente debe existir, ser entrenador y estar activo."""
    entrenador = session.get(Usuario, entrenador_id)
    if entrenador is None or entrenador.rol != Rol.ENTRENADOR or not entrenador.activo:
        raise ErrorDeNegocio("El entrenador indicado no existe o no está activo", 400)


def _es_ultimo_admin_activo(session: Session, usuario: Usuario) -> bool:
    """¿Este usuario es el ÚNICO administrador activo? (Siempre debe quedar al menos uno.)"""
    if usuario.rol != Rol.ADMIN or not usuario.activo:
        return False
    otros = session.exec(
        select(func.count()).select_from(Usuario).where(
            Usuario.rol == Rol.ADMIN, Usuario.activo == True, Usuario.id != usuario.id  # noqa: E712
        )
    ).one()
    return otros == 0


def actualizar_usuario(session: Session, quien_edita: Usuario, usuario_id: int, datos: UsuarioActualizar) -> Usuario:
    """El administrador modifica los datos de un usuario. Solo cambia los campos que vengan en `datos`."""
    usuario = obtener_usuario(session, usuario_id)
    cambios = datos.model_dump(exclude_unset=True)  # solo lo que realmente se envió
    rol_final = cambios.get("rol", usuario.rol)

    # --- Cambio de rol: protecciones ---
    if rol_final != usuario.rol:
        if usuario.id == quien_edita.id:
            raise ErrorDeNegocio("No puedes cambiar tu propio rol.", 400)
        if _es_ultimo_admin_activo(session, usuario):
            raise ErrorDeNegocio("Debe quedar al menos un administrador activo.", 400)
        if usuario.rol == Rol.ENTRENADOR and session.exec(
            select(Usuario).where(Usuario.entrenador_id == usuario.id)
        ).first():
            raise ErrorDeNegocio("Este entrenador tiene clientes asignados. Reasígnalos antes de cambiar su rol.", 400)

    # --- Datos únicos ---
    if "email" in cambios and cambios["email"] != usuario.email and obtener_por_email(session, cambios["email"]):
        raise ErrorDeNegocio("Ya existe un usuario con ese correo", 409)
    if "documento" in cambios and cambios["documento"] and cambios["documento"] != usuario.documento:
        if session.exec(select(Usuario).where(Usuario.documento == cambios["documento"])).first():
            raise ErrorDeNegocio("Ya existe un usuario con ese documento de identidad", 409)

    # --- Reglas del estado FINAL del usuario (cómo quedaría después de aplicar los cambios) ---
    documento_final = cambios["documento"] if "documento" in cambios else usuario.documento
    if rol_final == Rol.CLIENTE and not documento_final:
        raise ErrorDeNegocio("El documento de identidad es obligatorio para los clientes", 400)
    if cambios.get("entrenador_id") is not None:
        if rol_final != Rol.CLIENTE:
            raise ErrorDeNegocio("Solo los clientes pueden tener un entrenador asignado", 400)
        _validar_entrenador(session, cambios["entrenador_id"])

    # --- Aplicar ---
    for campo, valor in cambios.items():
        setattr(usuario, campo, valor)
    if rol_final != Rol.CLIENTE:
        # Solo los clientes tienen entrenador y código QR.
        usuario.entrenador_id = None
        usuario.codigo = None
    elif usuario.codigo is None:
        usuario.codigo = f"GP-{usuario.id:06d}"  # pasó a ser cliente: recibe su código (igual que al crearlo)

    session.add(usuario)
    session.commit()
    session.refresh(usuario)
    return usuario


def cambiar_estado(session: Session, quien_edita: Usuario, usuario_id: int, activo: bool) -> Usuario:
    """Activa o desactiva un usuario. Desactivar le quita el acceso, pero conserva su historial."""
    usuario = obtener_usuario(session, usuario_id)
    if not activo:
        if usuario.id == quien_edita.id:
            raise ErrorDeNegocio("No puedes desactivar tu propia cuenta.", 400)
        if _es_ultimo_admin_activo(session, usuario):
            raise ErrorDeNegocio("Debe quedar al menos un administrador activo.", 400)
    usuario.activo = activo
    session.add(usuario)
    session.commit()
    session.refresh(usuario)
    return usuario


def definir_password_temporal(session: Session, usuario_id: int, password_nueva: str) -> None:
    """El administrador define una contraseña temporal para otra persona (por ejemplo, si olvidó la suya)."""
    cambiar_password(session, obtener_usuario(session, usuario_id), password_nueva)


def actualizar_perfil(session: Session, usuario: Usuario, datos: PerfilActualizar) -> Usuario:
    """Cada persona edita SUS datos de contacto. Solo cambia los campos que vengan en `datos`."""
    for campo, valor in datos.model_dump(exclude_unset=True).items():
        setattr(usuario, campo, valor)
    session.add(usuario)
    session.commit()
    session.refresh(usuario)
    return usuario
