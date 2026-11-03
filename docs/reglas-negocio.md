# Reglas de negocio

Las marcadas **(a validar)** son propuestas del equipo que conviene confirmar con el cliente o el docente.

## RN1. Estado de la membresía
Se calcula con la `fecha_fin` (inclusiva) de la membresía que vence más tarde, contando los días que faltan desde **hoy** (día de Colombia):

| Estado | Condición | ¿Puede entrar? |
|---|---|:--:|
| **Al día** | faltan más de 5 días | Sí |
| **Por vencer** | faltan 5 días o menos (incluye el último día, que es «0 días») | Sí |
| **En mora** | ya pasó la `fecha_fin` | No |
| **Sin membresía** | nunca ha tenido un pago aprobado | No |

El margen de 5 días es configurable (`DIAS_POR_VENCER` en `.env`). «Hoy» se calcula siempre en la zona horaria del gimnasio (`ZONA_HORARIA`, por defecto America/Bogota) y no en UTC.

## RN2. Renovación
- Solo los pagos **aprobados** dan membresía. Cada pago aprobado tiene una membresía.
- Las fechas de inicio y fin son **inclusivas**: un plan de 30 días pagado el 1 de noviembre vale del 1 al 30 de noviembre.
- Si el cliente renueva con la membresía vigente (incluso el último día), la nueva empieza el día siguiente a la `fecha_fin` anterior: no pierde días.
- Si renueva estando en mora, o es su primer pago, empieza el día del pago.
- Las membresías no se editan a mano: se **recalculan** a partir de los pagos aprobados cada vez que hay un pago nuevo o se anula uno.

## RN2b. Anulación de pagos
- Solo el administrador puede anular, y solo pagos **aprobados**. Debe escribir un motivo (5 a 300 caracteres).
- El pago no se borra: queda `anulado` con quién, cuándo y por qué. Sus días dejan de contar y las membresías posteriores se recorren (por ejemplo, una renovación que iba «al final» pasa a empezar el día en que se pagó).
- Un pago anulado no se puede reactivar; si fue un error, se registra un pago nuevo.
- Registrar un pago manual exige un cliente **activo**. Un pago manual nace aprobado.

## RN3. Check-in
Para registrar una entrada, el sistema valida en este orden:
1. El código existe.
2. El usuario es cliente y está activo.
3. La membresía está **al día** o **por vencer** (en mora se rechaza).
4. No tiene ya una entrada registrada **ese mismo día** **(a validar)**.

La respuesta siempre dice el motivo: "Bienvenido(a)", "Código no existe", "Membresía vencida", "Ya registró entrada hoy".

## RN4. Racha y % de cumplimiento (a validar)
- Cada cliente tiene una **meta semanal** de asistencia (por defecto **3 días por semana**).
- **Racha:** número de semanas consecutivas, hasta la actual, en que cumplió la meta.
- **% de cumplimiento del mes:** asistencias del mes ÷ (meta semanal × semanas transcurridas del mes) × 100, con máximo 100 %.

Se usa la meta semanal porque nadie va al gimnasio todos los días; una racha "diaria" se rompería siempre.

## RN5. Alertas de vencimiento (HU03)
Una tarea diaria (6:00 a. m., hora de Colombia, configurable con `HORA_ALERTAS`) revisa a los clientes **activos** que tienen membresía y crea avisos dentro del sistema (pantalla «Avisos», con contador en el menú) y envía el correo equivalente (hoy se imprime en la consola del servidor):
- **Por vencer:** cuando faltan entre 1 y 3 días (`DIAS_AVISO_VENCIMIENTO`) para el vencimiento. Se avisa **una sola vez por vencimiento**; si la tarea no corrió el día exacto, avisa al siguiente día en que corra.
- **Vence hoy:** el último día de la membresía.
- **Resumen para el administrador:** cada día en que haya clientes por vencer o que vencen hoy, cada administrador activo recibe un aviso con las cantidades.
- No se avisa a clientes desactivados, sin membresía o ya vencidos. Si el cliente renueva a tiempo, el vencimiento cambia y no recibe el aviso.
- La tarea también corre al encender el servidor (por si estuvo apagado) y no repite avisos: es **idempotente** (un aviso es único por persona, tipo y fecha de referencia). El administrador puede lanzarla a mano desde «Avisos» → «Revisar vencimientos ahora».
- Cada persona ve y marca como leídos solo **sus** avisos. El entrenador no recibe avisos por ahora.
- **Seguimiento:** en Pagos → «Vencimientos» el administrador ve los clientes por vencer y en mora (más urgentes primero), con teléfono y acceso rápido para registrar su pago.

## RN6. Recordatorio de asistencia (HU02)
La misma tarea diaria envía un recordatorio al cliente con membresía al día que lleve **7 días sin asistir** **(a validar)**. Máximo un recordatorio por semana.

