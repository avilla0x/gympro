# Decisiones técnicas

Cada decisión indica qué se eligió, por qué y qué se descartó. Si una decisión cambia, se actualiza aquí.

## D1. Backend: FastAPI + SQLModel
- **Por qué:** FastAPI es Python, rápido de aprender y genera documentación automática en `/docs`, útil para probar y exponer. SQLModel (del mismo autor) usa una sola clase como tabla de la base de datos y como validación de datos, así hay menos código que entender.
- **Descartado:** Django (más completo, pero el equipo eligió FastAPI).

## D2. Base de datos: PostgreSQL
- **Por qué:** es la base de datos relacional más usada con Python, gratuita, y en AWS se convierte en **Amazon RDS PostgreSQL** cambiando solo la cadena de conexión (`DATABASE_URL`).
- **Local:** se levanta con Docker (`docker-compose.yml`) para que los 3 integrantes tengan exactamente la misma versión.
- **Migraciones:** Alembic registra cada cambio en las tablas (como un "git" de la base de datos).

## D3. Autenticación: JWT propio (no Amazon Cognito)
- **Por qué:** AWS es "por si toca", no obligatorio. Con JWT propio el login, los roles y la recuperación de contraseña quedan en nuestro código y se pueden explicar completos. Las contraseñas se guardan cifradas con argon2, nunca en texto plano.
- **Impacto en el roadmap:** la subtarea "Configurar Amazon Cognito" pasa a ser "Implementar autenticación con JWT y roles".

## D4. Frontend: React + Vite + Tailwind CSS + shadcn/ui
- **Por qué React:** es la librería JavaScript con más ejemplos, tutoriales y componentes de diseño moderno.
- **Por qué Vite y no Next.js:** el backend ya es FastAPI; las funciones de servidor de Next.js sobrarían y agregarían conceptos. Vite solo construye el frontend y es muy rápido.
- **Por qué Tailwind + shadcn/ui:** el equipo quiere un diseño bonito e innovador. shadcn/ui da componentes modernos (tarjetas, tablas, modales, modo oscuro) que se copian al proyecto y se pueden personalizar.
- **Gráficas:** Recharts (dashboard administrativo y progreso del cliente).

## D5. Check-in con QR usando la cámara (sin dispositivos adicionales)
- Cada cliente tiene un **código único** (ej. `GP-000123`) y su **QR** se muestra en su sesión desde el celular.
- En recepción, la página de check-in abre la **cámara del computador** desde el navegador y lee el QR.
- Si la cámara falla, el código se puede escribir a mano en el mismo campo.
- **Descartado:** huella o lector biométrico (no hay dispositivos y son datos sensibles regulados por la Ley 1581 de 2012).

## D6. Datos "biométricos" = medidas físicas
- Se registran **peso, estatura y (opcional) % de grasa** con su fecha, para ver la evolución del cliente.
- No se guardan huellas ni datos biométricos de identificación.

## D7. Pasarela de pagos simulada
- No se integra una pasarela real. Se construye una **pantalla de pago simulada** que reproduce el flujo (crear pago → aprobar o rechazar) y actualiza el estado del pago y de la membresía.
- El administrador también puede registrar **pagos manuales** (efectivo o transferencia).

## D8. Usuarios creados por el administrador
- No hay registro público. El administrador crea a clientes y entrenadores con una contraseña temporal; el usuario la cambia en su perfil o con "olvidé mi contraseña".

## D9. Rol entrenador: rutinas y medidas
- Al eliminar las HU de IA, el entrenador **crea y asigna rutinas manualmente** (ejercicios por día, series y repeticiones) y registra medidas físicas.
- **Impacto en el roadmap:** es funcionalidad nueva; hay que ubicarla en un sprint (ver `plan-trabajo.md`).

## D10. Despliegue (solo si toca AWS)
| Componente | Local | AWS |
|---|---|---|
| Base de datos | PostgreSQL en Docker | Amazon RDS PostgreSQL |
| Backend | `uvicorn` | AWS Elastic Beanstalk o EC2 (con Docker) |
| Frontend | `npm run dev` | Amazon S3 + CloudFront (o AWS Amplify Hosting) |
| Reportes exportados | carpeta local | Amazon S3 |
| Correos | SMTP de prueba | Amazon SES |

Si no se exige AWS, el backend y la base de datos pueden desplegarse en Render o Railway y el frontend en Vercel o Netlify (revisar sus planes gratuitos vigentes).

