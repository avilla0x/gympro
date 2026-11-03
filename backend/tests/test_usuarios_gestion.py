"""Pruebas de la gestión de usuarios por el administrador (HU01 · subtarea 5: perfil de usuario)."""
from datetime import date, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session

from app.models import Rol, Usuario
from tests.conftest import PASSWORD_PRUEBA, crear_usuario_directo, encabezados, iniciar_sesion


@pytest.fixture(name="h")
def encabezados_admin_fixture(client: TestClient, admin: Usuario) -> dict:
    """Encabezados de sesión del administrador (atajo para no repetirlos en cada prueba)."""
    return encabezados(client, admin.email)


# ---------------------------------------------------------------------------
# Listar, buscar, filtrar y paginar
# ---------------------------------------------------------------------------
@pytest.fixture(name="poblada")
def base_poblada_fixture(session: Session, admin: Usuario) -> dict:
    """Un administrador (ya existe), un entrenador, dos clientes (uno desactivado)."""
    coach = crear_usuario_directo(session, Rol.ENTRENADOR, "coach@gympro.com", nombre="Carlos Coach")
    ana = crear_usuario_directo(
        session, Rol.CLIENTE, "ana@gympro.com", nombre="Ana Gómez", documento="1010", codigo="GP-000010", entrenador_id=coach.id
    )
    luis = crear_usuario_directo(
        session, Rol.CLIENTE, "luis@gympro.com", nombre="Luis Pérez", documento="2020", codigo="GP-000011", activo=False
    )
    return {"coach": coach, "ana": ana, "luis": luis}


def listar(client: TestClient, h: dict, **filtros) -> dict:
    respuesta = client.get("/api/usuarios", params=filtros, headers=h)
    assert respuesta.status_code == 200
    return respuesta.json()


def test_listar_devuelve_a_todos_ordenados_por_nombre(client: TestClient, h, poblada):
    resultado = listar(client, h)

    assert resultado["total"] == 4
    nombres = [u["nombre"] for u in resultado["items"]]
    assert nombres == sorted(nombres)
    assert all("password_hash" not in u for u in resultado["items"])


@pytest.mark.parametrize(
    "busqueda, esperados",
    [
        ("ana", ["ana@gympro.com"]),  # por nombre o correo, sin distinguir mayúsculas
        ("ANA", ["ana@gympro.com"]),
        ("2020", ["luis@gympro.com"]),  # por documento
        ("GP-000010", ["ana@gympro.com"]),  # por código
        ("coach", ["coach@gympro.com"]),
        ("   ", None),  # una búsqueda en blanco no filtra
        ("nadie-con-este-nombre", []),
    ],
)
def test_buscar_por_nombre_correo_documento_o_codigo(client: TestClient, h, poblada, busqueda, esperados):
    resultado = listar(client, h, busqueda=busqueda)

    if esperados is None:
        assert resultado["total"] == 4
    else:
        assert sorted(u["email"] for u in resultado["items"]) == sorted(esperados)


def test_filtrar_por_rol(client: TestClient, h, poblada):
    assert [u["email"] for u in listar(client, h, rol="entrenador")["items"]] == ["coach@gympro.com"]
    assert listar(client, h, rol="cliente")["total"] == 2


def test_filtrar_por_estado(client: TestClient, h, poblada):
    assert [u["email"] for u in listar(client, h, activo="false")["items"]] == ["luis@gympro.com"]
    assert listar(client, h, activo="true")["total"] == 3


def test_filtros_combinados(client: TestClient, h, poblada):
    resultado = listar(client, h, rol="cliente", activo="true")

    assert [u["email"] for u in resultado["items"]] == ["ana@gympro.com"]


def test_paginacion(client: TestClient, h, poblada):
    primera = listar(client, h, por_pagina=3, pagina=1)
    segunda = listar(client, h, por_pagina=3, pagina=2)

    assert primera["total"] == segunda["total"] == 4  # el total no depende de la página
    assert len(primera["items"]) == 3 and len(segunda["items"]) == 1
    assert not {u["id"] for u in primera["items"]} & {u["id"] for u in segunda["items"]}


