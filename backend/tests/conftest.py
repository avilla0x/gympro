"""
Preparación común de las pruebas (pytest la carga automáticamente).

Las pruebas usan una base de datos SQLite EN MEMORIA, no PostgreSQL:
  + no necesitan Docker ni ninguna instalación para ejecutarse,
  + son muy rápidas y cada prueba empieza con la base vacía.
La compatibilidad real con PostgreSQL se verifica al aplicar las migraciones de Alembic.

Se ejecutan desde la carpeta backend/ con:   pytest
"""
import os

# La configuración exige estas variables; se definen ANTES de importar la aplicación.
# Son valores solo para las pruebas (no se usa PostgreSQL ni el .env real).
os.environ.setdefault("DATABASE_URL", "postgresql+psycopg://prueba:prueba@localhost:5432/prueba")
os.environ.setdefault("SECRET_KEY", "clave-solo-para-pruebas-con-largo-suficiente-123456")
os.environ.setdefault("ADMIN_EMAIL", "admin@gympro.com")
os.environ.setdefault("ADMIN_PASSWORD", "admin1234")
os.environ.setdefault("ALERTAS_ACTIVAS", "false")  # las pruebas no arrancan la tarea programada

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine

import app.models  # noqa: F401  (registra los modelos para crear sus tablas)
from app.core.database import get_session
from app.core.security import hashear_password
from app.main import app
from app.models import Rol, Usuario

PASSWORD_PRUEBA = "Clave1234"  # cumple las reglas: 8+ caracteres, mayúscula y número


@pytest.fixture(name="session")
def session_fixture():
    """Una sesión con una base de datos SQLite en memoria, nueva y vacía para cada prueba."""
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,  # mantiene UNA conexión, así la base en memoria no se pierde
    )
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        yield session


@pytest.fixture(name="client")
def client_fixture(session: Session):
    """Cliente HTTP de prueba cuya API usa la base de datos de prueba en vez de PostgreSQL."""
    app.dependency_overrides[get_session] = lambda: session
    yield TestClient(app)
    app.dependency_overrides.clear()  # deja la aplicación como estaba


def crear_usuario_directo(session: Session, rol: Rol, email: str, **cambios) -> Usuario:
    """Inserta un usuario en la base de datos de prueba sin pasar por la API (atajo para preparar escenarios)."""
    datos = dict(
        email=email,
        password_hash=hashear_password(PASSWORD_PRUEBA),
        rol=rol,
        nombre=f"Usuario {rol.value}",
    )
    datos.update(cambios)
    usuario = Usuario(**datos)
    session.add(usuario)
    session.commit()
    session.refresh(usuario)
    return usuario


def iniciar_sesion(client: TestClient, email: str, password: str = PASSWORD_PRUEBA):
    """Hace login (formulario OAuth2: el campo se llama `username` pero lleva el correo)."""
    return client.post("/api/auth/login", data={"username": email, "password": password})


def encabezados(client: TestClient, email: str) -> dict:
    """Inicia sesión y devuelve el encabezado `Authorization` listo para usar en otras peticiones."""
    token = iniciar_sesion(client, email).json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(name="admin")
def admin_fixture(session: Session) -> Usuario:
    return crear_usuario_directo(session, Rol.ADMIN, "admin@prueba.com")


class Reloj:
    """Reloj controlable para las pruebas: permite decidir qué día y hora es."""

    def __init__(self, monkeypatch):
        self._mp = monkeypatch
        self.poner(2026, 11, 1)

    def poner(self, anio: int, mes: int, dia: int, hora: int = 12) -> None:
        """Fija el instante actual (hora de Colombia, UTC-5). Por defecto, mediodía."""
        from datetime import datetime, timedelta, timezone

        instante = datetime(anio, mes, dia, hora, tzinfo=timezone(timedelta(hours=-5))).astimezone(timezone.utc)
        self._mp.setattr("app.core.tiempo.ahora", lambda: instante)


@pytest.fixture(name="reloj")
def reloj_fixture(monkeypatch) -> Reloj:
    return Reloj(monkeypatch)
