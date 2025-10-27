import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react-swc';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: env.VITE_API_BASE_URL
        ? {
            '/uploads': {
              target: env.VITE_API_BASE_URL,
              changeOrigin: true
            }
          }
        : undefined
    }
  };
});