def test_parametros_de_paginacion_invalidos(client: TestClient, h):
    assert client.get("/api/usuarios", params={"pagina": 0}, headers=h).status_code == 422
    assert client.get("/api/usuarios", params={"por_pagina": 101}, headers=h).status_code == 422


@pytest.mark.parametrize("rol, esperado", [(Rol.ENTRENADOR, 403), (Rol.CLIENTE, 403)])
def test_solo_el_admin_puede_listar(client: TestClient, session: Session, rol, esperado):
    crear_usuario_directo(session, rol, "otro@gympro.com")

    assert client.get("/api/usuarios", headers=encabezados(client, "otro@gympro.com")).status_code == esperado
    assert client.get("/api/usuarios").status_code == 401


# ---------------------------------------------------------------------------
# Detalle de un usuario: cada rol ve solo lo que le corresponde
# ---------------------------------------------------------------------------
def test_el_admin_ve_el_detalle_de_cualquiera(client: TestClient, h, poblada):
    respuesta = client.get(f"/api/usuarios/{poblada['ana'].id}", headers=h)

    assert respuesta.status_code == 200
    assert respuesta.json()["email"] == "ana@gympro.com"


def test_usuario_inexistente_responde_404(client: TestClient, h):
    assert client.get("/api/usuarios/9999", headers=h).status_code == 404


def test_el_entrenador_ve_a_su_cliente_pero_no_a_otros(client: TestClient, poblada):
    h_coach = encabezados(client, "coach@gympro.com")

    assert client.get(f"/api/usuarios/{poblada['ana'].id}", headers=h_coach).status_code == 200  # su cliente
    assert client.get(f"/api/usuarios/{poblada['luis'].id}", headers=h_coach).status_code == 403  # sin entrenador asignado


def test_el_cliente_solo_se_ve_a_si_mismo(client: TestClient, poblada):
    h_ana = encabezados(client, "ana@gympro.com")

    assert client.get(f"/api/usuarios/{poblada['ana'].id}", headers=h_ana).status_code == 200
    assert client.get(f"/api/usuarios/{poblada['luis'].id}", headers=h_ana).status_code == 403
    assert client.get(f"/api/usuarios/{poblada['coach'].id}", headers=h_ana).status_code == 403


# ---------------------------------------------------------------------------
# Editar un usuario (administrador)
# ---------------------------------------------------------------------------
def editar(client: TestClient, h: dict, usuario_id: int, **cambios):
    return client.put(f"/api/usuarios/{usuario_id}", json=cambios, headers=h)


def test_editar_cambia_solo_lo_enviado(client: TestClient, h, poblada):
    respuesta = editar(client, h, poblada["ana"].id, telefono="3001234567", direccion="Calle 1")

    assert respuesta.status_code == 200
    ana = respuesta.json()
    assert ana["telefono"] == "3001234567" and ana["direccion"] == "Calle 1"
    assert ana["nombre"] == "Ana Gómez" and ana["documento"] == "1010"  # lo demás quedó igual


def test_enviar_null_deja_un_dato_opcional_vacio(client: TestClient, h, poblada):
    editar(client, h, poblada["ana"].id, telefono="3001234567")

    respuesta = editar(client, h, poblada["ana"].id, telefono=None)

    assert respuesta.json()["telefono"] is None


def test_editar_nombre_y_correo(client: TestClient, h, poblada):
    respuesta = editar(client, h, poblada["ana"].id, nombre="  Ana María Gómez ", email="ANA.MARIA@gympro.com")

    assert respuesta.json()["nombre"] == "Ana María Gómez"
    assert respuesta.json()["email"] == "ana.maria@gympro.com"  # se guarda en minúsculas


def test_los_campos_obligatorios_no_se_pueden_vaciar(client: TestClient, h, poblada):
    for campo in ("nombre", "email", "rol"):
        assert editar(client, h, poblada["ana"].id, **{campo: None}).status_code == 422, campo


def test_no_se_puede_usar_un_correo_o_documento_ya_registrado(client: TestClient, h, poblada):
    correo = editar(client, h, poblada["ana"].id, email="luis@gympro.com")
    documento = editar(client, h, poblada["ana"].id, documento="2020")

    assert correo.status_code == 409 and "correo" in correo.json()["detail"]
    assert documento.status_code == 409 and "documento" in documento.json()["detail"]


