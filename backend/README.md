# Backend – FastAPI

## Organización
```
backend/
├── app/
│   ├── main.py      → crea la aplicación FastAPI y registra los routers
│   ├── core/        → configuración (.env), conexión a la BD y seguridad (JWT, contraseñas, roles)
│   ├── models/      → tablas de la base de datos (una por archivo: usuario.py, plan.py, pago.py…)
│   ├── schemas/     → qué datos entran y salen de cada endpoint (validación)
│   ├── routers/     → endpoints por módulo (auth.py, usuarios.py, pagos.py, asistencias.py…)
│   ├── services/    → lógica de negocio (estado de membresía, check-in, métricas, reportes, correos)
│   └── jobs/        → tareas programadas diarias (vencimientos y recordatorios)
├── alembic/         → migraciones de la base de datos
├── tests/           → pruebas automáticas (pytest)
├── requirements.txt → librerías de Python
└── .env.example     → plantilla de variables de configuración
```

## Regla para ubicar el código: router → service → model
1. El **router** recibe la petición y verifica el rol.
2. El **service** aplica las reglas de negocio (`docs/reglas-negocio.md`).
3. El **model** lee o guarda en la base de datos.

Así, si preguntan "¿dónde se valida que el cliente esté al día?", la respuesta siempre es un archivo de `services/`.

## Configuración
Copiar `.env.example` como `.env` y completar los valores. **El archivo `.env` nunca se sube a GitHub** (está en `.gitignore`).
