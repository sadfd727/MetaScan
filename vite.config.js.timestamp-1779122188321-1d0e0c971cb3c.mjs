// vite.config.js
import { defineConfig } from "file:///C:/Users/lenov/Desktop/Metascan%E6%99%BA%E8%83%BD%E4%BD%93/node_modules/vite/dist/node/index.js";
import vue from "file:///C:/Users/lenov/Desktop/Metascan%E6%99%BA%E8%83%BD%E4%BD%93/node_modules/@vitejs/plugin-vue/dist/index.mjs";
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { resolve } from "path";
var __vite_injected_original_dirname = "C:\\Users\\lenov\\Desktop\\Metascan\u667A\u80FD\u4F53";
function handleAppJsPlugin() {
  return {
    name: "handle-app-js",
    apply: "build",
    enforce: "pre",
    transformIndexHtml(html) {
      return html.replace(/<script src="app\.js"><\/script>/g, "<!-- APP_JS_PLACEHOLDER -->");
    },
    writeBundle() {
      const distDir = resolve(__vite_injected_original_dirname, "dist");
      const srcFile = resolve(__vite_injected_original_dirname, "app.js");
      const destFile = resolve(distDir, "app.js");
      if (!existsSync(distDir)) mkdirSync(distDir, { recursive: true });
      if (existsSync(srcFile)) {
        copyFileSync(srcFile, destFile);
        console.log("\u2713 copied app.js to dist/");
      }
    },
    closeBundle() {
      const distDir = resolve(__vite_injected_original_dirname, "dist");
      ["index.html", "index-vue.html"].forEach(function(name) {
        const filePath = resolve(distDir, name);
        if (existsSync(filePath)) {
          var content = readFileSync(filePath, "utf-8");
          content = content.replace("<!-- APP_JS_PLACEHOLDER -->", '<script src="app.js"></script>');
          writeFileSync(filePath, content);
        }
      });
      console.log("\u2713 injected app.js into output HTML");
    }
  };
}
var vite_config_default = defineConfig({
  root: ".",
  build: {
    outDir: "dist",
    assetsDir: "assets",
    rollupOptions: {
      input: {
        main: "./index.html",
        vue: "./index-vue.html"
      },
      output: {
        manualChunks: {
          "chartjs": ["chart.js"],
          "tesseract": ["tesseract.js"],
          "vue-vendor": ["vue"]
        }
      }
    }
  },
  server: {
    port: 3e3,
    open: true
  },
  resolve: {
    alias: {
      "@": resolve(__vite_injected_original_dirname, "src-vue")
    }
  },
  plugins: [
    vue(),
    handleAppJsPlugin(),
    {
      name: "pwa-content-type",
      configureServer(server) {
        server.middlewares.use(function(req, res, next) {
          if (req.url === "/manifest.json") {
            res.setHeader("Content-Type", "application/manifest+json");
          }
          if (req.url === "/sw.js") {
            res.setHeader("Service-Worker-Allowed", "/");
          }
          next();
        });
      }
    }
  ]
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxsZW5vdlxcXFxEZXNrdG9wXFxcXE1ldGFzY2FuXHU2NjdBXHU4MEZEXHU0RjUzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxsZW5vdlxcXFxEZXNrdG9wXFxcXE1ldGFzY2FuXHU2NjdBXHU4MEZEXHU0RjUzXFxcXHZpdGUuY29uZmlnLmpzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9DOi9Vc2Vycy9sZW5vdi9EZXNrdG9wL01ldGFzY2FuJUU2JTk5JUJBJUU4JTgzJUJEJUU0JUJEJTkzL3ZpdGUuY29uZmlnLmpzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSc7XG5pbXBvcnQgdnVlIGZyb20gJ0B2aXRlanMvcGx1Z2luLXZ1ZSc7XG5pbXBvcnQgeyBjb3B5RmlsZVN5bmMsIGV4aXN0c1N5bmMsIG1rZGlyU3luYywgcmVhZEZpbGVTeW5jLCB3cml0ZUZpbGVTeW5jIH0gZnJvbSAnZnMnO1xuaW1wb3J0IHsgcmVzb2x2ZSB9IGZyb20gJ3BhdGgnO1xuXG5mdW5jdGlvbiBoYW5kbGVBcHBKc1BsdWdpbigpIHtcbiAgcmV0dXJuIHtcbiAgICBuYW1lOiAnaGFuZGxlLWFwcC1qcycsXG4gICAgYXBwbHk6ICdidWlsZCcsXG4gICAgZW5mb3JjZTogJ3ByZScsXG4gICAgdHJhbnNmb3JtSW5kZXhIdG1sKGh0bWwpIHtcbiAgICAgIHJldHVybiBodG1sLnJlcGxhY2UoLzxzY3JpcHQgc3JjPVwiYXBwXFwuanNcIj48XFwvc2NyaXB0Pi9nLCAnPCEtLSBBUFBfSlNfUExBQ0VIT0xERVIgLS0+Jyk7XG4gICAgfSxcbiAgICB3cml0ZUJ1bmRsZSgpIHtcbiAgICAgIGNvbnN0IGRpc3REaXIgPSByZXNvbHZlKF9fZGlybmFtZSwgJ2Rpc3QnKTtcbiAgICAgIGNvbnN0IHNyY0ZpbGUgPSByZXNvbHZlKF9fZGlybmFtZSwgJ2FwcC5qcycpO1xuICAgICAgY29uc3QgZGVzdEZpbGUgPSByZXNvbHZlKGRpc3REaXIsICdhcHAuanMnKTtcbiAgICAgIGlmICghZXhpc3RzU3luYyhkaXN0RGlyKSkgbWtkaXJTeW5jKGRpc3REaXIsIHsgcmVjdXJzaXZlOiB0cnVlIH0pO1xuICAgICAgaWYgKGV4aXN0c1N5bmMoc3JjRmlsZSkpIHtcbiAgICAgICAgY29weUZpbGVTeW5jKHNyY0ZpbGUsIGRlc3RGaWxlKTtcbiAgICAgICAgY29uc29sZS5sb2coJ1x1MjcxMyBjb3BpZWQgYXBwLmpzIHRvIGRpc3QvJyk7XG4gICAgICB9XG4gICAgfSxcbiAgICBjbG9zZUJ1bmRsZSgpIHtcbiAgICAgIGNvbnN0IGRpc3REaXIgPSByZXNvbHZlKF9fZGlybmFtZSwgJ2Rpc3QnKTtcbiAgICAgIFsnaW5kZXguaHRtbCcsICdpbmRleC12dWUuaHRtbCddLmZvckVhY2goZnVuY3Rpb24obmFtZSkge1xuICAgICAgICBjb25zdCBmaWxlUGF0aCA9IHJlc29sdmUoZGlzdERpciwgbmFtZSk7XG4gICAgICAgIGlmIChleGlzdHNTeW5jKGZpbGVQYXRoKSkge1xuICAgICAgICAgIHZhciBjb250ZW50ID0gcmVhZEZpbGVTeW5jKGZpbGVQYXRoLCAndXRmLTgnKTtcbiAgICAgICAgICBjb250ZW50ID0gY29udGVudC5yZXBsYWNlKCc8IS0tIEFQUF9KU19QTEFDRUhPTERFUiAtLT4nLCAnPHNjcmlwdCBzcmM9XCJhcHAuanNcIj48L3NjcmlwdD4nKTtcbiAgICAgICAgICB3cml0ZUZpbGVTeW5jKGZpbGVQYXRoLCBjb250ZW50KTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgICBjb25zb2xlLmxvZygnXHUyNzEzIGluamVjdGVkIGFwcC5qcyBpbnRvIG91dHB1dCBIVE1MJyk7XG4gICAgfVxuICB9O1xufVxuXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoe1xuICByb290OiAnLicsXG4gIGJ1aWxkOiB7XG4gICAgb3V0RGlyOiAnZGlzdCcsXG4gICAgYXNzZXRzRGlyOiAnYXNzZXRzJyxcbiAgICByb2xsdXBPcHRpb25zOiB7XG4gICAgICBpbnB1dDoge1xuICAgICAgICBtYWluOiAnLi9pbmRleC5odG1sJyxcbiAgICAgICAgdnVlOiAnLi9pbmRleC12dWUuaHRtbCdcbiAgICAgIH0sXG4gICAgICBvdXRwdXQ6IHtcbiAgICAgICAgbWFudWFsQ2h1bmtzOiB7XG4gICAgICAgICAgJ2NoYXJ0anMnOiBbJ2NoYXJ0LmpzJ10sXG4gICAgICAgICAgJ3Rlc3NlcmFjdCc6IFsndGVzc2VyYWN0LmpzJ10sXG4gICAgICAgICAgJ3Z1ZS12ZW5kb3InOiBbJ3Z1ZSddXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH0sXG4gIHNlcnZlcjoge1xuICAgIHBvcnQ6IDMwMDAsXG4gICAgb3BlbjogdHJ1ZVxuICB9LFxuICByZXNvbHZlOiB7XG4gICAgYWxpYXM6IHtcbiAgICAgICdAJzogcmVzb2x2ZShfX2Rpcm5hbWUsICdzcmMtdnVlJylcbiAgICB9XG4gIH0sXG4gIHBsdWdpbnM6IFtcbiAgICB2dWUoKSxcbiAgICBoYW5kbGVBcHBKc1BsdWdpbigpLFxuICAgIHtcbiAgICAgIG5hbWU6ICdwd2EtY29udGVudC10eXBlJyxcbiAgICAgIGNvbmZpZ3VyZVNlcnZlcihzZXJ2ZXIpIHtcbiAgICAgICAgc2VydmVyLm1pZGRsZXdhcmVzLnVzZShmdW5jdGlvbihyZXEsIHJlcywgbmV4dCkge1xuICAgICAgICAgIGlmIChyZXEudXJsID09PSAnL21hbmlmZXN0Lmpzb24nKSB7XG4gICAgICAgICAgICByZXMuc2V0SGVhZGVyKCdDb250ZW50LVR5cGUnLCAnYXBwbGljYXRpb24vbWFuaWZlc3QranNvbicpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAocmVxLnVybCA9PT0gJy9zdy5qcycpIHtcbiAgICAgICAgICAgIHJlcy5zZXRIZWFkZXIoJ1NlcnZpY2UtV29ya2VyLUFsbG93ZWQnLCAnLycpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBuZXh0KCk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH1cbiAgXVxufSk7Il0sCiAgIm1hcHBpbmdzIjogIjtBQUEwVCxTQUFTLG9CQUFvQjtBQUN2VixPQUFPLFNBQVM7QUFDaEIsU0FBUyxjQUFjLFlBQVksV0FBVyxjQUFjLHFCQUFxQjtBQUNqRixTQUFTLGVBQWU7QUFIeEIsSUFBTSxtQ0FBbUM7QUFLekMsU0FBUyxvQkFBb0I7QUFDM0IsU0FBTztBQUFBLElBQ0wsTUFBTTtBQUFBLElBQ04sT0FBTztBQUFBLElBQ1AsU0FBUztBQUFBLElBQ1QsbUJBQW1CLE1BQU07QUFDdkIsYUFBTyxLQUFLLFFBQVEscUNBQXFDLDZCQUE2QjtBQUFBLElBQ3hGO0FBQUEsSUFDQSxjQUFjO0FBQ1osWUFBTSxVQUFVLFFBQVEsa0NBQVcsTUFBTTtBQUN6QyxZQUFNLFVBQVUsUUFBUSxrQ0FBVyxRQUFRO0FBQzNDLFlBQU0sV0FBVyxRQUFRLFNBQVMsUUFBUTtBQUMxQyxVQUFJLENBQUMsV0FBVyxPQUFPLEVBQUcsV0FBVSxTQUFTLEVBQUUsV0FBVyxLQUFLLENBQUM7QUFDaEUsVUFBSSxXQUFXLE9BQU8sR0FBRztBQUN2QixxQkFBYSxTQUFTLFFBQVE7QUFDOUIsZ0JBQVEsSUFBSSwrQkFBMEI7QUFBQSxNQUN4QztBQUFBLElBQ0Y7QUFBQSxJQUNBLGNBQWM7QUFDWixZQUFNLFVBQVUsUUFBUSxrQ0FBVyxNQUFNO0FBQ3pDLE9BQUMsY0FBYyxnQkFBZ0IsRUFBRSxRQUFRLFNBQVMsTUFBTTtBQUN0RCxjQUFNLFdBQVcsUUFBUSxTQUFTLElBQUk7QUFDdEMsWUFBSSxXQUFXLFFBQVEsR0FBRztBQUN4QixjQUFJLFVBQVUsYUFBYSxVQUFVLE9BQU87QUFDNUMsb0JBQVUsUUFBUSxRQUFRLCtCQUErQixnQ0FBZ0M7QUFDekYsd0JBQWMsVUFBVSxPQUFPO0FBQUEsUUFDakM7QUFBQSxNQUNGLENBQUM7QUFDRCxjQUFRLElBQUkseUNBQW9DO0FBQUEsSUFDbEQ7QUFBQSxFQUNGO0FBQ0Y7QUFFQSxJQUFPLHNCQUFRLGFBQWE7QUFBQSxFQUMxQixNQUFNO0FBQUEsRUFDTixPQUFPO0FBQUEsSUFDTCxRQUFRO0FBQUEsSUFDUixXQUFXO0FBQUEsSUFDWCxlQUFlO0FBQUEsTUFDYixPQUFPO0FBQUEsUUFDTCxNQUFNO0FBQUEsUUFDTixLQUFLO0FBQUEsTUFDUDtBQUFBLE1BQ0EsUUFBUTtBQUFBLFFBQ04sY0FBYztBQUFBLFVBQ1osV0FBVyxDQUFDLFVBQVU7QUFBQSxVQUN0QixhQUFhLENBQUMsY0FBYztBQUFBLFVBQzVCLGNBQWMsQ0FBQyxLQUFLO0FBQUEsUUFDdEI7QUFBQSxNQUNGO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFBQSxFQUNBLFFBQVE7QUFBQSxJQUNOLE1BQU07QUFBQSxJQUNOLE1BQU07QUFBQSxFQUNSO0FBQUEsRUFDQSxTQUFTO0FBQUEsSUFDUCxPQUFPO0FBQUEsTUFDTCxLQUFLLFFBQVEsa0NBQVcsU0FBUztBQUFBLElBQ25DO0FBQUEsRUFDRjtBQUFBLEVBQ0EsU0FBUztBQUFBLElBQ1AsSUFBSTtBQUFBLElBQ0osa0JBQWtCO0FBQUEsSUFDbEI7QUFBQSxNQUNFLE1BQU07QUFBQSxNQUNOLGdCQUFnQixRQUFRO0FBQ3RCLGVBQU8sWUFBWSxJQUFJLFNBQVMsS0FBSyxLQUFLLE1BQU07QUFDOUMsY0FBSSxJQUFJLFFBQVEsa0JBQWtCO0FBQ2hDLGdCQUFJLFVBQVUsZ0JBQWdCLDJCQUEyQjtBQUFBLFVBQzNEO0FBQ0EsY0FBSSxJQUFJLFFBQVEsVUFBVTtBQUN4QixnQkFBSSxVQUFVLDBCQUEwQixHQUFHO0FBQUEsVUFDN0M7QUFDQSxlQUFLO0FBQUEsUUFDUCxDQUFDO0FBQUEsTUFDSDtBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBQ0YsQ0FBQzsiLAogICJuYW1lcyI6IFtdCn0K
