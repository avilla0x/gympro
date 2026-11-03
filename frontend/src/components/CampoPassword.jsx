// Campo de contraseña con un botón para mostrar u ocultar lo escrito.
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";

import { Input } from "@/components/ui/input";

export function CampoPassword({ ...props }) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <Input type={visible ? "text" : "password"} className="pr-10" {...props} />
      <button
        type="button" // type="button" evita que este botón envíe el formulario
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
        className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-md text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
      >
        {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}
