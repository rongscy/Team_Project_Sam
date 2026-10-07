import React, { useState, useEffect } from 'react';
import { formatSgd } from '../services/hdbApi';

interface AffordabilityCalculatorProps {
  basePrice: number;
  selectedLabel: string;
  customRecordLabel?: string | null;
  onResetCustomPrice?: () => void;
}

function calculateBsd(price: number): number {
  if (price <= 0) return 0;
  let remaining = price;
  let duty = 0;

  const tier1 = Math.min(remaining, 180000);
  duty += tier1 * 0.01;
  remaining -= tier1;

  if (remaining > 0) {
    const tier2 = Math.min(remaining, 180000);
    duty += tier2 * 0.02;
    remaining -= tier2;
  }

  if (remaining > 0) {
    const tier3 = Math.min(remaining, 640000);
    duty += tier3 * 0.03;
    remaining -= tier3;
  }

  if (remaining > 0) {
    const tier4 = Math.min(remaining, 500000);
    duty += tier4 * 0.04;
    remaining -= tier4;
  }

  if (remaining > 0) {
    duty += remaining * 0.05;
  }

  return Math.round(duty);
}

export const AffordabilityCalculator: React.FC<AffordabilityCalculatorProps> = ({
  basePrice,
  selectedLabel,
  customRecordLabel,
  onResetCustomPrice,
}) => {
  const [price, setPrice] = useState<number>(basePrice || 620000);
  const [loanType, setLoanType] = useState<'HDB' | 'BANK'>('HDB');
  const [tenureYears, setTenureYears] = useState<number>(25);
  const [downpaymentPct, setDownpaymentPct] = useState<number>(25);

  useEffect(() => {
    if (basePrice > 0) {
      setPrice(basePrice);
    }
  }, [basePrice]);

  const interestRate = loanType === 'HDB' ? 2.6 : 3.05;
  const loanRatio = (100 - downpaymentPct) / 100;
  const loanAmount = Math.round(price * loanRatio);
  const downpaymentAmount = price - loanAmount;
  const bsdAmount = calculateBsd(price);

  // Monthly mortgage calculation: M = P * [r(1+r)^n] / [(1+r)^n - 1]
  const monthlyRate = interestRate / 100 / 12;
  const totalMonths = tenureYears * 12;
  const monthlyPayment =
    loanAmount > 0 && monthlyRate > 0
      ? Math.round(
          (loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, totalMonths))) /
            (Math.pow(1 + monthlyRate, totalMonths) - 1)
        )
      : 0;

  // Singapore HDB Mortgage Servicing Ratio (MSR) is capped at 30% of gross monthly income
  const estimatedMinIncome = Math.round(monthlyPayment / 0.3);

  return (
    <section
      id="calculator"
      className="bg-white rounded-3xl border border-black/[0.06] p-6 sm:p-8 lg:p-10"
    >
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-black/[0.06]">
        <div>
          <p className="text-xs font-medium text-[#6E6E73] mb-1">
            Financial Planning · HDB MSR 30% Benchmark
          </p>
          <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-[#1D1D1F] text-balance">
            One-Click Cost &amp; Monthly Repayment Estimator
          </h2>
        </div>

        {customRecordLabel ? (
          <div className="flex items-center gap-3 text-xs text-[#6E6E73]">
            <span>Pinned unit: {customRecordLabel}</span>
            {onResetCustomPrice && (
              <button
                type="button"
                onClick={onResetCustomPrice}
                className="min-h-[36px] px-3 py-1.5 rounded-lg bg-[#F5F5F7] text-[#0071E3] font-medium hover:bg-[#E8E8ED] transition-colors whitespace-nowrap"
              >
                Reset to Median
              </button>
            )}
          </div>
        ) : (
          <p className="text-xs text-[#6E6E73]">
            Synced with live median for {selectedLabel}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-6">
        {/* Left Controls */}
        <div className="lg:col-span-7 space-y-6">
          {/* Flat Price Slider & Input */}
          <div>
            <div className="flex items-baseline justify-between mb-2">
              <label
                htmlFor="flat-price-range"
                className="text-sm font-medium text-[#1D1D1F]"
              >
                Purchase Price
              </label>
              <span className="text-xl font-semibold text-[#1D1D1F] font-mono-tabular">
                {formatSgd(price)}
              </span>
            </div>
            <input
              id="flat-price-range"
              type="range"
              min={250000}
              max={1500000}
              step={5000}
              value={price}
              onChange={(e) => setPrice(Number(e.target.value))}
              className="w-full h-2 bg-[#E8E8ED] rounded-lg appearance-none cursor-pointer accent-[#0071E3]"
            />
            <div className="flex justify-between text-xs text-[#6E6E73] font-mono-tabular mt-1.5">
              <span>S$250,000</span>
              <span>S$850,000</span>
              <span>S$1,500,000</span>
            </div>
          </div>

          {/* Financing Package Segmented Control */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <span className="block text-xs font-medium text-[#6E6E73] mb-2">
                Financing Type
              </span>
              <div className="grid grid-cols-2 p-1 bg-[#F5F5F7] rounded-xl">
                <button
                  type="button"
                  onClick={() => setLoanType('HDB')}
                  className={`min-h-[44px] px-3 py-2 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${
                    loanType === 'HDB'
                      ? 'bg-white text-[#1D1D1F] shadow-xs'
                      : 'text-[#6E6E73] hover:text-[#1D1D1F]'
                  }`}
                >
                  HDB Loan (2.60%)
                </button>
                <button
                  type="button"
                  onClick={() => setLoanType('BANK')}
                  className={`min-h-[44px] px-3 py-2 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${
                    loanType === 'BANK'
                      ? 'bg-white text-[#1D1D1F] shadow-xs'
                      : 'text-[#6E6E73] hover:text-[#1D1D1F]'
                  }`}
                >
                  Bank Fixed (~3.05%)
                </button>
              </div>
            </div>

            {/* Tenure Selector */}
            <div>
              <span className="block text-xs font-medium text-[#6E6E73] mb-2">
                Loan Tenure (Years)
              </span>
              <div className="grid grid-cols-3 p-1 bg-[#F5F5F7] rounded-xl">
                {[15, 20, 25].map((yr) => (
                  <button
                    key={yr}
                    type="button"
                    onClick={() => setTenureYears(yr)}
                    className={`min-h-[44px] px-3 py-2 text-xs font-semibold rounded-lg transition-all whitespace-nowrap font-mono-tabular ${
                      tenureYears === yr
                        ? 'bg-white text-[#1D1D1F] shadow-xs'
                        : 'text-[#6E6E73] hover:text-[#1D1D1F]'
                    }`}
                  >
                    {yr} yrs
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Downpayment Ratio */}
          <div>
            <span className="block text-xs font-medium text-[#6E6E73] mb-2">
              Downpayment Percentage (CPF OA / Cash)
            </span>
            <div className="grid grid-cols-3 p-1 bg-[#F5F5F7] rounded-xl">
              {[25, 30, 40].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => setDownpaymentPct(pct)}
                  className={`min-h-[44px] px-3 py-2 text-xs font-semibold rounded-lg transition-all whitespace-nowrap font-mono-tabular ${
                    downpaymentPct === pct
                      ? 'bg-white text-[#1D1D1F] shadow-xs'
                      : 'text-[#6E6E73] hover:text-[#1D1D1F]'
                  }`}
                >
                  {pct}% Down ({100 - pct}% LTV)
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Breakdown Summary */}
        <div className="lg:col-span-5 flex flex-col justify-between lg:border-l lg:border-black/[0.06] lg:pl-8">
          <div>
            <p className="text-xs font-medium text-[#6E6E73]">
              Estimated Monthly Installment
            </p>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-semibold tracking-tight text-[#1D1D1F] font-mono-tabular">
                {formatSgd(monthlyPayment)}
              </span>
              <span className="text-sm text-[#6E6E73]">/ month</span>
            </div>
            <p className="mt-1 text-xs text-[#6E6E73]">
              {interestRate.toFixed(2)}% p.a. · {tenureYears} years · {100 - downpaymentPct}% Loan-to-Value
            </p>
          </div>

          <div className="mt-6 space-y-3 pt-5 border-t border-black/[0.06] text-sm">
            <div className="flex items-center justify-between">
              <span className="text-[#6E6E73]">
                Downpayment ({downpaymentPct}% CPF/Cash)
              </span>
              <span className="font-medium text-[#1D1D1F] font-mono-tabular">
                {formatSgd(downpaymentAmount)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#6E6E73]">
                Loan Principal ({100 - downpaymentPct}% LTV)
              </span>
              <span className="font-medium text-[#1D1D1F] font-mono-tabular">
                {formatSgd(loanAmount)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#6E6E73]">
                Buyer&apos;s Stamp Duty (IRAS BSD)
              </span>
              <span className="font-medium text-[#1D1D1F] font-mono-tabular">
                {formatSgd(bsdAmount)}
              </span>
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-black/[0.06]">
              <span className="font-medium text-[#1D1D1F]">
                Rec. Household Income (30% MSR)
              </span>
              <span className="font-semibold text-[#0071E3] font-mono-tabular">
                {formatSgd(estimatedMinIncome)}/mo
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
