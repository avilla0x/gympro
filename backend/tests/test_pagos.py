"""Pruebas de pagos manuales, membresías y estados (HU03 · subtarea 2)."""
from datetime import date

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session

from app.models import Plan, Rol
from app.services.membresias import EstadoMembresia, calcular_estado
from tests.conftest import crear_usuario_directo, encabezados


@pytest.fixture(name="planes")
def planes_fixture(session: Session) -> dict:
    mensual = Plan(nombre="Mensual", duracion_dias=30, precio=90_000)
    trimestral = Plan(nombre="Trimestral", duracion_dias=90, precio=240_000)
    session.add_all([mensual, trimestral])
    session.commit()
    return {"mensual": mensual, "trimestral": trimestral}


@pytest.fixture(name="cliente")
def cliente_fixture(session: Session):
    return crear_usuario_directo(session, Rol.CLIENTE, "cliente@prueba.com", nombre="Cliente Uno")


def pagar(client, admin, cliente, plan, metodo="efectivo", **extra):
    return client.post(
        "/api/pagos/manual",
        json={"usuario_id": cliente.id, "plan_id": plan.id, "metodo": metodo, **extra},
        headers=encabezados(client, admin.email),
    )


def membresia(client, admin, cliente):
    return client.get(f"/api/usuarios/{cliente.id}/membresia", headers=encabezados(client, admin.email)).json()


# ---------------------------------------------------------------------------
# Estado: función pura (RN1)
# ---------------------------------------------------------------------------
@pytest.mark.parametrize(
    "vence, esperado, restantes",
    [
        (None, EstadoMembresia.SIN_MEMBRESIA, None),
        (date(2026, 11, 30), EstadoMembresia.AL_DIA, 29),
        (date(2026, 11, 7), EstadoMembresia.AL_DIA, 6),  # 6 días: todavía al día
        (date(2026, 11, 6), EstadoMembresia.POR_VENCER, 5),  # 5 días: por vencer
        (date(2026, 11, 1), EstadoMembresia.POR_VENCER, 0),  # vence hoy: aún puede entrar
        (date(2026, 10, 31), EstadoMembresia.EN_MORA, -1),  # venció ayer
    ],
)
def test_calculo_de_estado(vence, esperado, restantes):
    assert calcular_estado(vence, date(2026, 11, 1), 5) == (esperado, restantes)


# ---------------------------------------------------------------------------
# Registrar pagos manuales
# ---------------------------------------------------------------------------
def test_cliente_sin_pagos_esta_sin_membresia(client, session, admin, cliente, planes):
    datos = membresia(client, admin, cliente)
    assert datos["estado"] == "sin_membresia"
    assert datos["puede_entrar"] is False
    assert datos["membresias"] == []


def test_primer_pago_crea_membresia_desde_hoy(client, session, admin, cliente, planes, reloj):
    reloj.poner(2026, 11, 1)
    r = pagar(client, admin, cliente, planes["mensual"], referencia="  TR-123 ")
    assert r.status_code == 201
    pago = r.json()
    assert pago["estado"] == "aprobado"
    assert pago["monto"] == 90_000
    assert pago["referencia"] == "TR-123"
    assert pago["usuario_nombre"] == "Cliente Uno"
    assert pago["plan_nombre"] == "Mensual"
    assert pago["registrado_por_id"] == admin.id

    datos = membresia(client, admin, cliente)
    assert datos["fecha_vencimiento"] == "2026-11-30"  # 30 días contando el 1 de noviembre
    assert datos["estado"] == "al_dia"
    assert datos["puede_entrar"] is True
    assert datos["plan"] == "Mensual"


def test_el_dia_se_calcula_en_hora_colombia_y_no_utc(client, session, admin, cliente, planes, reloj):
    reloj.poner(2026, 11, 1, hora=22)  # 10 p. m. en Bogotá = 3 a. m. del 2 de noviembre en UTC
    pagar(client, admin, cliente, planes["mensual"])
    assert membresia(client, admin, cliente)["membresias"][0]["fecha_inicio"] == "2026-11-01"


