# Roles y permisos

Hay **3 roles**: **Administrador**, **Entrenador** y **Cliente**. Cada usuario tiene exactamente uno.

## Dos niveles de control

| Nivel | Qué responde | Dónde está | ¿Se puede saltar? |
|---|---|---|---|
| **Backend (el real)** | ¿Este rol puede usar este endpoint? ¿Esta persona puede ver estos datos? | `app/core/dependencias.py` y `app/services/permisos.py` | **No.** Se revisa en cada petición, aunque alguien llame a la API sin usar la pantalla. |
| **Frontend (comodidad)** | ¿Qué secciones se muestran en el menú? ¿Qué pantallas se abren? | `src/lib/menu.js` y `src/routes/RutaPorRol.jsx` | **Sí**, un usuario técnico puede manipular el navegador. Por eso nunca decide la seguridad: solo evita mostrar lo que no corresponde. |

> **Regla de oro:** todo permiso que se agregue en el frontend **debe existir también en el backend**.

## Cómo decide el backend

1. **Sin sesión** (sin token o token inválido/vencido) → **401**: "no sabemos quién eres".
2. **Con sesión pero sin permiso** → **403**: "sabemos quién eres, pero no puedes hacer esto".
3. El **rol se lee de la base de datos en cada petición**, no del token. Si a alguien le cambian el rol o lo desactivan, el cambio vale de inmediato, aunque su token siga vigente. (Tampoco sirve un token que "diga" ser administrador: lo que cuenta es lo guardado en la base de datos.)

### Atajos para proteger un endpoint (`app/core/dependencias.py`)
```python
Depends(solo_admin)            # solo administrador
Depends(admin_o_entrenador)    # administrador o entrenador
Depends(solo_cliente)          # solo cliente
Depends(get_usuario_actual)    # cualquier persona con sesión
Depends(requiere_roles(...))   # cualquier otra combinación
```

### Reglas de pertenencia (`app/services/permisos.py`)
A veces un rol puede usar el endpoint, pero solo sobre SUS datos. `puede_ver_usuario(actual, objetivo)`:

| Quién consulta | A quién puede ver |
|---|---|
| Administrador | A todos |
| Entrenador | A sí mismo y **solo a los clientes que tiene asignados** |
| Cliente | Solo a sí mismo |

## Qué puede hacer cada rol

Leyenda: ✅ puede · — no puede · 🔒 solo lo suyo · ⏳ aún no construido (planeado)

### HU01 · Usuarios y acceso
| Capacidad | Admin | Entrenador | Cliente |
|---|:--:|:--:|:--:|
| Iniciar sesión, cerrar sesión, recuperar contraseña | ✅ | ✅ | ✅ |
| Cambiar su propia contraseña | ✅ | ✅ | ✅ |
| Ver sus propios datos (`/auth/me`) | ✅ | ✅ | ✅ |
| Editar sus datos de **contacto** (teléfono, dirección, fecha de nacimiento, contacto de emergencia) | ✅ | ✅ | ✅ |
| Editar su nombre, correo, documento o rol | — | — | — |
| **Crear** usuarios (clientes, entrenadores, administradores) | ✅ | — | — |
| **Listar y buscar** usuarios | ✅ | — | — |
| **Ver el detalle** de un usuario | ✅ todos | ✅ 🔒 sus clientes | ✅ 🔒 él mismo |
| **Editar** cualquier dato de un usuario (incluye rol y entrenador asignado) | ✅ | — | — |
| **Activar / desactivar** usuarios | ✅ | — | — |
| **Definir una contraseña temporal** a otra persona | ✅ | — | — |

> El administrador **no puede** cambiarse su propio rol ni desactivarse a sí mismo, y siempre debe quedar al menos un administrador activo (RN13).

### HU03 · Avisos de vencimiento
| Capacidad | Admin | Entrenador | Cliente |
|---|:--:|:--:|:--:|
| Ver y marcar como leídos **sus** avisos | ✅ 🔒 | — | ✅ 🔒 |
| Revisar vencimientos a mano (`POST /avisos/generar`) | ✅ | — | — |
| Ver clientes por vencer y en mora (`GET /vencimientos`) | ✅ | — | — |

### HU02 · Asistencia
| Capacidad | Admin | Entrenador | Cliente |
|---|:--:|:--:|:--:|
| Registrar su entrada con el QR (`POST /asistencias/checkin`) | — | — | ✅ |
| Registrar la entrada de un cliente a mano (`POST /asistencias/manual`) | ✅ | — | — |
| Ver el QR del gimnasio (`GET /asistencias/qr`) | ✅ | — | — |
| Historial de **todos** con filtros (`GET /asistencias`) | ✅ | — | — |
| Historial y constancia de un cliente | ✅ | ✅ 🔒 sus clientes | ✅ 🔒 el suyo |
| Pantalla «Mi progreso» (`/mi-progreso`) | — | — | ✅ |

### Otros módulos (planeados, ver `docs/api.md`)
| Módulo | Admin | Entrenador | Cliente |
|---|:--:|:--:|:--:|
| Planes: ver la lista y los precios | ✅ | ✅ | ✅ |
| Planes: cambiar el precio | ✅ | — | — |
| Pagos y membresías | ✅ registra, lista, cobra por pasarela y anula pagos · ✅ ve todos los estados | ✅ 🔒 ve la membresía y pagos de sus clientes | ✅ 🔒 ve la suya y sus pagos · ✅ 🔒 paga con la pasarela y ve sus comprobantes |
| Check-in (recepción) | ⏳ | — | — |
| Historial y métricas de asistencia | ✅ todos | ✅ 🔒 sus clientes | ✅ 🔒 los suyos |
| Rutinas | ⏳ consulta | ⏳ crea y asigna (sus clientes) | ⏳ 🔒 la suya |
| Medidas físicas | ⏳ consulta | ⏳ registra (sus clientes) | ⏳ 🔒 las suyas |
| Reportes y dashboard administrativo | ⏳ | — | — |

## Menú de cada rol (frontend)
| Rol | Secciones |
|---|---|
| Administrador | Inicio · Dashboard · Recepción · Usuarios · Planes · Pagos · Reportes · Mi perfil |
| Entrenador | Inicio · Mis clientes · Rutinas · Medidas · Mi perfil |
| Cliente | Inicio · Mi progreso · Mi historial · Mi rutina · Pagar membresía · Mi perfil |

Las secciones cuya pantalla todavía no existe se muestran **deshabilitadas con la etiqueta "Pronto"**.

## Cómo agregar una pantalla o endpoint nuevo (para cada HU)
1. **Backend:** proteger el endpoint con el atajo que corresponda y, si hay datos "propios", usar `exigir_ver_usuario` u otra regla en `services/permisos.py`.
2. **Backend:** escribir pruebas para cada rol (`tests/test_permisos.py` muestra cómo, con `@pytest.mark.parametrize`).
3. **Frontend:** en `src/lib/menu.js`, cambiar `disponible: false` por `true` en el ítem.
4. **Frontend:** en `src/App.jsx`, agregar la ruta dentro de `<RutaPorRol roles={[...]}>` con **los mismos roles** que el ítem del menú.
5. **Documentar** el cambio en la tabla de este archivo.
