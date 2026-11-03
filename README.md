# GymPro

Sistema web para el gimnasio **GymPro Fitness Center**: gestión de usuarios, membresías, pagos, asistencia con código QR y rutinas asignadas por el entrenador.

> Estado: **Sprint 1 terminado** · **HU01 completa** (modelo de datos, autenticación, interfaz de login, roles y permisos, perfil de usuario) · **HU03 completa** (planes, pagos manuales y estados de membresía, pasarela simulada con comprobante, alertas automáticas de vencimiento). Sigue el Sprint 2.

---

## 1. Qué hace el sistema

| Rol | Qué puede hacer |
|---|---|
| **Administrador** | Crea usuarios (clientes y entrenadores), gestiona planes, membresías y pagos, registra entradas en recepción, ve reportes y el dashboard del negocio. |
| **Entrenador** | Consulta sus clientes, les asigna rutinas y registra sus medidas físicas (peso, estatura). |
| **Cliente** | Ve su código QR, su rutina, su historial de asistencia, su racha, su % de cumplimiento, sus medidas y el estado de su membresía. |

**Regla central:** un cliente solo puede entrar al gimnasio si su membresía está **al día**.

## 2. Stack

| Capa | Tecnología |
|---|---|
| Backend | Python 3.12 · FastAPI · SQLModel · Alembic |
| Base de datos | PostgreSQL 16 (local con Docker; en AWS: Amazon RDS) |
| Autenticación | JWT propio (contraseñas cifradas con argon2) |
| Frontend | React · Vite · Tailwind CSS · shadcn/ui · Recharts |
| Lectura de QR | Cámara del computador de recepción desde el navegador |
| Pagos | Pasarela **simulada** (no se integra una pasarela real) |
| Correos | SMTP (desarrollo) · Amazon SES (si se despliega en AWS) |
| Tareas diarias | APScheduler (vencimientos y recordatorios) |
| Reportes | openpyxl (Excel) · reportlab (PDF) |
| CI/CD | GitHub Actions |

El porqué de cada decisión está en [`docs/decisiones.md`](docs/decisiones.md).

## 3. Estructura del repositorio

```
gympro/
├── backend/           → API en FastAPI (ver backend/README.md)
├── frontend/          → aplicación web en React (ver frontend/README.md)
├── docs/              → decisiones, modelo de datos, API, reglas de negocio y plan de trabajo
├── .github/workflows/ → integración continua (pruebas automáticas en cada push)
├── docker-compose.yml → base de datos PostgreSQL local
└── README.md
```

## 4. Documentación

| Documento | Contenido |
|---|---|
| [`docs/decisiones.md`](docs/decisiones.md) | Decisiones técnicas y su justificación |
| [`docs/modelo-datos.md`](docs/modelo-datos.md) | Tablas, campos y relaciones |
| [`docs/permisos.md`](docs/permisos.md) | Qué puede hacer cada rol y cómo se controla |
| [`docs/reglas-negocio.md`](docs/reglas-negocio.md) | Cómo se calcula el estado de la membresía, la racha, las alertas, etc. |
| [`docs/api.md`](docs/api.md) | Endpoints por módulo y qué rol puede usarlos |
| [`docs/guia-instalacion.md`](docs/guia-instalacion.md) | Instalación paso a paso en Windows |
| [`docs/plan-trabajo.md`](docs/plan-trabajo.md) | División del trabajo entre los 3 integrantes y flujo de Git |

## 5. Requisitos para desarrollar (Windows)

- **Git** y una cuenta de GitHub
- **Python 3.12**
- **Node.js 22 LTS** o superior
- **Docker Desktop** (con WSL 2), solo para levantar PostgreSQL. Si el computador no lo soporta, se puede instalar PostgreSQL 16 directamente.
- Editor recomendado: **VS Code**

Instalación paso a paso: [`docs/guia-instalacion.md`](docs/guia-instalacion.md).
