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
          // Intercepter UNIQUEMENT les requêtes d'API explicites vers /api
          if (req.url.startsWith('/api')) {
            res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify({ 
              status: 'ok', 
              summary: 'Système IA initialisé.',
              message: 'Données réseau synchronisées.' 
            }));
          }

          // Si le frontend cherche des requêtes de diagnostic spécifiques en JSON
          if ((req.url.includes('Diagnostics') || req.url.includes('defaults')) && !req.url.endsWith('.js')) {
            res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify({ status: 'ok' }));
          }

          next();
        });
      }
    }
  ]
});