## D11. Administrador de demostración
- **Decisión del equipo:** el primer administrador se crea automáticamente con un correo y una contraseña conocidos, para facilitar las pruebas y la exposición.
- **Riesgo:** una clave conocida es insegura si el sistema se publica en internet. Antes de cualquier despliegue real hay que cambiarla desde el archivo `.env`.

## D12. Pruebas automáticas con SQLite en memoria
- Las pruebas (`pytest`) usan una base SQLite en memoria: no necesitan Docker ni PostgreSQL y corren en menos de un segundo.
- La compatibilidad con PostgreSQL se verifica aplicando las migraciones de Alembic a una base PostgreSQL real.
- **Limitación:** si en el futuro se usan funciones exclusivas de PostgreSQL, esas partes no se podrán probar con SQLite.

## D13. El rol se guarda como texto
- El campo `rol` es un `VARCHAR` y no un tipo `ENUM` de PostgreSQL. Agregar un rol nuevo no exige una migración compleja; la validación la hace Python.

## D14. Token de sesión guardado en localStorage
- El frontend guarda el token JWT en `localStorage` para que la persona siga dentro al recargar la página (se borra al cerrar sesión o cuando vence).
- **Trade-off:** si hubiera una falla que permitiera ejecutar código ajeno en la página (XSS), ese código podría leer el token. La alternativa (cookie `HttpOnly`) es más segura, pero exige cambiar también el backend y la configuración de CORS.
- Se acepta para este proyecto por simplicidad. Mitigaciones: el token vence a las 8 horas y el backend revisa en cada petición que el usuario siga activo.

## D15. Frontend en JavaScript (no TypeScript) con componentes estilo shadcn/ui
- Se usa **JavaScript**, como pidió el equipo, para bajar la curva de aprendizaje.
- **Tailwind CSS v4** para los estilos y componentes base (`components/ui/`) copiados al proyecto al estilo shadcn/ui: son código propio, sin dependencia de una librería de componentes.
- **Identidad provisional:** oscuro con acento naranja `#F97316`, tipografía Inter, logo de texto con ícono de mancuerna. Se cambia en `src/index.css` y `src/components/Logo.jsx`.
- **Sin registro público:** la pantalla de login indica que las cuentas las crea el administrador (D8).

## D16. Menú lateral con secciones "Pronto" y permisos centralizados
- **Menú lateral** (decisión del equipo): barra a la izquierda con las secciones de cada rol; en celulares se esconde y se abre con un botón.
- **Secciones futuras visibles pero deshabilitadas** ("Pronto"): el menú muestra desde ya el sistema completo planeado (útil para la exposición), y cada HU habilita su ítem al construirse.
- **Permisos en un solo lugar:** en el backend, atajos con nombre (`solo_admin`, `admin_o_entrenador`...) y reglas de pertenencia en `services/permisos.py`; en el frontend, `lib/menu.js` y `RutaPorRol`. La matriz completa está en `docs/permisos.md`.
- **El rol se lee de la base de datos en cada petición, no del token:** quitar un rol o desactivar a alguien surte efecto de inmediato. A cambio, cada petición hace una consulta extra a la base de datos (costo mínimo para este tamaño de proyecto).
- **Entrenador:** sin las HU de IA, sus funciones son rutinas y medidas de sus clientes (D9); aún no tiene pantallas porque dependen de HU de sprints siguientes.

## D17. Alcance de la edición de usuarios y del perfil propio
- **Perfil propio** (decisión del equipo): cada persona edita solo sus datos de contacto. Identidad (nombre, correo, documento, rol) solo la cambia el administrador.
- **El administrador puede editar cualquier dato, incluido el rol,** con protecciones (RN13): no cambia su propio rol, siempre queda un administrador activo, y un entrenador con clientes no cambia de rol. Se eligió permitir el cambio de rol (en vez de dejarlo fijo) para poder corregir errores sin crear una cuenta nueva.
- **Contraseña temporal por el administrador** (decisión del equipo): útil mientras los correos no se envían de verdad. Limitación documentada en RN15.
- **Edición enviando solo lo que cambió:** el frontend manda únicamente los campos modificados. Evita pisar datos que nadie tocó (por ejemplo, un entrenador que luego fue desactivado).
- **Paginación en el servidor** (20 por página, máximo 100) y búsqueda con retraso de 300 ms mientras se escribe.