def test_el_monto_conserva_el_precio_del_momento(client, session, admin, cliente, planes, reloj):
    pagar(client, admin, cliente, planes["mensual"])
    planes["mensual"].precio = 100_000
    session.add(planes["mensual"])
    session.commit()
    pagos = client.get("/api/pagos", headers=encabezados(client, admin.email)).json()
    assert pagos[0]["monto"] == 90_000


def test_renovar_antes_de_vencer_suma_al_final(client, session, admin, cliente, planes, reloj):
    reloj.poner(2026, 11, 1)
    pagar(client, admin, cliente, planes["mensual"])  # 1 al 30 nov
    reloj.poner(2026, 11, 20)
    pagar(client, admin, cliente, planes["mensual"])  # empieza el 1 dic, termina el 30 dic
    datos = membresia(client, admin, cliente)
    assert datos["fecha_vencimiento"] == "2026-12-30"
    assert [(m["fecha_inicio"], m["fecha_fin"]) for m in datos["membresias"]] == [
        ("2026-12-01", "2026-12-30"),
        ("2026-11-01", "2026-11-30"),
    ]


def test_renovar_el_ultimo_dia_no_deja_hueco(client, session, admin, cliente, planes, reloj):
    reloj.poner(2026, 11, 1)
    pagar(client, admin, cliente, planes["mensual"])
    reloj.poner(2026, 11, 30)  # último día válido
    pagar(client, admin, cliente, planes["mensual"])
    assert membresia(client, admin, cliente)["membresias"][0]["fecha_inicio"] == "2026-12-01"


def test_renovar_vencida_empieza_el_dia_del_pago(client, session, admin, cliente, planes, reloj):
    reloj.poner(2026, 11, 1)
    pagar(client, admin, cliente, planes["mensual"])
    reloj.poner(2026, 12, 10)
    assert membresia(client, admin, cliente)["estado"] == "en_mora"
    pagar(client, admin, cliente, planes["mensual"])
    datos = membresia(client, admin, cliente)
    assert datos["membresias"][0]["fecha_inicio"] == "2026-12-10"
    assert datos["estado"] == "al_dia"


def test_estado_por_vencer_y_en_mora_segun_el_dia(client, session, admin, cliente, planes, reloj):
    reloj.poner(2026, 11, 1)
    pagar(client, admin, cliente, planes["mensual"])  # vence el 30
    reloj.poner(2026, 11, 25)
    assert membresia(client, admin, cliente)["estado"] == "por_vencer"
    reloj.poner(2026, 12, 1)
    datos = membresia(client, admin, cliente)
    assert datos["estado"] == "en_mora" and datos["puede_entrar"] is False and datos["dias_restantes"] == -1


def test_validaciones_al_registrar(client, session, admin, cliente, planes):
    h = encabezados(client, admin.email)
    assert pagar(client, admin, cliente, planes["mensual"], metodo="pasarela").status_code == 400
    assert pagar(client, admin, cliente, planes["mensual"], metodo="bitcoin").status_code == 422
    assert client.post("/api/pagos/manual", json={"usuario_id": 999, "plan_id": 1, "metodo": "efectivo"}, headers=h).status_code == 404
    assert client.post("/api/pagos/manual", json={"usuario_id": cliente.id, "plan_id": 999, "metodo": "efectivo"}, headers=h).status_code == 404
    # el admin no es cliente
    assert client.post("/api/pagos/manual", json={"usuario_id": admin.id, "plan_id": planes["mensual"].id, "metodo": "efectivo"}, headers=h).status_code == 404
    cliente.activo = False
    session.add(cliente)
    session.commit()
    assert pagar(client, admin, cliente, planes["mensual"]).status_code == 400


