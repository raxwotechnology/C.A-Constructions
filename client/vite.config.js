import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * Dev proxy: defaults to local API so new routes (e.g. /api/cheques) work before production deploy.
 * Override in `.env.development.local`:
 *   VITE_PROXY_API=https://backend.raxwo.net
 *
 * Production hosting: client-side routes (/admin, /manager, …) are not real files.
 * A refresh must return index.html (SPA fallback). See public/_redirects, public/.htaccess
 * (Hostinger / Apache), vercel.json, and nginx.spa-fallback.example.conf. If the host sends /admin
 * to the Express API instead, you get JSON: { "message": "Route /admin not found" }.
 */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const target = env.VITE_PROXY_API || 'http://127.0.0.1:5000'
  const secure = /^https:/i.test(target)

  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target,
          changeOrigin: true,
          secure,
        },
        '/uploads': {
          target,
          changeOrigin: true,
          secure,
        },
      },
    },
  }
})
