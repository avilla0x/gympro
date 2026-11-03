# Guía de instalación en Windows (paso a paso)

Esta guía deja el proyecto funcionando en tu computador. Hay que hacerla **una vez por integrante**.

## 1. Instalar Python 3.12
1. Descargar desde https://www.python.org/downloads/ (versión 3.12 o superior).
2. En el instalador, **marcar la casilla "Add python.exe to PATH"** antes de pulsar *Install Now*.
3. Abrir **PowerShell** y comprobar: `python --version`

## 2. Instalar Docker Desktop (para la base de datos)
1. Descargar desde https://www.docker.com/products/docker-desktop/ e instalar. Dejar marcada la opción **WSL 2** si la ofrece.
2. Reiniciar el computador cuando lo pida.
3. Abrir **Docker Desktop** y esperar a que el icono de la ballena (barra de tareas) quede estable, sin animación.
4. En PowerShell comprobar: `docker --version`

> Si Docker pide **virtualización**: hay que activarla en la BIOS del computador (opción llamada *Virtualization Technology*, *SVM* o *VT-x*). Si el computador no la soporta, se instala PostgreSQL 16 directamente (paso 2-B).

### 2-B. Alternativa sin Docker: PostgreSQL instalado
1. Descargar PostgreSQL 16 desde https://www.postgresql.org/download/windows/ e instalar (puerto `5432`; anotar la contraseña del usuario `postgres`).
2. **Ojo:** el PostgreSQL de tu trabajo probablemente ya usa el puerto 5432 y su usuario `postgres`. No hace falta tocarlo: crea solo el usuario y la base de GymPro con *SQL Shell (psql)*:
   ```sql
   CREATE USER gympro WITH PASSWORD 'gympro';
   CREATE DATABASE gympro OWNER gympro;
   ```
3. En este caso la base de datos está en el puerto **5432** (no en 5440), así que en `backend\.env` usa:
   `DATABASE_URL=postgresql+psycopg://gympro:gympro@localhost:5432/gympro`

## 3. Levantar la base de datos (con Docker)
En PowerShell, dentro de la carpeta `gympro`:
```powershell
docker compose up -d
```
Comprobar que está encendida: `docker ps` debe mostrar un contenedor llamado `gympro-db`.

- Apagarla: `docker compose stop` · Encenderla de nuevo: `docker compose start`
- **Borrar todos los datos** y empezar de cero: `docker compose down -v`

### ¿Y si el puerto está ocupado? (PostgreSQL de otro proyecto u otros contenedores)
GymPro usa el puerto **5440** de tu computador, distinto del 5432 habitual, para no chocar con otro PostgreSQL instalado ni con otros contenedores.

1. **Comprobar que el 5440 está libre** (PowerShell):
   ```powershell
   netstat -ano | findstr :5440
   ```
   Si no muestra nada, está libre. Para ver qué puertos usan tus otros contenedores: `docker ps` (columna PORTS).
2. **Si está ocupado**, elige otro (ej. `5441`) y cámbialo en **dos** lugares, siempre el MISMO número:
   - `docker-compose.yml`: `"5441:5432"` (cambia solo el primer número; el 5432 de la derecha es el interior del contenedor y no se toca).
   - `backend\.env`: `DATABASE_URL=postgresql+psycopg://gympro:gympro@localhost:5441/gympro`
3. Aplicar el cambio: `docker compose down` y luego `docker compose up -d`.

> Si ya habías levantado el contenedor con otro puerto, el cambio de puerto no borra tus datos. Para empezar con la base vacía usa `docker compose down -v`.

## 4. Preparar el backend
En PowerShell, dentro de la carpeta `gympro\backend`:
```powershell
python -m venv .venv                 # crea un entorno aislado de Python
.venv\Scripts\Activate.ps1           # lo activa (verás (.venv) al inicio de la línea)
pip install -r requirements.txt      # instala las librerías
copy .env.example .env               # crea tu archivo de configuración
alembic upgrade head                 # crea las tablas en la base de datos
uvicorn app.main:app --reload        # enciende la API
```
- Si PowerShell dice que *la ejecución de scripts está deshabilitada*, ejecutar una vez: `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` y repetir la activación.
- Cada vez que abras una terminal nueva, hay que volver a activar el entorno: `.venv\Scripts\Activate.ps1`.

## 5. Comprobar que funciona
- Abrir http://127.0.0.1:8000/api/salud → debe mostrar `{"estado":"ok","base_de_datos":"ok"}`
- Abrir http://127.0.0.1:8000/docs → documentación interactiva de la API.
- **Administrador de demostración** (se crea solo la primera vez que enciendes la API, con los datos de tu `.env`):
  correo `admin@gympro.com` · contraseña `admin1234`.
  Para probar en `/docs`: pulsa **Authorize**, escribe esos datos y ya puedes usar los endpoints protegidos.
- Para generar una `SECRET_KEY` propia: `python -c "import secrets; print(secrets.token_hex(32))"`

## 6. Ejecutar las pruebas automáticas
En `gympro\backend`, con el entorno activado:
```powershell
pytest
```

## 7. Frontend (pantalla de login)
1. **Instalar Node.js 22 LTS** desde https://nodejs.org (instalador "LTS"). Comprobar: `node --version` (debe ser v22 o superior).
2. Con la **API encendida** (paso 4), abrir **otra terminal** y, desde `gympro\frontend`:
   ```bash
   npm install
   npm run dev
   ```
3. Abrir http://localhost:5173 e iniciar sesión con `admin@gympro.com` / `admin1234`.
4. Para ejecutar las pruebas del frontend: `npm test`.

> **Importante:** el frontend usa el puerto **5173** y la API el **8000**. Si el 5173 está ocupado, `npm run dev` lo dirá en vez de cambiar de puerto en silencio (así el backend sigue permitiendo la conexión).
> **Recuperar contraseña:** como todavía no se envían correos, el enlace aparece en la terminal donde corre `uvicorn`. Cópialo y ábrelo en el navegador.

## 8. (Opcional) Ver la base de datos con una herramienta visual
Instalar **DBeaver** (https://dbeaver.io) y crear una conexión PostgreSQL con: servidor `localhost`, puerto `5440`, base `gympro`, usuario `gympro`, contraseña `gympro`.

## Cuando alguien cambia las tablas
Si un compañero agrega una migración nueva, después de hacer `git pull` ejecutar: `alembic upgrade head`.
