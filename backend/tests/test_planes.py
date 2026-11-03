"""Pruebas de los planes de membresía (HU03 · subtarea 1)."""
import importlib.util
from pathlib import Path

import pytest
from alembic.migration import MigrationContext
from alembic.operations import Operations
from fastapi.testclient import TestClient
from sqlalchemy import text
from sqlmodel import Session, create_engine

from app.models import Plan, Rol
from tests.conftest import crear_usuario_directo, encabezados


@pytest.fixture(name="planes")
def planes_fixture(session: Session) -> dict:
    """Los tres planes de siempre (en producción los carga la migración; aquí se crean a mano)."""
    creados = {
        "mensual": Plan(nombre="Mensual", duracion_dias=30, precio=90_000),
        "anual": Plan(nombre="Anual", duracion_dias=365, precio=850_000),  # se crea antes que el trimestral a propósito
        "trimestral": Plan(nombre="Trimestral", duracion_dias=90, precio=240_000),
    }
    session.add_all(creados.values())
    session.commit()
    for plan in creados.values():
        session.refresh(plan)
    return creados


def con_rol(client: TestClient, session: Session, rol: Rol) -> dict:
    crear_usuario_directo(session, rol, f"{rol.value}@gympro.com")
    return encabezados(client, f"{rol.value}@gympro.com")


# ---------------------------------------------------------------------------
# Consultar los planes
# ---------------------------------------------------------------------------
@pytest.mark.parametrize("rol", [Rol.ADMIN, Rol.ENTRENADOR, Rol.CLIENTE])
def test_cualquier_rol_puede_ver_los_planes(client: TestClient, session: Session, planes, rol):
    respuesta = client.get("/api/planes", headers=con_rol(client, session, rol))

    assert respuesta.status_code == 200
    assert len(respuesta.json()) == 3


def test_los_planes_vienen_del_mas_corto_al_mas_largo(client: TestClient, session: Session, planes):
    respuesta = client.get("/api/planes", headers=con_rol(client, session, Rol.CLIENTE))

    assert [(p["nombre"], p["duracion_dias"], p["precio"]) for p in respuesta.json()] == [
        ("Mensual", 30, 90_000),
        ("Trimestral", 90, 240_000),
        ("Anual", 365, 850_000),
    ]


def test_ver_los_planes_exige_sesion(client: TestClient, planes):
    assert client.get("/api/planes").status_code == 401


# ---------------------------------------------------------------------------
# Cambiar el precio (solo el administrador)
# ---------------------------------------------------------------------------
def cambiar_precio(client: TestClient, headers: dict, plan_id: int, cuerpo):
    return client.patch(f"/api/planes/{plan_id}", json=cuerpo, headers=headers)


def test_el_admin_cambia_el_precio_de_un_plan(client: TestClient, session: Session, planes):
    h = con_rol(client, session, Rol.ADMIN)

    respuesta = cambiar_precio(client, h, planes["mensual"].id, {"precio": 95_000})

    assert respuesta.status_code == 200
    assert respuesta.json() == {"id": planes["mensual"].id, "nombre": "Mensual", "duracion_dias": 30, "precio": 95_000}
    # El cambio queda guardado y los otros planes no se tocan.
    precios = {p["nombre"]: p["precio"] for p in client.get("/api/planes", headers=h).json()}
    assert precios == {"Mensual": 95_000, "Trimestral": 240_000, "Anual": 850_000}


def test_solo_se_puede_cambiar_el_precio_no_el_nombre_ni_la_duracion(client: TestClient, session: Session, planes):
    h = con_rol(client, session, Rol.ADMIN)

    respuesta = cambiar_precio(
        client, h, planes["mensual"].id, {"precio": 95_000, "nombre": "Hackeado", "duracion_dias": 1}
    )

    assert respuesta.status_code == 200
    assert respuesta.json()["nombre"] == "Mensual"  # se ignoran los campos que no corresponden
    assert respuesta.json()["duracion_dias"] == 30


@pytest.mark.parametrize("rol", [Rol.ENTRENADOR, Rol.CLIENTE])
def test_los_demas_roles_no_pueden_cambiar_precios(client: TestClient, session: Session, planes, rol):
    respuesta = cambiar_precio(client, con_rol(client, session, rol), planes["mensual"].id, {"precio": 1_000})

    assert respuesta.status_code == 403
    assert session.get(Plan, planes["mensual"].id).precio == 90_000  # no cambió


def test_cambiar_el_precio_exige_sesion(client: TestClient, planes):
    assert client.patch(f"/api/planes/{planes['mensual'].id}", json={"precio": 1_000}).status_code == 401


@pytest.mark.parametrize(
    "precio",
    [0, -5, 90_000.5, "90000", None, True, 100_000_001],
    ids=["cero", "negativo", "decimal", "texto", "nulo", "booleano", "supera el tope"],
)
def test_precios_invalidos_son_rechazados(client: TestClient, session: Session, planes, precio):
    h = con_rol(client, session, Rol.ADMIN)

    respuesta = cambiar_precio(client, h, planes["mensual"].id, {"precio": precio})

    assert respuesta.status_code == 422
    assert session.get(Plan, planes["mensual"].id).precio == 90_000


def test_falta_el_precio(client: TestClient, session: Session, planes):
    assert cambiar_precio(client, con_rol(client, session, Rol.ADMIN), planes["mensual"].id, {}).status_code == 422


def test_el_precio_maximo_permitido_se_acepta(client: TestClient, session: Session, planes):
    h = con_rol(client, session, Rol.ADMIN)

    assert cambiar_precio(client, h, planes["anual"].id, {"precio": 100_000_000}).status_code == 200


def test_plan_inexistente_responde_404(client: TestClient, session: Session, planes):
    respuesta = cambiar_precio(client, con_rol(client, session, Rol.ADMIN), 9999, {"precio": 1_000})

    assert respuesta.status_code == 404


# ---------------------------------------------------------------------------
# La migración carga los tres planes iniciales
# ---------------------------------------------------------------------------
@pytest.fixture(name="migracion")
def migracion_fixture():
    """Carga el archivo de la migración de los planes como un módulo de Python."""
    ruta = Path(__file__).parent.parent / "alembic" / "versions" / "20261101_d4e2de76e80d_crea_tabla_plan.py"
    especificacion = importlib.util.spec_from_file_location("migracion_planes", ruta)
    modulo = importlib.util.module_from_spec(especificacion)
    especificacion.loader.exec_module(modulo)
    return modulo


def test_la_migracion_crea_la_tabla_y_carga_los_tres_planes(migracion):
    """Se ejecuta la migración sobre una base vacía, igual que al hacer `alembic upgrade head`."""
    motor = create_engine("sqlite://")
    with motor.begin() as conexion:
        with Operations.context(MigrationContext.configure(conexion)):
            migracion.upgrade()

        filas = conexion.execute(text("SELECT nombre, duracion_dias, precio FROM plan ORDER BY duracion_dias")).all()

    assert [tuple(f) for f in filas] == [("Mensual", 30, 90_000), ("Trimestral", 90, 240_000), ("Anual", 365, 850_000)]


def test_la_migracion_se_puede_deshacer(migracion):
    motor = create_engine("sqlite://")
    with motor.begin() as conexion:
        with Operations.context(MigrationContext.configure(conexion)):
            migracion.upgrade()
            migracion.downgrade()

        tablas = conexion.execute(text("SELECT name FROM sqlite_master WHERE type='table' AND name='plan'")).all()

    assert tablas == []
