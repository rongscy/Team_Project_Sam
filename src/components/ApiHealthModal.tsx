import React from 'react';
import { X, RefreshCw, CheckCircle2, AlertTriangle, XCircle, ExternalLink } from 'lucide-react';
import { DatasetMetadataResponse, HealthReport } from '../types/hdb';

interface ApiHealthModalProps {
  isOpen: boolean;
  onClose: () => void;
  healthReport: HealthReport | null;
  metadata: DatasetMetadataResponse | null;
  isChecking: boolean;
  onRefreshHealth: () => void;
}

export const ApiHealthModal: React.FC<ApiHealthModalProps> = ({
  isOpen,
  onClose,
  healthReport,
  metadata,
  isChecking,
  onRefreshHealth,
}) => {
  if (!isOpen) return null;

  const endpoints = healthReport
    ? [
        healthReport.endpoints.datastoreSearch,
        healthReport.endpoints.filteredSearch,
        healthReport.endpoints.datasetMetadata,
      ]
    : [];

  const columnMap = metadata?.data?.columnMetadata?.map || {};
  const columnOrder = metadata?.data?.columnMetadata?.order || Object.keys(columnMap);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-xs p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="api-health-modal-title"
    >
      <div className="w-full max-w-3xl bg-white rounded-t-3xl sm:rounded-3xl border border-black/[0.08] max-h-[88vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Mobile grab handle */}
        <div className="sm:hidden w-10 h-1.5 bg-[#D2D2D7] rounded-full mx-auto mt-3" />

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-black/[0.06]">
          <div>
            <h2
              id="api-health-modal-title"
              className="text-lg font-semibold text-[#1D1D1F]"
            >
              API Health Monitor &amp; Dataset Schema
            </h2>
            <p className="text-xs text-[#6E6E73] font-mono-tabular">
              Endpoint: /api/health.js · Resource d_8b84c4ee58e3cfc0ece0d773c8ca6abc
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onRefreshHealth}
              disabled={isChecking}
              className="min-h-[40px] px-3.5 py-2 rounded-xl bg-[#F5F5F7] hover:bg-[#E8E8ED] text-xs font-medium text-[#1D1D1F] flex items-center gap-1.5 transition-colors disabled:opacity-50 whitespace-nowrap"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
              <span>{isChecking ? 'Probing...' : 'Probe Now'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close API Health modal"
              className="min-h-[40px] min-w-[40px] rounded-xl bg-[#F5F5F7] hover:bg-[#E8E8ED] flex items-center justify-center text-[#1D1D1F] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Overall Status Summary */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-black/[0.06]">
            <div className="flex items-center gap-3">
              {healthReport?.status === 'healthy' ? (
                <CheckCircle2 className="w-6 h-6 text-[#16A34A] shrink-0" />
              ) : healthReport?.status === 'degraded' ? (
                <AlertTriangle className="w-6 h-6 text-[#D97706] shrink-0" />
              ) : (
                <XCircle className="w-6 h-6 text-[#DC2626] shrink-0" />
              )}
              <div>
                <div className="text-sm font-semibold text-[#1D1D1F]">
                  {healthReport?.status === 'healthy'
                    ? 'All Official HDB Data.gov.sg Endpoints Nominal'
                    : healthReport?.status === 'degraded'
                    ? 'Partial API Degradation Detected'
                    : isChecking
                    ? 'Running Live Diagnostic Probe...'
                    : 'API Unreachable'}
                </div>
                <div className="text-xs text-[#6E6E73] font-mono-tabular mt-0.5">
                  {healthReport
                    ? `Checked at ${new Date(healthReport.checkedAt).toLocaleTimeString()} · Total probe duration ${healthReport.totalDurationMs}ms`
                    : 'Waiting for probe response...'}
                </div>
              </div>
            </div>

            <a
              href="/api/health.js"
              target="_blank"
              rel="noreferrer"
              className="min-h-[40px] px-3.5 py-2 rounded-xl bg-[#0071E3] text-white text-xs font-medium flex items-center gap-1.5 hover:bg-[#0077ED] transition-colors self-start sm:self-auto whitespace-nowrap"
            >
              <span>Open /api/health.js JSON</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* 3 Official Endpoints Status List */}
          <div>
            <h3 className="text-xs font-semibold text-[#6E6E73] mb-3">
              Monitored Data.gov.sg Endpoints
            </h3>
            <div className="divide-y divide-black/[0.06] border-t border-b border-black/[0.06]">
              {endpoints.map((ep, idx) => (
                <div key={idx} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-[#1D1D1F]">
                        {ep.name}
                      </span>
                      <span className="text-xs text-[#6E6E73]">·</span>
                      <span
                        className={`text-xs font-medium ${
                          ep.status === 'healthy'
                            ? 'text-[#16A34A]'
                            : ep.status === 'degraded'
                            ? 'text-[#D97706]'
                            : 'text-[#DC2626]'
                        }`}
                      >
                        {ep.status === 'healthy'
                          ? `HTTP ${ep.httpStatus} OK`
                          : ep.error || `HTTP ${ep.httpStatus}`}
                      </span>
                    </div>
                    <p className="text-xs text-[#6E6E73] font-mono-tabular truncate mt-1">
                      {ep.url}
                    </p>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-[#6E6E73] font-mono-tabular shrink-0">
                    {typeof ep.totalRecords === 'number' && (
                      <span>{ep.totalRecords.toLocaleString()} total rows</span>
                    )}
                    {typeof ep.totalMatching === 'number' && (
                      <span>{ep.totalMatching.toLocaleString()} Tampines 4-Rm</span>
                    )}
                    <span className="text-[#1D1D1F] font-medium">
                      {ep.latencyMs} ms
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Official Dataset Metadata Summary */}
          {metadata?.data && (
            <div>
              <h3 className="text-xs font-semibold text-[#6E6E73] mb-2">
                Official Dataset Metadata (v2 API)
              </h3>
              <p className="text-sm text-[#1D1D1F] font-medium">
                {metadata.data.name}
              </p>
              <p className="text-xs text-[#6E6E73] mt-1 font-mono-tabular">
                Managed by {metadata.data.managedBy} · Format: {metadata.data.format} · Last updated:{' '}
                {metadata.data.lastUpdatedAt
                  ? new Date(metadata.data.lastUpdatedAt).toLocaleDateString('en-SG', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })
                  : 'Recent'}
              </p>

              {columnOrder.length > 0 && (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-black/[0.08] text-[#6E6E73]">
                        <th className="py-2 pr-4 font-medium">Field Name</th>
                        <th className="py-2 px-4 font-medium">Label</th>
                        <th className="py-2 pl-4 font-medium text-right">Type</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/[0.05]">
                      {columnOrder.map((colKey) => {
                        const col = columnMap[colKey];
                        if (!col) return null;
                        return (
                          <tr key={colKey}>
                            <td className="py-2 pr-4 font-mono-tabular text-[#1D1D1F]">
                              {col.name || colKey}
                            </td>
                            <td className="py-2 px-4 text-[#6E6E73]">
                              {col.title || col.description || 'HDB transaction attribute'}
                            </td>
                            <td className="py-2 pl-4 text-right font-mono-tabular text-[#6E6E73]">
                              {col.dataType || 'text'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
