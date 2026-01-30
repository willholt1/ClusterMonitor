import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/prom": {
        target: "http://192.168.0.18:9090",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/prom/, ""),
      },
    },
  },
})