def test_guardar_el_mismo_correo_o_documento_no_es_un_duplicado(client: TestClient, h, poblada):
    respuesta = editar(client, h, poblada["ana"].id, email="ana@gympro.com", documento="1010", nombre="Ana G.")

    assert respuesta.status_code == 200


def test_un_cliente_no_puede_quedar_sin_documento(client: TestClient, h, poblada):
    assert editar(client, h, poblada["ana"].id, documento=None).status_code == 400
    assert editar(client, h, poblada["ana"].id, documento="  ").status_code == 400


def test_fecha_de_nacimiento_futura_es_rechazada(client: TestClient, h, poblada):
    manana = (date.today() + timedelta(days=1)).isoformat()

    assert editar(client, h, poblada["ana"].id, fecha_nacimiento=manana).status_code == 422
    assert editar(client, h, poblada["ana"].id, fecha_nacimiento="1990-05-17").status_code == 200


def test_reasignar_el_entrenador_de_un_cliente(client: TestClient, session: Session, h, poblada):
    otro = crear_usuario_directo(session, Rol.ENTRENADOR, "coach2@gympro.com", nombre="Otro Coach")

    respuesta = editar(client, h, poblada["ana"].id, entrenador_id=otro.id)

    assert respuesta.json()["entrenador_id"] == otro.id
    assert editar(client, h, poblada["ana"].id, entrenador_id=None).json()["entrenador_id"] is None  # quitarlo


def test_el_entrenador_asignado_debe_existir_y_estar_activo(client: TestClient, session: Session, h, poblada):
    inactivo = crear_usuario_directo(session, Rol.ENTRENADOR, "inactivo@gympro.com", activo=False)

    assert editar(client, h, poblada["ana"].id, entrenador_id=999).status_code == 400
    assert editar(client, h, poblada["ana"].id, entrenador_id=poblada["luis"].id).status_code == 400  # es cliente
    assert editar(client, h, poblada["ana"].id, entrenador_id=inactivo.id).status_code == 400


def test_solo_los_clientes_pueden_tener_entrenador(client: TestClient, h, poblada):
    assert editar(client, h, poblada["coach"].id, entrenador_id=poblada["coach"].id).status_code == 400


def test_cambiar_un_cliente_a_entrenador_le_quita_codigo_y_entrenador(client: TestClient, h, poblada):
    respuesta = editar(client, h, poblada["ana"].id, rol="entrenador")

    assert respuesta.status_code == 200
    assert respuesta.json()["rol"] == "entrenador"
    assert respuesta.json()["codigo"] is None and respuesta.json()["entrenador_id"] is None


def test_cambiar_un_entrenador_a_cliente_exige_documento_y_le_da_codigo(client: TestClient, session: Session, h, poblada):
    # Un entrenador SIN clientes asignados (el de `poblada` sí tiene uno y no podría cambiar de rol).
    libre = crear_usuario_directo(session, Rol.ENTRENADOR, "libre@gympro.com", nombre="Coach Libre")

    sin_documento = editar(client, h, libre.id, rol="cliente")
    con_documento = editar(client, h, libre.id, rol="cliente", documento="3030")

    assert sin_documento.status_code == 400
    assert con_documento.status_code == 200
    assert con_documento.json()["codigo"] == f"GP-{libre.id:06d}"


def test_no_se_puede_quitar_el_rol_a_un_entrenador_con_clientes(client: TestClient, h, poblada):
    respuesta = editar(client, h, poblada["coach"].id, rol="admin")

    assert respuesta.status_code == 400
    assert "clientes asignados" in respuesta.json()["detail"]


def test_el_admin_no_puede_cambiar_su_propio_rol(client: TestClient, h, admin):
    respuesta = editar(client, h, admin.id, rol="cliente", documento="999")

    assert respuesta.status_code == 400


