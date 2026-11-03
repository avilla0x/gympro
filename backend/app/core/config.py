"""
Configuración de la aplicación.

Todos los valores que cambian según el equipo o el ambiente (la dirección de la
base de datos, claves, etc.) se leen del archivo `.env`. Así el código nunca
contiene claves y el mismo código funciona en el computador de cada integrante
y, más adelante, en AWS.
"""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # --- Base de datos -----------------------------------------------------
    # Formato: postgresql+psycopg://usuario:clave@servidor:puerto/nombre_bd
    # Es obligatoria: si falta en el .env, la aplicación no arranca.
    database_url: str

    # --- Seguridad (tokens JWT) -------------------------------------------
    # Clave con la que se firman los tokens. Quien la conozca puede fabricar
    # tokens falsos, por eso nunca se sube a GitHub (solo vive en el .env).
    secret_key: str
    # Cuánto dura una sesión iniciada (en minutos). 480 = 8 horas.
    token_expira_minutos: int = 480
    # Cuánto dura el enlace de "recuperar contraseña" (en minutos).
    reset_expira_minutos: int = 30

    # --- Administrador de demostración (decisión D11 de docs/decisiones.md) --
    # Se crea automáticamente al arrancar la API si todavía no existe.
    admin_email: str
    admin_password: str
    admin_nombre: str = "Administrador GymPro"

    # --- Reglas de negocio -------------------------------------------------
    # Zona horaria del gimnasio. TODAS las fechas del negocio (vencimientos, "hoy"...) se calculan con ella.
    zona_horaria: str = "America/Bogota"
    # Cuántos días antes del vencimiento una membresía pasa a estado "por vencer" (RN1).
    dias_por_vencer: int = 5
    # Cuántos días antes del vencimiento se le avisa al cliente (RN5).
    dias_aviso_vencimiento: int = 3
    # Alertas automáticas: la tarea diaria corre a esta hora (hora de Colombia). En las pruebas se apaga.
    alertas_activas: bool = True
    hora_alertas: int = 6

    # --- Frontend ----------------------------------------------------------
    # Dirección desde la que se permite llamar a la API (CORS) y a la que
    # apuntan los enlaces de recuperación de contraseña.
    frontend_url: str = "http://localhost:5173"

    # Lee el archivo .env (ubicado en la carpeta backend/). Las variables del
    # .env que todavía no se usan (correo, metas, etc.) se ignoran sin error.
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


# Se crea una sola vez; el resto del código importa `settings`.
settings = Settings()