## D18. Planes fijos, dinero en pesos enteros y planes cargados por migración
- **Tres planes fijos** (decisión del equipo): mensual, trimestral y anual. El administrador solo cambia el precio; por eso el modelo no tiene campo `activo` ni hay endpoints para crear o borrar planes.
- **Dinero como entero en pesos** (decisión del equipo): se evitan los errores de redondeo de los decimales y los pesos colombianos no usan centavos en la práctica.
- **Los planes los carga la migración** (`alembic/versions/..._crea_tabla_plan.py`) y no el código de arranque: así existen en cualquier base de datos donde se apliquen las migraciones (cada integrante, pruebas, AWS) sin pasos extra. Los precios iniciales son de ejemplo.
- **Un cambio de precio no toca pagos anteriores** (decisión del equipo): cada pago guarda su monto.
- **Duración en días fijos** (30, 90, 365): la membresía vence exactamente esos días después de empezar, no «un mes calendario».

## D19. Membresías calculadas desde los pagos, hora de Colombia y anulación
- **Las membresías se recalculan, no se editan** (`recalcular_membresias`): así anular un pago corrige solas todas las fechas posteriores y no pueden quedar fechas incoherentes.
- **Fechas inclusivas** y renovación anticipada «suma al final» (decisión del equipo, RN2).
- **Cuatro estados** (decisión del equipo): al día, por vencer (≤ 5 días, configurable), en mora y **sin membresía** (nunca pagó; no puede entrar).
- **Hora de Colombia:** todo «hoy» sale de `app/core/tiempo.py` (America/Bogota) y nunca de UTC, para que una membresía no venza un día antes por la diferencia horaria. Windows no trae zonas horarias, por eso se agregó `tzdata` a los requisitos.
- **Anular en vez de borrar** (decisión del equipo): el pago queda con quién, cuándo y por qué (RN2b), por trazabilidad del dinero.
- **Criterios que tomé yo (cámbialos si no te convienen):** no se registra un pago manual a un cliente desactivado; se puede anular cualquier pago aprobado (incluido el de pasarela, cuando exista); un pago anulado no se reactiva.

## D20. Pasarela simulada, pagos pendientes y comprobante
- **Pantalla con Aprobar / Rechazar** (decisión del equipo): permite demostrar ambos resultados en la exposición; no hay dinero real ni resultado aleatorio.
- **Pendiente se puede retomar** (decisión del equipo): un pago que se abre y no se decide queda `pendiente` y no da membresía. No hay vencimiento automático.
- **Cancelar = rechazado:** se evitó un estado más (`cancelado`) para no complicar el modelo; para el negocio es lo mismo (no se cobró nada).
- **Un solo pendiente abierto por cliente** (decisión mía): iniciar el mismo plan reutiliza el pendiente y uno distinto cancela el anterior, para que no queden dos pagos abiertos que se puedan aprobar por error.
- **El administrador cobra por la pasarela** a nombre de un cliente y también puede aprobar/rechazar (decisión del equipo).
- **Comprobante imprimible** (decisión del equipo): se imprime o guarda como PDF desde el navegador; el menú no sale en la impresión.
- **Limitación:** la lista de pagos del administrador no está paginada (se filtra por cliente y estado); es suficiente para el tamaño de este proyecto.

## D21. Alertas de vencimiento: avisos en el sistema + correo, tarea diaria idempotente
- **Avisos dentro del sistema y correo** (decisión del equipo): pantalla «Avisos» con contador en el menú. Pusimos un ítem de menú con contador en lugar de una campana flotante porque funciona igual en computador y celular, y es más fácil de probar y de usar con teclado. El correo sigue imprimiéndose en consola hasta que se configure SMTP (ver `correo.py`).
- **3 días antes y el último día** (decisión del equipo). No se avisa «venció»: el administrador ve a los vencidos en Pagos → Vencimientos.
- **APScheduler dentro de la API** (6:00 a. m. Colombia): no necesita servicios aparte (cron, Celery). Si la API se apaga, al encender revisa de inmediato. Se apaga con `ALERTAS_ACTIVAS=false` (las pruebas lo hacen).
- **Idempotente:** un aviso es único por (persona, tipo, fecha de referencia), con restricción en la base de datos. «Por vencer» usa un rango (1 a 3 días) y no el día exacto para no perder el aviso si el servidor estuvo apagado.
- **Resumen al administrador** (mi interpretación de «avisos propios para el admin»): un aviso diario con cuántos clientes están por vencer o vencen hoy, solo si hay alguno. Dime si preferías otra cosa.
- **Limitación:** si hay varios servidores corriendo la API a la vez, cada uno ejecutaría la tarea; la restricción única evita avisos duplicados, pero se enviarían correos repetidos. Con un solo servidor no pasa.
