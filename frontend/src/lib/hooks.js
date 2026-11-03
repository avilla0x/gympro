// Utilidades de React reutilizables.
import { useEffect, useState } from "react";

// Devuelve `valor` pero "con retraso": solo se actualiza cuando pasó `espera` ms sin cambios.
// Se usa en los buscadores para no consultar al servidor con cada letra que se escribe.
//   const textoParaBuscar = useRetraso(busqueda, 300);
export function useRetraso(valor, espera = 300) {
  const [conRetraso, setConRetraso] = useState(valor);

  useEffect(() => {
    const temporizador = setTimeout(() => setConRetraso(valor), espera);
    return () => clearTimeout(temporizador); // si el valor cambia antes de tiempo, se reinicia la cuenta
  }, [valor, espera]);

  return conRetraso;
}
