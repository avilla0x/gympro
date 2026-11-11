"""Esquemas de asistencia (check-in, historial y constancia)."""
from datetime import date, datetime

from pydantic import BaseModel, Field

from app.models import MetodoCheckin


class CheckinQR(BaseModel):
    codigo: str = Field(min_length=1, max_length=100, description="Texto leído del QR del gimnasio")


class CheckinManual(BaseModel):
    usuario_id: int


class AsistenciaLeer(BaseModel):
    id: int
    usuario_id: int
    usuario_nombre: str
    usuario_codigo: str | None
    fecha: date
    registrada_en: datetime
    metodo: MetodoCheckin


class QRGimnasio(BaseModel):
    codigo: str  # lo que contiene el QR
    url: str  # enlace que abre el check-in en el celular (es lo que se codifica en la imagen)


class MetricasLeer(BaseModel):
    racha_actual: int
    mejor_racha: int
    dias_asistidos_mes: int
    dias_transcurridos_mes: int
    dias_en_el_mes: int
    cumplimiento_mes: int  # porcentaje 0-100
    entradas_mes: int
    total_dias_asistidos: int
    ultima_asistencia: date | None
    dias_sin_asistir: int | None
