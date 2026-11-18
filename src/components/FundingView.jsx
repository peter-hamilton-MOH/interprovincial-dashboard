import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import { DollarSign, TrendingUp, Users, Layers, Filter, ChevronDown, ChevronUp, RotateCcw } from 'lucide-react';
import { FUNDING_CATEGORY_META, AGE_SERVICE_CATEGORIES } from '../constants/jurisdictions';

export default function FundingView({
  fundingData,
  loading,
  selectedJurisdiction,
  selectedYear,
  onYearChange,
  sexGroup,
  onSexGroupChange,
  serviceCategory,
  onServiceCategoryChange,
  metricType,
  onMetricTypeChange,
  jurisdictions,
  onJurisdictionChange,
  hasActiveFilters,
  onResetFilters,
}) {
  const [categoryViewMode, setCategoryViewMode] = useState('nominal'); // 'nominal' | 'percent'
  const [compareSexes, setCompareSexes] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const activeFilterCount = [
    selectedJurisdiction !== 'All',
    selectedYear !== 'All',
    sexGroup !== 'Both sexes' || compareSexes,
    serviceCategory !== 'total_health',
  ].filter(Boolean).length;

  const timeSeriesRows = fundingData?.timeSeriesRows || [];
  const categoryRows = fundingData?.categoryRows || [];
  const ageRows = fundingData?.ageRows || [];
  const ageBySexRows = fundingData?.ageBySexRows || [];
  const targetYear = fundingData?.targetYear || 2025;
  const targetAgeYear = fundingData?.targetAgeYear || 2023;

  // Compute time-series by year
  const yearlyTrend = useMemo(() => {
    const byYear = new Map();
    for (const r of timeSeriesRows) {
      // When "All" jurisdictions are selected, we compute:
      // 1) National ('Canada') row if present
      // 2) PowerBI Sum across all rows in the table (which gives 619.29K in 2025)
      if (!byYear.has(r.year)) {
        byYear.set(r.year, {
          year: r.year,
          sumNominal: 0,
          canadaNominal: null,
          yoyValues: [],
          canadaYoY: null,
          perCapitaValues: [],
          canadaPerCapita: null,
        });
      }
      const bucket = byYear.get(r.year);
      if (r.total_expenditure_nominal != null) {
        bucket.sumNominal += r.total_expenditure_nominal;
        if (r.jurisdiction === 'Canada') {
          bucket.canadaNominal = r.total_expenditure_nominal;
        }
      }
      if (r.yoy_growth_percent != null) {
        bucket.yoyValues.push(r.yoy_growth_percent);
        if (r.jurisdiction === 'Canada') {
          bucket.canadaYoY = r.yoy_growth_percent;
        }
      }
      if (r.per_capita_expenditure != null) {
        bucket.perCapitaValues.push(r.per_capita_expenditure);
        if (r.jurisdiction === 'Canada') {
          bucket.canadaPerCapita = r.per_capita_expenditure;
        }
      }
    }

    return Array.from(byYear.values())
      .sort((a, b) => a.year - b.year)
      .map((b) => {
        const avgYoY =
          b.yoyValues.length > 0
            ? b.yoyValues.reduce((acc, v) => acc + v, 0) / b.yoyValues.length
            : 0;
        const avgPerCapita =
          b.perCapitaValues.length > 0
            ? b.perCapitaValues.reduce((acc, v) => acc + v, 0) / b.perCapitaValues.length
            : 0;

        // If user selected All, show both Canada National and Combined Rollup
        const displayNominal =
          selectedJurisdiction === 'All' && b.canadaNominal != null
            ? b.canadaNominal
            : b.sumNominal;

        return {
          year: String(b.year),
          nominalExpenditure: Number(displayNominal.toFixed(1)),
          powerBiSumNominal: Number(b.sumNominal.toFixed(1)),
          avgYoYGrowth: Number(avgYoY.toFixed(2)),
          canadaYoYGrowth: b.canadaYoY != null ? Number(b.canadaYoY.toFixed(2)) : Number(avgYoY.toFixed(2)),
          avgPerCapita: Number(avgPerCapita.toFixed(2)),
          canadaPerCapita: b.canadaPerCapita != null ? Number(b.canadaPerCapita.toFixed(2)) : Number(avgPerCapita.toFixed(2)),
        };
      });
  }, [timeSeriesRows, selectedJurisdiction]);

  // Latest KPI snapshot for the selected year (or latest year 2025)
  const kpiSnapshot = useMemo(() => {
    const match =
      yearlyTrend.find((y) => Number(y.year) === Number(targetYear)) ||
      yearlyTrend[yearlyTrend.length - 1];
    if (!match) {
      return {
        nominal: 0,
        powerBiSum: 0,
        yoy: 0,
        canadaYoY: 0,
        perCapita: 0,
        canadaPerCapita: 0,
      };
    }
    return {
      nominal: match.nominalExpenditure,
      powerBiSum: match.powerBiSumNominal,
      yoy: match.avgYoYGrowth,
      canadaYoY: match.canadaYoYGrowth,
      perCapita: match.avgPerCapita,
      canadaPerCapita: match.canadaPerCapita,
    };
  }, [yearlyTrend, targetYear]);

  // Category breakdown data (nominal vs % share)
  const formattedCategories = useMemo(() => {
    return categoryRows.map((row) => {
      const total =
        FUNDING_CATEGORY_META.reduce((acc, c) => acc + (Number(row[c.key]) || 0), 0) || 1;
      const out = {
        jurisdiction: row.jurisdiction,
        sub_total: row.sub_total,
      };
      for (const c of FUNDING_CATEGORY_META) {
        const raw = Number(row[c.key]) || 0;
        out[c.key] =
          categoryViewMode === 'percent'
            ? Number(((raw / total) * 100).toFixed(2))
            : Number(raw.toFixed(1));
      }
      return out;
    });
  }, [categoryRows, categoryViewMode]);

  if (loading && !fundingData) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 animate-pulse">
        <div className="h-64 bg-white rounded-2xl border border-slate-200 p-6" />
        <div className="h-64 bg-white rounded-2xl border border-slate-200 p-6" />
      </div>
    );
  }

  const formatMillions = (valInMillions) => {
    if (valInMillions >= 1000) {
      return `$${(valInMillions / 1000).toFixed(2)}B`;
    }
    return `$${valInMillions.toFixed(1)}M`;
  };

  return (
    <div className="space-y-4 pb-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-600">CIHI NHEX Gold Dataset</p>
          <h2 className="mt-1 text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Health Care Funding</h2>
        </div>
        <button
          type="button"
          onClick={() => setFiltersOpen((v) => !v)}
          aria-expanded={filtersOpen}
          className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold transition-colors ${
            filtersOpen || activeFilterCount > 0 ? 'bg-brand-50 text-brand-700' : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          <Filter className="w-4 h-4" />
          Filters
          {activeFilterCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-brand-600 text-white text-[10px] font-bold tabular-nums">
              {activeFilterCount}
            </span>
          )}
          {filtersOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {filtersOpen && (
        <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="flex flex-wrap items-center gap-1.5">
            {jurisdictions.map((jur) => {
              const active = selectedJurisdiction === jur.name;
              return (
                <button
                  key={jur.code}
                  type="button"
                  title={jur.fullName}
                  aria-pressed={active}
                  onClick={() => onJurisdictionChange(jur.name)}
                  className={`px-2.5 py-1 rounded-md text-xs font-bold transition-colors ${
                    active
                      ? 'bg-brand-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-brand-50 hover:text-brand-700'
                  }`}
                >
                  {jur.code}
                </button>
              );
            })}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={onResetFilters}
                className="ml-auto inline-flex items-center gap-1 rounded-lg bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-700 transition-colors hover:bg-rose-100"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
        {/* Year Selector Pills */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Year:</span>
          {['All', '2022', '2023', '2024', '2025'].map((yr) => {
            const active = String(selectedYear) === yr;
            return (
              <button
                key={yr}
                onClick={() => onYearChange(yr)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  active
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {yr}
              </button>
            );
          })}
        </div>

        {/* Service Category Selector (for Age/Sex Chart) */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Age Cohort Service:
          </span>
          <div className="flex items-center bg-slate-100 p-0.5 rounded-xl flex-wrap">
            {AGE_SERVICE_CATEGORIES.map((sc) => {
              const active = serviceCategory === sc.value;
              return (
                <button
                  key={sc.value}
                  onClick={() => onServiceCategoryChange(sc.value)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                    active
                      ? 'bg-white text-brand-700 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {sc.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Sex Group Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Sex:</span>
          <div className="flex items-center bg-slate-100 p-0.5 rounded-xl">
            {['Both sexes', 'Female', 'Male'].map((sx) => {
              const active = !compareSexes && sexGroup === sx;
              return (
                <button
                  key={sx}
                  onClick={() => {
                    setCompareSexes(false);
                    onSexGroupChange(sx);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                    active
                      ? 'bg-white text-brand-700 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {sx}
                </button>
              );
            })}
            <button
              onClick={() => setCompareSexes(true)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                compareSexes
                  ? 'bg-brand-600 text-white shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Compare Female vs Male side-by-side"
            >
              F vs M
            </button>
          </div>
        </div>
      </div>
        </div>
      )}

      {/* KPI Cards Row (matching funding.png KPIs with clear units & benchmarks) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-sm flex items-start justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Latest Total Expenditure (Nominal, {targetYear})
            </span>
            <div className="mt-2 flex items-baseline gap-2.5">
              <span className="text-3xl font-extrabold text-slate-900 tabular-nums">
                {formatMillions(kpiSnapshot.nominal)}
              </span>
              <span className="text-xs font-semibold text-slate-500 tabular-nums">
                ({kpiSnapshot.nominal.toLocaleString()} $M)
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1.5">
              {selectedJurisdiction === 'All'
                ? `National (Canada) Total • Combined P/T + Can Rollup: ${(kpiSnapshot.powerBiSum / 1000).toFixed(2)}K ($M)`
                : `Selected Jurisdiction: ${selectedJurisdiction}`}
            </p>
          </div>
          <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-sm flex items-start justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Latest YoY Growth (%, {targetYear})
            </span>
            <div className="mt-2 flex items-baseline gap-2.5">
              <span className="text-3xl font-extrabold text-slate-900 tabular-nums">
                {kpiSnapshot.yoy.toFixed(2)}%
              </span>
              {selectedJurisdiction === 'All' && (
                <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                  Canada Rate: {kpiSnapshot.canadaYoY.toFixed(2)}%
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 mt-1.5">
              {selectedJurisdiction === 'All'
                ? 'Jurisdictional Mean YoY Growth across 14 FPT entities'
                : `Annual nominal expenditure growth for ${selectedJurisdiction}`}
            </p>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-sm flex items-start justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Latest Per Capita Expenditure ({targetYear})
            </span>
            <div className="mt-2 flex items-baseline gap-2.5">
              <span className="text-3xl font-extrabold text-slate-900 tabular-nums">
                ${kpiSnapshot.perCapita.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              {selectedJurisdiction === 'All' && (
                <span className="text-xs font-semibold text-brand-700 bg-brand-50 px-2 py-0.5 rounded-md">
                  National: ${kpiSnapshot.canadaPerCapita.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 mt-1.5">
              {selectedJurisdiction === 'All'
                ? 'Unweighted P/T + National Mean (reflects higher Northern per-capita costs)'
                : `Per capita health expenditure in ${selectedJurisdiction}`}
            </p>
          </div>
          <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600">
            <Users className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Row 1 of Charts: Nominal Expenditure Over Time + YoY Growth (%) Over Time */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Nominal Expenditure Over Time */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Nominal Expenditure Over Time</h3>
              <p className="text-xs text-slate-500">
                Total expenditure ($ Millions) from 2022 to 2025 ({selectedJurisdiction === 'All' ? 'Canada National' : selectedJurisdiction})
              </p>
            </div>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={yearlyTrend} margin={{ top: 10, right: 24, left: 12, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#334155', fontWeight: 600 }} />
                <YAxis
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickFormatter={(v) => (v >= 1000 ? `$${(v / 1000).toFixed(0)}B` : `$${v}M`)}
                />
                <Tooltip
                  formatter={(val) => [`$${Number(val).toLocaleString()}M`, 'Expenditure']}
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                />
                <Line
                  type="monotone"
                  dataKey="nominalExpenditure"
                  name="Nominal Expenditure ($M)"
                  stroke="#1d4ed8"
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#1d4ed8' }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* YoY Growth (%) Over Time */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">YoY Growth (%) Over Time</h3>
              <p className="text-xs text-slate-500">
                Year-over-year percentage change in health expenditure (2022–2025)
              </p>
            </div>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={yearlyTrend} margin={{ top: 10, right: 24, left: 4, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#334155', fontWeight: 600 }} />
                <YAxis
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickFormatter={(v) => `${v}%`}
                />
                <ReferenceLine y={0} stroke="#cbd5e1" strokeDasharray="3 3" />
                <Tooltip
                  formatter={(val) => [`${val}%`, 'YoY Growth']}
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Line
                  type="monotone"
                  dataKey="avgYoYGrowth"
                  name={selectedJurisdiction === 'All' ? 'Jurisdictional Mean YoY (%)' : `${selectedJurisdiction} YoY (%)`}
                  stroke="#0284c7"
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#0284c7' }}
                />
                {selectedJurisdiction === 'All' && (
                  <Line
                    type="monotone"
                    dataKey="canadaYoYGrowth"
                    name="Canada National YoY (%)"
                    stroke="#10b981"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={{ r: 3, fill: '#10b981' }}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 2 of Charts: Expenditure by Service Category + Expenditure by Age Group */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Expenditure by Service Category (Latest/Selected Year) */}
        <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200/90 p-5 shadow-sm flex flex-col">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Expenditure by Service Category ({targetYear})
              </h3>
              <p className="text-xs text-slate-500">
                Breakdown across Hospitals, Physicians, Drugs, Public Health & Home Care
              </p>
            </div>
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-xs font-semibold">
              <button
                onClick={() => setCategoryViewMode('nominal')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  categoryViewMode === 'nominal'
                    ? 'bg-white text-slate-900 shadow-2xs font-bold'
                    : 'text-slate-600'
                }`}
              >
                Nominal ($M)
              </button>
              <button
                onClick={() => setCategoryViewMode('percent')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  categoryViewMode === 'percent'
                    ? 'bg-white text-slate-900 shadow-2xs font-bold'
                    : 'text-slate-600'
                }`}
              >
                Share (%)
              </button>
            </div>
          </div>

          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={formattedCategories}
                layout="vertical"
                margin={{ top: 5, right: 20, left: 25, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                <XAxis
                  type="number"
                  domain={categoryViewMode === 'percent' ? [0, 100] : ['auto', 'auto']}
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  tickFormatter={(v) =>
                    categoryViewMode === 'percent'
                      ? `${v}%`
                      : v >= 1000
                      ? `$${(v / 1000).toFixed(0)}B`
                      : `$${v}M`
                  }
                />
                <YAxis
                  type="category"
                  dataKey="jurisdiction"
                  width={135}
                  tick={{ fontSize: 11, fill: '#334155', fontWeight: 600 }}
                />
                <Tooltip
                  formatter={(val, name) => [
                    categoryViewMode === 'percent' ? `${val}%` : `$${Number(val).toLocaleString()}M`,
                    name,
                  ]}
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '11px' }}
                />
                <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '8px' }} />
                {FUNDING_CATEGORY_META.map((cat) => (
                  <Bar
                    key={cat.key}
                    dataKey={cat.key}
                    name={cat.label}
                    stackId="a"
                    fill={cat.color}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Expenditure by Age Group (Latest Available) */}
        <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200/90 p-5 shadow-sm flex flex-col">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Expenditure by Age Group ({targetAgeYear})
              </h3>
              <p className="text-xs text-slate-500">
                {AGE_SERVICE_CATEGORIES.find((c) => c.value === serviceCategory)?.label || 'Total Health'} •{' '}
                {compareSexes ? 'Female vs Male Comparison' : sexGroup}
              </p>
            </div>

            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-xs font-semibold">
              <button
                onClick={() => onMetricTypeChange('total_expenditure')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  metricType === 'total_expenditure'
                    ? 'bg-white text-slate-900 shadow-2xs font-bold'
                    : 'text-slate-600'
                }`}
              >
                Total ($M)
              </button>
              <button
                onClick={() => onMetricTypeChange('per_capita_expenditure')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  metricType === 'per_capita_expenditure'
                    ? 'bg-white text-slate-900 shadow-2xs font-bold'
                    : 'text-slate-600'
                }`}
              >
                Per Capita ($)
              </button>
            </div>
          </div>

          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={compareSexes ? ageBySexRows : ageRows}
                margin={{ top: 10, right: 16, left: 8, bottom: 30 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="age_group"
                  tick={{ fontSize: 10, fill: '#334155', fontWeight: 600 }}
                  angle={-35}
                  textAnchor="end"
                  interval={0}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  tickFormatter={(v) =>
                    metricType === 'per_capita_expenditure'
                      ? `$${(v / 1000).toFixed(0)}k`
                      : v >= 1000
                      ? `$${(v / 1000).toFixed(0)}B`
                      : `$${v.toFixed(0)}M`
                  }
                />
                <Tooltip
                  formatter={(val, name) => [
                    metricType === 'per_capita_expenditure'
                      ? `$${Number(val).toLocaleString(undefined, { maximumFractionDigits: 0 })} per capita`
                      : `$${Number(val).toLocaleString(undefined, { maximumFractionDigits: 1 })}M`,
                    name,
                  ]}
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                />
                {compareSexes ? (
                  <>
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <Bar dataKey="Female" name="Female" fill="#ec4899" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Male" name="Male" fill="#0284c7" radius={[4, 4, 0, 0]} />
                  </>
                ) : (
                  <Bar
                    dataKey="value"
                    name={metricType === 'per_capita_expenditure' ? 'Per Capita ($)' : 'Expenditure ($M)'}
                    fill="#1d4ed8"
                    radius={[5, 5, 0, 0]}
                  />
                )}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
