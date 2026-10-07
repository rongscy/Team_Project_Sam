import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import healthHandler from './api/health.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const RESOURCE_ID = 'd_8b84c4ee58e3cfc0ece0d773c8ca6abc';

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json());

  // Health monitoring endpoint (supports both /api/health and /api/health.js)
  app.get('/api/health', (req, res) => healthHandler(req, res));
  app.get('/api/health.js', (req, res) => healthHandler(req, res));

  // Proxy route for HDB Resale Datastore Search
  app.get('/api/resale', async (req, res) => {
    try {
      const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 500);
      const offset = Math.max(Number(req.query.offset) || 0, 0);
      const sort = typeof req.query.sort === 'string' ? req.query.sort : 'month desc';
      const town = typeof req.query.town === 'string' && req.query.town !== 'ALL' ? req.query.town : undefined;
      const flat_type =
        typeof req.query.flat_type === 'string' && req.query.flat_type !== 'ALL'
          ? req.query.flat_type
          : undefined;

      const filtersObj: Record<string, string> = {};
      if (town) filtersObj.town = town;
      if (flat_type) filtersObj.flat_type = flat_type;

      const params = new URLSearchParams({
        resource_id: RESOURCE_ID,
        limit: String(limit),
        offset: String(offset),
        sort,
      });

      if (Object.keys(filtersObj).length > 0) {
        params.set('filters', JSON.stringify(filtersObj));
      }

      const upstreamUrl = `https://data.gov.sg/api/action/datastore_search?${params.toString()}`;
      const response = await fetch(upstreamUrl, {
        headers: { Accept: 'application/json' },
      });

      if (!response.ok) {
        res.status(response.status).json({
          success: false,
          error: `Upstream data.gov.sg returned HTTP ${response.status}`,
        });
        return;
      }

      const data = await response.json();
      res.json({
        ...data,
        _meta: {
          upstreamUrl,
          filters: filtersObj,
          fetchedAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      res.status(502).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch HDB resale data',
      });
    }
  });

  // Proxy route for HDB Dataset Metadata API
  app.get('/api/metadata', async (_req, res) => {
    try {
      const upstreamUrl = `https://api-production.data.gov.sg/v2/public/api/datasets/${RESOURCE_ID}/metadata`;
      const response = await fetch(upstreamUrl, {
        headers: { Accept: 'application/json' },
      });

      if (!response.ok) {
        res.status(response.status).json({
          error: `Upstream metadata API returned HTTP ${response.status}`,
        });
        return;
      }

      const data = await response.json();
      res.json(data);
    } catch (error) {
      res.status(502).json({
        error: error instanceof Error ? error.message : 'Failed to fetch dataset metadata',
      });
    }
  });

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
