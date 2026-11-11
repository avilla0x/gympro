"""Esquemas de avisos (notificaciones) y seguimiento de vencimientos."""
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict

from app.models import TipoAviso
from app.services.membresias import EstadoMembresia


class AvisoLeer(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    tipo: TipoAviso
    titulo: str
    mensaje: str
    referencia: date
    leida: bool
    creado_en: datetime


class ListaAvisos(BaseModel):
    no_leidas: int
    items: list[AvisoLeer]


class SeguimientoLeer(BaseModel):
    usuario_id: int
    nombre: str
    telefono: str | None
    email: str
    estado: EstadoMembresia
    fecha_vencimiento: date
    dias_restantes: int


class ResultadoGeneracion(BaseModel):
    por_vencer: int
    vence_hoy: int
    resumen_admin: int
    recordatorio_asistencia: int = 0
