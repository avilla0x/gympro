"""
Endpoint de salud: sirve para comprobar que la API y la base de datos responden.
Se usa al instalar el proyecto y, más adelante, para monitorear el despliegue.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlmodel import Session

from app.core.database import get_session

router = APIRouter(tags=["Salud"])


@router.get("/salud")
def comprobar_salud(session: Session = Depends(get_session)) -> dict:
    """Devuelve ok si la API está viva y puede consultar la base de datos."""
    try:
        session.exec(text("SELECT 1"))  # consulta mínima para probar la conexión
    except Exception:
        # 503 = servicio no disponible: la API corre pero no alcanza la base de datos
        raise HTTPException(status_code=503, detail="No hay conexión con la base de datos")
    return {"estado": "ok", "base_de_datos": "ok"}
