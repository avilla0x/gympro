"""Pruebas del administrador de demostración (decisión D11)."""
from sqlmodel import Session, select

from app.core.config import settings
from app.core.security import verificar_password
from app.models import Rol, Usuario
from app.services.usuarios import asegurar_admin_demo


def test_se_crea_el_admin_de_demostracion_con_los_datos_del_env(session: Session):
    assert asegurar_admin_demo(session) is True

    admin = session.exec(select(Usuario)).one()
    assert admin.email == settings.admin_email
    assert admin.rol == Rol.ADMIN
    assert admin.activo is True
    # La contraseña queda cifrada, pero coincide con la configurada en el .env
    assert admin.password_hash != settings.admin_password
    assert verificar_password(settings.admin_password, admin.password_hash)


def test_no_se_duplica_si_ya_existe(session: Session):
    asegurar_admin_demo(session)

    assert asegurar_admin_demo(session) is False
    assert len(session.exec(select(Usuario)).all()) == 1


def test_el_admin_de_demostracion_puede_iniciar_sesion(client, session: Session):
    asegurar_admin_demo(session)

    respuesta = client.post(
        "/api/auth/login", data={"username": settings.admin_email, "password": settings.admin_password}
    )

    assert respuesta.status_code == 200
    assert respuesta.json()["usuario"]["rol"] == "admin"
