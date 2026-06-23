import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    react(),
    {
      name: "storybook-static-route",
      configureServer(server) {
        server.middlewares.use((request, response, next) => {
          const pathname = request.url?.split("?")[0];

          if (pathname === "/storybook") {
            response.statusCode = 302;
            response.setHeader("Location", "/storybook/");
            response.end();
            return;
          }

          if (pathname === "/storybook/") {
            response.setHeader("Content-Type", "text/html");
            response.end(readFileSync(resolve(process.cwd(), "public/storybook/index.html")));
            return;
          }

          next();
        });
      },
    },
  ],
  server: {
    host: "0.0.0.0",
    port: 3000,
  },
});
