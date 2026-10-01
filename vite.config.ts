import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
  // two pages: the interior app (index.html) and the exterior module (exterior.html)
  build: { rolldownOptions: { input: { main: "index.html", exterior: "exterior.html" } } },
});
