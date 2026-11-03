// Tema claro/oscuro. Por defecto el sistema es oscuro; la elección se recuerda en el navegador.
//
// "Contexto" de React = un dato compartido por TODA la aplicación. Cualquier componente puede
// preguntar por el tema con `useTema()` sin que se lo pasen de padre a hijo.
import { createContext, useContext, useEffect, useState } from "react";

const CLAVE_TEMA = "gympro-tema";
const TemaContext = createContext(null);

function leerTemaGuardado() {
  try {
    return localStorage.getItem(CLAVE_TEMA) === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}

export function TemaProvider({ children }) {
  const [tema, setTema] = useState(leerTemaGuardado);

  // Cada vez que cambia el tema: se pone o quita la clase "dark" en <html> (ver index.css) y se guarda.
  useEffect(() => {
    document.documentElement.classList.toggle("dark", tema === "dark");
    try {
      localStorage.setItem(CLAVE_TEMA, tema);
    } catch {
      /* sin almacenamiento: el tema no se recordará */
    }
  }, [tema]);

  const alternarTema = () => setTema((actual) => (actual === "dark" ? "light" : "dark"));

  return <TemaContext.Provider value={{ tema, alternarTema }}>{children}</TemaContext.Provider>;
}

export function useTema() {
  const contexto = useContext(TemaContext);
  if (!contexto) throw new Error("useTema debe usarse dentro de <TemaProvider>");
  return contexto;
}