# ---------------------------------------------------------------------------
# Anular
# ---------------------------------------------------------------------------
def test_anular_pago_recalcula_membresias(client, session, admin, cliente, planes, reloj):
    reloj.poner(2026, 11, 1)
    p1 = pagar(client, admin, cliente, planes["mensual"]).json()
    reloj.poner(2026, 11, 10)
    pagar(client, admin, cliente, planes["mensual"])  # 1 dic al 30 dic
    h = encabezados(client, admin.email)

    r = client.post(f"/api/pagos/{p1['id']}/anular", json={"motivo": "Error de digitación"}, headers=h)
    assert r.status_code == 200
    anulado = r.json()
    assert anulado["estado"] == "anulado"
    assert anulado["motivo_anulacion"] == "Error de digitación"
    assert anulado["anulado_por_id"] == admin.id and anulado["anulado_en"]

    # el segundo pago ya no se suma al final del primero: empieza el día en que se pagó (10 nov)
    datos = membresia(client, admin, cliente)
    assert len(datos["membresias"]) == 1
    assert datos["membresias"][0]["fecha_inicio"] == "2026-11-10"
    assert datos["fecha_vencimiento"] == "2026-12-09"


def test_anular_el_unico_pago_deja_sin_membresia(client, session, admin, cliente, planes):
    p = pagar(client, admin, cliente, planes["mensual"]).json()
    client.post(f"/api/pagos/{p['id']}/anular", json={"motivo": "Pago duplicado"}, headers=encabezados(client, admin.email))
    assert membresia(client, admin, cliente)["estado"] == "sin_membresia"


def test_anular_validaciones(client, session, admin, cliente, planes):
    h = encabezados(client, admin.email)
    p = pagar(client, admin, cliente, planes["mensual"]).json()
    assert client.post("/api/pagos/999/anular", json={"motivo": "Motivo válido"}, headers=h).status_code == 404
    assert client.post(f"/api/pagos/{p['id']}/anular", json={"motivo": "ab"}, headers=h).status_code == 422
    assert client.post(f"/api/pagos/{p['id']}/anular", json={"motivo": "Motivo válido"}, headers=h).status_code == 200
    assert client.post(f"/api/pagos/{p['id']}/anular", json={"motivo": "Motivo válido"}, headers=h).status_code == 409


# ---------------------------------------------------------------------------
# Listados y permisos
# ---------------------------------------------------------------------------
def test_listar_pagos_con_filtros(client, session, admin, cliente, planes):
    otro = crear_usuario_directo(session, Rol.CLIENTE, "otro@prueba.com", nombre="Otro")
    pagar(client, admin, cliente, planes["mensual"])
    p2 = pagar(client, admin, otro, planes["trimestral"]).json()
    h = encabezados(client, admin.email)
    client.post(f"/api/pagos/{p2['id']}/anular", json={"motivo": "Prueba de anulación"}, headers=h)

    todos = client.get("/api/pagos", headers=h).json()
    assert [p["id"] for p in todos] == [p2["id"], 1]  # el más reciente primero
    assert len(client.get(f"/api/pagos?usuario_id={cliente.id}", headers=h).json()) == 1
    assert [p["id"] for p in client.get("/api/pagos?estado=anulado", headers=h).json()] == [p2["id"]]


