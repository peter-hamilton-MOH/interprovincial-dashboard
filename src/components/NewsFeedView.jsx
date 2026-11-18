import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Search, Filter, X, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Sparkles, ArrowUpDown, ExternalLink } from 'lucide-react';
import { ThumbsUpIcon, ThumbsDownIcon } from './Icons';
import { NEWS_JURISDICTIONS } from '../constants/jurisdictions';

const SECTION_PILLS = [
  { key: 'All', label: 'All Sections' },
  { key: 'Government Announcements', label: 'Government Announcement' },
  { key: 'Articles and Research Reports', label: 'Articles & Reports' },
  { key: 'Health Ministers News', label: 'Health Ministers News' },
  { key: 'Health Care Funding', label: 'Healthcare Funding' },
];

const SECTION_KEYS = SECTION_PILLS.slice(1).map((pill) => pill.key);

const FEEDBACK_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'liked', label: 'Upvoted' },
  { value: 'bookmarked', label: 'Bookmarked' },
];

const inputClass =
  'rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500';

const smallButtonClass =
  'px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 transition-colors';

const PAGE_SIZE_OPTIONS = [10, 25, 50];

const pagerButtonClass =
  'inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors';

function buildPageList(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const shown = [...new Set([1, total, current - 1, current, current + 1])]
    .filter((p) => p >= 1 && p <= total)
    .sort((a, b) => a - b);
  return shown.flatMap((p, i) => (i > 0 && p - shown[i - 1] > 1 ? [`gap-${p}`, p] : [p]));
}

