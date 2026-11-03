"""Pruebas del modelo Usuario (HU01 · subtarea 1: modelo de datos)."""
import pytest
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, select

from app.models import Rol, Usuario


def crear_usuario(**cambios) -> Usuario:
    """Arma un usuario válido; cada prueba cambia solo lo que le interesa."""
    datos = dict(email="ana@gympro.com", password_hash="hash", rol=Rol.CLIENTE, nombre="Ana Gómez")
    datos.update(cambios)
    return Usuario(**datos)


def test_guarda_y_recupera_todos_los_campos(session: Session):
    session.add(
        crear_usuario(
            documento="1234567890",
            telefono="3001234567",
            direccion="Calle 1 # 2-3",
            contacto_emergencia_nombre="Luis Gómez",
            contacto_emergencia_telefono="3109876543",
            codigo="GP-000001",
        )
    )
    session.commit()

    guardado = session.exec(select(Usuario)).one()
    assert guardado.id is not None
    assert guardado.rol == Rol.CLIENTE
    assert guardado.documento == "1234567890"
    assert guardado.contacto_emergencia_nombre == "Luis Gómez"
    assert guardado.activo is True  # por defecto un usuario nuevo está activo
    assert guardado.creado_en is not None  # la fecha de creación se llena sola


def test_email_no_se_puede_repetir(session: Session):
    session.add(crear_usuario())
    session.commit()

    session.add(crear_usuario(nombre="Otra Persona"))  # mismo email
    with pytest.raises(IntegrityError):
        session.commit()


def test_documento_no_se_puede_repetir(session: Session):
    session.add(crear_usuario(documento="111"))
    session.commit()

    session.add(crear_usuario(email="otro@gympro.com", documento="111"))
    with pytest.raises(IntegrityError):
        session.commit()


def test_varios_usuarios_pueden_dejar_documento_y_codigo_vacios(session: Session):
    """El documento y el código son únicos, pero vacíos no cuentan como repetidos."""
    session.add(crear_usuario(email="a@gympro.com"))
    session.add(crear_usuario(email="b@gympro.com"))
    session.commit()

    assert len(session.exec(select(Usuario)).all()) == 2


def test_un_cliente_puede_tener_entrenador(session: Session):
    entrenador = crear_usuario(email="coach@gympro.com", rol=Rol.ENTRENADOR, nombre="Coach")
    session.add(entrenador)
    session.commit()

    cliente = crear_usuario(entrenador_id=entrenador.id)
    session.add(cliente)
    session.commit()

    assert session.get(Usuario, cliente.id).entrenador_id == entrenador.id
