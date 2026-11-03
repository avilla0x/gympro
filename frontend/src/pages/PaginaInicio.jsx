// Pantalla de inicio, igual de simple para todos los roles. Se reemplaza por el panel de cada rol
// cuando se construyan sus HU (dashboard del administrador, progreso del cliente, etc.).
// El menú y el cierre de sesión ya no están aquí: los da <AppLayout>.
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import { DESCRIPCION_ROL, ETIQUETAS_ROL } from "@/lib/roles";

export default function PaginaInicio() {
  const { usuario } = useAuth();

  return (
    <div className="max-w-2xl">
      <p className="text-sm text-muted-foreground">{ETIQUETAS_ROL[usuario.rol] ?? usuario.rol}</p>
      <h1 className="mt-1 text-3xl font-extrabold tracking-tight">Hola, {usuario.nombre.split(" ")[0]} 👋</h1>
      <p className="mt-2 text-muted-foreground">{DESCRIPCION_ROL[usuario.rol]}</p>

      <Card className="mt-8 max-w-md">
        <CardHeader>
          <CardTitle>Tu cuenta</CardTitle>
          <CardDescription>Estos datos vienen del servidor: el login funciona.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <Fila etiqueta="Nombre" valor={usuario.nombre} />
          <Fila etiqueta="Correo" valor={usuario.email} />
          <Fila etiqueta="Rol" valor={ETIQUETAS_ROL[usuario.rol] ?? usuario.rol} />
          {usuario.codigo && <Fila etiqueta="Código QR" valor={usuario.codigo} />}
        </CardContent>
      </Card>

      <p className="mt-8 max-w-md text-sm text-muted-foreground">
        Las secciones del menú marcadas como <strong>Pronto</strong> se irán habilitando a medida que se construyan.
      </p>
    </div>
  );
}

// Una línea "etiqueta ........ valor" de la tarjeta.
function Fila({ etiqueta, valor }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b pb-3 last:border-0 last:pb-0">
      <span className="text-muted-foreground">{etiqueta}</span>
      <span className="font-medium">{valor}</span>
    </div>
  );
}
