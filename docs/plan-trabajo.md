# Plan de trabajo del equipo (3 integrantes)

## 1. Cómo se reparte el trabajo
Cada integrante es dueño de **módulos completos** (backend + pantallas), no de "solo backend" o "solo frontend". Así nadie queda bloqueado esperando a otro y cada uno puede explicar su parte de punta a punta.

| Integrante | Módulos | Responsabilidad transversal |
|---|---|---|
| **Dev 1** | Autenticación, usuarios, roles, medidas físicas · Asistencia y check-in QR | Configuración base del backend (conexión a BD, seguridad, Alembic) |
| **Dev 2** | Planes, membresías, pagos y pasarela simulada · Notificaciones y tareas diarias · Reportes | Pruebas automáticas y CI/CD (HU09) |
| **Dev 3** | Rutinas (entrenador) · Dashboard del cliente · Dashboard administrativo | Configuración base del frontend y **sistema de diseño** (colores, tipografía, componentes, modo oscuro) |

## 2. Orden de construcción (según el roadmap)
| Sprint | Dev 1 | Dev 2 | Dev 3 |
|---|---|---|---|
| **1** | Base backend + login JWT + usuarios y roles | Planes, membresías, pagos, pasarela simulada | Base frontend, diseño, layout por rol, pantallas de login y usuarios |
| **2** | Check-in QR + historial de asistencia | Alertas de vencimiento + recordatorios (tarea diaria) | Rutinas del entrenador + métricas y dashboard del cliente |
| **3** | Medidas físicas + apoyo en pruebas | Reportes Excel/PDF + CI/CD + pruebas | Dashboard administrativo + pulido visual |

> **Pendiente:** el roadmap actual no incluye las rutinas del entrenador ni las medidas físicas, y menciona Amazon Cognito. Hay que actualizarlo para que coincida con este plan.

## 3. Flujo de Git
- `main`: versión estable, solo recibe cambios desde `develop` al cierre de cada sprint.
- `develop`: integración del trabajo del equipo.
- Ramas por tarea: `feature/<modulo>-<descripcion>`, ej. `feature/pagos-pasarela-simulada`.
- Todo cambio entra a `develop` por **Pull Request** con la revisión de al menos un compañero.
- Mensajes de commit en español y en presente: `agrega endpoint de check-in`, `corrige cálculo de racha`.

## 4. Definición de terminado (DoD)
Una subtarea está terminada cuando:
1. El código está en `develop` mediante un Pull Request aprobado.
2. Tiene al menos una prueba automática de su lógica principal.
3. El endpoint aparece documentado en `/docs` de FastAPI.
4. La pantalla funciona con datos reales del backend.
5. Se mostró al equipo en la Daily o la Review.

## 5. Ceremonias Scrum
| Ceremonia | Cuándo | Duración |
|---|---|---|
| Sprint Planning | Primer día del sprint | 1 h |
| Daily | Todos los días | 15 min |
| Sprint Review | Último día del sprint | 1 h |
| Retrospectiva | Último día del sprint, después de la Review | 30 min |
