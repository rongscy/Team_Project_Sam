import {
  DatastoreSearchResponse,
  DatasetMetadataResponse,
  FlatTypeOption,
  HdbRecord,
  HealthReport,
  ValuationMetrics,
} from '../types/hdb';

const RESOURCE_ID = 'd_8b84c4ee58e3cfc0ece0d773c8ca6abc';
const SQM_TO_SQFT = 10.7639104;

export function buildOfficialApiUrl(params: {
  town: string;
  flatType: FlatTypeOption;
  limit?: number;
  sort?: string;
}): string {
  const { town, flatType, limit = 100, sort = 'month desc' } = params;
  const filters: Record<string, string> = {};
  if (town && town !== 'ALL') filters.town = town;
  if (flatType && flatType !== 'ALL') filters.flat_type = flatType;

  const searchParams = new URLSearchParams({
    resource_id: RESOURCE_ID,
    limit: String(limit),
  });

  if (sort) {
    searchParams.set('sort', sort);
  }

  if (Object.keys(filters).length > 0) {
    searchParams.set('filters', JSON.stringify(filters));
  }

  return `https://data.gov.sg/api/action/datastore_search?${searchParams.toString()}`;
}

export async function fetchResaleTransactions(params: {
  town: string;
  flatType: FlatTypeOption;
  limit?: number;
  sort?: string;
}): Promise<DatastoreSearchResponse> {
  const { town, flatType, limit = 100, sort = 'month desc' } = params;

  const query = new URLSearchParams({
    limit: String(limit),
    sort,
  });
  if (town && town !== 'ALL') query.set('town', town);
  if (flatType && flatType !== 'ALL') query.set('flat_type', flatType);

  try {
    const res = await fetch(`/api/resale?${query.toString()}`);
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Fallback to direct data.gov.sg call if local proxy is unavailable
  }

  const directUrl = buildOfficialApiUrl({ town, flatType, limit, sort });
  const directRes = await fetch(directUrl);
  if (!directRes.ok) {
    throw new Error(`HDB API returned status ${directRes.status}`);
  }
  const data = await directRes.json();
  return {
    ...data,
    _meta: {
      upstreamUrl: directUrl,
      filters: {
        ...(town !== 'ALL' ? { town } : {}),
        ...(flatType !== 'ALL' ? { flat_type: flatType } : {}),
      },
      fetchedAt: new Date().toISOString(),
    },
  };
}

export async function fetchDatasetMetadata(): Promise<DatasetMetadataResponse> {
  try {
    const res = await fetch('/api/metadata');
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Fallback to direct metadata API
  }

  const directRes = await fetch(
    `https://api-production.data.gov.sg/v2/public/api/datasets/${RESOURCE_ID}/metadata`
  );
  if (!directRes.ok) {
    throw new Error(`Dataset metadata API returned status ${directRes.status}`);
  }
  return await directRes.json();
}

export async function fetchApiHealth(): Promise<HealthReport> {
  const res = await fetch('/api/health.js');
  if (!res.ok && res.status !== 503) {
    throw new Error(`Health endpoint returned HTTP ${res.status}`);
  }
  return await res.json();
}

export function parseRemainingLeaseYears(leaseStr: string): number {
  if (!leaseStr) return 0;
  const yearsMatch = leaseStr.match(/(\d+)\s*year/i);
  const monthsMatch = leaseStr.match(/(\d+)\s*month/i);
  const years = yearsMatch ? Number(yearsMatch[1]) : 0;
  const months = monthsMatch ? Number(monthsMatch[1]) : 0;
  return years + months / 12;
}

