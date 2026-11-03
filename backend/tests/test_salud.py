"""Prueba del endpoint de salud (HU01 · subtarea 1: base de datos configurada)."""
from fastapi.testclient import TestClient


def test_salud_responde_ok(client: TestClient):
    respuesta = client.get("/api/salud")

    assert respuesta.status_code == 200
    assert respuesta.json() == {"estado": "ok", "base_de_datos": "ok"}
