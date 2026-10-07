const RESOURCE_ID = 'd_8b84c4ee58e3cfc0ece0d773c8ca6abc';

export default async function handler(req, res) {
  if (req.method && req.method !== 'GET' && req.method !== 'HEAD') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

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
}
