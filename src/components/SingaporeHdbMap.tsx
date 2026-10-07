import React, { useState } from 'react';
import {
  MapPin,
  Compass,
  Check,
  TrendingUp,
  Building2,
  ChevronRight,
  Maximize2,
  Layers,
} from 'lucide-react';
import {
  HDB_TOWNS,
  RegionFilter,
  TownInfo,
  ValuationMetrics,
} from '../types/hdb';
import { formatSgd } from '../services/hdbApi';

interface TownGeoData extends TownInfo {
  path: string;
  pinX: number;
  pinY: number;
  shortCode: string;
}

// 26 Official HDB Towns with geographic polygons mapped to a 1000x580 viewBox of Singapore
const TOWN_GEOMETRIES: Record<string, { path: string; pinX: number; pinY: number; shortCode: string }> = {
  WOODLANDS: {
    path: 'M 360,75 L 465,70 L 480,115 L 475,175 L 415,180 L 360,155 Z',
    pinX: 418,
    pinY: 125,
    shortCode: 'WL',
  },
  SEMBAWANG: {
    path: 'M 465,70 L 550,70 L 565,130 L 485,140 L 480,115 Z',
    pinX: 512,
    pinY: 105,
    shortCode: 'SB',
  },
  YISHUN: {
    path: 'M 485,140 L 565,130 L 600,180 L 585,235 L 505,235 L 475,175 Z',
    pinX: 540,
    pinY: 185,
    shortCode: 'YS',
  },
  'ANG MO KIO': {
    path: 'M 470,240 L 575,240 L 570,300 L 480,305 L 460,275 Z',
    pinX: 515,
    pinY: 272,
    shortCode: 'AMK',
  },
  BISHAN: {
    path: 'M 475,305 L 550,300 L 545,350 L 470,350 Z',
    pinX: 510,
    pinY: 327,
    shortCode: 'BS',
  },
  'TOA PAYOH': {
    path: 'M 470,350 L 555,350 L 560,395 L 480,402 L 465,375 Z',
    pinX: 512,
    pinY: 376,
    shortCode: 'TPY',
  },
  SERANGOON: {
    path: 'M 560,280 L 635,280 L 630,340 L 555,340 Z',
    pinX: 595,
    pinY: 310,
    shortCode: 'SRG',
  },
  HOUGANG: {
    path: 'M 580,220 L 675,220 L 670,280 L 575,280 Z',
    pinX: 625,
    pinY: 250,
    shortCode: 'HG',
  },
  SENGKANG: {
    path: 'M 610,160 L 710,160 L 705,220 L 595,220 Z',
    pinX: 655,
    pinY: 190,
    shortCode: 'SK',
  },
  PUNGGOL: {
    path: 'M 635,100 L 735,110 L 745,160 L 620,160 Z',
    pinX: 680,
    pinY: 135,
    shortCode: 'PG',
  },
  'PASIR RIS': {
    path: 'M 745,170 L 860,180 L 870,255 L 760,255 L 730,215 Z',
    pinX: 805,
    pinY: 215,
    shortCode: 'PSR',
  },
  TAMPINES: {
    path: 'M 740,260 L 865,260 L 870,335 L 755,340 L 725,305 Z',
    pinX: 798,
    pinY: 298,
    shortCode: 'TMP',
  },
  BEDOK: {
    path: 'M 685,340 L 820,340 L 805,420 L 685,415 L 660,375 Z',
    pinX: 745,
    pinY: 378,
    shortCode: 'BDK',
  },
  'MARINE PARADE': {
    path: 'M 635,415 L 780,420 L 770,455 L 635,450 Z',
    pinX: 705,
    pinY: 435,
    shortCode: 'MP',
  },
  GEYLANG: {
    path: 'M 590,365 L 680,365 L 675,415 L 585,415 Z',
    pinX: 632,
    pinY: 390,
    shortCode: 'GL',
  },
  'KALLANG/WHAMPOA': {
    path: 'M 535,360 L 600,360 L 595,425 L 530,420 Z',
    pinX: 565,
    pinY: 392,
    shortCode: 'KW',
  },
  'CENTRAL AREA': {
    path: 'M 525,425 L 595,425 L 585,490 L 520,485 Z',
    pinX: 555,
    pinY: 457,
    shortCode: 'CA',
  },
  'BUKIT MERAH': {
    path: 'M 445,425 L 525,425 L 515,500 L 440,495 Z',
    pinX: 480,
    pinY: 462,
    shortCode: 'BM',
  },
  QUEENSTOWN: {
    path: 'M 370,405 L 450,405 L 445,490 L 365,485 Z',
    pinX: 408,
    pinY: 448,
    shortCode: 'QT',
  },
  'BUKIT TIMAH': {
    path: 'M 380,325 L 470,325 L 465,405 L 375,405 Z',
    pinX: 420,
    pinY: 365,
    shortCode: 'BT',
  },
  CLEMENTI: {
    path: 'M 305,365 L 375,365 L 370,450 L 295,445 Z',
    pinX: 335,
    pinY: 407,
    shortCode: 'CLM',
  },
  'BUKIT BATOK': {
    path: 'M 295,285 L 380,285 L 375,365 L 290,365 Z',
    pinX: 335,
    pinY: 325,
    shortCode: 'BB',
  },
  'BUKIT PANJANG': {
    path: 'M 320,205 L 410,205 L 400,285 L 315,285 Z',
    pinX: 360,
    pinY: 245,
    shortCode: 'BP',
  },
  'CHOA CHU KANG': {
    path: 'M 230,215 L 320,205 L 310,305 L 225,305 Z',
    pinX: 270,
    pinY: 255,
    shortCode: 'CCK',
  },
  'JURONG EAST': {
    path: 'M 225,315 L 305,315 L 295,410 L 215,410 Z',
    pinX: 260,
    pinY: 362,
    shortCode: 'JE',
  },
  'JURONG WEST': {
    path: 'M 130,305 L 225,305 L 215,410 L 120,410 Z',
    pinX: 170,
    pinY: 358,
    shortCode: 'JW',
  },
};

