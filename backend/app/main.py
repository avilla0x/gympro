"""
Punto de entrada de la API de GymPro.

Para ejecutarla (desde la carpeta backend/):
    uvicorn app.main:app --reload
Documentación automática e interactiva: http://127.0.0.1:8000/docs
"""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlmodel import Session

from app.core.config import settings
from app.core.database import engine
from app.core.errores import ErrorDeNegocio
from app.core.tareas import iniciar_programador
from app.routers import asistencias, auth, avisos, pagos, planes, salud, usuarios
from app.services.usuarios import asegurar_admin_demo

_registro = logging.getLogger("uvicorn.error")


@asynccontextmanager
async def ciclo_de_vida(_app: FastAPI):
    """Se ejecuta una vez al encender la API (antes de `yield`) y una vez al apagarla (después)."""
    try:
        with Session(engine) as session:
            if asegurar_admin_demo(session):
                _registro.info("Administrador de demostración creado: %s", settings.admin_email)
    except Exception as error:
        # El error más común: todavía no se aplicaron las migraciones.
        _registro.error(
            "No se pudo preparar el administrador de demostración. "
            "¿Ejecutaste 'alembic upgrade head' y la base de datos está encendida? Detalle: %s",
            error,
        )
    programador = iniciar_programador()  # tarea diaria de avisos de vencimiento
    yield
    if programador:
        programador.shutdown(wait=False)


app = FastAPI(
    title="GymPro API",
    description="Gestión de usuarios, membresías, pagos y asistencia del gimnasio GymPro.",
    version="0.1.0",
    lifespan=ciclo_de_vida,
)

# CORS: el navegador solo deja que el frontend (otra dirección y puerto) llame a la API
# si la API lo autoriza explícitamente. Aquí autorizamos únicamente a nuestro frontend.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(ErrorDeNegocio)
async def manejar_error_de_negocio(_peticion: Request, error: ErrorDeNegocio):
    """Convierte los errores de reglas de negocio (lanzados en los services) en una respuesta HTTP."""
    return JSONResponse(status_code=error.codigo_http, content={"detail": error.mensaje})


# Todas las rutas empiezan por /api (ver docs/api.md). Cada módulo nuevo se registra aquí.
app.include_router(salud.router, prefix="/api")
app.include_router(auth.router, prefix="/api")
app.include_router(usuarios.router, prefix="/api")
app.include_router(planes.router, prefix="/api")
app.include_router(pagos.router, prefix="/api")
app.include_router(avisos.router, prefix="/api")
app.include_router(asistencias.router, prefix="/api")
