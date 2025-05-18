import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    proxy: {
      '/api/testcompany': {
        target: 'http://localhost:3000/internal/oneshot/company/settings',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/testcompany/, ''),
        secure: false,
      },
      // Weitere Proxys können hier ergänzt werden, z.B.:
      // '/api/customers': {
      //   target: 'http://localhost:3000/internal/oneshot/cust',
      //   changeOrigin: true,
      //   rewrite: (path) => path.replace(/^\/api\/customers/, ''),
      //   secure: false,
      // },
    },
  },
});
