"""Pruebas de los avisos automáticos de vencimiento y el seguimiento (HU03 · subtarea 4)."""
from datetime import date

import pytest
from sqlmodel import Session, select

from app.models import Notificacion, Plan, Rol
from app.services import avisos, correo
from tests.conftest import crear_usuario_directo, encabezados


@pytest.fixture(name="plan")
def plan_fixture(session: Session) -> Plan:
    plan = Plan(nombre="Mensual", duracion_dias=30, precio=90_000)
    session.add(plan)
    session.commit()
    return plan


@pytest.fixture(name="correos")
def correos_fixture(monkeypatch) -> list:
    """Captura los correos que se 'enviarían' para poder revisarlos."""
    enviados: list = []
    monkeypatch.setattr(correo, "enviar_aviso", lambda destino, titulo, mensaje: enviados.append((destino, titulo, mensaje)))
    return enviados


def cliente_con_membresia(client, session, admin, plan, correo_cliente="c@x.com", nombre="Cliente"):
    cliente = crear_usuario_directo(session, Rol.CLIENTE, correo_cliente, nombre=nombre)
    r = client.post(
        "/api/pagos/manual",
        json={"usuario_id": cliente.id, "plan_id": plan.id, "metodo": "efectivo"},
        headers=encabezados(client, admin.email),
    )
    assert r.status_code == 201
    return cliente


def generar(session: Session, dia: date) -> dict:
    return avisos.generar_avisos_vencimiento(session, dia)


def mis_avisos(client, correo_usuario):
    return client.get("/api/avisos", headers=encabezados(client, correo_usuario)).json()


# Pagando el 1 de noviembre con un plan de 30 días, la membresía vence el 30 de noviembre.
def test_avisa_cuando_faltan_3_dias_o_menos(client, session, admin, plan, reloj, correos):
    reloj.poner(2026, 11, 1)
    cliente = cliente_con_membresia(client, session, admin, plan)

    assert generar(session, date(2026, 11, 26)) == {"por_vencer": 0, "vence_hoy": 0, "resumen_admin": 0}  # faltan 4: aún no
    assert generar(session, date(2026, 11, 27)) == {"por_vencer": 1, "vence_hoy": 0, "resumen_admin": 1}  # faltan 3

    datos = mis_avisos(client, cliente.email)
    assert datos["no_leidas"] == 1
    assert datos["items"][0]["tipo"] == "por_vencer"
    assert "30/11/2026" in datos["items"][0]["mensaje"] and "en 3 días" in datos["items"][0]["mensaje"]
    assert correos[0][0] == cliente.email  # y se mandó el correo


def test_no_repite_avisos_al_correr_varias_veces_ni_los_dias_siguientes(client, session, admin, plan, reloj, correos):
    reloj.poner(2026, 11, 1)
    cliente_con_membresia(client, session, admin, plan)
    generar(session, date(2026, 11, 27))
    assert generar(session, date(2026, 11, 27)) == {"por_vencer": 0, "vence_hoy": 0, "resumen_admin": 0}
    # al día siguiente sigue "por vencer" pero ya se avisó de este vencimiento: no se repite al cliente
    assert generar(session, date(2026, 11, 28))["por_vencer"] == 0
    # un correo al cliente (una sola vez) y un resumen al administrador por cada día distinto
    assert [c[0] for c in correos] == ["c@x.com", "admin@prueba.com", "admin@prueba.com"]


def test_si_la_tarea_no_corrio_el_dia_exacto_igual_avisa(client, session, admin, plan, reloj, correos):
    reloj.poner(2026, 11, 1)
    cliente_con_membresia(client, session, admin, plan)
    assert generar(session, date(2026, 11, 29))["por_vencer"] == 1  # faltan 1 día, nunca se avisó antes


def test_avisa_el_ultimo_dia(client, session, admin, plan, reloj, correos):
    reloj.poner(2026, 11, 1)
    cliente = cliente_con_membresia(client, session, admin, plan)
    generar(session, date(2026, 11, 27))
    assert generar(session, date(2026, 11, 30))["vence_hoy"] == 1
    tipos = [a["tipo"] for a in mis_avisos(client, cliente.email)["items"]]
    assert tipos == ["vence_hoy", "por_vencer"]  # el más reciente primero


def test_no_avisa_a_vencidos_a_sin_membresia_ni_a_desactivados(client, session, admin, plan, reloj, correos):
    reloj.poner(2026, 11, 1)
    vencido = cliente_con_membresia(client, session, admin, plan, "v@x.com")
    desactivado = cliente_con_membresia(client, session, admin, plan, "d@x.com")
    desactivado.activo = False
    session.add(desactivado)
    session.commit()
    crear_usuario_directo(session, Rol.CLIENTE, "nuevo@x.com")  # nunca pagó
    assert generar(session, date(2026, 12, 5)) == {"por_vencer": 0, "vence_hoy": 0, "resumen_admin": 0}
    assert generar(session, date(2026, 11, 28))["por_vencer"] == 1  # solo el activo con membresía (el vencido de hoy aún no)
    assert session.exec(select(Notificacion).where(Notificacion.usuario_id == desactivado.id)).all() == []
    assert vencido.id


