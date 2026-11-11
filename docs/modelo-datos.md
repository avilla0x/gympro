# Modelo de datos

Base de datos: **PostgreSQL**. Todas las tablas tienen `id` (entero autoincremental) y `creado_en` (fecha y hora de creación).

## Diagrama entidad-relación

### Lo que ya existe (Sprint 1)
Tablas creadas por las migraciones de Alembic (`usuario`, `plan`, `pago`, `membresia`, `notificacion` y `asistencia`). `asistencia` tiene dos relaciones con `usuario`: el cliente que entró y quien registró la entrada (el mismo cliente o el administrador). Cada pago aprobado genera exactamente una membresía (`pago_id` es único).

```mermaid
erDiagram
    USUARIO |o--o{ USUARIO : "entrena a"
    USUARIO ||--o{ PAGO : "paga"
    USUARIO ||--o{ MEMBRESIA : "tiene"
    USUARIO ||--o{ NOTIFICACION : "recibe"
    USUARIO ||--o{ ASISTENCIA : "registra entradas"
    PLAN ||--o{ PAGO : "se cobra en"
    PLAN ||--o{ MEMBRESIA : "define"
    PAGO ||--o| MEMBRESIA : "genera"

    USUARIO {
        int id PK
        string email UK
        string rol
        boolean activo
        string documento UK
        int entrenador_id FK
    }
    PLAN {
        int id PK
        string nombre UK
        int duracion_dias
        int precio
    }
    PAGO {
        int id PK
        int usuario_id FK
        int plan_id FK
        int monto
        string metodo
        string estado
        int registrado_por_id FK
        int anulado_por_id FK
    }
    MEMBRESIA {
        int id PK
        int usuario_id FK
        int plan_id FK
        int pago_id FK, UK
        date fecha_inicio
        date fecha_fin
    }
    NOTIFICACION {
        int id PK
        int usuario_id FK
        string tipo
        date referencia
        boolean leida
    }
    ASISTENCIA {
        int id PK
        int usuario_id FK
        date fecha
        datetime registrada_en
        string metodo
        int registrada_por_id FK
    }
```

### Lo planeado (Sprint 2 en adelante)
Estas tablas todavía no existen; se crearán con cada historia de usuario.

```mermaid
erDiagram
    USUARIO ||--o{ MEDIDA_CORPORAL : "tiene"
    USUARIO ||--o{ RUTINA : "recibe (cliente)"
    USUARIO ||--o{ RUTINA : "crea (entrenador)"
    RUTINA ||--o{ EJERCICIO_RUTINA : "contiene"
```

### Cómo se leen las relaciones
Los símbolos de los extremos dicen **cuántas** filas hay de ese lado: `||` exactamente una · `|o` cero o una · `o{` cero o muchas.

| Relación | Cardinalidad | Se lee así |
|---|---|---|
| usuario → usuario (`entrenador_id`) | 1 : N (opcional) | Un entrenador tiene muchos clientes; un cliente tiene como máximo un entrenador |
| usuario → pago (`usuario_id`) | 1 : N | Un cliente tiene muchos pagos; cada pago es de un solo cliente |
| usuario → membresia (`usuario_id`) | 1 : N | Un cliente tiene muchas membresías a lo largo del tiempo |
| usuario → notificacion (`usuario_id`) | 1 : N | Una persona recibe muchos avisos; cada aviso es de una sola persona |
| plan → pago (`plan_id`) | 1 : N | Un plan se paga muchas veces; cada pago es de un solo plan |
| plan → membresia (`plan_id`) | 1 : N | Un plan define muchas membresías |
| pago → membresia (`pago_id`, único) | 1 : 0..1 | Un pago aprobado genera una membresía; un pago pendiente, rechazado o anulado no genera ninguna |

Además, `pago.registrado_por_id` y `pago.anulado_por_id` apuntan a `usuario` (quién registró y quién anuló el pago); no se dibujan para no saturar el diagrama.

**No hay relaciones de muchos a muchos directas.** Conceptualmente *usuario ↔ plan* sí lo es (un cliente ha tenido varios planes y un plan lo tienen muchos clientes), pero se resuelve con tablas intermedias (`pago` y `membresia`), que además guardan datos propios: monto, método, fechas.

## Tablas

### usuario
| Campo | Tipo | Notas |
|---|---|---|
| nombre | texto | |
| email | texto, único | se usa para iniciar sesión |
| password_hash | texto | contraseña cifrada con argon2 |
| rol | `admin` · `entrenador` · `cliente` | |
| documento | texto, único, opcional | cédula o documento de identidad |
| telefono | texto, opcional | |
| fecha_nacimiento | fecha, opcional | |
| direccion | texto, opcional | dirección de residencia |
| contacto_emergencia_nombre | texto, opcional | persona a quien avisar en un accidente |
| contacto_emergencia_telefono | texto, opcional | |
| codigo | texto, único | solo clientes, ej. `GP-000123`; es lo que contiene el QR |
| entrenador_id | → usuario, opcional | entrenador asignado al cliente |
| activo | booleano | un usuario inactivo no puede iniciar sesión ni hacer check-in |

