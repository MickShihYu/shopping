import {defineConfig, loadEnv} from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig(({mode}) => {
  const env = loadEnv(mode, process.cwd(), '');
  const ORDER_SERVICE_URL = env.ORDER_SERVICE_URL || 'http://127.0.0.1:3002';
  const PRODUCT_SERVICE_URL =
    env.PRODUCT_SERVICE_URL || 'http://127.0.0.1:3001';
  const AUTH_SERVICE_URL = env.AUTH_SERVICE_URL || 'http://127.0.0.1:3003';

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/users': {
          target: AUTH_SERVICE_URL,
          changeOrigin: true,
        },
        '/user-orders': {
          target: ORDER_SERVICE_URL,
          changeOrigin: true,
          rewrite: path => path.replace(/^\/user-orders/, '/users'),
        },
        '/shoppingCarts': {
          target: ORDER_SERVICE_URL,
          changeOrigin: true,
        },
        '/orders': {
          target: ORDER_SERVICE_URL,
          changeOrigin: true,
          bypass: req => {
            if (req.headers.accept?.includes('text/html')) {
              return '/index.html';
            }
          },
        },
        '/admin/products': {
          target: PRODUCT_SERVICE_URL,
          changeOrigin: true,
        },
        '/admin': {
          target: ORDER_SERVICE_URL,
          changeOrigin: true,
        },
        '/explorer': {
          target: ORDER_SERVICE_URL,
          changeOrigin: true,
        },
        '/ping': {
          target: ORDER_SERVICE_URL,
          changeOrigin: true,
        },
        '/openapi.json': {
          target: ORDER_SERVICE_URL,
          changeOrigin: true,
        },

        '/products': {
          target: PRODUCT_SERVICE_URL,
          changeOrigin: true,
        },
      },
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
    },
  };
});
