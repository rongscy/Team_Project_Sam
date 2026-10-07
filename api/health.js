/**
 * /api/health.js
 * Monitors the live operational status, response latency, and schema integrity
 * of the official Singapore HDB Resale Flat Price APIs on data.gov.sg.
 */

const RESOURCE_ID = 'd_8b84c4ee58e3cfc0ece0d773c8ca6abc';
const DATASTORE_URL = `https://data.gov.sg/api/action/datastore_search?resource_id=${RESOURCE_ID}&limit=5`;
const FILTERED_SAMPLE_URL = `https://data.gov.sg/api/action/datastore_search?resource_id=${RESOURCE_ID}&limit=5&filters=%7B%22town%22%3A%22TAMPINES%22%2C%22flat_type%22%3A%224%20ROOM%22%7D`;
const METADATA_URL = `https://api-production.data.gov.sg/v2/public/api/datasets/${RESOURCE_ID}/metadata`;

export async function checkHdbApiHealth() {
  const checkedAt = new Date().toISOString();
  const startOverall = Date.now();

  const probeEndpoint = async (name, url, validator) => {
    const start = Date.now();
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const response = await fetch(url, {
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });
      clearTimeout(timeout);
      const latencyMs = Date.now() - start;

      if (!response.ok) {
        return {
          name,
          url,
          status: 'degraded',
          httpStatus: response.status,
          latencyMs,
          error: `HTTP ${response.status} ${response.statusText}`,
        };
      }

      const json = await response.json();
      const details = validator ? validator(json) : {};

      return {
        name,
        url,
        status: 'healthy',
        httpStatus: response.status,
        latencyMs,
        ...details,
      };
    } catch (err) {
      return {
        name,
        url,
        status: 'down',
        httpStatus: 0,
        latencyMs: Date.now() - start,
        error: err instanceof Error ? err.message : 'Unknown fetch error',
      };
    }
  };

  const [datastoreProbe, filteredProbe, metadataProbe] = await Promise.all([
    probeEndpoint('HDB Resale Datastore Search (Unfiltered)', DATASTORE_URL, (json) => ({
      success: Boolean(json?.success),
      totalRecords: json?.result?.total ?? 0,
      sampleCount: Array.isArray(json?.result?.records) ? json.result.records.length : 0,
    })),
    probeEndpoint('HDB Resale Datastore Search (4-Room Tampines)', FILTERED_SAMPLE_URL, (json) => ({
      success: Boolean(json?.success),
      totalMatching: json?.result?.total ?? 0,
      sampleCount: Array.isArray(json?.result?.records) ? json.result.records.length : 0,
    })),
    probeEndpoint('HDB Dataset Metadata API v2', METADATA_URL, (json) => ({
      datasetName: json?.data?.name ?? 'Resale flat prices',
      lastUpdatedAt: json?.data?.lastUpdatedAt ?? null,
      managedBy: json?.data?.managedBy ?? 'Housing & Development Board',
      coverageStart: json?.data?.coverageStart ?? null,
      coverageEnd: json?.data?.coverageEnd ?? null,
    })),
  ]);

  const endpoints = [datastoreProbe, filteredProbe, metadataProbe];
  const allHealthy = endpoints.every((e) => e.status === 'healthy');
  const anyHealthy = endpoints.some((e) => e.status === 'healthy');
  const overallStatus = allHealthy ? 'healthy' : anyHealthy ? 'degraded' : 'down';

  return {
    status: overallStatus,
    service: 'Singapore HDB Resale Flat Price API Monitor',
    resourceId: RESOURCE_ID,
    checkedAt,
    totalDurationMs: Date.now() - startOverall,
    endpoints: {
      datastoreSearch: datastoreProbe,
      filteredSearch: filteredProbe,
      datasetMetadata: metadataProbe,
    },
  };
}

export default async function handler(req, res) {
  if (req.method && req.method !== 'GET' && req.method !== 'HEAD') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  try {
    const report = await checkHdbApiHealth();
    const statusCode = report.status === 'down' ? 503 : 200;
    res.status(statusCode).json(report);
  } catch (error) {
    res.status(500).json({
      status: 'down',
      checkedAt: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Internal Health Check Error',
    });
  }
}
