"""Pruebas de contraseñas y tokens (HU01 · subtarea 2)."""
from datetime import datetime, timedelta, timezone

import jwt

from app.core.config import settings
from app.core.security import (
    ALGORITMO,
    TIPO_ACCESO,
    TIPO_RESET,
    crear_token_acceso,
    crear_token_reset,
    decodificar_token,
    hashear_password,
    huella_coincide,
    verificar_password,
)


def test_la_contrasena_no_se_guarda_en_texto_plano():
    hash_ = hashear_password("Clave1234")
    assert hash_ != "Clave1234"
    assert verificar_password("Clave1234", hash_)


def test_contrasena_incorrecta_no_verifica():
    assert not verificar_password("OtraClave1", hashear_password("Clave1234"))


def test_dos_hashes_de_la_misma_contrasena_son_distintos():
    """Cada hash lleva una 'sal' aleatoria, así dos usuarios con la misma clave no se delatan."""
    assert hashear_password("Clave1234") != hashear_password("Clave1234")


def test_token_de_acceso_se_decodifica():
    datos = decodificar_token(crear_token_acceso(7, "admin"), TIPO_ACCESO)
    assert datos["sub"] == "7"
    assert datos["rol"] == "admin"


def test_token_de_otro_tipo_se_rechaza():
    """Un token de recuperación no sirve para iniciar sesión."""
    token_reset = crear_token_reset(7, "hash-cualquiera")
    assert decodificar_token(token_reset, TIPO_ACCESO) is None


def test_token_vencido_se_rechaza():
    vencido = jwt.encode(
        {"sub": "1", "tipo": TIPO_ACCESO, "exp": datetime.now(timezone.utc) - timedelta(minutes=1)},
        settings.secret_key,
        algorithm=ALGORITMO,
    )
    assert decodificar_token(vencido, TIPO_ACCESO) is None


def test_token_manipulado_se_rechaza():
    token = crear_token_acceso(1, "cliente")
    assert decodificar_token(token + "x", TIPO_ACCESO) is None


def test_token_firmado_con_otra_clave_se_rechaza():
    falso = jwt.encode({"sub": "1", "tipo": TIPO_ACCESO}, "otra-clave-distinta-con-largo-suficiente-123456", algorithm=ALGORITMO)
    assert decodificar_token(falso, TIPO_ACCESO) is None


def test_huella_del_token_reset_cambia_con_la_contrasena():
    token = decodificar_token(crear_token_reset(1, "hash-viejo"), TIPO_RESET)
    assert huella_coincide(token, "hash-viejo")
    assert not huella_coincide(token, "hash-nuevo")