const REGION_COLOR_SCHEMES: Record<Exclude<RegionFilter, 'ALL'>, {
  fill: string;
  stroke: string;
  hoverFill: string;
  badgeBg: string;
  badgeText: string;
}> = {
  East: {
    fill: '#FEF3C7',
    stroke: '#F59E0B',
    hoverFill: '#FDE68A',
    badgeBg: '#FEF3C7',
    badgeText: '#B45309',
  },
  'North-East': {
    fill: '#EDE9FE',
    stroke: '#8B5CF6',
    hoverFill: '#DDD6FE',
    badgeBg: '#EDE9FE',
    badgeText: '#6D28D9',
  },
  Central: {
    fill: '#FFE4E6',
    stroke: '#F43F5E',
    hoverFill: '#FECDD3',
    badgeBg: '#FFE4E6',
    badgeText: '#BE123C',
  },
  North: {
    fill: '#D1FAE5',
    stroke: '#10B981',
    hoverFill: '#A7F3D0',
    badgeBg: '#D1FAE5',
    badgeText: '#047857',
  },
  West: {
    fill: '#E0F2FE',
    stroke: '#0284C7',
    hoverFill: '#BAE6FD',
    badgeBg: '#E0F2FE',
    badgeText: '#0369A1',
  },
};

interface SingaporeHdbMapProps {
  selectedTown: string;
  onSelectTown: (townId: string) => void;
  selectedRegion: RegionFilter;
  onSelectRegion: (region: RegionFilter) => void;
  activeMetrics?: ValuationMetrics;
  selectedFlatLabel: string;
}

