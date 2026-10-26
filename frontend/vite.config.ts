import { defineConfig } from 'vitest/config'
import { loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

/**
 * Content-Security-Policy for production builds, as a <meta> tag so it works on any
 * static host. Scripts may only come from this origin and requests may only go to
 * this origin and the API, so injected script cannot exfiltrate the session tokens
 * to another site. Build-only: the dev server relies on inline scripts (HMR).
 * frame-ancestors cannot be set from a meta tag; the hosts send X-Frame-Options.
 */
function contentSecurityPolicy(apiUrl: string): Plugin {
  let apiOrigin = ''
  try {
    apiOrigin = new URL(apiUrl).origin
  } catch {
    // relative API URL: same origin, already covered by 'self'
  }
  const policy = [
    "default-src 'self'",
    "script-src 'self'",
    // index.html and framer-motion use inline styles.
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob:",
    `connect-src 'self' ${apiOrigin}`.trim(),
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ')

  return {
    name: 'content-security-policy',
    apply: 'build',
    transformIndexHtml: () => [
      {
        tag: 'meta',
        attrs: { 'http-equiv': 'Content-Security-Policy', content: policy },
        injectTo: 'head-prepend',
      },
    ],
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  const apiUrl = env.VITE_API_URL ?? 'http://localhost:8000'

  return {
    plugins: [react(), tailwindcss(), contentSecurityPolicy(apiUrl)],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, './src'),
      },
    },
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      css: false,
    },
    server: {
      host: true,
      port: 5173,
    },
  }
})
