import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import healthHandler from './api/health.js';
import resaleHandler from './api/resale.js';
import metadataHandler from './api/metadata.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json());

  // Health monitoring endpoint (supports both /api/health and /api/health.js)
  app.get('/api/health', (req, res) => healthHandler(req, res));
  app.get('/api/health.js', (req, res) => healthHandler(req, res));

  // Proxy route for HDB Resale Datastore Search
  app.get('/api/resale', (req, res) => resaleHandler(req, res));
  app.get('/api/resale.js', (req, res) => resaleHandler(req, res));

  // Proxy route for HDB Dataset Metadata API
  app.get('/api/metadata', (req, res) => metadataHandler(req, res));
  app.get('/api/metadata.js', (req, res) => metadataHandler(req, res));

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
