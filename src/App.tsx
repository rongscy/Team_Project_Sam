import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Search,
  SlidersHorizontal,
  ArrowUpDown,
  Copy,
  Check,
  RefreshCw,
  Calculator,
  Activity,
  ChevronRight,
} from 'lucide-react';
import {
  DatasetMetadataResponse,
  FLAT_TYPES,
  FlatTypeOption,
  HDB_TOWNS,
  HdbRecord,
  HealthReport,
  RegionFilter,
} from './types/hdb';
import {
  buildOfficialApiUrl,
  computeValuationMetrics,
  fetchApiHealth,
  fetchDatasetMetadata,
  fetchResaleTransactions,
  formatSgd,
} from './services/hdbApi';
import { AffordabilityCalculator } from './components/AffordabilityCalculator';
import { ApiHealthModal } from './components/ApiHealthModal';

const REGIONS: RegionFilter[] = ['ALL', 'East', 'North-East', 'Central', 'West', 'North'];

export default function App() {
  // Primary 1-Click Filters (Defaults to 4 ROOM in TAMPINES per user specification)
  const [selectedFlatType, setSelectedFlatType] = useState<FlatTypeOption>('4 ROOM');
  const [selectedTown, setSelectedTown] = useState<string>('TAMPINES');
  const [selectedRegion, setSelectedRegion] = useState<RegionFilter>('ALL');
  const [townQuery, setTownQuery] = useState<string>('');

  // Transaction Table Filters & Sorting
  const [streetSearch, setStreetSearch] = useState<string>('');
  const [sortBy, setSortBy] = useState<'recent' | 'price-asc' | 'price-desc' | 'sqm-desc'>('recent');
  const [recordLimit, setRecordLimit] = useState<number>(100);

  // Live API Data State
  const [records, setRecords] = useState<HdbRecord[]>([]);
  const [totalAvailable, setTotalAvailable] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<boolean>(false);

  // Pinned Transaction for Calculator
  const [pinnedRecord, setPinnedRecord] = useState<HdbRecord | null>(null);

  // API Health & Metadata State
  const [healthReport, setHealthReport] = useState<HealthReport | null>(null);
  const [metadata, setMetadata] = useState<DatasetMetadataResponse | null>(null);
  const [isHealthModalOpen, setIsHealthModalOpen] = useState<boolean>(false);
  const [isCheckingHealth, setIsCheckingHealth] = useState<boolean>(false);

  const loadTransactions = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetchResaleTransactions({
        town: selectedTown,
        flatType: selectedFlatType,
        limit: recordLimit,
        sort: 'month desc',
      });
      setRecords(response.result?.records || []);
      setTotalAvailable(response.result?.total || 0);
      setPinnedRecord(null);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to reach official data.gov.sg HDB resale endpoint.'
      );
    } finally {
      setIsLoading(false);
    }
  }, [selectedTown, selectedFlatType, recordLimit]);

  const loadHealthAndMetadata = useCallback(async () => {
    setIsCheckingHealth(true);
    try {
      const [healthRes, metaRes] = await Promise.allSettled([
        fetchApiHealth(),
        fetchDatasetMetadata(),
      ]);
      if (healthRes.status === 'fulfilled') {
        setHealthReport(healthRes.value);
      }
      if (metaRes.status === 'fulfilled') {
        setMetadata(metaRes.value);
      }
    } finally {
      setIsCheckingHealth(false);
    }
  }, []);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  useEffect(() => {
    loadHealthAndMetadata();
  }, [loadHealthAndMetadata]);

  // Filtered Towns for the 1-Click Town Selector
  const visibleTowns = useMemo(() => {
    return HDB_TOWNS.filter((t) => {
      const matchesRegion = selectedRegion === 'ALL' || t.region === selectedRegion;
      const matchesQuery =
        !townQuery.trim() ||
        t.label.toLowerCase().includes(townQuery.trim().toLowerCase()) ||
        t.id.toLowerCase().includes(townQuery.trim().toLowerCase());
      return matchesRegion && matchesQuery;
    });
  }, [selectedRegion, townQuery]);

  // Valuation Metrics computed from live records
  const metrics = useMemo(() => {
    return computeValuationMetrics(records, totalAvailable);
  }, [records, totalAvailable]);

  // Client-side Street / Block filter and sort for the transactions list
  const displayedRecords = useMemo(() => {
    const filtered = records.filter((rec) => {
      if (!streetSearch.trim()) return true;
      const q = streetSearch.trim().toLowerCase();
      return (
        rec.street_name?.toLowerCase().includes(q) ||
        rec.block?.toLowerCase().includes(q) ||
        rec.flat_model?.toLowerCase().includes(q) ||
        rec.town?.toLowerCase().includes(q)
      );
    });

    return [...filtered].sort((a, b) => {
      if (sortBy === 'price-asc') {
        return Number(a.resale_price) - Number(b.resale_price);
      }
      if (sortBy === 'price-desc') {
        return Number(b.resale_price) - Number(a.resale_price);
      }
      if (sortBy === 'sqm-desc') {
        return Number(b.floor_area_sqm) - Number(a.floor_area_sqm);
      }
      return b.month.localeCompare(a.month);
    });
  }, [records, streetSearch, sortBy]);

  const activeTownObj = HDB_TOWNS.find((t) => t.id === selectedTown);
  const activeTownLabel = selectedTown === 'ALL' ? 'All Singapore Towns' : activeTownObj?.label || selectedTown;
  const activeFlatObj = FLAT_TYPES.find((f) => f.id === selectedFlatType);
  const activeFlatLabel = activeFlatObj?.label || selectedFlatType;

  const currentOfficialUrl = useMemo(() => {
    return buildOfficialApiUrl({
      town: selectedTown,
      flatType: selectedFlatType,
      limit: 5,
      sort: '',
    });
  }, [selectedTown, selectedFlatType]);

  const handleCopyApiUrl = async () => {
    try {
      await navigator.clipboard.writeText(currentOfficialUrl);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } catch {
      // Ignore clipboard failures in restricted frames
    }
  };

  const handleSelectRecordForCalculator = (rec: HdbRecord) => {
    setPinnedRecord(rec);
    const calcEl = document.getElementById('calculator');
    if (calcEl) {
      calcEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5F7] text-[#1D1D1F] flex flex-col">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-30 h-14 bg-white/85 backdrop-blur-md border-b border-black/[0.06] px-4 sm:px-8 flex items-center justify-between">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#valuation"
          className="text-base sm:text-lg font-semibold tracking-tight text-[#1D1D1F] whitespace-nowrap"
        >
          HDB Valuation
        </a>

        {/* Zone 2: 4 clean text navigation links */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-[#6E6E73]">
          <a href="#valuation" className="hover:text-[#1D1D1F] transition-colors whitespace-nowrap">
            Valuation
          </a>
          <a href="#towns" className="hover:text-[#1D1D1F] transition-colors whitespace-nowrap">
            Towns
          </a>
          <a href="#transactions" className="hover:text-[#1D1D1F] transition-colors whitespace-nowrap">
            Transactions
          </a>
          <a href="#calculator" className="hover:text-[#1D1D1F] transition-colors whitespace-nowrap">
            Calculator
          </a>
        </nav>

        {/* Zone 3: 1 primary action (API Health Monitor) */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsHealthModalOpen(true)}
            className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-[#F5F5F7] hover:bg-[#E8E8ED] text-xs font-medium text-[#1D1D1F] flex items-center gap-2 transition-colors whitespace-nowrap"
          >
            <Activity
              className={`w-3.5 h-3.5 ${
                healthReport?.status === 'healthy'
                  ? 'text-[#16A34A]'
                  : healthReport?.status === 'degraded'
                  ? 'text-[#D97706]'
                  : 'text-[#0071E3]'
              }`}
            />
            <span>
              {healthReport?.status === 'healthy'
                ? 'API Healthy'
                : healthReport?.status === 'degraded'
                ? 'API Degraded'
                : 'API Monitor'}
            </span>
          </button>
        </div>
      </header>

      {/* Main Content Container (1440px baseline, 1200px max content container) */}
      <main className="flex-1 w-full max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-8 sm:space-y-10">
        {/* Section 1: Hero & One-Click Flat Type Selector */}
        <section id="valuation" className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <p className="text-xs font-medium text-[#6E6E73] mb-1.5">
                Official Data.gov.sg Resale Register · Jan 2017 – Present
              </p>
              <h1 className="text-2xl sm:text-4xl font-semibold tracking-tight text-[#1D1D1F] text-balance">
                How much does a Singapore HDB flat cost?
              </h1>
            </div>

            <p className="text-xs text-[#6E6E73] font-mono-tabular">
              {metadata?.data?.lastUpdatedAt
                ? `Updated ${new Date(metadata.data.lastUpdatedAt).toLocaleDateString('en-SG', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}`
                : 'Live HDB Resale Dataset'}
            </p>
          </div>

          {/* One-Click Flat Type Segmented Bar */}
          <div className="bg-white rounded-2xl border border-black/[0.06] p-2">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-1.5">
              {FLAT_TYPES.map((ft) => {
                const isActive = selectedFlatType === ft.id;
                return (
                  <button
                    key={ft.id}
                    type="button"
                    onClick={() => setSelectedFlatType(ft.id)}
                    className={`min-h-[48px] px-3 py-2 rounded-xl text-left transition-all flex flex-col justify-center ${
                      isActive
                        ? 'bg-[#0071E3] text-white shadow-xs'
                        : 'bg-transparent text-[#1D1D1F] hover:bg-[#F5F5F7]'
                    }`}
                  >
                    <span className="text-xs sm:text-sm font-semibold whitespace-nowrap">
                      {ft.label}
                    </span>
                    <span
                      className={`text-[11px] font-mono-tabular whitespace-nowrap ${
                        isActive ? 'text-white/85' : 'text-[#6E6E73]'
                      }`}
                    >
                      {ft.typicalSqm}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* Section 2: One-Click Town Selector */}
        <section
          id="towns"
          className="bg-white rounded-3xl border border-black/[0.06] p-5 sm:p-7 space-y-5"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base sm:text-lg font-semibold text-[#1D1D1F]">
                Select HDB Town
              </h2>
              <p className="text-xs text-[#6E6E73] mt-0.5">
                One tap updates live resale valuation for {activeFlatLabel.toLowerCase()}s
              </p>
            </div>

            {/* Region Segmented Filter + Quick Town Filter */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center bg-[#F5F5F7] p-1 rounded-xl overflow-x-auto no-scrollbar max-w-full">
                {REGIONS.map((region) => (
                  <button
                    key={region}
                    type="button"
                    onClick={() => setSelectedRegion(region)}
                    className={`min-h-[36px] px-3 py-1 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                      selectedRegion === region
                        ? 'bg-white text-[#1D1D1F] shadow-xs'
                        : 'text-[#6E6E73] hover:text-[#1D1D1F]'
                    }`}
                  >
                    {region === 'ALL' ? 'All Regions' : region}
                  </button>
                ))}
              </div>

              <div className="relative flex-1 sm:flex-initial sm:w-48">
                <Search className="w-3.5 h-3.5 text-[#6E6E73] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={townQuery}
                  onChange={(e) => setTownQuery(e.target.value)}
                  placeholder="Filter town..."
                  aria-label="Filter HDB town"
                  className="w-full min-h-[38px] pl-8 pr-3 py-1.5 text-xs bg-[#F5F5F7] rounded-xl text-[#1D1D1F] placeholder-[#6E6E73] focus:outline-none focus:ring-2 focus:ring-[#0071E3]"
                />
              </div>
            </div>
          </div>

          {/* One-Click Town Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 gap-2">
            <button
              type="button"
              onClick={() => setSelectedTown('ALL')}
              className={`min-h-[44px] px-3 py-2 rounded-xl text-xs font-medium transition-all text-left flex flex-col justify-center ${
                selectedTown === 'ALL'
                  ? 'bg-[#1D1D1F] text-white'
                  : 'bg-[#F5F5F7] text-[#1D1D1F] hover:bg-[#E8E8ED]'
              }`}
            >
              <span className="font-semibold truncate">All Singapore</span>
              <span
                className={`text-[10px] truncate ${
                  selectedTown === 'ALL' ? 'text-white/75' : 'text-[#6E6E73]'
                }`}
              >
                Islandwide
              </span>
            </button>

            {visibleTowns.map((town) => {
              const isSelected = selectedTown === town.id;
              return (
                <button
                  key={town.id}
                  type="button"
                  onClick={() => setSelectedTown(town.id)}
                  className={`min-h-[44px] px-3 py-2 rounded-xl text-xs font-medium transition-all text-left flex flex-col justify-center ${
                    isSelected
                      ? 'bg-[#0071E3] text-white'
                      : 'bg-[#F5F5F7] text-[#1D1D1F] hover:bg-[#E8E8ED]'
                  }`}
                >
                  <span className="font-semibold truncate">{town.label}</span>
                  <span
                    className={`text-[10px] truncate ${
                      isSelected ? 'text-white/80' : 'text-[#6E6E73]'
                    }`}
                  >
                    {town.region} · {town.maturity}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Section 3: Primary Focal Anchor — Live Valuation Readout Card */}
        <section className="bg-white rounded-3xl border border-black/[0.06] p-6 sm:p-8 lg:p-10">
          {error ? (
            <div className="py-8 text-center space-y-3">
              <p className="text-sm font-medium text-[#DC2626]">{error}</p>
              <button
                type="button"
                onClick={loadTransactions}
                className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#0071E3] text-white text-xs font-semibold hover:bg-[#0077ED] transition-colors"
              >
                Retry Official HDB API
              </button>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Top Row: Selected Filter Headline & Median Price */}
              <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-8 border-b border-black/[0.06]">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-[#6E6E73]">
                    <span>{activeTownLabel}</span>
                    <span aria-hidden="true">·</span>
                    <span>{activeFlatLabel}</span>
                    {activeTownObj && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>{activeTownObj.maturity} Estate</span>
                      </>
                    )}
                    <span aria-hidden="true">·</span>
                    <span className="font-mono-tabular">
                      {metrics.totalAvailable.toLocaleString()} historical transactions
                    </span>
                  </div>

                  <p className="text-xs font-medium text-[#6E6E73] pt-1">
                    Live Median Resale Valuation (Recent {metrics.count} Registered Flats)
                  </p>

                  {isLoading ? (
                    <div className="h-12 sm:h-14 w-64 bg-[#F5F5F7] rounded-xl animate-pulse" />
                  ) : (
                    <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                      <span className="text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight text-[#1D1D1F] font-mono-tabular">
                        {formatSgd(metrics.medianPrice)}
                      </span>
                      <span className="text-sm text-[#6E6E73] font-mono-tabular">
                        Avg {formatSgd(metrics.averagePrice)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Right: Sample Range & Sampled Window */}
                <div className="flex flex-wrap sm:flex-nowrap items-center gap-6 lg:text-right">
                  <div>
                    <p className="text-xs text-[#6E6E73]">Middle 50% Range (IQR)</p>
                    <p className="text-sm sm:text-base font-semibold text-[#1D1D1F] font-mono-tabular mt-0.5">
                      {isLoading
                        ? '—'
                        : `${formatSgd(metrics.p25Price)} – ${formatSgd(metrics.p75Price)}`}
                    </p>
                  </div>
                  <div className="h-8 w-px bg-black/[0.06] hidden sm:block" />
                  <div>
                    <p className="text-xs text-[#6E6E73]">Full Observed Range</p>
                    <p className="text-sm sm:text-base font-semibold text-[#1D1D1F] font-mono-tabular mt-0.5">
                      {isLoading
                        ? '—'
                        : `${formatSgd(metrics.minPrice)} – ${formatSgd(metrics.maxPrice)}`}
                    </p>
                  </div>
                </div>
              </div>

              {/* Middle Row: 4 Core Unit Economics & Storey Breakdown */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 pb-8 border-b border-black/[0.06]">
                <div>
                  <p className="text-xs text-[#6E6E73]">Price per Sq. Foot</p>
                  <p className="text-xl sm:text-2xl font-semibold text-[#1D1D1F] font-mono-tabular mt-1">
                    {isLoading ? '—' : `${formatSgd(metrics.avgPricePerSqft)} psf`}
                  </p>
                  <p className="text-xs text-[#6E6E73] font-mono-tabular mt-0.5">
                    {isLoading ? '' : `${formatSgd(metrics.avgPricePerSqm)} / sqm`}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-[#6E6E73]">Typical Floor Area</p>
                  <p className="text-xl sm:text-2xl font-semibold text-[#1D1D1F] font-mono-tabular mt-1">
                    {isLoading ? '—' : `${metrics.avgFloorAreaSqm} sqm`}
                  </p>
                  <p className="text-xs text-[#6E6E73] font-mono-tabular mt-0.5">
                    {isLoading ? '' : `~${metrics.avgFloorAreaSqft.toLocaleString()} sq ft`}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-[#6E6E73]">Avg Remaining Lease</p>
                  <p className="text-xl sm:text-2xl font-semibold text-[#1D1D1F] font-mono-tabular mt-1">
                    {isLoading ? '—' : `${metrics.avgRemainingLeaseYears} yrs`}
                  </p>
                  <p className="text-xs text-[#6E6E73] mt-0.5">Out of 99-year HDB lease</p>
                </div>

                <div>
                  <p className="text-xs text-[#6E6E73]">Latest Registration Month</p>
                  <p className="text-xl sm:text-2xl font-semibold text-[#1D1D1F] font-mono-tabular mt-1">
                    {isLoading ? '—' : metrics.latestMonth}
                  </p>
                  <p className="text-xs text-[#6E6E73] font-mono-tabular mt-0.5">
                    Sample size: {metrics.count} units
                  </p>
                </div>
              </div>

              {/* Storey Level Price Comparison + Live API Query Bar */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                <div className="lg:col-span-7 grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-[#6E6E73]">Low Floor (01–06)</p>
                    <p className="text-sm sm:text-base font-semibold text-[#1D1D1F] font-mono-tabular mt-0.5">
                      {metrics.storeyBreakdown.low.medianPrice
                        ? formatSgd(metrics.storeyBreakdown.low.medianPrice)
                        : '—'}
                    </p>
                    <p className="text-[11px] text-[#6E6E73] font-mono-tabular">
                      {metrics.storeyBreakdown.low.count} units
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-[#6E6E73]">Mid Floor (07–12)</p>
                    <p className="text-sm sm:text-base font-semibold text-[#1D1D1F] font-mono-tabular mt-0.5">
                      {metrics.storeyBreakdown.mid.medianPrice
                        ? formatSgd(metrics.storeyBreakdown.mid.medianPrice)
                        : '—'}
                    </p>
                    <p className="text-[11px] text-[#6E6E73] font-mono-tabular">
                      {metrics.storeyBreakdown.mid.count} units
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-[#6E6E73]">High Floor (13+)</p>
                    <p className="text-sm sm:text-base font-semibold text-[#1D1D1F] font-mono-tabular mt-0.5">
                      {metrics.storeyBreakdown.high.medianPrice
                        ? formatSgd(metrics.storeyBreakdown.high.medianPrice)
                        : '—'}
                    </p>
                    <p className="text-[11px] text-[#6E6E73] font-mono-tabular">
                      {metrics.storeyBreakdown.high.count} units
                    </p>
                  </div>
                </div>

                {/* Live Endpoint Inspector Bar */}
                <div className="lg:col-span-5 flex items-center justify-between gap-2 bg-[#F5F5F7] rounded-2xl px-4 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-medium text-[#6E6E73]">
                      Official Filtered API Endpoint
                    </p>
                    <p className="text-xs font-mono-tabular text-[#1D1D1F] truncate">
                      {currentOfficialUrl}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyApiUrl}
                    className="min-h-[38px] px-3 py-1.5 rounded-xl bg-white hover:bg-[#E8E8ED] text-xs font-medium text-[#1D1D1F] flex items-center gap-1.5 shrink-0 transition-colors shadow-2xs"
                  >
                    {copiedUrl ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-[#16A34A]" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-[#6E6E73]" />
                        <span>Copy URL</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Section 4: Official HDB Resale Transactions List */}
        <section
          id="transactions"
          className="bg-white rounded-3xl border border-black/[0.06] p-5 sm:p-8 space-y-6"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg sm:text-xl font-semibold text-[#1D1D1F]">
                Verified HDB Resale Transactions
              </h2>
              <p className="text-xs text-[#6E6E73] mt-0.5">
                Showing {displayedRecords.length} of {metrics.totalAvailable.toLocaleString()} matching records · Tap any flat to calculate monthly mortgage
              </p>
            </div>

            {/* Search Street/Block + Sort + Sample Size */}
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative flex-1 sm:w-56">
                <Search className="w-3.5 h-3.5 text-[#6E6E73] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={streetSearch}
                  onChange={(e) => setStreetSearch(e.target.value)}
                  placeholder="Search street or block..."
                  aria-label="Search street name or block number"
                  className="w-full min-h-[40px] pl-8 pr-3 py-2 text-xs bg-[#F5F5F7] rounded-xl text-[#1D1D1F] placeholder-[#6E6E73] focus:outline-none focus:ring-2 focus:ring-[#0071E3]"
                />
              </div>

              <div className="relative">
                <ArrowUpDown className="w-3.5 h-3.5 text-[#6E6E73] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <select
                  aria-label="Sort transactions"
                  value={sortBy}
                  onChange={(e) =>
                    setSortBy(
                      e.target.value as 'recent' | 'price-asc' | 'price-desc' | 'sqm-desc'
                    )
                  }
                  className="min-h-[40px] pl-8 pr-7 py-2 text-xs font-medium bg-[#F5F5F7] rounded-xl text-[#1D1D1F] focus:outline-none focus:ring-2 focus:ring-[#0071E3]"
                >
                  <option value="recent">Latest Month</option>
                  <option value="price-asc">Price: Low to High</option>
                  <option value="price-desc">Price: High to Low</option>
                  <option value="sqm-desc">Largest Floor Area</option>
                </select>
              </div>

              <div className="relative">
                <SlidersHorizontal className="w-3.5 h-3.5 text-[#6E6E73] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <select
                  aria-label="Sample batch size"
                  value={recordLimit}
                  onChange={(e) => setRecordLimit(Number(e.target.value))}
                  className="min-h-[40px] pl-8 pr-7 py-2 text-xs font-medium bg-[#F5F5F7] rounded-xl text-[#1D1D1F] focus:outline-none focus:ring-2 focus:ring-[#0071E3] font-mono-tabular"
                >
                  <option value={5}>First 5 rows</option>
                  <option value={25}>25 rows</option>
                  <option value={100}>100 rows</option>
                  <option value={250}>250 rows</option>
                </select>
              </div>

              <button
                type="button"
                onClick={loadTransactions}
                aria-label="Refresh transactions"
                className="min-h-[40px] min-w-[40px] rounded-xl bg-[#F5F5F7] hover:bg-[#E8E8ED] flex items-center justify-center text-[#1D1D1F] transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Desktop High-Density Table & Mobile Tap List */}
          {isLoading ? (
            <div className="space-y-2.5 pt-2">
              {Array.from({ length: 6 }).map((_, idx) => (
                <div
                  key={idx}
                  className="h-14 w-full bg-[#F5F5F7] rounded-xl animate-pulse"
                />
              ))}
            </div>
          ) : displayedRecords.length === 0 ? (
            <div className="py-12 text-center space-y-3 border-t border-black/[0.06]">
              <p className="text-sm font-medium text-[#1D1D1F]">
                No resale transactions match your current filter.
              </p>
              <p className="text-xs text-[#6E6E73]">
                Try clearing the street search or resetting to 4-Room flats in Tampines.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSelectedTown('TAMPINES');
                  setSelectedFlatType('4 ROOM');
                  setStreetSearch('');
                }}
                className="min-h-[44px] px-4 py-2 rounded-xl bg-[#0071E3] text-white text-xs font-semibold hover:bg-[#0077ED] transition-colors"
              >
                Reset to 4-Room Tampines
              </button>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-black/[0.08] text-xs font-medium text-[#6E6E73]">
                      <th className="py-3 pr-4">Address (Block &amp; Street)</th>
                      <th className="py-3 px-4">Town · Flat Model</th>
                      <th className="py-3 px-4">Storey</th>
                      <th className="py-3 px-4 text-right">Floor Area</th>
                      <th className="py-3 px-4">Remaining Lease</th>
                      <th className="py-3 px-4">Month</th>
                      <th className="py-3 pl-4 text-right">Resale Price</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/[0.05] text-sm">
                    {displayedRecords.slice(0, 50).map((rec) => {
                      const priceNum = Number(rec.resale_price) || 0;
                      const sqmNum = Number(rec.floor_area_sqm) || 1;
                      const psf = Math.round(priceNum / (sqmNum * 10.7639));
                      const isPinned = pinnedRecord?._id === rec._id;

                      return (
                        <tr
                          key={rec._id}
                          onClick={() => handleSelectRecordForCalculator(rec)}
                          className={`group cursor-pointer transition-colors ${
                            isPinned ? 'bg-[#0071E3]/[0.06]' : 'hover:bg-[#F5F5F7]/80'
                          }`}
                        >
                          <td className="py-3.5 pr-4 font-medium text-[#1D1D1F]">
                            Blk {rec.block} {rec.street_name}
                          </td>
                          <td className="py-3.5 px-4 text-xs text-[#6E6E73]">
                            {rec.town} · {rec.flat_type} · {rec.flat_model}
                          </td>
                          <td className="py-3.5 px-4 text-xs font-mono-tabular text-[#1D1D1F]">
                            {rec.storey_range}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono-tabular text-xs text-[#1D1D1F]">
                            {rec.floor_area_sqm} sqm
                          </td>
                          <td className="py-3.5 px-4 text-xs font-mono-tabular text-[#6E6E73]">
                            {rec.remaining_lease} (Built {rec.lease_commence_date})
                          </td>
                          <td className="py-3.5 px-4 text-xs font-mono-tabular text-[#6E6E73]">
                            {rec.month}
                          </td>
                          <td className="py-3.5 pl-4 text-right">
                            <div className="font-semibold text-[#1D1D1F] font-mono-tabular group-hover:text-[#0071E3] transition-colors">
                              {formatSgd(priceNum)}
                            </div>
                            <div className="text-[11px] text-[#6E6E73] font-mono-tabular">
                              S${psf.toLocaleString()} psf
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Ergonomic Tap List Rows (min-h-[64px], clean unboxed metadata) */}
              <div className="md:hidden divide-y divide-black/[0.06] border-t border-black/[0.06]">
                {displayedRecords.slice(0, 30).map((rec) => {
                  const priceNum = Number(rec.resale_price) || 0;
                  const sqmNum = Number(rec.floor_area_sqm) || 1;
                  const psf = Math.round(priceNum / (sqmNum * 10.7639));

                  return (
                    <button
                      key={rec._id}
                      type="button"
                      onClick={() => handleSelectRecordForCalculator(rec)}
                      className="w-full min-h-[68px] py-3.5 flex items-center justify-between gap-3 text-left active:bg-[#F5F5F7] transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-[#1D1D1F] truncate">
                          Blk {rec.block} {rec.street_name}
                        </p>
                        <p className="text-xs text-[#6E6E73] truncate mt-0.5">
                          {rec.town} · {rec.flat_type} · Storey {rec.storey_range}
                        </p>
                        <p className="text-[11px] text-[#6E6E73] font-mono-tabular mt-0.5">
                          {rec.floor_area_sqm} sqm · {rec.remaining_lease} · {rec.month}
                        </p>
                      </div>

                      <div className="text-right shrink-0 flex items-center gap-1.5">
                        <div>
                          <p className="text-sm font-semibold text-[#1D1D1F] font-mono-tabular">
                            {formatSgd(priceNum)}
                          </p>
                          <p className="text-[11px] text-[#6E6E73] font-mono-tabular">
                            S${psf.toLocaleString()} psf
                          </p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-[#6E6E73]" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </section>

        {/* Section 5: Interactive HDB Cost & Mortgage Calculator */}
        <AffordabilityCalculator
          basePrice={
            pinnedRecord ? Number(pinnedRecord.resale_price) : metrics.medianPrice
          }
          selectedLabel={`${activeFlatLabel} in ${activeTownLabel}`}
          customRecordLabel={
            pinnedRecord
              ? `Blk ${pinnedRecord.block} ${pinnedRecord.street_name} (${formatSgd(
                  Number(pinnedRecord.resale_price)
                )})`
              : null
          }
          onResetCustomPrice={() => setPinnedRecord(null)}
        />
      </main>

      {/* Clean Minimal Footer */}
      <footer className="border-t border-black/[0.06] bg-white py-6 px-4 sm:px-8 mt-12">
        <div className="max-w-[1200px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#6E6E73]">
          <p>
            HDB Valuation Studio · Powered by Official Singapore Housing &amp; Development Board Open Data
          </p>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setIsHealthModalOpen(true)}
              className="hover:text-[#1D1D1F] transition-colors flex items-center gap-1.5"
            >
              <Calculator className="w-3.5 h-3.5" />
              <span>Inspect /api/health.js &amp; Schema</span>
            </button>
            <span aria-hidden="true">·</span>
            <a
              href="/api/health.js"
              target="_blank"
              rel="noreferrer"
              className="hover:text-[#1D1D1F] transition-colors font-mono-tabular"
            >
              /api/health.js
            </a>
          </div>
        </div>
      </footer>

      {/* API Health & Dataset Schema Modal */}
      <ApiHealthModal
        isOpen={isHealthModalOpen}
        onClose={() => setIsHealthModalOpen(false)}
        healthReport={healthReport}
        metadata={metadata}
        isChecking={isCheckingHealth}
        onRefreshHealth={loadHealthAndMetadata}
      />
    </div>
  );
}
