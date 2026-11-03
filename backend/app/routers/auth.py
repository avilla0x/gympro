"""
Endpoints de autenticación (HU01): login, datos de la sesión y manejo de contraseña.

Cada endpoint solo recibe la petición y delega la lógica en `services/usuarios.py`.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlmodel import Session

from app.core.database import get_session
from app.core.dependencias import get_usuario_actual
from app.core.errores import ErrorDeNegocio
from app.core.security import crear_token_acceso, verificar_password
from app.models import Usuario
from app.schemas.auth import (
    CambiarPasswordSolicitud,
    MensajeRespuesta,
    RecuperarSolicitud,
    RestablecerSolicitud,
    TokenRespuesta,
)
from app.schemas.usuario import PerfilActualizar, UsuarioLeer
from app.services import usuarios as servicio

router = APIRouter(prefix="/auth", tags=["Autenticación"])


@router.post("/login", response_model=TokenRespuesta)
def login(
    formulario: OAuth2PasswordRequestForm = Depends(),
    session: Session = Depends(get_session),
):
    """
    Inicia sesión. Recibe un formulario con `username` (el correo) y `password`.
    Se usa el formato de formulario estándar (OAuth2) para que el botón "Authorize"
    de /docs funcione.
    """
    usuario = servicio.autenticar(session, formulario.username, formulario.password)
    if usuario is None:
        # Mismo mensaje si falla el correo o la contraseña: no se revela cuál de los dos está mal.
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Correo o contraseña incorrectos",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not usuario.activo:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Tu cuenta está desactivada. Habla con el administrador.")
    return TokenRespuesta(
        access_token=crear_token_acceso(usuario.id, usuario.rol.value),
        usuario=UsuarioLeer.model_validate(usuario),
    )


@router.get("/me", response_model=UsuarioLeer)
def datos_de_mi_sesion(usuario: Usuario = Depends(get_usuario_actual)):
    """Devuelve los datos de la persona que inició sesión (el frontend lo usa al recargar la página)."""
    return usuario


@router.patch("/me", response_model=UsuarioLeer)
def editar_mi_perfil(
    datos: PerfilActualizar,
    usuario: Usuario = Depends(get_usuario_actual),
    session: Session = Depends(get_session),
):
    """
    Cada persona edita SUS datos de contacto (teléfono, dirección, fecha de nacimiento y contacto de
    emergencia). El nombre, correo, documento y rol solo los cambia el administrador.
    Solo se modifican los campos enviados.
    """
    return servicio.actualizar_perfil(session, usuario, datos)


@router.post("/recuperar", response_model=MensajeRespuesta)
def recuperar_password(datos: RecuperarSolicitud, session: Session = Depends(get_session)):
    """Pide un enlace para cambiar la contraseña olvidada. Por ahora el enlace sale en la consola del servidor."""
    servicio.solicitar_recuperacion(session, datos.email)
    # Siempre la misma respuesta, exista o no el correo (así no se pueden "adivinar" correos registrados).
    return MensajeRespuesta(mensaje="Si el correo está registrado, recibirás un enlace para restablecer tu contraseña.")


@router.post("/restablecer", response_model=MensajeRespuesta)
def restablecer_password(datos: RestablecerSolicitud, session: Session = Depends(get_session)):
    """Cambia la contraseña usando el enlace recibido."""
    servicio.restablecer_password(session, datos.token, datos.password_nueva)
    return MensajeRespuesta(mensaje="Contraseña actualizada. Ya puedes iniciar sesión.")


@router.put("/password", response_model=MensajeRespuesta)
def cambiar_mi_password(
    datos: CambiarPasswordSolicitud,
    usuario: Usuario = Depends(get_usuario_actual),
    session: Session = Depends(get_session),
):
    """Cambia la contraseña de quien tiene la sesión iniciada (pide la actual por seguridad)."""
    if not verificar_password(datos.password_actual, usuario.password_hash):
        raise ErrorDeNegocio("La contraseña actual no es correcta", 400)
    servicio.cambiar_password(session, usuario, datos.password_nueva)
    return MensajeRespuesta(mensaje="Contraseña actualizada.")
