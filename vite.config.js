import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

function ensureMediapipeSourcemapStub() {
  return {
    name: 'ensure-mediapipe-sourcemap-stub',
    apply: 'serve', // dev only; not needed at build time
    configResolved() {
      try {
        const pkgDir = path.resolve(
          __dirname,
          'node_modules/@mediapipe/tasks-vision'
        );
        if (!fs.existsSync(pkgDir)) return; // dep not installed yet — nothing to do
        const mapPath = path.join(pkgDir, 'vision_bundle_mjs.js.map');
        if (fs.existsSync(mapPath)) return; // real map already there — leave it alone
        fs.writeFileSync(
          mapPath,
          JSON.stringify({
            version: 3,
            file: 'vision_bundle.mjs',
            sources: [],
            sourcesContent: [],
            names: [],
            mappings: '',
          })
        );
      } catch (err) {
        // Non-fatal: dev still works, only the cosmetic warning remains.
        // eslint-disable-next-line no-console
        console.warn(
          '[ensure-mediapipe-sourcemap-stub] Could not create stub map:',
          err.message
        );
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), ensureMediapipeSourcemapStub()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    fs: {
      strict: false,
    },
    https: {
      key: fs.readFileSync('./localhost+2-key.pem'),
      cert: fs.readFileSync('./localhost+2.pem'),
    },
    proxy: {

      '/weekly_interview': {
        target: 'https://192.168.48.201:8025',
        changeOrigin: true,
        secure: false,
        ws: true,
      },
      '/js/practice': {
        target: 'https://192.168.48.201:8025',
        changeOrigin: true,
        secure: false,
        ws: true,
      },
      '/ws/js/practice': {
        target: 'https://192.168.48.201:8025',
        changeOrigin: true,
        secure: false,
        ws: true,
      },

      '/api/jobseekers/quick-interview': {
        target: 'https://192.168.48.201:8025',
        changeOrigin: true,
        secure: false,
      },
      '/api/jobseeker/': {
        target: 'https://192.168.48.201:8025',
        changeOrigin: true,
        secure: false,
      },
      '/api/resume-builder': {
        target: 'https://192.168.48.201:8025',
        changeOrigin: true,
        secure: false,
      },
      '/api/js/practice/': {
        target: 'https://192.168.48.201:8025',
        changeOrigin: true,
        secure: false,
        rewrite: (p) => p.replace('/api/js/', '/api/'),
      },
      '/api/js/': {
        target: 'https://192.168.48.201:8025',
        changeOrigin: true,
        secure: false,
        rewrite: (p) => p.replace('/api/js/', '/api/'),
      },
      '/api/manual-': {
        target: 'https://192.168.48.201:8025',
        changeOrigin: true,
        secure: false,
      },
      '/api/ai-assessment': {
        target: 'https://192.168.48.201:8025',
        changeOrigin: true,
        secure: false,
      },
      '/api/ai-paper': {
        target: 'https://192.168.48.201:8025',
        changeOrigin: true,
        secure: false,
      },


      '/api/auth': {
        target: 'https://192.168.48.201:8025',
        changeOrigin: true,
        secure: false,
      },

      '/api/support/contact': {
        target: 'https://192.168.48.201:8025',
        changeOrigin: true,
        secure: false,
      },

      '/api/support': {
        target: 'https://192.168.48.201:8025',
        changeOrigin: true,
        secure: false,
      },
      '/api/public': {
        target: 'https://192.168.48.201:8025',
        changeOrigin: true,
        secure: false,
      },

      '/api': {
        target: 'https://192.168.48.201:8025',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {

    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              
              name: 'react-vendor',
              test: (id) =>
                /node_modules[\\/](react|react-dom|react-is|scheduler|react-router|react-router-dom)[\\/]/.test(id),
              priority: 40,
            },
            {

              name: 'mui-vendor',
              test: (id) =>
                /node_modules[\\/](@mui|@emotion|@popperjs|stylis|clsx|react-transition-group)[\\/]/.test(id) &&
                !/node_modules[\\/]@mui[\\/]x-date-pickers[\\/]/.test(id),
              priority: 30,
            },
            {

              name: 'datepicker-vendor',
              test: (id) =>
                /node_modules[\\/]@mui[\\/]x-date-pickers[\\/]/.test(id) ||
                /node_modules[\\/]date-fns[\\/]/.test(id),
              priority: 10,
            },
            {
              name: 'charts-vendor',
              test: (id) =>
                /node_modules[\\/](recharts|d3-[^\\/]+|victory-vendor|decimal\.js-light|internmap)[\\/]/.test(id),
              priority: 10,
            },
            {
              // LiveKit WebRTC stack. Only /live-room and /waiting-room.
              name: 'livekit-vendor',
              test: (id) => /node_modules[\\/](livekit-client|@livekit)[\\/]/.test(id),
              priority: 10,
            },
          ],
        },
      },
    },

    chunkSizeWarningLimit: 700,
  },
  resolve: {
    alias: {
      '@':path.resolve(__dirname, 'src'),
      '@assets':path.resolve(__dirname, 'src/assets'),
      '@components':  path.resolve(__dirname, 'src/components'),
      '@config':      path.resolve(__dirname, 'src/config'),
      '@constants':   path.resolve(__dirname, 'src/constants'),
      '@contexts':    path.resolve(__dirname, 'src/contexts'),
      '@hooks':       path.resolve(__dirname, 'src/hooks'),
      '@layouts':     path.resolve(__dirname, 'src/layouts'),
      '@pages':       path.resolve(__dirname, 'src/pages'),
      '@routes':      path.resolve(__dirname, 'src/routes'),
      '@services':    path.resolve(__dirname, 'src/services'),
      '@utils':       path.resolve(__dirname, 'src/utils'),
      '@theme':       path.resolve(__dirname, 'src/theme'),
    },
  },
  optimizeDeps: {
    exclude: ['@mediapipe/tasks-vision'],
  },
});