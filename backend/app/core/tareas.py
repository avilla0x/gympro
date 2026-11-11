"""
Tareas programadas: cosas que el sistema hace solo, sin que nadie pulse nada.

Hoy hay una: revisar cada día los vencimientos y crear los avisos (RN5) y los recordatorios de asistencia (RN6). Se usa APScheduler, que corre
dentro del mismo proceso de la API (no necesita nada instalado aparte). Si la API está apagada a la hora
programada, al encenderla se hace una revisión inmediata; como la revisión no repite avisos, no hay problema.
"""
import logging

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from sqlmodel import Session

from app.core.config import settings
from app.core.database import engine
from app.core.tiempo import ZONA
from app.services.avisos import generar_avisos_vencimiento
from app.services.recordatorios import generar_recordatorios_asistencia

_registro = logging.getLogger("uvicorn.error")


def revisar_vencimientos() -> None:
    """La tarea diaria: abre su propia sesión de base de datos y genera los avisos de hoy."""
    try:
        with Session(engine) as session:
            creados = generar_avisos_vencimiento(session)
            creados["recordatorio_asistencia"] = generar_recordatorios_asistencia(session)
        _registro.info("Revisión de vencimientos terminada. Avisos creados: %s", creados)
    except Exception as error:  # una falla aquí nunca debe tumbar la API
        _registro.error("La revisión de vencimientos falló: %s", error)


def iniciar_programador() -> BackgroundScheduler | None:
    """Arranca la tarea diaria. Devuelve el programador (para apagarlo), o None si las alertas están apagadas."""
    if not settings.alertas_activas:
        _registro.info("Alertas automáticas desactivadas (ALERTAS_ACTIVAS=false).")
        return None
    programador = BackgroundScheduler(timezone=ZONA)
    programador.add_job(
        revisar_vencimientos, CronTrigger(hour=settings.hora_alertas, minute=0, timezone=ZONA), id="vencimientos", replace_existing=True
    )
    programador.add_job(revisar_vencimientos, id="vencimientos-arranque")  # una revisión al encender
    programador.start()
    _registro.info("Alertas automáticas activas: cada día a las %02d:00 (hora de Colombia).", settings.hora_alertas)
    return programador
