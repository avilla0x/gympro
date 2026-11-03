# Frontend – React + Vite + Tailwind

Interfaz web de GymPro. Estado actual: **HU01 completa** (acceso, roles y permisos, gestión de usuarios y perfil propio) y **HU03 en curso** (planes de membresía).

## Ejecutar
Requiere **Node.js 22 o superior** (`node --version`) y el backend encendido (ver `docs/guia-instalacion.md`).

```bash
cd frontend
npm install        # instala las librerías (solo la primera vez o cuando cambie package.json)
npm run dev        # enciende el frontend en http://localhost:5173
npm test           # ejecuta las pruebas automáticas
npm run build      # genera la versión final en la carpeta dist/
```

Para probar: abrir http://localhost:5173 e iniciar sesión con el administrador de demostración (`admin@gympro.com` / `admin1234`).
El frontend busca la API en `http://localhost:8000/api`; si está en otra dirección, copiar `.env.example` como `.env` y cambiar `VITE_API_URL`.

## Pantallas construidas
| Dirección | Pantalla | Quién la ve |
|---|---|---|
| `/login` | Iniciar sesión | quien no tiene sesión |
| `/recuperar` | Pedir el enlace de recuperación | todos |
| `/restablecer?token=...` | Elegir contraseña nueva (llega desde el enlace) | todos |
| `/` | Inicio (provisional: muestra los datos de la sesión) | quien tiene sesión |
| `/perfil` | Mi perfil: datos de la cuenta, contacto y cambio de contraseña | todos los roles |
| `/usuarios` | Lista de usuarios con búsqueda, filtros y paginación | administrador |
| `/usuarios/nuevo` | Crear un usuario | administrador |
| `/usuarios/:id` | Editar un usuario, activar/desactivar y definir contraseña temporal | administrador |
| `/planes` | Los 3 planes de membresía y cambio de precio | administrador |
| `/sin-permiso` | Aviso de falta de permiso | quien tiene sesión |

## Organización de `src/`
```
src/
├── main.jsx          → punto de entrada: arma la aplicación
├── App.jsx           → mapa de pantallas (qué dirección muestra qué pantalla)
├── index.css         → SISTEMA DE DISEÑO: colores, tipografía, modo claro/oscuro
├── api/              → comunicación con el backend
│   ├── cliente.js    → única función que llama al backend (maneja token y errores)
│   ├── sesion.js     → guarda/lee el token en el navegador
│   ├── auth.js       → login, perfil propio, recuperar, restablecer y cambiar contraseña
│   ├── usuarios.js   → listar, crear, editar, activar/desactivar y contraseña temporal
│   └── planes.js     → listar planes y cambiar su precio
├── context/          → datos compartidos por toda la aplicación
│   ├── AuthContext.jsx → quién inició sesión, iniciar y cerrar sesión
│   └── TemaContext.jsx → tema claro/oscuro
├── routes/           → protección de pantallas (RutaProtegida, RutaPublica, RutaPorRol)
├── pages/            → una pantalla por archivo
├── components/       → piezas reutilizables (AppLayout, MenuLateral, Logo, LayoutAuth, CampoPassword...)
│   └── ui/           → componentes base: Button, Input, Select, Label, Card, Alert, Badge, Table
├── lib/              → utilidades (menu.js = menú por rol, regla de contraseñas, nombres de roles)
└── pruebas/          → ayudas para las pruebas
```
Las pruebas viven junto al archivo que prueban (`*.test.js` / `*.test.jsx`).

## Diseño
- **Colores y tipografía:** todo está en `src/index.css`. Para cambiar la identidad (por ejemplo, con los colores oficiales del gimnasio) se editan los valores de ese archivo y toda la aplicación se actualiza.
- **Logo:** provisional, en `src/components/Logo.jsx`. Para usar el oficial se reemplaza el contenido de ese archivo.
- **Modo oscuro** por defecto, con botón para cambiar a claro (se recuerda la elección).
- **Componentes base** (`components/ui/`) siguen el estilo de **shadcn/ui**: son archivos propios del proyecto, no una librería, así que se pueden modificar libremente.
- Íconos: **lucide-react**. Gráficas (próximas HU): **Recharts**.

## Menú y permisos por rol
- El menú lateral de cada rol se define **en un solo archivo: `src/lib/menu.js`**. Las secciones cuya pantalla no existe todavía se ven deshabilitadas con la etiqueta "Pronto".
- Para **agregar una pantalla nueva** (cuando se construya su HU):
  1. En `lib/menu.js`, cambiar `disponible: false` por `true` en su ítem.
  2. En `App.jsx`, agregar su `<Route>` dentro de `<RutaPorRol roles={[...]}>` con **los mismos roles** que el ítem.
  3. Crear la pantalla en `src/pages/`.
- Para mostrar u ocultar **una parte** de una pantalla según el rol: `const { tieneRol } = useAuth();` y luego `tieneRol("admin")`.
- Qué puede hacer cada rol: ver `docs/permisos.md`.

## Patrón de cada pantalla
1. La pantalla guarda lo que escribe la persona en el **estado** (`useState`).
2. Al enviar, llama una función de `src/api/` y espera la respuesta.
3. Si falla, muestra el mensaje (`ErrorApi.message` ya viene en español); si funciona, actualiza la pantalla o la sesión.

Todas las pantallas nuevas siguen este mismo patrón para que cualquier integrante entienda las de los demás.

## Seguridad
- El **control real de permisos lo hace el backend**. Ocultar o proteger una pantalla aquí solo mejora la experiencia: nunca se confía en el frontend para decidir quién puede qué.
- El token de sesión se guarda en `localStorage` (decisión D14 en `docs/decisiones.md`).
