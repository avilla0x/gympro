# API (endpoints planeados)

Todas las rutas empiezan por `/api`. Salvo el login y la recuperación de contraseña, todas requieren el token JWT en el encabezado `Authorization: Bearer <token>`.

✅ = ya construido.

Roles: **A** = administrador · **E** = entrenador · **C** = cliente

## Autenticación (HU01)
| Método | Ruta | Rol | Qué hace |
|---|---|---|---|
| POST | `/auth/login` | todos | Recibe un **formulario** con `username` (el correo) y `password`; devuelve el token y los datos del usuario ✅ |
| GET | `/auth/me` | todos | Datos del usuario que inició sesión ✅ |
| POST | `/auth/recuperar` | todos | Genera el enlace para cambiar la contraseña; por ahora se muestra en la consola del servidor ✅ |
| POST | `/auth/restablecer` | todos | Cambia la contraseña con el enlace recibido (se usa una sola vez) ✅ |
| PUT | `/auth/password` | todos | Cambia la contraseña estando logueado ✅ |

## Usuarios (HU01)
| Método | Ruta | Rol | Qué hace |
|---|---|---|---|
| GET | `/usuarios` | A | Lista paginada. Parámetros opcionales: `busqueda` (nombre, correo, documento o código), `rol`, `activo`, `pagina`, `por_pagina` (máx. 100). Responde `{items, total, pagina, por_pagina}` ✅ |
| POST | `/usuarios` | A | Crea cliente, entrenador o administrador; a los clientes les genera su código QR ✅ |
| GET | `/usuarios/{id}` | A, E, C | Detalle. El administrador ve a todos; el entrenador solo a sus clientes; el cliente solo a sí mismo ✅ |
| PUT | `/usuarios/{id}` | A | Modifica datos (solo cambian los campos enviados; `null` vacía un dato opcional) ✅ |
| PATCH | `/usuarios/{id}/estado` | A | Activa o desactiva (`{"activo": false}`) ✅ |
| PUT | `/usuarios/{id}/password` | A | Define una contraseña temporal para otra persona ✅ |
| PATCH | `/auth/me` | todos | Edita **sus propios** datos de contacto (teléfono, dirección, fecha de nacimiento, contacto de emergencia) ✅ |
| GET | `/mi/qr` | C | Imagen del QR del cliente ⏳ |

## Medidas físicas (HU01)
| Método | Ruta | Rol | Qué hace |
|---|---|---|---|
| GET | `/usuarios/{id}/medidas` | A, E | Historial de medidas de un cliente |
| POST | `/usuarios/{id}/medidas` | E | Registra una medición |
| GET | `/mi/medidas` | C | Sus propias medidas |

## Planes, membresías y pagos (HU03)
| Método | Ruta | Rol | Qué hace |
|---|---|---|---|
| GET | `/planes` | todos | Lista los 3 planes (mensual, trimestral, anual), del más corto al más largo ✅ |
| PATCH | `/planes/{id}` | A | Cambia el precio de un plan (`{"precio": 95000}`, entero en pesos, de 1 a 100.000.000) ✅ |
| GET | `/usuarios/{id}/membresia` | A, E 🔒, C 🔒 | Estado actual (`al_dia`, `por_vencer`, `en_mora`, `sin_membresia`), `puede_entrar`, vencimiento, días restantes e historial de membresías |
| GET | `/usuarios/{id}/pagos` | A, E 🔒, C 🔒 | Pagos del cliente |
| GET | `/pagos` | A | Lista de pagos; filtros `usuario_id` y `estado` |
| POST | `/pagos/manual` | A | Registra pago en efectivo o transferencia (nace aprobado) |
| POST | `/pagos/{id}/anular` | A | Anula un pago aprobado; body `{"motivo": "..."}` |
| POST | `/pagos/checkout` | A, C | Inicia pago en la pasarela simulada (pendiente). Body `{"plan_id", "usuario_id"?}`; el cliente no envía `usuario_id`, el administrador sí |
| POST | `/pagos/{id}/simular` | A, C 🔒 | Aprueba o rechaza el pago pendiente. Body `{"resultado": "aprobado"\|"rechazado"}` |
| POST | `/pagos/{id}/cancelar` | A, C 🔒 | Cancela un pago pendiente (queda rechazado) |
| GET | `/pagos/{id}` | A, E 🔒, C 🔒 | Detalle del pago con datos de comprobante (documento y vigencia) |

## Avisos y vencimientos (HU03)
| Método | Ruta | Rol | Qué hace |
|---|---|---|---|
| GET | `/avisos` | A, C | Mis 50 avisos más recientes y `no_leidas` |
| POST | `/avisos/{id}/leer` | A, C 🔒 | Marca uno de mis avisos como leído (uno ajeno responde 404) |
| POST | `/avisos/leer-todos` | A, C | Marca todos los míos como leídos |
| POST | `/avisos/generar` | A | Lanza ya la revisión de vencimientos; devuelve cuántos avisos creó de cada tipo |
| GET | `/vencimientos` | A | Clientes activos por vencer y en mora, los más urgentes primero |

## Asistencia y seguimiento (HU02)
| Método | Ruta | Rol | Qué hace |
|---|---|---|---|
| POST | `/asistencias/checkin` | A | Registra entrada con el código del QR |
| GET | `/asistencias` | A | Historial con filtros por cliente y fechas |
| GET | `/mi/asistencias` | C | Su historial |
| GET | `/mi/metricas` | C | Racha y % de cumplimiento |
| GET | `/mi/dashboard` | C | Resumen: membresía, asistencia, métricas, rutina y medidas |

## Rutinas (rol entrenador)
| Método | Ruta | Rol | Qué hace |
|---|---|---|---|
| GET | `/entrenador/clientes` | E | Sus clientes asignados |
| GET | `/usuarios/{id}/rutinas` | A, E | Rutinas del cliente (activa e historial) |
| POST | `/usuarios/{id}/rutinas` | E | Crea y asigna una rutina con sus ejercicios |
| PUT | `/rutinas/{id}` | E | Edita la rutina |
| GET | `/mi/rutina` | C | Su rutina activa |

## Reportes y dashboard administrativo (HU07)
| Método | Ruta | Rol | Qué hace |
|---|---|---|---|
| GET | `/reportes/asistencia` | A | Estadísticas por fecha, día de la semana y hora |
| GET | `/reportes/financiero` | A | Ingresos por periodo y clientes en mora |
| GET | `/reportes/{tipo}/exportar?formato=xlsx\|pdf` | A | Descarga el reporte |
| GET | `/dashboard/admin` | A | Indicadores: clientes activos, entradas hoy, ingresos del mes, morosos, por vencer |