def test_siempre_debe_quedar_un_administrador_activo(client: TestClient, session: Session, h, admin):
    """Un segundo admin intenta quitarle el rol al único otro admin activo -> permitido; luego ya no se puede."""
    segundo = crear_usuario_directo(session, Rol.ADMIN, "admin2@gympro.com")
    h2 = encabezados(client, segundo.email)

    # admin1 desactivado por admin2: queda admin2 como único activo
    assert client.patch(f"/api/usuarios/{admin.id}/estado", json={"activo": False}, headers=h2).status_code == 200
    # ahora admin2 es el último: nadie puede quitarle el rol (ni él mismo, ni otro)
    assert editar(client, h2, segundo.id, rol="cliente", documento="1").status_code == 400
    assert client.patch(f"/api/usuarios/{segundo.id}/estado", json={"activo": False}, headers=h2).status_code == 400


def test_un_admin_puede_cambiar_el_rol_de_otro_admin_si_queda_otro_activo(client: TestClient, session: Session, h, admin):
    otro = crear_usuario_directo(session, Rol.ADMIN, "admin2@gympro.com")

    assert editar(client, h, otro.id, rol="entrenador").status_code == 200


@pytest.mark.parametrize("rol", [Rol.ENTRENADOR, Rol.CLIENTE])
def test_solo_el_admin_puede_editar(client: TestClient, session: Session, poblada, rol):
    crear_usuario_directo(session, rol, f"x-{rol.value}@gympro.com")

    respuesta = client.put(
        f"/api/usuarios/{poblada['ana'].id}", json={"telefono": "1"}, headers=encabezados(client, f"x-{rol.value}@gympro.com")
    )

    assert respuesta.status_code == 403


def test_editar_un_usuario_inexistente_responde_404(client: TestClient, h):
    assert editar(client, h, 9999, nombre="Nadie").status_code == 404


# ---------------------------------------------------------------------------
# Activar / desactivar
# ---------------------------------------------------------------------------
def cambiar_estado(client: TestClient, h: dict, usuario_id: int, activo: bool):
    return client.patch(f"/api/usuarios/{usuario_id}/estado", json={"activo": activo}, headers=h)


def test_desactivar_quita_el_acceso_y_conserva_al_usuario(client: TestClient, h, poblada):
    assert iniciar_sesion(client, "ana@gympro.com").status_code == 200

    respuesta = cambiar_estado(client, h, poblada["ana"].id, False)

    assert respuesta.status_code == 200 and respuesta.json()["activo"] is False
    assert iniciar_sesion(client, "ana@gympro.com").status_code == 403  # ya no puede entrar
    assert client.get(f"/api/usuarios/{poblada['ana'].id}", headers=h).status_code == 200  # sigue existiendo


def test_la_sesion_ya_iniciada_se_cierra_al_desactivar(client: TestClient, h, poblada):
    h_ana = encabezados(client, "ana@gympro.com")

    cambiar_estado(client, h, poblada["ana"].id, False)

    assert client.get("/api/auth/me", headers=h_ana).status_code == 401


def test_reactivar_devuelve_el_acceso(client: TestClient, h, poblada):
    assert cambiar_estado(client, h, poblada["luis"].id, True).json()["activo"] is True
    assert iniciar_sesion(client, "luis@gympro.com").status_code == 200


def test_el_admin_no_puede_desactivarse_a_si_mismo(client: TestClient, session: Session, h, admin):
    crear_usuario_directo(session, Rol.ADMIN, "admin2@gympro.com")  # hay otro admin, aun así no puede

    assert cambiar_estado(client, h, admin.id, False).status_code == 400


def test_estado_de_un_usuario_inexistente(client: TestClient, h):
    assert cambiar_estado(client, h, 9999, False).status_code == 404


def test_solo_el_admin_cambia_estados(client: TestClient, poblada):
    respuesta = cambiar_estado(client, encabezados(client, "coach@gympro.com"), poblada["ana"].id, False)

    assert respuesta.status_code == 403


