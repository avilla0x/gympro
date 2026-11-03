// Punto de entrada del frontend: arma la aplicación y la dibuja dentro de <div id="root"> (ver index.html).
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import App from "@/App";
import { AuthProvider } from "@/context/AuthContext";
import { TemaProvider } from "@/context/TemaContext";
import "@/index.css";

// Los "Provider" envuelven la aplicación para que TODAS las pantallas puedan consultar el tema y la sesión.
createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <TemaProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </TemaProvider>
    </BrowserRouter>
  </StrictMode>,
);
