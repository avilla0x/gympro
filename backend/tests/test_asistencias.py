"""Pruebas de asistencia (HU02): check-in, historial, constancia y recordatorios."""
from datetime import date

import pytest
from sqlmodel import Session

from app.core.config import settings
from app.models import Asistencia, MetodoCheckin, Notificacion, Plan, Rol
from app.services import asistencias, correo, recordatorios
from tests.conftest import crear_usuario_directo, encabezados

QR = settings.qr_gimnasio


@pytest.fixture(name="plan")
def plan_fixture(session: Session) -> Plan:
    plan = Plan(nombre="Mensual", duracion_dias=30, precio=90_000)
    session.add(plan)
    session.commit()
    return plan


@pytest.fixture(autouse=True)
def sin_correos(monkeypatch):
    monkeypatch.setattr(correo, "enviar_aviso", lambda *a, **k: None)


def cliente_pagado(client, session, admin, plan, email="c@x.com", **extra):
    cliente = crear_usuario_directo(session, Rol.CLIENTE, email, nombre="Ana Cliente", **extra)
    r = client.post("/api/pagos/manual", json={"usuario_id": cliente.id, "plan_id": plan.id, "metodo": "efectivo"},
                    headers=encabezados(client, admin.email))
    assert r.status_code == 201
    return cliente


def entrar(client, email, codigo=QR):
    return client.post("/api/asistencias/checkin", json={"codigo": codigo}, headers=encabezados(client, email))


# --------------------------- check-in ---------------------------
def test_checkin_con_qr_correcto(client, session, admin, plan, reloj):
    cliente = cliente_pagado(client, session, admin, plan)
    r = entrar(client, cliente.email)
    assert r.status_code == 201
    datos = r.json()
    assert datos["metodo"] == "qr" and datos["fecha"] == "2026-11-01" and datos["usuario_nombre"] == "Ana Cliente"


def test_checkin_con_qr_invalido(client, session, admin, plan):
    cliente = cliente_pagado(client, session, admin, plan)
    r = entrar(client, cliente.email, "OTRO-QR")
    assert r.status_code == 400 and "QR" in r.json()["detail"]


def test_varias_entradas_el_mismo_dia_se_permiten(client, session, admin, plan, reloj):
    cliente = cliente_pagado(client, session, admin, plan)
    assert entrar(client, cliente.email).status_code == 201
    assert entrar(client, cliente.email).status_code == 201
    m = client.get(f"/api/usuarios/{cliente.id}/asistencia/metricas", headers=encabezados(client, cliente.email)).json()
    assert m["entradas_mes"] == 2 and m["dias_asistidos_mes"] == 1  # dos entradas, un solo día


def test_rechaza_cliente_en_mora(client, session, admin, plan, reloj):
    cliente = cliente_pagado(client, session, admin, plan)  # vence el 30 de nov
    reloj.poner(2026, 12, 1)
    r = entrar(client, cliente.email)
    assert r.status_code == 403 and "venció el 30/11/2026" in r.json()["detail"]


def test_rechaza_cliente_sin_membresia(client, session):
    cliente = crear_usuario_directo(session, Rol.CLIENTE, "n@x.com")
    r = entrar(client, cliente.email)
    assert r.status_code == 403 and "membresía" in r.json()["detail"]


def test_el_ultimo_dia_todavia_entra(client, session, admin, plan, reloj):
    cliente = cliente_pagado(client, session, admin, plan)
    reloj.poner(2026, 11, 30)
    assert entrar(client, cliente.email).status_code == 201


def test_admin_y_entrenador_no_usan_el_qr(client, session, admin):
    assert entrar(client, admin.email).status_code == 403


def test_checkin_exige_sesion(client):
    assert client.post("/api/asistencias/checkin", json={"codigo": QR}).status_code == 401


def test_registro_manual_por_admin(client, session, admin, plan):
    cliente = cliente_pagado(client, session, admin, plan)
    r = client.post("/api/asistencias/manual", json={"usuario_id": cliente.id}, headers=encabezados(client, admin.email))
    assert r.status_code == 201 and r.json()["metodo"] == "manual"


def test_registro_manual_respeta_la_membresia_y_el_rol(client, session, admin):
    sin = crear_usuario_directo(session, Rol.CLIENTE, "s@x.com")
    h = encabezados(client, admin.email)
    assert client.post("/api/asistencias/manual", json={"usuario_id": sin.id}, headers=h).status_code == 403
    assert client.post("/api/asistencias/manual", json={"usuario_id": admin.id}, headers=h).status_code == 404
    assert client.post("/api/asistencias/manual", json={"usuario_id": 999}, headers=h).status_code == 404


