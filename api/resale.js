const RESOURCE_ID = 'd_8b84c4ee58e3cfc0ece0d773c8ca6abc';

export default async function handler(req, res) {
  if (req.method && req.method !== 'GET' && req.method !== 'HEAD') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 500);
    const offset = Math.max(Number(req.query.offset) || 0, 0);
    const sort = typeof req.query.sort === 'string' ? req.query.sort : 'month desc';
    const town = typeof req.query.town === 'string' && req.query.town !== 'ALL' ? req.query.town : undefined;
    const flat_type =
      typeof req.query.flat_type === 'string' && req.query.flat_type !== 'ALL'
        ? req.query.flat_type
        : undefined;

    const filtersObj = {};
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
}