### plan
| Campo | Tipo | Notas |
|---|---|---|
| nombre | texto, único | Mensual, Trimestral, Anual |
| duracion_dias | entero | 30, 90, 365 |
| precio | entero | pesos colombianos **sin decimales** (90000 = $90.000) |

> Son **tres planes fijos** que carga la migración (decisión D18). No hay campo `activo`: no se crean ni se desactivan planes; el administrador solo cambia el precio. Cada pago guarda su propio monto, así que un cambio de precio no altera pagos anteriores.

### membresia
Se genera sola a partir de los pagos aprobados (RN2); no se edita a mano.
| Campo | Tipo | Notas |
|---|---|---|
| usuario_id | → usuario | cliente |
| plan_id | → plan | |
| pago_id | → pago, único | el pago que la originó (uno a uno) |
| fecha_inicio | fecha | inclusiva |
| fecha_fin | fecha | inclusiva: inicio + duración − 1 día |

### pago
Nunca se borra: un error se corrige anulándolo.
| Campo | Tipo | Notas |
|---|---|---|
| usuario_id | → usuario | cliente que recibe la membresía |
| plan_id | → plan | |
| monto | entero | pesos; copia del precio del plan al momento del pago (RN16) |
| metodo | `efectivo` · `transferencia` · `pasarela` | |
| estado | `pendiente` · `aprobado` · `rechazado` · `anulado` | los manuales nacen aprobados |
| referencia | texto, opcional | ej. número de transferencia |
| fecha | fecha | día (Colombia) en que se creó |
| creado_en / aprobado_en | fecha y hora (UTC) | de `aprobado_en` sale el inicio de la membresía |
| registrado_por_id | → usuario | administrador (o cliente en la pasarela) |
| anulado_en / anulado_por_id / motivo_anulacion | opcionales | se llenan al anular (RN2b) |

### asistencia
Una fila por **entrada** al gimnasio (un cliente puede tener varias el mismo día).
| Campo | Tipo | Notas |
|---|---|---|
| usuario_id | → usuario | el cliente que entró |
| fecha | fecha | el día de la entrada **en Colombia** (índice junto con `usuario_id`) |
| registrada_en | fecha y hora (UTC) | momento exacto |
| metodo | `qr` · `manual` | escaneo del cliente o registro de recepción |
| registrada_por_id | → usuario | el mismo cliente (QR) o el administrador (manual) |

### medida_corporal
| Campo | Tipo | Notas |
|---|---|---|
| usuario_id | → usuario | cliente |
| fecha | fecha | |
| peso_kg | decimal | |
| estatura_cm | decimal | |
| grasa_pct | decimal, opcional | |
| registrado_por | → usuario | entrenador |

### rutina
| Campo | Tipo | Notas |
|---|---|---|
| cliente_id | → usuario | |
| entrenador_id | → usuario | |
| nombre | texto | ej. "Fuerza – principiante" |
| objetivo | texto, opcional | |
| fecha_inicio | fecha | |
| activa | booleano | un cliente tiene **una sola** rutina activa |

### ejercicio_rutina
| Campo | Tipo | Notas |
|---|---|---|
| rutina_id | → rutina | |
| dia | `lunes` … `domingo` | |
| nombre | texto | ej. "Sentadilla" |
| series | entero | |
| repeticiones | texto | texto para permitir "10-12" |
| descanso_seg | entero, opcional | |
| notas | texto, opcional | |
| orden | entero | orden dentro del día |

### notificacion
Aviso dentro del sistema para una persona. Único por (usuario, tipo, referencia): así la tarea diaria no repite avisos.
| Campo | Tipo | Notas |
|---|---|---|
| usuario_id | → usuario | a quién se le avisa |
| tipo | `por_vencer` · `vence_hoy` · `resumen_admin` · `recordatorio_asistencia` | |
| titulo / mensaje | texto | |
| referencia | fecha | vencimiento que origina el aviso (clientes) o el día del resumen (administrador) |
| leida | sí/no | |
| creado_en | fecha y hora (UTC) | |

## Datos que NO se guardan (se calculan)
- **Estado de la membresía** (al día, por vencer, en mora)
- **Racha** y **% de cumplimiento** de asistencia
- **Indicadores del dashboard**

Se calculan al consultarlos para que nunca queden desactualizados. Las reglas están en `reglas-negocio.md`.
