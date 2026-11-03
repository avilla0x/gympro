"""Pruebas de la creación de usuarios por el administrador (HU01 · subtarea 2: registro)."""
from fastapi.testclient import TestClient
from sqlmodel import Session

from app.models import Rol
from tests.conftest import crear_usuario_directo, encabezados, iniciar_sesion


def datos_cliente(**cambios) -> dict:
    """Datos válidos de un cliente; cada prueba cambia solo lo que le interesa."""
    datos = {
        "nombre": "Ana Gómez",
        "email": "ana@gympro.com",
        "rol": "cliente",
        "password": "Temporal123",
        "documento": "1010101010",
    }
    datos.update(cambios)
    return datos


def test_admin_crea_un_cliente_con_su_codigo(client: TestClient, admin):
    respuesta = client.post("/api/usuarios", json=datos_cliente(), headers=encabezados(client, admin.email))

    assert respuesta.status_code == 201
    cliente = respuesta.json()
    assert cliente["codigo"] == f"GP-{cliente['id']:06d}"  # ej. GP-000002
    assert cliente["rol"] == "cliente"
    assert cliente["activo"] is True
    assert "password" not in cliente and "password_hash" not in cliente


def test_el_cliente_creado_puede_iniciar_sesion(client: TestClient, admin):
    client.post("/api/usuarios", json=datos_cliente(), headers=encabezados(client, admin.email))

    assert iniciar_sesion(client, "ana@gympro.com", "Temporal123").status_code == 200


def test_el_correo_se_guarda_en_minusculas(client: TestClient, admin):
    respuesta = client.post(
        "/api/usuarios", json=datos_cliente(email="ANA@GymPro.com"), headers=encabezados(client, admin.email)
    )

    assert respuesta.json()["email"] == "ana@gympro.com"


def test_el_entrenador_y_el_admin_no_reciben_codigo_qr(client: TestClient, admin):
    headers = encabezados(client, admin.email)

    entrenador = client.post(
        "/api/usuarios",
        json={"nombre": "Coach Pérez", "email": "coach@gympro.com", "rol": "entrenador", "password": "Temporal123"},
        headers=headers,
    )

    assert entrenador.status_code == 201
    assert entrenador.json()["codigo"] is None  # el documento no es obligatorio para entrenadores


def test_documento_es_obligatorio_para_clientes(client: TestClient, admin):
    datos = datos_cliente()
    del datos["documento"]

    respuesta = client.post("/api/usuarios", json=datos, headers=encabezados(client, admin.email))

    assert respuesta.status_code == 422


def test_documento_vacio_cuenta_como_faltante(client: TestClient, admin):
    respuesta = client.post(
        "/api/usuarios", json=datos_cliente(documento="   "), headers=encabezados(client, admin.email)
    )

    assert respuesta.status_code == 422


def test_correo_repetido_responde_409(client: TestClient, admin):
    headers = encabezados(client, admin.email)
    client.post("/api/usuarios", json=datos_cliente(), headers=headers)

    respuesta = client.post("/api/usuarios", json=datos_cliente(documento="2020202020"), headers=headers)

    assert respuesta.status_code == 409
    assert "correo" in respuesta.json()["detail"]


def test_documento_repetido_responde_409(client: TestClient, admin):
    headers = encabezados(client, admin.email)
    client.post("/api/usuarios", json=datos_cliente(), headers=headers)

    respuesta = client.post("/api/usuarios", json=datos_cliente(email="otra@gympro.com"), headers=headers)

    assert respuesta.status_code == 409
    assert "documento" in respuesta.json()["detail"]


def test_contrasena_debil_es_rechazada(client: TestClient, admin):
    headers = encabezados(client, admin.email)
    for debil in ["Corta1", "sinmayuscula1", "SinNumeroAqui", "12345678"]:
        respuesta = client.post("/api/usuarios", json=datos_cliente(password=debil), headers=headers)
        assert respuesta.status_code == 422, f"debió rechazar: {debil}"


def test_correo_invalido_es_rechazado(client: TestClient, admin):
    respuesta = client.post(
        "/api/usuarios", json=datos_cliente(email="no-es-un-correo"), headers=encabezados(client, admin.email)
    )

    assert respuesta.status_code == 422


def test_cliente_con_entrenador_asignado(client: TestClient, session: Session, admin):
    entrenador = crear_usuario_directo(session, Rol.ENTRENADOR, "coach@gympro.com")

    respuesta = client.post(
        "/api/usuarios", json=datos_cliente(entrenador_id=entrenador.id), headers=encabezados(client, admin.email)
    )

    assert respuesta.status_code == 201
    assert respuesta.json()["entrenador_id"] == entrenador.id


def test_entrenador_asignado_debe_existir_y_ser_entrenador(client: TestClient, session: Session, admin):
    headers = encabezados(client, admin.email)
    otro_cliente = crear_usuario_directo(session, Rol.CLIENTE, "otro@gympro.com")

    inexistente = client.post("/api/usuarios", json=datos_cliente(entrenador_id=999), headers=headers)
    no_es_entrenador = client.post(
        "/api/usuarios", json=datos_cliente(entrenador_id=otro_cliente.id), headers=headers
    )

    assert inexistente.status_code == 400
    assert no_es_entrenador.status_code == 400


def test_solo_los_clientes_pueden_tener_entrenador(client: TestClient, session: Session, admin):
    entrenador = crear_usuario_directo(session, Rol.ENTRENADOR, "coach@gympro.com")

    respuesta = client.post(
        "/api/usuarios",
        json={"nombre": "Otro Admin", "email": "otro@gympro.com", "rol": "admin",
              "password": "Temporal123", "entrenador_id": entrenador.id},
        headers=encabezados(client, admin.email),
    )

    assert respuesta.status_code == 422


def test_un_cliente_no_puede_crear_usuarios(client: TestClient, session: Session):
    crear_usuario_directo(session, Rol.CLIENTE, "cliente@gympro.com")

    respuesta = client.post("/api/usuarios", json=datos_cliente(), headers=encabezados(client, "cliente@gympro.com"))

    assert respuesta.status_code == 403


def test_un_entrenador_no_puede_crear_usuarios(client: TestClient, session: Session):
    crear_usuario_directo(session, Rol.ENTRENADOR, "coach@gympro.com")

    respuesta = client.post("/api/usuarios", json=datos_cliente(), headers=encabezados(client, "coach@gympro.com"))

    assert respuesta.status_code == 403


def test_sin_sesion_no_se_puede_crear_usuarios(client: TestClient):
    assert client.post("/api/usuarios", json=datos_cliente()).status_code == 401
