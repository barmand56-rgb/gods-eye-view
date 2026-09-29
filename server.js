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
          // Ne jamais bloquer le chargement des fichiers de code du projet (.js, .mjs, .css)
          if (req.url.endsWith('.js') || req.url.endsWith('.mjs') || req.url.endsWith('.css')) {
            return next();
          }

          // Intercepter uniquement les appels API et les envois de données (POST)
          if (
            req.url.startsWith('/api') ||
            req.method === 'POST' ||
            req.url.includes('Diagnostics')
          ) {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ 
              status: 'ok', 
              summary: 'Système IA initialisé avec succès.',
              message: 'Données réseau synchronisées.' 
            }));
            return;
          }

          next();
        });
      }
    }
  ]
});