// Configuración de Vite (la herramienta que arma y sirve el frontend).
import path from "node:path";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  // react(): permite escribir componentes en JSX · tailwindcss(): activa los estilos de Tailwind
  plugins: [react(), tailwindcss()],

  resolve: {
    // "@/algo" equivale a "src/algo": evita rutas largas como "../../../components/..."
    alias: { "@": path.resolve(import.meta.dirname, "src") },
  },

  server: {
    port: 5173, // debe coincidir con FRONTEND_URL del backend (CORS)
    strictPort: true, // si el 5173 está ocupado, avisa en vez de cambiar de puerto en silencio
  },

  // Configuración de las pruebas automáticas (Vitest)
  test: {
    environment: "jsdom", // simula un navegador
    setupFiles: ["./src/pruebas/preparacion.js"],
    globals: true,
  },
});
