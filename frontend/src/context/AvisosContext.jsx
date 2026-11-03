// Estado compartido de los avisos: lo usan el menú (contador de no leídos) y la pantalla «Avisos».
// Se consulta al entrar y luego cada minuto, para que un aviso nuevo aparezca sin recargar la página.
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { listarAvisos, marcarAvisoLeido, marcarTodosLeidos } from "@/api/avisos";
import { useAuth } from "@/context/AuthContext";

const AvisosContext = createContext(null);
const CADA_MINUTO = 60_000;

export function AvisosProvider({ children }) {
  const { usuario } = useAuth();
  const [datos, setDatos] = useState({ no_leidas: 0, items: [] });
  const [cargando, setCargando] = useState(true);
  // Solo el administrador y el cliente reciben avisos; el entrenador no (todavía).
  const recibeAvisos = usuario?.rol === "admin" || usuario?.rol === "cliente";

  const recargar = useCallback(async () => {
    if (!recibeAvisos) return;
    try {
      setDatos(await listarAvisos());
    } catch {
      // Un fallo al consultar avisos no debe estorbar el resto de la aplicación.
    } finally {
      setCargando(false);
    }
  }, [recibeAvisos]);

  useEffect(() => {
    if (!recibeAvisos) {
      setCargando(false);
      return undefined;
    }
    recargar();
    const temporizador = setInterval(recargar, CADA_MINUTO);
    return () => clearInterval(temporizador);
  }, [recibeAvisos, recargar]);

  const marcarLeido = useCallback(async (id) => {
    await marcarAvisoLeido(id);
    setDatos((d) => {
      const yaLeido = d.items.find((a) => a.id === id)?.leida;
      return {
        no_leidas: yaLeido ? d.no_leidas : Math.max(0, d.no_leidas - 1),
        items: d.items.map((a) => (a.id === id ? { ...a, leida: true } : a)),
      };
    });
  }, []);

  const marcarTodos = useCallback(async () => {
    await marcarTodosLeidos();
    setDatos((d) => ({ no_leidas: 0, items: d.items.map((a) => ({ ...a, leida: true })) }));
  }, []);

  const valor = useMemo(
    () => ({ avisos: datos.items, noLeidas: datos.no_leidas, cargando, recargar, marcarLeido, marcarTodos }),
    [datos, cargando, recargar, marcarLeido, marcarTodos],
  );
  return <AvisosContext.Provider value={valor}>{children}</AvisosContext.Provider>;
}

export function useAvisos() {
  const contexto = useContext(AvisosContext);
  if (!contexto) throw new Error("useAvisos debe usarse dentro de <AvisosProvider>");
  return contexto;
}