def test_registro_manual_solo_admin(client, session, admin, plan):
    cliente = cliente_pagado(client, session, admin, plan)
    r = client.post("/api/asistencias/manual", json={"usuario_id": cliente.id}, headers=encabezados(client, cliente.email))
    assert r.status_code == 403


def test_qr_del_gimnasio_solo_admin(client, session, admin, plan):
    r = client.get("/api/asistencias/qr", headers=encabezados(client, admin.email))
    assert r.status_code == 200 and r.json()["codigo"] == QR and f"codigo={QR}" in r.json()["url"]
    cliente = cliente_pagado(client, session, admin, plan)
    assert client.get("/api/asistencias/qr", headers=encabezados(client, cliente.email)).status_code == 403


# --------------------------- historial ---------------------------
def poner_asistencia(session, cliente, dia: date):
    session.add(Asistencia(usuario_id=cliente.id, fecha=dia, metodo=MetodoCheckin.QR, registrada_por_id=cliente.id))
    session.commit()


def test_historial_admin_con_filtros(client, session, admin, plan):
    a = cliente_pagado(client, session, admin, plan, "a@x.com")
    b = cliente_pagado(client, session, admin, plan, "b@x.com")
    for d in (1, 5, 9):
        poner_asistencia(session, a, date(2026, 11, d))
    poner_asistencia(session, b, date(2026, 11, 5))
    h = encabezados(client, admin.email)
    assert len(client.get("/api/asistencias", headers=h).json()) == 4
    assert len(client.get(f"/api/asistencias?usuario_id={a.id}", headers=h).json()) == 3
    r = client.get("/api/asistencias?desde=2026-11-05&hasta=2026-11-05", headers=h).json()
    assert {x["usuario_id"] for x in r} == {a.id, b.id}
    assert client.get("/api/asistencias?desde=2026-11-09&hasta=2026-11-01", headers=h).status_code == 400


def test_historial_solo_admin(client, session, admin, plan):
    cliente = cliente_pagado(client, session, admin, plan)
    assert client.get("/api/asistencias", headers=encabezados(client, cliente.email)).status_code == 403


def test_historial_del_cliente_es_privado(client, session, admin, plan):
    a = cliente_pagado(client, session, admin, plan, "a@x.com")
    b = cliente_pagado(client, session, admin, plan, "b@x.com")
    poner_asistencia(session, a, date(2026, 11, 1))
    ha = encabezados(client, a.email)
    assert len(client.get(f"/api/usuarios/{a.id}/asistencias", headers=ha).json()) == 1
    assert client.get(f"/api/usuarios/{b.id}/asistencias", headers=ha).status_code == 403
    assert client.get(f"/api/usuarios/{b.id}/asistencia/metricas", headers=ha).status_code == 403
    assert client.get("/api/usuarios/999/asistencias", headers=encabezados(client, admin.email)).status_code == 404


def test_entrenador_ve_solo_a_sus_clientes(client, session, admin, plan):
    ent = crear_usuario_directo(session, Rol.ENTRENADOR, "e@x.com")
    mio = cliente_pagado(client, session, admin, plan, "m@x.com", entrenador_id=ent.id)
    ajeno = cliente_pagado(client, session, admin, plan, "j@x.com")
    h = encabezados(client, ent.email)
    assert client.get(f"/api/usuarios/{mio.id}/asistencias", headers=h).status_code == 200
    assert client.get(f"/api/usuarios/{ajeno.id}/asistencias", headers=h).status_code == 403


# --------------------------- racha y cumplimiento ---------------------------
D = lambda n: date(2026, 11, n)  # noqa: E731


def test_racha_funcion_pura():
    assert asistencias.calcular_racha(set(), D(10)) == (0, 0)
    assert asistencias.calcular_racha({D(8), D(9), D(10)}, D(10)) == (3, 3)
    assert asistencias.calcular_racha({D(8), D(9)}, D(10)) == (2, 2)  # hoy aún no vino: la racha sigue viva
    assert asistencias.calcular_racha({D(7), D(8)}, D(10)) == (0, 2)  # ayer no vino: se perdió
    assert asistencias.calcular_racha({D(1), D(2), D(3), D(4), D(8), D(9)}, D(9)) == (2, 4)  # mejor racha pasada


def test_metricas_del_cliente(client, session, admin, plan, reloj):
    cliente = cliente_pagado(client, session, admin, plan)
    reloj.poner(2026, 11, 10)
    for d in (1, 2, 3, 7, 9, 10):
        poner_asistencia(session, cliente, D(d))
    poner_asistencia(session, cliente, D(10))  # segunda entrada el mismo día
    m = client.get(f"/api/usuarios/{cliente.id}/asistencia/metricas", headers=encabezados(client, cliente.email)).json()
    assert m["racha_actual"] == 2 and m["mejor_racha"] == 3
    assert m["dias_asistidos_mes"] == 6 and m["dias_transcurridos_mes"] == 10 and m["cumplimiento_mes"] == 60
    assert m["entradas_mes"] == 7 and m["ultima_asistencia"] == "2026-11-10" and m["dias_sin_asistir"] == 0


