"""Pruebas de login, sesión y cambio de contraseña (HU01 · subtarea 2)."""
from fastapi.testclient import TestClient
from sqlmodel import Session

from tests.conftest import PASSWORD_PRUEBA, crear_usuario_directo, encabezados, iniciar_sesion
from app.models import Rol


def test_login_correcto_devuelve_token_y_usuario(client: TestClient, admin):
    respuesta = iniciar_sesion(client, admin.email)

    assert respuesta.status_code == 200
    cuerpo = respuesta.json()
    assert cuerpo["token_type"] == "bearer"
    assert cuerpo["access_token"]
    assert cuerpo["usuario"]["email"] == admin.email
    assert cuerpo["usuario"]["rol"] == "admin"
    assert "password_hash" not in cuerpo["usuario"]  # nunca se devuelve nada de la contraseña


def test_login_ignora_mayusculas_en_el_correo(client: TestClient, admin):
    assert iniciar_sesion(client, admin.email.upper()).status_code == 200


def test_login_con_contrasena_incorrecta(client: TestClient, admin):
    respuesta = iniciar_sesion(client, admin.email, "ClaveEquivocada1")

    assert respuesta.status_code == 401
    assert respuesta.json()["detail"] == "Correo o contraseña incorrectos"


def test_login_con_correo_inexistente_da_el_mismo_mensaje(client: TestClient):
    """No se revela si el correo existe o no."""
    respuesta = iniciar_sesion(client, "nadie@gympro.com")

    assert respuesta.status_code == 401
    assert respuesta.json()["detail"] == "Correo o contraseña incorrectos"


def test_login_de_usuario_desactivado(client: TestClient, session: Session):
    crear_usuario_directo(session, Rol.CLIENTE, "inactivo@gympro.com", activo=False)

    assert iniciar_sesion(client, "inactivo@gympro.com").status_code == 403


def test_me_devuelve_el_usuario_de_la_sesion(client: TestClient, admin):
    respuesta = client.get("/api/auth/me", headers=encabezados(client, admin.email))

    assert respuesta.status_code == 200
    assert respuesta.json()["email"] == admin.email


def test_me_sin_token_responde_401(client: TestClient):
    assert client.get("/api/auth/me").status_code == 401


def test_me_con_token_falso_responde_401(client: TestClient):
    assert client.get("/api/auth/me", headers={"Authorization": "Bearer token-falso"}).status_code == 401


def test_desactivar_al_usuario_cierra_su_sesion_de_inmediato(client: TestClient, session: Session, admin):
    """Aunque el token siga vigente, un usuario desactivado ya no puede usarlo."""
    headers = encabezados(client, admin.email)
    admin.activo = False
    session.add(admin)
    session.commit()

    assert client.get("/api/auth/me", headers=headers).status_code == 401


def test_cambiar_password_con_la_actual_correcta(client: TestClient, admin):
    headers = encabezados(client, admin.email)

    respuesta = client.put(
        "/api/auth/password",
        headers=headers,
        json={"password_actual": PASSWORD_PRUEBA, "password_nueva": "NuevaClave9"},
    )

    assert respuesta.status_code == 200
    assert iniciar_sesion(client, admin.email, "NuevaClave9").status_code == 200
    assert iniciar_sesion(client, admin.email, PASSWORD_PRUEBA).status_code == 401  # la vieja ya no sirve


def test_cambiar_password_con_la_actual_incorrecta(client: TestClient, admin):
    respuesta = client.put(
        "/api/auth/password",
        headers=encabezados(client, admin.email),
        json={"password_actual": "Equivocada1", "password_nueva": "NuevaClave9"},
    )

    assert respuesta.status_code == 400


def test_cambiar_password_rechaza_una_contrasena_debil(client: TestClient, admin):
    respuesta = client.put(
        "/api/auth/password",
        headers=encabezados(client, admin.email),
        json={"password_actual": PASSWORD_PRUEBA, "password_nueva": "corta"},
    )

    assert respuesta.status_code == 422
