import { defineConfig } from 'vite';

export default defineConfig({
  preview: {
    allowedHosts: true,
    host: '0.0.0.0',
  },
  server: {
    allowedHosts: true,
    host: '0.0.0.0',
  },
  plugins: [
    {
      name: 'api-handler',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          // Protéger les fichiers JS/CSS
          if (req.url.endsWith('.js') || req.url.endsWith('.mjs') || req.url.endsWith('.css')) {
            return next();
          }

          // Répondre aux requêtes API / HUD
          if (req.url.startsWith('/api') || req.method === 'POST') {
            res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify({ 
              status: 'ok', 
              summary: 'Analyse satellite active. Zone sécurisée.',
              message: 'Système opérationnel.' 
            }));
          }

          next();
        });
      }
    }
  ]
});