def test_permisos_de_pagos(client, session, admin, cliente, planes):
    entrenador = crear_usuario_directo(session, Rol.ENTRENADOR, "ent@prueba.com")
    ajeno = crear_usuario_directo(session, Rol.CLIENTE, "ajeno@prueba.com")
    pagar(client, admin, cliente, planes["mensual"])

    # solo el admin registra, lista general y anula
    for correo in (cliente.email, entrenador.email):
        h = encabezados(client, correo)
        assert client.post("/api/pagos/manual", json={"usuario_id": cliente.id, "plan_id": 1, "metodo": "efectivo"}, headers=h).status_code == 403
        assert client.get("/api/pagos", headers=h).status_code == 403
        assert client.post("/api/pagos/1/anular", json={"motivo": "Motivo válido"}, headers=h).status_code == 403
    assert client.get("/api/pagos").status_code == 401

    # el cliente se ve a sí mismo, no a otro
    h = encabezados(client, cliente.email)
    assert client.get(f"/api/usuarios/{cliente.id}/membresia", headers=h).status_code == 200
    assert len(client.get(f"/api/usuarios/{cliente.id}/pagos", headers=h).json()) == 1
    assert client.get(f"/api/usuarios/{ajeno.id}/membresia", headers=h).status_code == 403
    assert client.get(f"/api/usuarios/{ajeno.id}/pagos", headers=h).status_code == 403

    # el entrenador solo ve a sus clientes asignados
    h = encabezados(client, entrenador.email)
    assert client.get(f"/api/usuarios/{cliente.id}/membresia", headers=h).status_code == 403
    cliente.entrenador_id = entrenador.id
    session.add(cliente)
    session.commit()
    assert client.get(f"/api/usuarios/{cliente.id}/membresia", headers=h).status_code == 200
    assert client.get("/api/usuarios/999/membresia", headers=encabezados(client, admin.email)).status_code == 404


# ---------------------------------------------------------------------------
# Pasarela simulada (subtarea 3)
# ---------------------------------------------------------------------------
def checkout(client, correo, plan, **extra):
    return client.post("/api/pagos/checkout", json={"plan_id": plan.id, **extra}, headers=encabezados(client, correo))


def test_cliente_paga_por_pasarela_y_aprueba(client, session, admin, cliente, planes, reloj):
    r = checkout(client, cliente.email, planes["mensual"])
    assert r.status_code == 201
    pago = r.json()
    assert pago["estado"] == "pendiente" and pago["metodo"] == "pasarela"
    assert pago["referencia"].startswith("SIM-") and pago["monto"] == 90_000
    assert pago["registrado_por_id"] == cliente.id
    # pendiente: todavía no da membresía
    assert membresia(client, admin, cliente)["estado"] == "sin_membresia"

    h = encabezados(client, cliente.email)
    r = client.post(f"/api/pagos/{pago['id']}/simular", json={"resultado": "aprobado"}, headers=h)
    assert r.status_code == 200 and r.json()["estado"] == "aprobado"
    datos = membresia(client, admin, cliente)
    assert datos["estado"] == "al_dia" and datos["fecha_vencimiento"] == "2026-11-30"
    # no se puede resolver dos veces
    assert client.post(f"/api/pagos/{pago['id']}/simular", json={"resultado": "rechazado"}, headers=h).status_code == 409


def test_pago_rechazado_o_cancelado_no_da_membresia(client, session, admin, cliente, planes):
    h = encabezados(client, cliente.email)
    p1 = checkout(client, cliente.email, planes["mensual"]).json()
    assert client.post(f"/api/pagos/{p1['id']}/simular", json={"resultado": "rechazado"}, headers=h).json()["estado"] == "rechazado"
    p2 = checkout(client, cliente.email, planes["mensual"]).json()
    assert p2["id"] != p1["id"]
    assert client.post(f"/api/pagos/{p2['id']}/cancelar", headers=h).json()["estado"] == "rechazado"
    assert membresia(client, admin, cliente)["estado"] == "sin_membresia"


def test_reintentar_reutiliza_el_pendiente_y_otro_plan_cancela_el_anterior(client, session, admin, cliente, planes):
    p1 = checkout(client, cliente.email, planes["mensual"]).json()
    assert checkout(client, cliente.email, planes["mensual"]).json()["id"] == p1["id"]  # mismo plan: se reutiliza
    p2 = checkout(client, cliente.email, planes["trimestral"]).json()
    assert p2["id"] != p1["id"]
    estados = {p["id"]: p["estado"] for p in client.get("/api/pagos", headers=encabezados(client, admin.email)).json()}
    assert estados == {p1["id"]: "rechazado", p2["id"]: "pendiente"}


def test_pendiente_toma_el_precio_vigente_al_reintentar(client, session, admin, cliente, planes):
    p1 = checkout(client, cliente.email, planes["mensual"]).json()
    planes["mensual"].precio = 100_000
    session.add(planes["mensual"])
    session.commit()
    assert checkout(client, cliente.email, planes["mensual"]).json()["monto"] == 100_000
    assert p1["monto"] == 90_000


