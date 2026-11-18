import React, { useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area,
} from 'recharts';
import { Database, Building2, Landmark, FileSpreadsheet, ThumbsUp, ArrowUpRight, Calendar, X, RotateCcw, Bookmark, Filter, ChevronDown, ChevronUp } from 'lucide-react';

const SOURCE_GROUP_COLORS = ['#1d4ed8', '#0ea5e9', '#f97316', '#7c3aed', '#10b981'];
const SECTION_BAR_COLORS = {
  'Government Announcements': '#2563eb',
  'Health Care Funding': '#059669',
  'Health Ministers News': '#4f46e5',
  'Articles and Research Reports': '#d97706',
};

export default function NewsStatsView({
  statsData,
  loading,
  onDrillDown,
  meta,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onDatePreset,
  jurisdictions,
  currentJurisdiction,
  onJurisdictionChange,
  feedback,
  onFeedbackChange,
  feedbackCounts,
  hasActiveFilters,
  onResetFilters,
}) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const activeFilterCount = [
    currentJurisdiction !== 'All',
    startDate !== '' || endDate !== '',
    feedback !== 'all',
  ].filter(Boolean).length;

  if (loading && !statsData) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 animate-pulse">
        <div className="h-64 bg-white rounded-2xl border border-slate-200 p-6" />
        <div className="h-64 bg-white rounded-2xl border border-slate-200 p-6" />
        <div className="h-64 bg-white rounded-2xl border border-slate-200 p-6" />
      </div>
    );
  }

  const kpis = statsData?.kpis || {};
  const unfilteredTotal = statsData?.unfilteredTotal || 1227;
  const totalItems = kpis.total_items ?? 0;
  const byContentSection = statsData?.byContentSection || [];
  const byTopicTag = statsData?.byTopicTag || [];
  const bySourceGroup = statsData?.bySourceGroup || [];
  const byJurisdiction = statsData?.byJurisdiction || [];
  const byMonth = statsData?.byMonth || [];
  const audit = statsData?.audit;

  const govPct = totalItems > 0 ? ((kpis.gov_source_count / totalItems) * 100).toFixed(1) : '0.0';
  const fundingPct = totalItems > 0 ? ((kpis.funding_related_count / totalItems) * 100).toFixed(1) : '0.0';

  return (
    <div className="space-y-6 pb-6">
      <section className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-600">Intelligence Insights</p>
            <h2 className="mt-1 text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Article Stats</h2>
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
          <div className="flex flex-wrap gap-1.5">
            {jurisdictions.map((jur) => {
              const active = currentJurisdiction === jur.name;
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
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
            <div className="inline-flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2">
              <Calendar className="w-3.5 h-3.5 shrink-0 text-slate-400" />
              <input
                type="date"
                value={startDate}
                min={meta?.minDate || ''}
                max={endDate || meta?.maxDate || ''}
                onChange={(e) => onStartDateChange(e.target.value)}
                title="Start date"
                className="w-[118px] bg-transparent text-xs font-medium text-slate-700 focus:outline-none"
              />
              <span className="text-slate-300">—</span>
              <input
                type="date"
                value={endDate}
                min={startDate || meta?.minDate || ''}
                max={meta?.maxDate || ''}
                onChange={(e) => onEndDateChange(e.target.value)}
                title="End date"
                className="w-[118px] bg-transparent text-xs font-medium text-slate-700 focus:outline-none"
              />
            </div>
            <button
              type="button"
              onClick={() => onDatePreset(30)}
              className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-200"
            >
              30D
            </button>
            <button
              type="button"
              onClick={() => onDatePreset(90)}
              className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-200"
            >
              90D
            </button>
            {(startDate || endDate) && (
              <button
                type="button"
                onClick={() => onDatePreset(null)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-900"
              >
                <X className="w-3 h-3" />
                Clear dates
              </button>
            )}

            <div className="ml-auto flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => onFeedbackChange('liked')}
                aria-pressed={feedback === 'liked'}
                className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                  feedback === 'liked'
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <ThumbsUp className="w-3 h-3" />
                Upvoted ({feedbackCounts?.liked || 0})
              </button>
              <button
                type="button"
                onClick={() => onFeedbackChange('bookmarked')}
                aria-pressed={feedback === 'bookmarked'}
                className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                  feedback === 'bookmarked'
                    ? 'bg-amber-50 text-amber-700'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Bookmark className="w-3 h-3" />
                Saved ({feedbackCounts?.bookmarked || 0})
              </button>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={onResetFilters}
                  className="inline-flex items-center gap-1 rounded-lg bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-700 transition-colors hover:bg-rose-100"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset
                </button>
              )}
            </div>
          </div>
        </div>
        )}
      </section>

      <div className="space-y-4">
      {/* Top KPI Summary Strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total Items Ingested</span>
            <span className="p-1.5 rounded-lg bg-brand-50 text-brand-600">
              <Database className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 tabular-nums">
              {totalItems.toLocaleString()}
            </span>
            {totalItems !== unfilteredTotal && (
              <span className="text-xs text-slate-400 font-medium">
                / {unfilteredTotal.toLocaleString()} total
              </span>
            )}
          </div>
          <p className="text-[11px] text-emerald-600 font-semibold mt-1">
            Pipeline Status: {audit?.final_GO_NO_GO_status || 'GO'} ({kpis.active_jurisdictions || 0} Jurisdictions)
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Government Sources</span>
            <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
              <Landmark className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900 tabular-nums">
              {(kpis.gov_source_count || 0).toLocaleString()}
            </span>
            <span className="text-xs font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
              {govPct}%
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Official Federal/P/T Newsrooms
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Funding Announcements</span>
            <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
              <Building2 className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900 tabular-nums">
              {(kpis.funding_related_count || 0).toLocaleString()}
            </span>
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
              {fundingPct}%
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Tagged with fiscal or capital investments
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Ministerial Releases</span>
            <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
              <FileSpreadsheet className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900 tabular-nums">
              {(kpis.minister_related_count || 0).toLocaleString()}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Direct Health Minister statements & events
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Analyst Curated</span>
            <span className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
              <ThumbsUp className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-3">
            <div>
              <span className="text-2xl font-extrabold text-slate-900 tabular-nums">
                {kpis.liked_count || 0}
              </span>
              <span className="text-xs text-slate-500 ml-1">Upvoted</span>
            </div>
            <div>
              <span className="text-2xl font-extrabold text-amber-600 tabular-nums">
                {kpis.bookmarked_count || 0}
              </span>
              <span className="text-xs text-slate-500 ml-1">Saved</span>
            </div>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Persisted in local SQLite database
          </p>
        </div>
      </div>

      {/* Row 1 of Charts: Items by Content Section + Items by Topic Tag */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Items by Content Section */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/90 p-5 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Items by Content Section</h3>
              <p className="text-xs text-slate-500">Click any bar to open matching articles</p>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={byContentSection}
                layout="vertical"
                margin={{ top: 5, right: 32, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis
                  type="category"
                  dataKey="content_section"
                  width={155}
                  tick={{ fontSize: 11, fill: '#334155', fontWeight: 600 }}
                />
                <Tooltip
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                />
                <Bar
                  dataKey="item_count"
                  name="Items"
                  radius={[0, 6, 6, 0]}
                  cursor="pointer"
                  onClick={(data) => onDrillDown && onDrillDown({ contentSection: data.content_section })}
                >
                  {byContentSection.map((entry, idx) => (
                    <Cell
                      key={idx}
                      fill={SECTION_BAR_COLORS[entry.content_section] || '#2563eb'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Items by Topic Tag */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/90 p-5 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Items by Topic Tag</h3>
              <p className="text-xs text-slate-500">Distribution across intergovernmental policy & clinical priority areas</p>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={byTopicTag}
                layout="vertical"
                margin={{ top: 5, right: 32, left: 25, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis
                  type="category"
                  dataKey="topic_tag"
                  width={175}
                  tick={{ fontSize: 11, fill: '#334155', fontWeight: 500 }}
                />
                <Tooltip
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                />
                <Bar
                  dataKey="item_count"
                  name="Items"
                  fill="#0284c7"
                  radius={[0, 6, 6, 0]}
                  cursor="pointer"
                  onClick={(data) => onDrillDown && onDrillDown({ topicTag: data.topic_tag })}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 2 of Charts: Items by Source Group (Donut) + Items by Jurisdiction (Column) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Items by Source Group */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/90 p-5 shadow-sm flex flex-col">
          <div className="mb-2">
            <h3 className="text-sm font-bold text-slate-900">Items by Source Group</h3>
            <p className="text-xs text-slate-500">Share of official government newsrooms vs research & media</p>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={bySourceGroup}
                  dataKey="item_count"
                  nameKey="display_source_group"
                  cx="50%"
                  cy="50%"
                  innerRadius={52}
                  outerRadius={82}
                  paddingAngle={3}
                  onClick={(data) => onDrillDown && onDrillDown({ sourceGroup: data.display_source_group })}
                  className="cursor-pointer"
                  label={({ percent }) => `${(percent * 100).toFixed(1)}%`}
                >
                  {bySourceGroup.map((entry, index) => (
                    <Cell key={index} fill={SOURCE_GROUP_COLORS[index % SOURCE_GROUP_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  wrapperStyle={{ fontSize: '11px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Items by Jurisdiction */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/90 p-5 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Items by Jurisdiction</h3>
              <p className="text-xs text-slate-500">Click any jurisdiction column to filter the entire hub</p>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={byJurisdiction}
                margin={{ top: 10, right: 20, left: 0, bottom: 35 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="jurisdiction"
                  tick={{ fontSize: 11, fill: '#334155', fontWeight: 500 }}
                  angle={-22}
                  textAnchor="end"
                  interval={0}
                />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                />
                <Bar
                  dataKey="item_count"
                  name="Items"
                  fill="#1d4ed8"
                  radius={[6, 6, 0, 0]}
                  cursor="pointer"
                  onClick={(data) => onDrillDown && onDrillDown({ jurisdiction: data.jurisdiction })}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 3: Monthly Intelligence Velocity Trend */}
      {byMonth.length > 1 && (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Intergovernmental Intelligence Publication Velocity</h3>
              <p className="text-xs text-slate-500">Monthly volume of ingested announcements and research items</p>
            </div>
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600">
              Live SQLite Aggregation <ArrowUpRight className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={byMonth} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="colorItems" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0284c7" stopOpacity={0.28} />
                    <stop offset="95%" stopColor="#0284c7" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="year_month" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                />
                <Area
                  type="monotone"
                  dataKey="item_count"
                  name="Published Items"
                  stroke="#0284c7"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorItems)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
