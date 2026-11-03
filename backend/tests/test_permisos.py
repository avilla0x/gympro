"""Pruebas de roles y permisos (HU01 · subtarea 4)."""
import pytest
from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient
from sqlmodel import Session

from app.core.database import get_session
from app.core.dependencias import admin_o_entrenador, solo_admin, solo_cliente
from app.core.errores import ErrorDeNegocio
from app.core.security import crear_token_acceso
from app.models import Rol, Usuario
from app.services.permisos import exigir_ver_usuario, puede_ver_usuario
from tests.conftest import crear_usuario_directo, encabezados


def datos_nuevo_usuario(sufijo: str) -> dict:
    return {
        "nombre": "Persona Nueva",
        "email": f"nueva{sufijo}@gympro.com",
        "rol": "cliente",
        "password": "Temporal123",
        "documento": f"9{sufijo}000",
    }


# ---------------------------------------------------------------------------
# Matriz de permisos de un endpoint real: POST /api/usuarios (solo administrador)
# ---------------------------------------------------------------------------
@pytest.mark.parametrize(
    "rol, codigo_esperado",
    [(Rol.ADMIN, 201), (Rol.ENTRENADOR, 403), (Rol.CLIENTE, 403)],
)
def test_crear_usuarios_segun_el_rol(client: TestClient, session: Session, rol: Rol, codigo_esperado: int):
    crear_usuario_directo(session, rol, f"{rol.value}@gympro.com")

    respuesta = client.post(
        "/api/usuarios", json=datos_nuevo_usuario("1"), headers=encabezados(client, f"{rol.value}@gympro.com")
    )

    assert respuesta.status_code == codigo_esperado


def test_sin_sesion_responde_401_y_no_403(client: TestClient):
    """401 = no sabemos quién eres · 403 = sabemos quién eres, pero no tienes permiso."""
    assert client.post("/api/usuarios", json=datos_nuevo_usuario("2")).status_code == 401


def test_el_rol_se_lee_de_la_base_de_datos_no_del_token(client: TestClient, session: Session, admin: Usuario):
    """Si a una persona le quitan el rol de administrador, pierde el permiso de inmediato,
    aunque su token (emitido cuando era administrador) siga vigente."""
    headers = encabezados(client, admin.email)
    assert client.post("/api/usuarios", json=datos_nuevo_usuario("3"), headers=headers).status_code == 201

    admin.rol = Rol.CLIENTE  # le quitan el rol
    session.add(admin)
    session.commit()

    assert client.post("/api/usuarios", json=datos_nuevo_usuario("4"), headers=headers).status_code == 403


def test_un_token_que_dice_ser_admin_no_da_permiso_si_en_la_base_no_lo_es(client: TestClient, session: Session):
    cliente = crear_usuario_directo(session, Rol.CLIENTE, "cliente@gympro.com")
    token_que_miente = crear_token_acceso(cliente.id, "admin")  # el contenido del token dice "admin"

    respuesta = client.post(
        "/api/usuarios",
        json=datos_nuevo_usuario("5"),
        headers={"Authorization": f"Bearer {token_que_miente}"},
    )

    assert respuesta.status_code == 403


# ---------------------------------------------------------------------------
# Los atajos de permisos (solo_admin, admin_o_entrenador, solo_cliente)
# ---------------------------------------------------------------------------
@pytest.fixture(name="app_de_prueba")
def app_de_prueba_fixture(session: Session) -> TestClient:
    """Una mini aplicación con una ruta por cada atajo, para probarlos aislados."""
    mini = FastAPI()

    @mini.get("/solo-admin")
    def ruta_admin(_: Usuario = Depends(solo_admin)):
        return {"ok": True}

    @mini.get("/admin-o-entrenador")
    def ruta_admin_o_entrenador(_: Usuario = Depends(admin_o_entrenador)):
        return {"ok": True}

    @mini.get("/solo-cliente")
    def ruta_cliente(_: Usuario = Depends(solo_cliente)):
        return {"ok": True}

    mini.dependency_overrides[get_session] = lambda: session
    return TestClient(mini)