def test_admin_cobra_por_pasarela_a_un_cliente(client, session, admin, cliente, planes):
    assert checkout(client, admin.email, planes["mensual"]).status_code == 400  # falta el cliente
    r = checkout(client, admin.email, planes["mensual"], usuario_id=cliente.id)
    assert r.status_code == 201 and r.json()["registrado_por_id"] == admin.id
    h = encabezados(client, admin.email)
    assert client.post(f"/api/pagos/{r.json()['id']}/simular", json={"resultado": "aprobado"}, headers=h).status_code == 200
    assert membresia(client, admin, cliente)["estado"] == "al_dia"


def test_permisos_de_la_pasarela(client, session, admin, cliente, planes):
    ajeno = crear_usuario_directo(session, Rol.CLIENTE, "ajeno@prueba.com")
    entrenador = crear_usuario_directo(session, Rol.ENTRENADOR, "ent@prueba.com")
    # un cliente no paga por otro; el entrenador no cobra
    assert checkout(client, ajeno.email, planes["mensual"], usuario_id=cliente.id).status_code == 403
    assert checkout(client, entrenador.email, planes["mensual"], usuario_id=cliente.id).status_code == 403
    assert client.post("/api/pagos/checkout", json={"plan_id": 1}).status_code == 401
    pago = checkout(client, cliente.email, planes["mensual"]).json()
    # otro cliente no puede operar ni ver el pago
    h = encabezados(client, ajeno.email)
    assert client.post(f"/api/pagos/{pago['id']}/simular", json={"resultado": "aprobado"}, headers=h).status_code == 403
    assert client.post(f"/api/pagos/{pago['id']}/cancelar", headers=h).status_code == 403
    assert client.get(f"/api/pagos/{pago['id']}", headers=h).status_code == 403
    assert client.post(f"/api/pagos/{pago['id']}/simular", json={"resultado": "quizas"}, headers=encabezados(client, cliente.email)).status_code == 422


def test_validaciones_del_checkout(client, session, admin, cliente, planes):
    assert client.post("/api/pagos/checkout", json={"plan_id": 999}, headers=encabezados(client, cliente.email)).status_code == 404
    cliente.activo = False
    session.add(cliente)
    session.commit()
    # un cliente desactivado ni siquiera puede iniciar sesión; el admin tampoco le cobra
    assert checkout(client, admin.email, planes["mensual"], usuario_id=cliente.id).status_code == 400


def test_pago_manual_no_se_opera_en_la_pasarela(client, session, admin, cliente, planes):
    p = pagar(client, admin, cliente, planes["mensual"]).json()
    h = encabezados(client, admin.email)
    assert client.post(f"/api/pagos/{p['id']}/simular", json={"resultado": "aprobado"}, headers=h).status_code == 400


def test_comprobante(client, session, admin, cliente, planes, reloj):
    reloj.poner(2026, 11, 1)
    cliente.documento = "1010"
    session.add(cliente)
    session.commit()
    p = pagar(client, admin, cliente, planes["mensual"]).json()
    r = client.get(f"/api/pagos/{p['id']}", headers=encabezados(client, cliente.email))
    assert r.status_code == 200
    c = r.json()
    assert c["usuario_documento"] == "1010" and c["fecha_inicio"] == "2026-11-01" and c["fecha_fin"] == "2026-11-30"
    # anulado: ya no tiene vigencia
    client.post(f"/api/pagos/{p['id']}/anular", json={"motivo": "Motivo válido"}, headers=encabezados(client, admin.email))
    c = client.get(f"/api/pagos/{p['id']}", headers=encabezados(client, admin.email)).json()
    assert c["estado"] == "anulado" and c["fecha_inicio"] is None
    assert client.get("/api/pagos/999", headers=encabezados(client, admin.email)).status_code == 404