def test_renovar_a_tiempo_evita_el_aviso(client, session, admin, plan, reloj, correos):
    reloj.poner(2026, 11, 1)
    cliente = cliente_con_membresia(client, session, admin, plan)
    reloj.poner(2026, 11, 20)
    client.post("/api/pagos/manual", json={"usuario_id": cliente.id, "plan_id": plan.id, "metodo": "efectivo"}, headers=encabezados(client, admin.email))
    assert generar(session, date(2026, 11, 28))["por_vencer"] == 0  # ahora vence el 30 de diciembre


def test_el_resumen_del_administrador_cuenta_los_clientes(client, session, admin, plan, reloj, correos):
    reloj.poner(2026, 11, 1)
    cliente_con_membresia(client, session, admin, plan, "a@x.com")
    cliente_con_membresia(client, session, admin, plan, "b@x.com")
    generar(session, date(2026, 11, 28))
    resumen = mis_avisos(client, admin.email)["items"][0]
    assert resumen["tipo"] == "resumen_admin" and "2 cliente(s) por vencer" in resumen["mensaje"]


def test_marcar_leidos_y_privacidad(client, session, admin, plan, reloj, correos):
    reloj.poner(2026, 11, 1)
    a = cliente_con_membresia(client, session, admin, plan, "a@x.com")
    b = cliente_con_membresia(client, session, admin, plan, "b@x.com")
    generar(session, date(2026, 11, 28))
    ha, hb = encabezados(client, a.email), encabezados(client, b.email)
    aviso_a = mis_avisos(client, a.email)["items"][0]

    # no se puede tocar el aviso de otra persona (se responde como si no existiera)
    assert client.post(f"/api/avisos/{aviso_a['id']}/leer", headers=hb).status_code == 404
    assert mis_avisos(client, a.email)["no_leidas"] == 1
    assert client.post(f"/api/avisos/{aviso_a['id']}/leer", headers=ha).json()["leida"] is True
    assert mis_avisos(client, a.email)["no_leidas"] == 0
    assert client.post("/api/avisos/999/leer", headers=ha).status_code == 404

    assert mis_avisos(client, b.email)["no_leidas"] == 1
    assert client.post("/api/avisos/leer-todos", headers=hb).json() == {"marcados": 1}
    assert mis_avisos(client, b.email)["no_leidas"] == 0
    assert client.get("/api/avisos").status_code == 401


def test_generar_a_mano_solo_el_admin(client, session, admin, plan, reloj, correos):
    reloj.poner(2026, 11, 28)
    cliente = cliente_con_membresia(client, session, admin, plan)  # paga el 28: vence el 27 de diciembre
    assert client.post("/api/avisos/generar", headers=encabezados(client, cliente.email)).status_code == 403
    r = client.post("/api/avisos/generar", headers=encabezados(client, admin.email))
    assert r.status_code == 200 and r.json() == {"por_vencer": 0, "vence_hoy": 0, "resumen_admin": 0, "recordatorio_asistencia": 0}


def test_seguimiento_de_vencimientos(client, session, admin, plan, reloj, correos):
    reloj.poner(2026, 11, 1)
    por_vencer = cliente_con_membresia(client, session, admin, plan, "pv@x.com", "Por Vencer")
    cliente_con_membresia(client, session, admin, plan, "mora@x.com", "En Mora")
    reloj.poner(2026, 11, 20)
    client.post("/api/pagos/manual", json={"usuario_id": por_vencer.id, "plan_id": plan.id, "metodo": "efectivo"}, headers=encabezados(client, admin.email))
    # Hoy es 5 de diciembre: "Por Vencer" renovó (vence 30 dic -> al día) y "En Mora" venció el 30 de noviembre
    reloj.poner(2026, 12, 5)
    filas = client.get("/api/vencimientos", headers=encabezados(client, admin.email)).json()
    assert [(f["nombre"], f["estado"], f["dias_restantes"]) for f in filas] == [("En Mora", "en_mora", -5)]

    reloj.poner(2026, 12, 27)  # al renovado le quedan 3 días
    filas = client.get("/api/vencimientos", headers=encabezados(client, admin.email)).json()
    # los más urgentes (menos días restantes) primero: la mora, luego el que está por vencer
    assert [(f["nombre"], f["estado"], f["dias_restantes"]) for f in filas] == [("En Mora", "en_mora", -27), ("Por Vencer", "por_vencer", 3)]
    assert client.get("/api/vencimientos", headers=encabezados(client, por_vencer.email)).status_code == 403
