import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

function handleAppJsPlugin() {
  return {
    name: 'handle-app-js',
    apply: 'build',
    enforce: 'pre',
    transformIndexHtml(html) {
      return html.replace(/<script src="app\.js"><\/script>/g, '<!-- APP_JS_PLACEHOLDER -->');
    },
    writeBundle() {
      const distDir = resolve(__dirname, 'dist');
      const srcFile = resolve(__dirname, 'app.js');
      const destFile = resolve(distDir, 'app.js');
      if (!existsSync(distDir)) mkdirSync(distDir, { recursive: true });
      if (existsSync(srcFile)) {
        copyFileSync(srcFile, destFile);
        console.log('✓ copied app.js to dist/');
      }
    },
    closeBundle() {
      const distDir = resolve(__dirname, 'dist');
      ['index.html', 'index-vue.html'].forEach(function(name) {
        const filePath = resolve(distDir, name);
        if (existsSync(filePath)) {
          var content = readFileSync(filePath, 'utf-8');
          content = content.replace('<!-- APP_JS_PLACEHOLDER -->', '<script src="app.js"></script>');
          writeFileSync(filePath, content);
        }
      });
      console.log('✓ injected app.js into output HTML');
    }
  };
}

export default defineConfig({
  root: '.',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      input: {
        main: './index.html',
        vue: './index-vue.html'
      },
      output: {
        manualChunks: {
          'chartjs': ['chart.js'],
          'tesseract': ['tesseract.js'],
          'vue-vendor': ['vue']
        }
      }
    }
  },
  server: {
    port: 3000,
    open: true
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src-vue')
    }
  },
  plugins: [
    vue(),
    handleAppJsPlugin(),
    {
      name: 'pwa-content-type',
      configureServer(server) {
        server.middlewares.use(function(req, res, next) {
          if (req.url === '/manifest.json') {
            res.setHeader('Content-Type', 'application/manifest+json');
          }
          if (req.url === '/sw.js') {
            res.setHeader('Service-Worker-Allowed', '/');
          }
          next();
        });
      }
    }
  ]
});