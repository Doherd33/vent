// ── Vite Configuration ──────────────────────────────────────────────────────
// Vite serves the frontend (client/) during development with hot reload,
// and proxies API requests to the Express backend on port 3001.
//
// Usage:
//   npm run dev     → starts Vite dev server (port 5173) + opens browser
//   npm run build   → minifies CSS/JS into client/dist/ for production
//   npm start       → runs the Express server (production, no Vite needed)
// ────────────────────────────────────────────────────────────────────────────
import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: 'client',

  server: {
    port: 5173,
    open: '/hub/hub.html',

    proxy: {
      '/api':            { target: 'http://localhost:3001', changeOrigin: true },
      '/charlie':        { target: 'http://localhost:3001', changeOrigin: true },
      '/submissions':    { target: 'http://localhost:3001', changeOrigin: true },
      '/vapi':           { target: 'http://localhost:3001', changeOrigin: true },
      '/admin/setup':    { target: 'http://localhost:3001', changeOrigin: true },
      '/admin/seed':     { target: 'http://localhost:3001', changeOrigin: true },
      '/auth': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        bypass: (req) => { if (req.url.match(/\.(html|css|js)$/)) return req.url; },
      },
      '/query':          { target: 'http://localhost:3001', changeOrigin: true },
      '/chat':           { target: 'http://localhost:3001', changeOrigin: true },
      '/sop':            { target: 'http://localhost:3001', changeOrigin: true },
      '/manual':         { target: 'http://localhost:3001', changeOrigin: true },
      '/todos':          { target: 'http://localhost:3001', changeOrigin: true },
      '/deviations':     { target: 'http://localhost:3001', changeOrigin: true },
      '/capas':          { target: 'http://localhost:3001', changeOrigin: true },
      '/change-control': { target: 'http://localhost:3001', changeOrigin: true },
      '/doc-control':    { target: 'http://localhost:3001', changeOrigin: true },
      '/docs':           { target: 'http://localhost:3001', changeOrigin: true },
      '/documents':      { target: 'http://localhost:3001', changeOrigin: true },
      '/sops':           { target: 'http://localhost:3001', changeOrigin: true },
      '/gdp':            { target: 'http://localhost:3001', changeOrigin: true },
      '/analytics':      { target: 'http://localhost:3001', changeOrigin: true },
      '/feedback':       { target: 'http://localhost:3001', changeOrigin: true },
      '/manuals':        { target: 'http://localhost:3001', changeOrigin: true },
      '/page-index.json': { target: 'http://localhost:3001', changeOrigin: true },
    },
  },

  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      input: {
        hub:           resolve(__dirname, 'client/hub/hub.html'),
        login:         resolve(__dirname, 'client/auth/login.html'),
        query:         resolve(__dirname, 'client/operator/query.html'),
        voiceIndex:    resolve(__dirname, 'client/operator/index.html'),
        feedback:      resolve(__dirname, 'client/operator/feedback.html'),
        qa:            resolve(__dirname, 'client/qa/qa.html'),
        workflow:      resolve(__dirname, 'client/qa/workflow.html'),
        submissions:   resolve(__dirname, 'client/qa/submissions.html'),
        deviations:    resolve(__dirname, 'client/qa/deviations.html'),
        capas:         resolve(__dirname, 'client/qa/capas.html'),
        changeControl: resolve(__dirname, 'client/qa/change-control.html'),
        documents:     resolve(__dirname, 'client/qa/documents.html'),
        builder:       resolve(__dirname, 'client/qa/builder.html'),
        dashboard:     resolve(__dirname, 'client/management/dashboard.html'),
      },
    },
  },
});