export const SingaporeHdbMap: React.FC<SingaporeHdbMapProps> = ({
  selectedTown,
  onSelectTown,
  selectedRegion,
  onSelectRegion,
  activeMetrics,
  selectedFlatLabel,
}) => {
  const [hoveredTownId, setHoveredTownId] = useState<string | null>(null);

  const hoveredTown = HDB_TOWNS.find((t) => t.id === hoveredTownId);
  const activeTownObj = HDB_TOWNS.find((t) => t.id === selectedTown);

  // Region filter quick-select items
  const regions: RegionFilter[] = ['ALL', 'East', 'North-East', 'Central', 'West', 'North'];

  return (
    <div className="bg-white rounded-3xl border border-black/[0.06] p-5 sm:p-7 space-y-5">
      {/* Map Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-[#0071E3]/10 text-[#0071E3]">
              <Compass className="w-3.5 h-3.5" />
            </span>
            <h2 className="text-base sm:text-lg font-semibold text-[#1D1D1F]">
              Interactive Singapore HDB Map
            </h2>
          </div>
          <p className="text-xs text-[#6E6E73] mt-1">
            Tap any town polygon or label to instantly view resale price trends
          </p>
        </div>

        {/* Region Segmented Controls */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <div className="flex items-center bg-[#F5F5F7] p-1 rounded-xl overflow-x-auto no-scrollbar max-w-full">
            {regions.map((reg) => {
              const isRegActive = selectedRegion === reg;
              return (
                <button
                  key={reg}
                  type="button"
                  onClick={() => onSelectRegion(reg)}
                  className={`min-h-[34px] px-3 py-1 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                    isRegActive
                      ? 'bg-white text-[#1D1D1F] shadow-xs'
                      : 'text-[#6E6E73] hover:text-[#1D1D1F]'
                  }`}
                >
                  {reg === 'ALL' ? 'All Island' : reg}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => onSelectTown('ALL')}
            className={`min-h-[34px] px-3 py-1 text-xs font-medium rounded-xl transition-colors whitespace-nowrap border ${
              selectedTown === 'ALL'
                ? 'bg-[#1D1D1F] text-white border-[#1D1D1F]'
                : 'bg-white text-[#1D1D1F] border-black/[0.08] hover:bg-[#F5F5F7]'
            }`}
          >
            Islandwide (All)
          </button>
        </div>
      </div>

      {/* SVG Map Canvas with Responsive Container */}
      <div className="relative w-full bg-[#F8FAFC] rounded-2xl border border-black/[0.06] overflow-hidden p-2 sm:p-4">
        {/* Subtle Water Backdrop Grid & Straits indicator */}
        <div className="absolute top-3 left-4 pointer-events-none text-[10px] font-medium tracking-wider uppercase text-slate-400 select-none">
          Straits of Johor
        </div>
        <div className="absolute bottom-3 right-4 pointer-events-none text-[10px] font-medium tracking-wider uppercase text-slate-400 select-none">
          Singapore Strait
        </div>

        <svg
          viewBox="0 0 1000 560"
          className="w-full h-auto select-none"
          style={{ maxHeight: '520px', minHeight: '340px' }}
          role="img"
          aria-label="Singapore HDB Towns Interactive Map"
        >
          <defs>
            {/* Soft drop shadow for selected town */}
            <filter id="active-shadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#0071E3" floodOpacity="0.35" />
            </filter>
            <filter id="hover-shadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#000000" floodOpacity="0.15" />
            </filter>
          </defs>

          {/* Non-HDB Geographic Regions (Tuas, Catchment, Changi, Offshore Islands) */}
          <g className="opacity-75">
            {/* Western Water Catchment / Tuas Industrial Zone */}
            <path
              d="M 30,340 L 130,305 L 120,420 L 70,510 L 20,450 Z"
              fill="#E2E8F0"
              stroke="#CBD5E1"
              strokeWidth="1.5"
            />
            <text x="65" y="420" fill="#94A3B8" fontSize="10" fontWeight="500" textAnchor="middle">
              Tuas / Western Catchment
            </text>

            {/* Central Catchment Nature Reserve & Reservoirs */}
            <path
              d="M 405,205 L 475,205 L 470,325 L 400,315 Z"
              fill="#DCFCE7"
              stroke="#86EFAC"
              strokeWidth="1.5"
            />
            {/* MacRitchie / Seletar Reservoir water accents */}
            <ellipse cx="440" cy="265" rx="18" ry="24" fill="#BAE6FD" />
            <text x="440" y="270" fill="#059669" fontSize="9" fontWeight="600" textAnchor="middle">
              Central Catchment
            </text>

            {/* Changi Airport & Coast */}
            <path
              d="M 865,255 L 965,285 L 940,380 L 820,375 Z"
              fill="#E2E8F0"
              stroke="#CBD5E1"
              strokeWidth="1.5"
            />
            <text x="895" y="325" fill="#94A3B8" fontSize="10" fontWeight="500" textAnchor="middle">
              Changi
            </text>

            {/* Jurong Island */}
            <path
              d="M 160,450 C 230,440 290,460 280,515 C 210,535 150,505 160,450 Z"
              fill="#E2E8F0"
              stroke="#CBD5E1"
              strokeWidth="1.5"
            />
            <text x="215" y="485" fill="#94A3B8" fontSize="9" fontWeight="500" textAnchor="middle">
              Jurong Island
            </text>

            {/* Sentosa */}
            <path
              d="M 455,515 C 475,505 525,505 540,525 C 530,545 480,550 455,515 Z"
              fill="#FEF3C7"
              stroke="#FCD34D"
              strokeWidth="1.2"
            />
            <text x="495" y="530" fill="#B45309" fontSize="8" fontWeight="600" textAnchor="middle">
              Sentosa
            </text>

            {/* Pulau Ubin */}
            <path
              d="M 780,115 C 820,105 870,115 860,145 C 820,150 775,135 780,115 Z"
              fill="#E2E8F0"
              stroke="#CBD5E1"
              strokeWidth="1.2"
            />
            <text x="820" y="132" fill="#94A3B8" fontSize="8" fontWeight="500" textAnchor="middle">
              P. Ubin
            </text>

            {/* Pulau Tekong */}
            <path
              d="M 890,115 C 940,105 980,125 970,165 C 930,175 885,155 890,115 Z"
              fill="#E2E8F0"
              stroke="#CBD5E1"
              strokeWidth="1.2"
            />
            <text x="930" y="142" fill="#94A3B8" fontSize="8" fontWeight="500" textAnchor="middle">
              P. Tekong
            </text>
          </g>

          {/* Interactive HDB Town Polygons */}
          <g>
            {HDB_TOWNS.map((town) => {
              const geo = TOWN_GEOMETRIES[town.id];
              if (!geo) return null;

              const isSelected = selectedTown === town.id;
              const isHovered = hoveredTownId === town.id;
              const regionScheme = REGION_COLOR_SCHEMES[town.region];

              // Check if town matches region filter
              const isRegionMatched =
                selectedRegion === 'ALL' || selectedRegion === town.region;

              let fillColor = regionScheme.fill;
              let strokeColor = regionScheme.stroke;
              let strokeWidth = 1.8;
              let filter = '';

              if (isSelected) {
                fillColor = '#0071E3';
                strokeColor = '#005BB5';
                strokeWidth = 3;
                filter = 'url(#active-shadow)';
              } else if (isHovered) {
                fillColor = regionScheme.hoverFill;
                strokeColor = regionScheme.stroke;
                strokeWidth = 2.5;
                filter = 'url(#hover-shadow)';
              } else if (!isRegionMatched) {
                // Dim down towns not in selected region
                fillColor = '#F1F5F9';
                strokeColor = '#CBD5E1';
                strokeWidth = 1;
              }

              return (
                <path
                  key={town.id}
                  d={geo.path}
                  fill={fillColor}
                  stroke={strokeColor}
                  strokeWidth={strokeWidth}
                  filter={filter}
                  className="cursor-pointer transition-colors duration-150 focus:outline-none"
                  tabIndex={0}
                  role="button"
                  aria-label={`${town.label} HDB Town (${town.region} Region)`}
                  onMouseEnter={() => setHoveredTownId(town.id)}
                  onMouseLeave={() => setHoveredTownId(null)}
                  onClick={() => onSelectTown(town.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelectTown(town.id);
                    }
                  }}
                />
              );
            })}
          </g>

          {/* Town Markers & Typography Overlay */}
          <g className="pointer-events-none">
            {HDB_TOWNS.map((town) => {
              const geo = TOWN_GEOMETRIES[town.id];
              if (!geo) return null;

              const isSelected = selectedTown === town.id;
              const isRegionMatched =
                selectedRegion === 'ALL' || selectedRegion === town.region;
              const opacity = isSelected ? 1 : isRegionMatched ? 1 : 0.45;

              return (
                <g key={`marker-${town.id}`} opacity={opacity} className="transition-opacity duration-150">
                  {/* Pin Dot */}
                  <circle
                    cx={geo.pinX}
                    cy={geo.pinY - 8}
                    r={isSelected ? 4.5 : 2.5}
                    fill={isSelected ? '#FFFFFF' : '#1D1D1F'}
                    stroke={isSelected ? '#0071E3' : '#FFFFFF'}
                    strokeWidth={isSelected ? 2 : 1}
                  />

                  {/* Town Label */}
                  <text
                    x={geo.pinX}
                    y={geo.pinY + 6}
                    textAnchor="middle"
                    fontSize={isSelected ? '11' : '9.5'}
                    fontWeight={isSelected ? '700' : '600'}
                    fill={isSelected ? '#FFFFFF' : '#1E293B'}
                    className="select-none"
                    style={{
                      textShadow: isSelected
                        ? '0 1px 2px rgba(0,0,0,0.3)'
                        : '0 1px 2px rgba(255,255,255,0.9), 0 0 3px rgba(255,255,255,0.8)',
                    }}
                  >
                    {town.label}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>

        {/* Live Hover / Active Town Inspection Card */}
        <div className="mt-3 bg-white/95 backdrop-blur-sm rounded-xl p-3 sm:p-4 border border-black/[0.06] flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                hoveredTown
                  ? 'bg-[#0071E3]/10 text-[#0071E3]'
                  : selectedTown === 'ALL'
                  ? 'bg-[#1D1D1F]/10 text-[#1D1D1F]'
                  : 'bg-[#0071E3] text-white'
              }`}
            >
              <Building2 className="w-5 h-5" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm sm:text-base font-semibold text-[#1D1D1F]">
                  {hoveredTown ? hoveredTown.label : activeTownObj?.label || 'Islandwide Singapore'}
                </span>
                <span
                  className="px-2 py-0.5 text-[10px] font-semibold rounded-md"
                  style={{
                    backgroundColor: hoveredTown
                      ? REGION_COLOR_SCHEMES[hoveredTown.region].badgeBg
                      : activeTownObj
                      ? REGION_COLOR_SCHEMES[activeTownObj.region].badgeBg
                      : '#F1F5F9',
                    color: hoveredTown
                      ? REGION_COLOR_SCHEMES[hoveredTown.region].badgeText
                      : activeTownObj
                      ? REGION_COLOR_SCHEMES[activeTownObj.region].badgeText
                      : '#475569',
                  }}
                >
                  {hoveredTown ? hoveredTown.region : activeTownObj?.region || 'All 5 Regions'}
                </span>
                {(hoveredTown || activeTownObj)?.maturity && (
                  <span className="text-[11px] text-[#6E6E73] font-medium hidden sm:inline">
                    · {(hoveredTown || activeTownObj)?.maturity} Estate
                  </span>
                )}
              </div>

              <p className="text-xs text-[#6E6E73] mt-0.5">
                {hoveredTown && hoveredTown.id !== selectedTown
                  ? `Click to filter resale valuation for ${hoveredTown.label}`
                  : `Currently viewing ${selectedFlatLabel.toLowerCase()} resale records`}
              </p>
            </div>
          </div>

          {/* Quick Metrics Badge for Currently Active Town */}
          {activeMetrics && selectedTown !== 'ALL' && (
            <div className="flex items-center gap-4 border-t md:border-t-0 md:border-l border-black/[0.06] pt-2 md:pt-0 md:pl-4">
              <div>
                <p className="text-[11px] text-[#6E6E73]">Median Resale Price</p>
                <p className="text-sm sm:text-base font-semibold font-mono-tabular text-[#1D1D1F]">
                  {formatSgd(activeMetrics.medianPrice)}
                </p>
              </div>

              <div>
                <p className="text-[11px] text-[#6E6E73]">Avg PSF</p>
                <p className="text-sm sm:text-base font-semibold font-mono-tabular text-[#0071E3]">
                  {activeMetrics.avgPricePerSqft > 0 ? `S$${activeMetrics.avgPricePerSqft}` : '—'}
                </p>
              </div>

              <div>
                <p className="text-[11px] text-[#6E6E73]">Transactions</p>
                <p className="text-sm sm:text-base font-semibold font-mono-tabular text-[#1D1D1F]">
                  {activeMetrics.count}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Region Color Legend & Maturity Summary */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-black/[0.06] text-xs text-[#6E6E73]">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-medium text-[#1D1D1F]">Region Legend:</span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-[#E0F2FE] border border-[#0284C7]" />
            West
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-[#D1FAE5] border border-[#10B981]" />
            North
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-[#FFE4E6] border border-[#F43F5E]" />
            Central
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-[#EDE9FE] border border-[#8B5CF6]" />
            North-East
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-[#FEF3C7] border border-[#F59E0B]" />
            East
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 text-[11px] text-[#6E6E73]">
            <span className="w-2 h-2 rounded-full bg-[#0071E3]" />
            Selected Town
          </span>
          <span className="text-[11px] text-[#6E6E73]">
            Total 26 HDB Planning Towns
          </span>
        </div>
      </div>
    </div>
  );
};