## RN7. Pasarela simulada
No se mueve dinero real: se imita el flujo de una pasarela para poder demostrar un pago aprobado y uno rechazado.
1. El cliente (para sí mismo) o el administrador (indicando el cliente) elige un plan y pulsa "Pagar" / "Cobrar por pasarela".
2. Se crea un pago `pendiente` con método `pasarela`, el precio vigente del plan y una referencia inventada (`SIM-` + 8 caracteres).
3. La pantalla simulada muestra los datos y dos botones: **Aprobar pago** y **Rechazar pago**. También se puede **cancelar** (queda rechazado) o **decidir después** (queda pendiente).
4. Aprobado → el pago cuenta como recibido y se recalculan las membresías (RN2). Rechazado o cancelado → no cambia nada.
5. Un pago pendiente se puede retomar desde «Mis pagos» (cliente) o «Pagos» (administrador). Si el cliente inicia otro pago del **mismo plan**, se reutiliza el pendiente (con el precio vigente); si elige **otro plan**, el pendiente anterior se cancela. Así nunca hay dos pendientes abiertos.
6. Solo el cliente dueño del pago o el administrador pueden aprobarlo, rechazarlo o cancelarlo. Un pago ya resuelto no se puede resolver de nuevo.
7. Los pagos manuales (efectivo/transferencia) no pasan por la pasarela.
8. El comprobante (cliente dueño, su entrenador asignado o administrador) muestra el pago y la vigencia que otorgó; se puede imprimir.

## RN8. Usuarios
- Solo el administrador crea usuarios y define su rol.
- El código de cliente se genera automáticamente y no se puede editar.
- No se borran usuarios: se **desactivan**, para conservar su historial.

## RN9. Rutinas
- Solo el entrenador asignado (o el administrador) crea o modifica la rutina de un cliente.
- Un cliente tiene una sola rutina activa; al asignar una nueva, la anterior queda inactiva como historial.

## RN10. Contraseñas
- Mínimo **8 caracteres**, al menos **una mayúscula** y **un número**.
- Se guardan únicamente cifradas (argon2); nadie, ni el administrador, puede verlas.
- El administrador de demostración (D11) es la única excepción: su clave se define en el `.env` y no pasa por esta validación.

## RN11. Recuperación de contraseña
- Cualquier persona puede pedir el enlace con su correo. La respuesta es siempre la misma, exista o no el correo.
- El enlace vale **30 minutos** y **se puede usar una sola vez** (deja de servir al cambiar la contraseña).
- Un usuario desactivado no puede recuperar su contraseña.
- Por ahora el enlace se muestra en la consola del servidor; cuando se configure un correo real, se enviará por correo.

## RN12. Documento de identidad
- Es **obligatorio** para los clientes y opcional para entrenadores y administradores.
- No puede repetirse entre usuarios.

## RN13. Gestión de usuarios (solo administrador)
- **Desactivar** a un usuario le quita el acceso de inmediato (incluso si ya tenía la sesión abierta) pero conserva su historial. Nunca se borra a un usuario.
- **Siempre debe quedar al menos un administrador activo:** no se puede desactivar ni quitarle el rol al único administrador activo.
- El administrador **no puede desactivarse a sí mismo ni cambiarse su propio rol.**
- **Cambio de rol:**
  - De cliente a otro rol: se le quitan el código QR y el entrenador asignado.
  - De otro rol a cliente: exige documento de identidad y recibe su código QR (`GP-` + su número).
  - Un entrenador con clientes asignados no puede cambiar de rol: primero hay que reasignar a sus clientes.
- El **entrenador asignado** a un cliente debe existir, ser entrenador y estar activo. Si un entrenador se desactiva, sus clientes conservan la asignación hasta que el administrador los reasigne.
- El correo y el documento no pueden repetirse (se responde con un error claro).
- La **búsqueda** no distingue mayúsculas pero **sí tildes** ("gomez" no encuentra "Gómez").

## RN14. Perfil propio
- Cada persona puede editar solo sus datos de **contacto**: teléfono, dirección, fecha de nacimiento y contacto de emergencia (nombre y teléfono).
- El nombre, correo, documento, rol y estado los cambia únicamente el administrador. Si alguien intenta enviarlos, el servidor los ignora.
- La fecha de nacimiento no puede ser futura.

## RN15. Contraseña temporal
- El administrador puede definir una contraseña para otra persona (por ejemplo, si la olvidó y no tiene acceso a su correo). Debe cumplir las reglas de RN10.
- **Limitación conocida:** no se obliga a la persona a cambiarla en su primer ingreso, y las sesiones que ya tuviera abiertas siguen vigentes hasta que venzan (8 horas) o hasta que se desactive al usuario.

## RN16. Planes y precios
- Hay **tres planes fijos**: Mensual (30 días), Trimestral (90 días) y Anual (365 días). No se crean, borran ni desactivan desde el sistema.
- Los precios son en **pesos colombianos, enteros y sin decimales**. Los iniciales ($90.000, $240.000 y $850.000) son **de ejemplo**: el administrador los ajusta desde «Planes».
- El precio debe ser un entero entre 1 y 100.000.000 (el tope solo evita errores de digitación, por ejemplo un cero de más).
- **Un cambio de precio solo aplica a pagos nuevos.** Cada pago conserva el monto con el que se hizo, así que los pagos anteriores no cambian.
- Cualquier persona con sesión puede ver los planes (el cliente necesita los precios para pagar); solo el administrador cambia precios.
