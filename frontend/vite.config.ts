import react from "@vitejs/plugin-react";
import {defineConfig} from "vite";

export default defineConfig({
    plugins: [react()],
    server: {
        port: 5173,
        strictPort: true,
        proxy: {
            // Spring Boot backend
            "/api": {
                target: "http://localhost:8080",
                changeOrigin: true,
            },
            // Keycloak, used only for the token endpoint (see src/lib/auth.ts).
            // The Origin header is dropped so Keycloak treats the call like a
            // server-side request and its "Web origins" client setting doesn't matter.
            "/keycloak": {
                target: "http://localhost:9090",
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/keycloak/, ""),
                configure: (proxy) => {
                    proxy.on("proxyReq", (proxyReq) => proxyReq.removeHeader("origin"));
                },
            },
        },
    },
});
