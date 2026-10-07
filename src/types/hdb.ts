export interface HdbRecord {
  _id: number;
  month: string;
  town: string;
  flat_type: string;
  block: string;
  street_name: string;
  storey_range: string;
  floor_area_sqm: string;
  flat_model: string;
  lease_commence_date: string;
  remaining_lease: string;
  resale_price: string;
}

export interface DatastoreSearchResponse {
  help?: string;
  success: boolean;
  result: {
    resource_id: string;
    fields?: Array<{ type: string; id: string }>;
    records: HdbRecord[];
    _links?: {
      start: string;
      next: string;
    };
    limit?: number;
    total: number;
    filters?: Record<string, string>;
  };
  _meta?: {
    upstreamUrl: string;
    filters: Record<string, string>;
    fetchedAt: string;
  };
}

export interface ColumnMetadataItem {
  colName?: string;
  name?: string;
  title?: string;
  dataType?: string;
  description?: string;
}

export interface DatasetMetadataResponse {
  code?: number;
  data?: {
    datasetId: string;
    createdAt: string;
    name: string;
    description?: string;
    format: string;
    lastUpdatedAt: string;
    managedBy: string;
    coverageStart?: string;
    coverageEnd?: string;
    columnMetadata?: {
      order?: string[];
      map?: Record<string, ColumnMetadataItem>;
    };
  };
  errorMsg?: string;
}

export interface EndpointProbeResult {
  name: string;
  url: string;
  status: 'healthy' | 'degraded' | 'down';
  httpStatus: number;
  latencyMs: number;
  error?: string;
  success?: boolean;
  totalRecords?: number;
  totalMatching?: number;
  sampleCount?: number;
  datasetName?: string;
  lastUpdatedAt?: string | null;
  managedBy?: string;
  coverageStart?: string | null;
  coverageEnd?: string | null;
}

export interface HealthReport {
  status: 'healthy' | 'degraded' | 'down';
  service: string;
  resourceId: string;
  checkedAt: string;
  totalDurationMs: number;
  endpoints: {
    datastoreSearch: EndpointProbeResult;
    filteredSearch: EndpointProbeResult;
    datasetMetadata: EndpointProbeResult;
  };
}

export interface ValuationMetrics {
  count: number;
  totalAvailable: number;
  medianPrice: number;
  averagePrice: number;
  minPrice: number;
  maxPrice: number;
  p25Price: number;
  p75Price: number;
  avgPricePerSqm: number;
  avgPricePerSqft: number;
  avgFloorAreaSqm: number;
  avgFloorAreaSqft: number;
  avgRemainingLeaseYears: number;
  latestMonth: string;
  storeyBreakdown: {
    low: { count: number; medianPrice: number };
    mid: { count: number; medianPrice: number };
    high: { count: number; medianPrice: number };
  };
}

export type FlatTypeOption =
  | 'ALL'
  | '2 ROOM'
  | '3 ROOM'
  | '4 ROOM'
  | '5 ROOM'
  | 'EXECUTIVE';

export type RegionFilter = 'ALL' | 'East' | 'North-East' | 'Central' | 'North' | 'West';

export interface TownInfo {
  id: string;
  label: string;
  region: Exclude<RegionFilter, 'ALL'>;
  maturity: 'Mature' | 'Non-Mature';
}

export const FLAT_TYPES: Array<{ id: FlatTypeOption; label: string; shortLabel: string; typicalSqm: string }> = [
  { id: '4 ROOM', label: '4-Room Flat', shortLabel: '4-Room', typicalSqm: '90–95 sqm' },
  { id: '3 ROOM', label: '3-Room Flat', shortLabel: '3-Room', typicalSqm: '65–70 sqm' },
  { id: '5 ROOM', label: '5-Room Flat', shortLabel: '5-Room', typicalSqm: '110–115 sqm' },
  { id: 'EXECUTIVE', label: 'Executive', shortLabel: 'Executive', typicalSqm: '130–145 sqm' },
  { id: '2 ROOM', label: '2-Room Flexi', shortLabel: '2-Room', typicalSqm: '45–50 sqm' },
  { id: 'ALL', label: 'All Flat Types', shortLabel: 'All Types', typicalSqm: '45–145 sqm' },
];

export const HDB_TOWNS: TownInfo[] = [
  { id: 'TAMPINES', label: 'Tampines', region: 'East', maturity: 'Mature' },
  { id: 'PUNGGOL', label: 'Punggol', region: 'North-East', maturity: 'Non-Mature' },
  { id: 'SENGKANG', label: 'Sengkang', region: 'North-East', maturity: 'Non-Mature' },
  { id: 'BISHAN', label: 'Bishan', region: 'Central', maturity: 'Mature' },
  { id: 'QUEENSTOWN', label: 'Queenstown', region: 'Central', maturity: 'Mature' },
  { id: 'ANG MO KIO', label: 'Ang Mo Kio', region: 'North-East', maturity: 'Mature' },
  { id: 'BEDOK', label: 'Bedok', region: 'East', maturity: 'Mature' },
  { id: 'BUKIT MERAH', label: 'Bukit Merah', region: 'Central', maturity: 'Mature' },
  { id: 'TOA PAYOH', label: 'Toa Payoh', region: 'Central', maturity: 'Mature' },
  { id: 'CLEMENTI', label: 'Clementi', region: 'West', maturity: 'Mature' },
  { id: 'JURONG WEST', label: 'Jurong West', region: 'West', maturity: 'Non-Mature' },
  { id: 'JURONG EAST', label: 'Jurong East', region: 'West', maturity: 'Non-Mature' },
  { id: 'WOODLANDS', label: 'Woodlands', region: 'North', maturity: 'Non-Mature' },
  { id: 'YISHUN', label: 'Yishun', region: 'North', maturity: 'Non-Mature' },
  { id: 'HOUGANG', label: 'Hougang', region: 'North-East', maturity: 'Non-Mature' },
  { id: 'SERANGOON', label: 'Serangoon', region: 'North-East', maturity: 'Mature' },
  { id: 'KALLANG/WHAMPOA', label: 'Kallang / Whampoa', region: 'Central', maturity: 'Mature' },
  { id: 'GEYLANG', label: 'Geylang', region: 'Central', maturity: 'Mature' },
  { id: 'PASIR RIS', label: 'Pasir Ris', region: 'East', maturity: 'Mature' },
  { id: 'MARINE PARADE', label: 'Marine Parade', region: 'East', maturity: 'Mature' },
  { id: 'BUKIT BATOK', label: 'Bukit Batok', region: 'West', maturity: 'Non-Mature' },
  { id: 'BUKIT PANJANG', label: 'Bukit Panjang', region: 'West', maturity: 'Non-Mature' },
  { id: 'CHOA CHU KANG', label: 'Choa Chu Kang', region: 'West', maturity: 'Non-Mature' },
  { id: 'SEMBAWANG', label: 'Sembawang', region: 'North', maturity: 'Non-Mature' },
  { id: 'CENTRAL AREA', label: 'Central Area', region: 'Central', maturity: 'Mature' },
  { id: 'BUKIT TIMAH', label: 'Bukit Timah', region: 'Central', maturity: 'Mature' },
];