function getPercentile(sortedNumbers: number[], percentile: number): number {
  if (sortedNumbers.length === 0) return 0;
  const index = (percentile / 100) * (sortedNumbers.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sortedNumbers[lower];
  return sortedNumbers[lower] + (sortedNumbers[upper] - sortedNumbers[lower]) * (index - lower);
}

export function computeValuationMetrics(
  records: HdbRecord[],
  totalAvailable: number
): ValuationMetrics {
  if (!records || records.length === 0) {
    return {
      count: 0,
      totalAvailable: 0,
      medianPrice: 0,
      averagePrice: 0,
      minPrice: 0,
      maxPrice: 0,
      p25Price: 0,
      p75Price: 0,
      avgPricePerSqm: 0,
      avgPricePerSqft: 0,
      avgFloorAreaSqm: 0,
      avgFloorAreaSqft: 0,
      avgRemainingLeaseYears: 0,
      latestMonth: '—',
      storeyBreakdown: {
        low: { count: 0, medianPrice: 0 },
        mid: { count: 0, medianPrice: 0 },
        high: { count: 0, medianPrice: 0 },
      },
    };
  }

  const prices: number[] = [];
  let totalPrice = 0;
  let totalSqm = 0;
  let totalPricePerSqm = 0;
  let totalLeaseYears = 0;
  let leaseCount = 0;

  const lowPrices: number[] = [];
  const midPrices: number[] = [];
  const highPrices: number[] = [];

  let latestMonth = records[0]?.month || '—';

  for (const rec of records) {
    const price = Number(rec.resale_price) || 0;
    const sqm = Number(rec.floor_area_sqm) || 0;
    const leaseYears = parseRemainingLeaseYears(rec.remaining_lease);

    if (rec.month && rec.month > latestMonth) {
      latestMonth = rec.month;
    }

    if (price > 0) {
      prices.push(price);
      totalPrice += price;

      if (sqm > 0) {
        totalSqm += sqm;
        totalPricePerSqm += price / sqm;
      }

      if (leaseYears > 0) {
        totalLeaseYears += leaseYears;
        leaseCount++;
      }

      const storeyMatch = rec.storey_range?.match(/^(\d+)/);
      const startFloor = storeyMatch ? Number(storeyMatch[1]) : 1;
      if (startFloor <= 6) {
        lowPrices.push(price);
      } else if (startFloor <= 12) {
        midPrices.push(price);
      } else {
        highPrices.push(price);
      }
    }
  }

  const sortedPrices = [...prices].sort((a, b) => a - b);
  const count = sortedPrices.length;
  const medianPrice = Math.round(getPercentile(sortedPrices, 50));
  const averagePrice = count > 0 ? Math.round(totalPrice / count) : 0;
  const minPrice = count > 0 ? sortedPrices[0] : 0;
  const maxPrice = count > 0 ? sortedPrices[count - 1] : 0;
  const p25Price = Math.round(getPercentile(sortedPrices, 25));
  const p75Price = Math.round(getPercentile(sortedPrices, 75));

  const avgFloorAreaSqm = count > 0 ? totalSqm / count : 0;
  const avgFloorAreaSqft = avgFloorAreaSqm * SQM_TO_SQFT;
  const avgPricePerSqm = count > 0 ? Math.round(totalPricePerSqm / count) : 0;
  const avgPricePerSqft = Math.round(avgPricePerSqm / SQM_TO_SQFT);
  const avgRemainingLeaseYears =
    leaseCount > 0 ? Number((totalLeaseYears / leaseCount).toFixed(1)) : 0;

  const sortNum = (arr: number[]) => [...arr].sort((a, b) => a - b);

  return {
    count,
    totalAvailable,
    medianPrice,
    averagePrice,
    minPrice,
    maxPrice,
    p25Price,
    p75Price,
    avgPricePerSqm,
    avgPricePerSqft,
    avgFloorAreaSqm: Number(avgFloorAreaSqm.toFixed(1)),
    avgFloorAreaSqft: Math.round(avgFloorAreaSqft),
    avgRemainingLeaseYears,
    latestMonth,
    storeyBreakdown: {
      low: {
        count: lowPrices.length,
        medianPrice: Math.round(getPercentile(sortNum(lowPrices), 50)),
      },
      mid: {
        count: midPrices.length,
        medianPrice: Math.round(getPercentile(sortNum(midPrices), 50)),
      },
      high: {
        count: highPrices.length,
        medianPrice: Math.round(getPercentile(sortNum(highPrices), 50)),
      },
    },
  };
}

export function formatSgd(amount: number): string {
  if (!amount || Number.isNaN(amount)) return 'S$0';
  return new Intl.NumberFormat('en-SG', {
    style: 'currency',
    currency: 'SGD',
    maximumFractionDigits: 0,
  }).format(amount);
}