@pytest.mark.parametrize(
    "ruta, permitidos",
    [
        ("/solo-admin", {Rol.ADMIN}),
        ("/admin-o-entrenador", {Rol.ADMIN, Rol.ENTRENADOR}),
        ("/solo-cliente", {Rol.CLIENTE}),
    ],
)
def test_cada_atajo_deja_pasar_solo_a_sus_roles(app_de_prueba: TestClient, session: Session, ruta: str, permitidos: set):
    for rol in Rol:
        usuario = crear_usuario_directo(session, rol, f"{rol.value}-{ruta[1:]}@gympro.com")
        token = crear_token_acceso(usuario.id, rol.value)

        respuesta = app_de_prueba.get(ruta, headers={"Authorization": f"Bearer {token}"})

        esperado = 200 if rol in permitidos else 403
        assert respuesta.status_code == esperado, f"{rol.value} en {ruta}: se esperaba {esperado}"


# ---------------------------------------------------------------------------
# Quién puede ver los datos de quién
# ---------------------------------------------------------------------------
@pytest.fixture(name="escenario")
def escenario_fixture(session: Session) -> dict:
    """Un administrador, dos entrenadores y dos clientes (cada uno con su entrenador)."""
    entrenador_a = crear_usuario_directo(session, Rol.ENTRENADOR, "coach-a@gympro.com")
    entrenador_b = crear_usuario_directo(session, Rol.ENTRENADOR, "coach-b@gympro.com")
    return {
        "admin": crear_usuario_directo(session, Rol.ADMIN, "admin@gympro.com"),
        "entrenador_a": entrenador_a,
        "entrenador_b": entrenador_b,
        "cliente_de_a": crear_usuario_directo(session, Rol.CLIENTE, "cliente-a@gympro.com", entrenador_id=entrenador_a.id),
        "cliente_de_b": crear_usuario_directo(session, Rol.CLIENTE, "cliente-b@gympro.com", entrenador_id=entrenador_b.id),
    }


def test_el_admin_ve_a_todos(escenario: dict):
    for otro in ("entrenador_a", "cliente_de_a", "cliente_de_b"):
        assert puede_ver_usuario(escenario["admin"], escenario[otro])


def test_cualquiera_se_ve_a_si_mismo(escenario: dict):
    for persona in escenario.values():
        assert puede_ver_usuario(persona, persona)


def test_el_entrenador_ve_a_sus_clientes(escenario: dict):
    assert puede_ver_usuario(escenario["entrenador_a"], escenario["cliente_de_a"])


def test_el_entrenador_no_ve_a_los_clientes_de_otro_entrenador(escenario: dict):
    assert not puede_ver_usuario(escenario["entrenador_a"], escenario["cliente_de_b"])


def test_el_entrenador_no_ve_a_otros_entrenadores_ni_al_admin(escenario: dict):
    assert not puede_ver_usuario(escenario["entrenador_a"], escenario["entrenador_b"])
    assert not puede_ver_usuario(escenario["entrenador_a"], escenario["admin"])


def test_el_cliente_no_ve_a_nadie_mas(escenario: dict):
    cliente = escenario["cliente_de_a"]
    for otro in ("admin", "entrenador_a", "cliente_de_b"):
        assert not puede_ver_usuario(cliente, escenario[otro])


def test_exigir_ver_usuario_lanza_403_sin_permiso(escenario: dict):
    with pytest.raises(ErrorDeNegocio) as error:
        exigir_ver_usuario(escenario["cliente_de_a"], escenario["cliente_de_b"])

    assert error.value.codigo_http == 403


def test_exigir_ver_usuario_no_lanza_nada_con_permiso(escenario: dict):
    exigir_ver_usuario(escenario["entrenador_a"], escenario["cliente_de_a"])  # no debe fallar