def test_metricas_sin_asistencias(client, session, admin, plan, reloj):
    cliente = cliente_pagado(client, session, admin, plan)
    m = client.get(f"/api/usuarios/{cliente.id}/asistencia/metricas", headers=encabezados(client, cliente.email)).json()
    assert m["racha_actual"] == 0 and m["cumplimiento_mes"] == 0 and m["ultima_asistencia"] is None and m["dias_sin_asistir"] is None


def test_el_mes_nuevo_reinicia_el_cumplimiento_pero_no_la_racha(client, session, admin, plan, reloj):
    cliente = cliente_pagado(client, session, admin, plan)
    poner_asistencia(session, cliente, date(2026, 11, 30))
    reloj.poner(2026, 12, 1)
    # (en diciembre ya está en mora, pero las métricas solo leen el historial)
    poner_asistencia(session, cliente, date(2026, 12, 1))
    m = client.get(f"/api/usuarios/{cliente.id}/asistencia/metricas", headers=encabezados(client, cliente.email)).json()
    assert m["racha_actual"] == 2 and m["dias_asistidos_mes"] == 1 and m["cumplimiento_mes"] == 100


# --------------------------- recordatorios ---------------------------
def avisos_de(client, email):
    return [a for a in client.get("/api/avisos", headers=encabezados(client, email)).json()["items"] if a["tipo"] == "recordatorio_asistencia"]


def test_recordatorio_tras_7_dias_sin_asistir(client, session, admin, plan, reloj):
    cliente = cliente_pagado(client, session, admin, plan)  # membresía del 1 al 30 de nov
    poner_asistencia(session, cliente, D(2))
    assert recordatorios.generar_recordatorios_asistencia(session, D(8)) == 0  # 6 días: aún no
    assert recordatorios.generar_recordatorios_asistencia(session, D(9)) == 1  # 7 días
    av = avisos_de(client, cliente.email)
    assert len(av) == 1 and "7 días" in av[0]["mensaje"] and "02/11/2026" in av[0]["mensaje"]


def test_recordatorio_no_se_repite_pero_si_hay_nueva_ausencia(client, session, admin, plan, reloj):
    cliente = cliente_pagado(client, session, admin, plan)
    poner_asistencia(session, cliente, D(2))
    assert recordatorios.generar_recordatorios_asistencia(session, D(9)) == 1
    assert recordatorios.generar_recordatorios_asistencia(session, D(9)) == 0
    assert recordatorios.generar_recordatorios_asistencia(session, D(12)) == 0  # misma ausencia
    poner_asistencia(session, cliente, D(13))  # vuelve...
    assert recordatorios.generar_recordatorios_asistencia(session, D(20)) == 1  # ...y se ausenta de nuevo
    assert len(avisos_de(client, cliente.email)) == 2


def test_recordatorio_a_quien_nunca_ha_venido(client, session, admin, plan, reloj):
    cliente = cliente_pagado(client, session, admin, plan)
    assert recordatorios.generar_recordatorios_asistencia(session, D(7)) == 0  # 6 días desde que empezó
    assert recordatorios.generar_recordatorios_asistencia(session, D(8)) == 1
    assert "primera visita" in avisos_de(client, cliente.email)[0]["mensaje"]


def test_recordatorio_solo_con_membresia_vigente(client, session, admin, plan, reloj):
    cliente_pagado(client, session, admin, plan)  # vence el 30
    assert recordatorios.generar_recordatorios_asistencia(session, date(2026, 12, 15)) == 0  # en mora: no aplica
    sin = crear_usuario_directo(session, Rol.CLIENTE, "s@x.com")
    assert sin and recordatorios.generar_recordatorios_asistencia(session, D(20)) == 1  # solo el cliente pagado


def test_recordatorio_ignora_clientes_desactivados(client, session, admin, plan, reloj):
    cliente = cliente_pagado(client, session, admin, plan)
    cliente.activo = False
    session.add(cliente)
    session.commit()
    assert recordatorios.generar_recordatorios_asistencia(session, D(20)) == 0


def test_endpoint_generar_incluye_recordatorios(client, session, admin, plan, reloj):
    cliente_pagado(client, session, admin, plan)
    reloj.poner(2026, 11, 9)
    r = client.post("/api/avisos/generar", headers=encabezados(client, admin.email))
    assert r.status_code == 200 and r.json()["recordatorio_asistencia"] == 1