# ---------------------------------------------------------------------------
# Contraseña temporal definida por el administrador
# ---------------------------------------------------------------------------
def test_el_admin_define_una_contrasena_temporal(client: TestClient, h, poblada):
    respuesta = client.put(f"/api/usuarios/{poblada['ana'].id}/password", json={"password_nueva": "Temporal2026"}, headers=h)

    assert respuesta.status_code == 200
    assert iniciar_sesion(client, "ana@gympro.com", "Temporal2026").status_code == 200
    assert iniciar_sesion(client, "ana@gympro.com", PASSWORD_PRUEBA).status_code == 401


def test_la_contrasena_temporal_debe_cumplir_las_reglas(client: TestClient, h, poblada):
    respuesta = client.put(f"/api/usuarios/{poblada['ana'].id}/password", json={"password_nueva": "debil"}, headers=h)

    assert respuesta.status_code == 422


def test_solo_el_admin_define_contrasenas_de_otros(client: TestClient, poblada):
    respuesta = client.put(
        f"/api/usuarios/{poblada['luis'].id}/password",
        json={"password_nueva": "Temporal2026"},
        headers=encabezados(client, "ana@gympro.com"),
    )

    assert respuesta.status_code == 403
    assert iniciar_sesion(client, "luis@gympro.com", "Temporal2026").status_code == 401  # no cambió nada


# ---------------------------------------------------------------------------
# Mi perfil: cada persona edita sus datos de contacto
# ---------------------------------------------------------------------------
@pytest.mark.parametrize("email", ["ana@gympro.com", "coach@gympro.com"])
def test_cada_persona_edita_sus_datos_de_contacto(client: TestClient, poblada, email):
    respuesta = client.patch(
        "/api/auth/me",
        json={
            "telefono": " 3001112233 ",
            "direccion": "Carrera 7 # 8-9",
            "fecha_nacimiento": "1995-03-02",
            "contacto_emergencia_nombre": "María Gómez",
            "contacto_emergencia_telefono": "3109998877",
        },
        headers=encabezados(client, email),
    )

    assert respuesta.status_code == 200
    perfil = respuesta.json()
    assert perfil["telefono"] == "3001112233"  # se recortan los espacios
    assert perfil["contacto_emergencia_nombre"] == "María Gómez"
    assert perfil["fecha_nacimiento"] == "1995-03-02"
    assert client.get("/api/auth/me", headers=encabezados(client, email)).json()["direccion"] == "Carrera 7 # 8-9"


def test_mi_perfil_solo_cambia_lo_enviado_y_permite_vaciar(client: TestClient, poblada):
    h_ana = encabezados(client, "ana@gympro.com")
    client.patch("/api/auth/me", json={"telefono": "300", "direccion": "Calle 1"}, headers=h_ana)

    respuesta = client.patch("/api/auth/me", json={"telefono": None}, headers=h_ana)

    assert respuesta.json()["telefono"] is None  # vaciado
    assert respuesta.json()["direccion"] == "Calle 1"  # lo que no se envió, intacto


def test_mi_perfil_ignora_los_campos_que_no_le_corresponden(client: TestClient, poblada):
    """Un cliente que intenta cambiarse el rol, el nombre o el correo: esos campos se descartan."""
    h_ana = encabezados(client, "ana@gympro.com")

    respuesta = client.patch(
        "/api/auth/me",
        json={"rol": "admin", "nombre": "Hacker", "email": "hacker@x.com", "documento": "1", "activo": False, "telefono": "300"},
        headers=h_ana,
    )

    assert respuesta.status_code == 200
    perfil = respuesta.json()
    assert perfil["telefono"] == "300"  # lo permitido sí se guardó
    assert perfil["rol"] == "cliente" and perfil["nombre"] == "Ana Gómez" and perfil["email"] == "ana@gympro.com"
    assert perfil["documento"] == "1010" and perfil["activo"] is True


def test_mi_perfil_rechaza_fechas_futuras(client: TestClient, poblada):
    manana = (date.today() + timedelta(days=1)).isoformat()

    respuesta = client.patch("/api/auth/me", json={"fecha_nacimiento": manana}, headers=encabezados(client, "ana@gympro.com"))

    assert respuesta.status_code == 422


def test_mi_perfil_exige_sesion(client: TestClient):
    assert client.patch("/api/auth/me", json={"telefono": "1"}).status_code == 401