function formatLongDate(isoDate) {
  if (!isoDate) return 'Date unavailable';
  return new Date(`${isoDate}T00:00:00Z`).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function ArticleImage({ topicTag }) {
  const [failed, setFailed] = useState(false);
  const placeholderClass =
    'w-36 h-28 shrink-0 rounded-xl bg-gradient-to-br from-brand-50 to-slate-100 flex items-center justify-center text-xs font-semibold text-brand-700/70 px-2 text-center';
  const fileName = (topicTag || '').toLowerCase().replace(/[^a-z0-9]+/g, '_');

  if (failed || !fileName) {
    return <div className={placeholderClass}>{topicTag || 'Article'}</div>;
  }

  return (
    <img
      src={`/assets/${fileName}.png`}
      alt={topicTag}
      onError={() => setFailed(true)}
      className="w-36 h-28 shrink-0 rounded-xl bg-slate-100 object-cover ring-1 ring-slate-200"
    />
  );
}

function FilterRow({ label, children }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-6">
      <span className="w-32 shrink-0 pt-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">
        {label}
      </span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

export default function NewsFeedView({
  groupedData,
  loading,
  meta,
  filters,
  onFilterChange,
  onDatePreset,
  onSelectItem,
  onFeedbackChange,
  onResetFilters,
  hasActiveFilters,
  title = 'Articles',
  showDateFilter = true,
  initialSections = [],
}) {
  const [selectedSections, setSelectedSections] = useState(initialSections);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sortDir, setSortDir] = useState('desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const feedRef = useRef(null);

  const allItems = useMemo(() => {
    if (groupedData?.unifiedItems) return groupedData.unifiedItems;
    if (!groupedData?.sections) return [];
    return Object.values(groupedData.sections).flat();
  }, [groupedData]);

  const visibleItems = useMemo(() => {
    const bySection =
      selectedSections.length === 0
        ? allItems
        : allItems.filter((item) => selectedSections.includes(item.content_section));
    return [...bySection].sort((a, b) => {
      const cmp = String(a.published_at || '').localeCompare(String(b.published_at || ''));
      return sortDir === 'desc' ? -cmp : cmp;
    });
  }, [allItems, selectedSections, sortDir]);

  useEffect(() => {
    setPage(1);
  }, [filters.search, filters.jurisdiction, filters.startDate, filters.endDate, filters.topicTag, filters.sourceGroup, filters.feedback, sortDir, selectedSections]);

  if (loading && !groupedData) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-40 rounded bg-slate-200" />
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {SECTION_PILLS.map((pill) => (
            <div key={pill.key} className="h-14 rounded-xl bg-slate-200/70" />
          ))}
        </div>
        <div className="h-12 rounded-xl bg-slate-200/70" />
        <div className="h-40 rounded-xl bg-slate-200/50" />
      </div>
    );
  }

  const toggleSection = (key) => {
    if (key === 'All') {
      setSelectedSections([]);
      return;
    }
    setSelectedSections((prev) => {
      const next = prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key];
      return next.length === SECTION_KEYS.length ? [] : next;
    });
  };

  const activeFilterCount = [
    filters.jurisdiction !== 'All',
    filters.startDate !== '' || filters.endDate !== '',
    filters.topicTag !== 'All',
    filters.sourceGroup !== 'All',
    filters.feedback !== 'all',
  ].filter(Boolean).length;

  const feedbackCounts = meta?.feedbackCounts || {};

  const totalPages = Math.max(1, Math.ceil(visibleItems.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const rangeStart = visibleItems.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const rangeEnd = Math.min(currentPage * pageSize, visibleItems.length);
  const pageItems = visibleItems.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const pageList = buildPageList(currentPage, totalPages);

  const goToPage = (next) => {
    setPage(next);
    feedRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="space-y-5 pb-6">
      <section className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-600">Intelligence Feed</p>
          <h2 className="mt-1 text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">{title}</h2>
        </div>
        <span className="text-sm text-slate-500">
          <span className="font-bold text-slate-900 tabular-nums">{visibleItems.length.toLocaleString()}</span> articles
        </span>
      </section>

      <div className="flex flex-wrap gap-2">
        {SECTION_PILLS.map((pill) => {
          const active =
            pill.key === 'All' ? selectedSections.length === 0 : selectedSections.includes(pill.key);
          return (
            <button
              key={pill.key}
              type="button"
              onClick={() => toggleSection(pill.key)}
              aria-pressed={active}
              className={`px-4 py-2 rounded-full border text-sm font-semibold transition-colors ${
                active
                  ? 'border-brand-600 bg-brand-600 text-white shadow-sm'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-brand-300 hover:text-brand-700'
              }`}
            >
              {pill.label}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={filters.search}
            onChange={(e) => onFilterChange({ search: e.target.value })}
            placeholder="Search titles and summaries"
            className="w-full rounded-xl bg-slate-50 pl-10 pr-10 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 transition-colors"
          />
          {filters.search && (
            <button
              type="button"
              onClick={() => onFilterChange({ search: '' })}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => setFiltersOpen((v) => !v)}
          aria-expanded={filtersOpen}
          className={`inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
            filtersOpen || activeFilterCount > 0
              ? 'bg-brand-50 text-brand-700'
              : 'text-slate-700 hover:bg-slate-100'
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

        <div className="hidden sm:block h-6 w-px bg-slate-200" />

        <button
          type="button"
          onClick={() => setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'))}
          className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-sm text-slate-700 hover:bg-slate-100 transition-colors"
        >
          <ArrowUpDown className="w-4 h-4" />
          Date: <span className="font-semibold">{sortDir === 'desc' ? 'Newest' : 'Oldest'}</span>
        </button>
      </div>

      {filtersOpen && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <FilterRow label="Jurisdiction">
            <div className="flex flex-wrap gap-1.5">
              {NEWS_JURISDICTIONS.map((jur) => {
                const active = filters.jurisdiction === jur.name;
                return (
                  <button
                    key={jur.code}
                    type="button"
                    title={jur.fullName}
                    onClick={() => onFilterChange({ jurisdiction: jur.name })}
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
          </FilterRow>

          {showDateFilter && (
          <FilterRow label="Published">
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="date"
                value={filters.startDate}
                min={meta?.minDate || ''}
                max={filters.endDate || meta?.maxDate || ''}
                onChange={(e) => onFilterChange({ startDate: e.target.value })}
                className={inputClass}
              />
              <span className="text-xs text-slate-400">to</span>
              <input
                type="date"
                value={filters.endDate}
                min={filters.startDate || meta?.minDate || ''}
                max={meta?.maxDate || ''}
                onChange={(e) => onFilterChange({ endDate: e.target.value })}
                className={inputClass}
              />
              <button type="button" onClick={() => onDatePreset(30)} className={smallButtonClass}>
                30D
              </button>
              <button type="button" onClick={() => onDatePreset(90)} className={smallButtonClass}>
                90D
              </button>
              {(filters.startDate || filters.endDate) && (
                <button
                  type="button"
                  onClick={() => onDatePreset(null)}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-900 underline underline-offset-2"
                >
                  Clear dates
                </button>
              )}
            </div>
          </FilterRow>
          )}

          <FilterRow label="Topic">
            <select
              value={filters.topicTag}
              onChange={(e) => onFilterChange({ topicTag: e.target.value })}
              className={`${inputClass} w-full sm:w-72`}
            >
              <option value="All">All topics</option>
              {(meta?.topicTags || []).map((t) => (
                <option key={t.topic_tag} value={t.topic_tag}>
                  {t.topic_tag} ({t.count})
                </option>
              ))}
            </select>
          </FilterRow>

          <FilterRow label="Source Group">
            <select
              value={filters.sourceGroup}
              onChange={(e) => onFilterChange({ sourceGroup: e.target.value })}
              className={`${inputClass} w-full sm:w-72`}
            >
              <option value="All">All source groups</option>
              {(meta?.sourceGroups || []).map((sg) => (
                <option key={sg.display_source_group} value={sg.display_source_group}>
                  {sg.display_source_group} ({sg.count})
                </option>
              ))}
            </select>
          </FilterRow>

          <FilterRow label="Relevance">
            <div className="inline-flex items-center bg-slate-100 p-0.5 rounded-lg">
              {FEEDBACK_OPTIONS.map((opt) => {
                const count =
                  opt.value === 'liked'
                    ? feedbackCounts.liked
                    : opt.value === 'bookmarked'
                    ? feedbackCounts.bookmarked
                    : null;
                const active = filters.feedback === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => onFilterChange({ feedback: opt.value })}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                      active ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {opt.label}
                    {count != null && ` (${count})`}
                  </button>
                );
              })}
            </div>
          </FilterRow>

          <div className="flex justify-end pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onResetFilters}
              disabled={!hasActiveFilters}
              className="text-xs font-semibold text-rose-700 hover:text-rose-800 disabled:text-slate-400 disabled:cursor-not-allowed"
            >
              Reset filters
            </button>
          </div>
        </div>
      )}

      <div ref={feedRef} className="space-y-3 scroll-mt-4">
        {visibleItems.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center">
            <Sparkles className="w-7 h-7 mx-auto mb-2.5 text-slate-300" />
            <p className="text-sm font-semibold text-slate-700">No news items match the current filters</p>
            <button
              type="button"
              onClick={() => {
                setSelectedSections([]);
                onResetFilters();
              }}
              className="mt-4 px-3.5 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-xs font-semibold text-white transition-colors"
            >
              Reset all filters
            </button>
          </div>
        ) : (
          pageItems.map((item) => (
            <article
              key={item.item_id}
              className="group flex items-start gap-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:border-brand-200 hover:shadow-md"
            >
              <ArticleImage topicTag={item.topic_tag} />

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                  <span className="font-semibold text-slate-500">{formatLongDate(item.published_date)}</span>
                  {item.jurisdiction && (
                    <span className="rounded-md bg-slate-100 px-2 py-0.5 font-semibold text-slate-700">
                      {item.jurisdiction}
                    </span>
                  )}
                  {item.topic_tag && (
                    <span className="rounded-md bg-brand-50 px-2 py-0.5 font-semibold text-brand-700">
                      {item.topic_tag}
                    </span>
                  )}
                </div>

                <h3
                  onClick={() => onSelectItem(item)}
                  className="mt-1.5 text-base font-bold leading-snug text-slate-900 cursor-pointer group-hover:text-brand-700 transition-colors"
                >
                  {item.title}
                </h3>

                {item.summary && (
                  <p
                    onClick={() => onSelectItem(item)}
                    className="mt-1.5 text-sm leading-relaxed text-slate-600 line-clamp-2 cursor-pointer"
                  >
                    {item.summary}
                  </p>
                )}

                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
                  {item.source_url && (
                    <a
                      href={item.source_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex min-w-0 max-w-full items-center gap-1 text-xs font-semibold text-brand-700 hover:text-brand-800 hover:underline underline-offset-2"
                    >
                      <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{item.source_name || 'View source'}</span>
                    </a>
                  )}

                  <div className="ml-auto flex items-center gap-1">
                    {item.user_notes && (
                      <button
                        type="button"
                        onClick={() => onSelectItem(item)}
                        className="mr-1 rounded-md bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700 hover:bg-amber-100"
                      >
                        Analyst note
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onFeedbackChange(item.item_id, { vote: item.user_vote === 1 ? 0 : 1 })}
                      className={`rounded-lg p-1.5 transition-colors ${
                        item.user_vote === 1
                          ? 'bg-emerald-50 text-emerald-600'
                          : 'text-slate-400 hover:bg-slate-100 hover:text-slate-700'
                      }`}
                      title="Relevant (saved to SQLite)"
                    >
                      <ThumbsUpIcon className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onFeedbackChange(item.item_id, { vote: item.user_vote === -1 ? 0 : -1 })}
                      className={`rounded-lg p-1.5 transition-colors ${
                        item.user_vote === -1
                          ? 'bg-rose-50 text-rose-600'
                          : 'text-slate-400 hover:bg-slate-100 hover:text-slate-700'
                      }`}
                      title="Not relevant (saved to SQLite)"
                    >
                      <ThumbsDownIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </article>
          ))
        )}
      </div>

      {visibleItems.length > 0 && (
        <nav
          aria-label="News pagination"
          className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
        >
          <div className="flex flex-wrap items-center gap-3 text-xs font-medium text-slate-500">
            <span>
              Showing{' '}
              <span className="font-bold text-slate-800 tabular-nums">
                {rangeStart.toLocaleString()}–{rangeEnd.toLocaleString()}
              </span>{' '}
              of{' '}
              <span className="font-bold text-slate-800 tabular-nums">{visibleItems.length.toLocaleString()}</span>{' '}
              items
            </span>
            <label className="inline-flex items-center gap-1.5">
              Per page
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className={inputClass}
              >
                {PAGE_SIZE_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage <= 1}
              className={pagerButtonClass}
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </button>
            {pageList.map((entry) =>
              typeof entry === 'number' ? (
                <button
                  key={entry}
                  type="button"
                  onClick={() => goToPage(entry)}
                  aria-current={entry === currentPage ? 'page' : undefined}
                  className={`min-w-[36px] px-2.5 py-1.5 rounded-lg text-xs font-bold tabular-nums transition-colors ${
                    entry === currentPage ? 'bg-brand-600 text-white' : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {entry}
                </button>
              ) : (
                <span key={entry} className="px-1.5 text-xs text-slate-400">
                  …
                </span>
              )
            )}
            <button
              type="button"
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage >= totalPages}
              className={pagerButtonClass}
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </nav>
      )}
    </div>
  );
}
