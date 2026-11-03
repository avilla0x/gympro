"""Pruebas de la recuperación de contraseña (HU01 · subtarea 2)."""
import re

import pytest
from fastapi.testclient import TestClient

from app.services import correo
from tests.conftest import PASSWORD_PRUEBA, iniciar_sesion


@pytest.fixture(name="correos")
def correos_fixture(monkeypatch):
    """Intercepta los correos que la API 'enviaría' para poder leerlos en la prueba."""
    enviados = []
    monkeypatch.setattr(correo, "enviar_correo", lambda destino, asunto, cuerpo: enviados.append((destino, cuerpo)))
    return enviados


def pedir_enlace(client: TestClient, correos: list, email: str) -> str:
    """Solicita la recuperación y devuelve el token que venía en el enlace del correo."""
    client.post("/api/auth/recuperar", json={"email": email})
    return re.search(r"token=(\S+)", correos[-1][1]).group(1)


def test_recuperar_envia_un_enlace_al_correo(client: TestClient, admin, correos):
    respuesta = client.post("/api/auth/recuperar", json={"email": admin.email})

    assert respuesta.status_code == 200
    assert len(correos) == 1
    assert correos[0][0] == admin.email
    assert "/restablecer?token=" in correos[0][1]


def test_recuperar_con_correo_inexistente_responde_igual_y_no_envia_nada(client: TestClient, correos):
    respuesta = client.post("/api/auth/recuperar", json={"email": "nadie@gympro.com"})

    assert respuesta.status_code == 200  # misma respuesta: no revela qué correos existen
    assert correos == []


def test_restablecer_cambia_la_contrasena(client: TestClient, admin, correos):
    token = pedir_enlace(client, correos, admin.email)

    respuesta = client.post("/api/auth/restablecer", json={"token": token, "password_nueva": "Recuperada7"})

    assert respuesta.status_code == 200
    assert iniciar_sesion(client, admin.email, "Recuperada7").status_code == 200
    assert iniciar_sesion(client, admin.email, PASSWORD_PRUEBA).status_code == 401


def test_el_enlace_solo_se_puede_usar_una_vez(client: TestClient, admin, correos):
    token = pedir_enlace(client, correos, admin.email)
    client.post("/api/auth/restablecer", json={"token": token, "password_nueva": "Recuperada7"})

    segundo_intento = client.post("/api/auth/restablecer", json={"token": token, "password_nueva": "Otra12345"})

    assert segundo_intento.status_code == 400


def test_restablecer_con_token_falso(client: TestClient):
    respuesta = client.post("/api/auth/restablecer", json={"token": "falso", "password_nueva": "Recuperada7"})

    assert respuesta.status_code == 400


def test_restablecer_rechaza_contrasena_debil(client: TestClient, admin, correos):
    token = pedir_enlace(client, correos, admin.email)

    respuesta = client.post("/api/auth/restablecer", json={"token": token, "password_nueva": "sinmayuscula1"})

    assert respuesta.status_code == 422


def test_un_token_de_sesion_no_sirve_para_restablecer(client: TestClient, admin):
    token_de_sesion = iniciar_sesion(client, admin.email).json()["access_token"]

    respuesta = client.post("/api/auth/restablecer", json={"token": token_de_sesion, "password_nueva": "Recuperada7"})

    assert respuesta.status_code == 400
