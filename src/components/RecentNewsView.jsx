import React, { useState, useMemo } from 'react';
import { ExternalLink, Sparkles, MessageSquareText, Check } from 'lucide-react';
import { ThumbsUpIcon, ThumbsDownIcon } from './Icons';
import {
  SECTION_CONFIG,
  JURISDICTION_BADGE_COLORS,
  JURISDICTION_CODE_MAP,
  TOPIC_BADGE_COLORS,
} from '../constants/jurisdictions';

const SECTION_KEYS = [
  'Government Announcements',
  'Health Care Funding',
  'Health Ministers News',
  'Articles and Research Reports',
];

export default function RecentNewsView({
  groupedData,
  loading,
  onSelectItem,
  onFeedbackChange,
  onResetFilters,
}) {
  // Active section toggles: empty array or all 4 means "All Sections"
  const [selectedSections, setSelectedSections] = useState([]);

  const counts = groupedData?.counts || {};
  const totalMatched = groupedData?.totalMatched ?? 0;

  // Build unified chronological item list from server or fallback to merging sections
  const allUnifiedItems = useMemo(() => {
    if (groupedData?.unifiedItems) {
      return groupedData.unifiedItems;
    }
    if (!groupedData?.sections) return [];
    return Object.values(groupedData.sections)
      .flat()
      .sort((a, b) => String(b.published_at || '').localeCompare(String(a.published_at || '')));
  }, [groupedData]);

  const filteredItems = useMemo(() => {
    if (selectedSections.length === 0) return allUnifiedItems;
    return allUnifiedItems.filter((item) => selectedSections.includes(item.content_section));
  }, [allUnifiedItems, selectedSections]);

  const toggleSection = (secKey) => {
    setSelectedSections((prev) => {
      if (prev.includes(secKey)) {
        return prev.filter((k) => k !== secKey);
      }
      const next = [...prev, secKey];
      // If all 4 are selected, reset to "All" (empty array)
      return next.length === SECTION_KEYS.length ? [] : next;
    });
  };

  const isAllSelected = selectedSections.length === 0;

  if (loading && !groupedData) {
    return (
      <div className="animate-pulse flex flex-col gap-4">
        <div className="flex gap-2">
          <div className="h-9 bg-slate-200 rounded-xl w-36" />
          <div className="h-9 bg-slate-100 rounded-xl w-48" />
          <div className="h-9 bg-slate-100 rounded-xl w-44" />
          <div className="h-9 bg-slate-100 rounded-xl w-44" />
        </div>
        <div className="h-24 bg-slate-100 rounded-xl" />
        <div className="h-24 bg-slate-100 rounded-xl" />
        <div className="h-24 bg-slate-100 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Top Section Toggles Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* "All Sections" Toggle */}
          <button
            onClick={() => setSelectedSections([])}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
              isAllSelected
                ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <span>All Sections</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[11px] font-extrabold tabular-nums ${
                isAllSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
              }`}
            >
              {totalMatched}
            </span>
          </button>

          <div className="h-5 w-[1px] bg-slate-200 hidden sm:block mx-0.5" />

          {/* Individual Content Section Toggles */}
          {SECTION_KEYS.map((secKey) => {
            const cfg = SECTION_CONFIG[secKey] || SECTION_CONFIG['Government Announcements'];
            const count = counts[secKey] ?? 0;
            const isActive = selectedSections.includes(secKey);

            return (
              <button
                key={secKey}
                onClick={() => toggleSection(secKey)}
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                  isActive
                    ? 'bg-brand-600 text-white border-brand-600 shadow-xs ring-2 ring-brand-500/20'
                    : 'bg-white text-slate-700 border-slate-200/90 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${
                    isActive ? 'bg-white' : cfg.dotColor
                  }`}
                />
                <span>{cfg.title}</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[11px] font-extrabold tabular-nums ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : `${cfg.badgeBg}`
                  }`}
                >
                  {count}
                </span>
                {isActive && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
              </button>
            );
          })}
        </div>

        {/* Active Feed Count Indicator */}
        <div className="text-xs text-slate-500 font-medium hidden xl:flex items-center gap-2">
          <span>
            Showing <strong className="text-slate-800 tabular-nums">{filteredItems.length}</strong> items
          </span>
          {!isAllSelected && (
            <button
              onClick={() => setSelectedSections([])}
              className="text-brand-600 hover:text-brand-700 font-semibold underline underline-offset-2"
            >
              Show all
            </button>
          )}
        </div>
      </div>

      <div className="divide-y divide-slate-200">
        {filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-16 text-slate-400">
            <Sparkles className="w-8 h-8 mb-2.5 text-slate-300" />
            <p className="text-sm font-semibold text-slate-700">No news items match the current filters</p>
            <p className="text-xs text-slate-400 mt-1">
              Try toggling additional content sections, expanding the date range, or selecting "All" jurisdictions.
            </p>
            <button
              onClick={() => {
                setSelectedSections([]);
                onResetFilters();
              }}
              className="mt-3.5 px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-semibold text-white transition-colors"
            >
              Reset All Filters
            </button>
          </div>
        ) : (
          filteredItems.map((item) => {
            const jurCode = JURISDICTION_CODE_MAP[item.jurisdiction] || item.jurisdiction;
            const jurBadge =
              JURISDICTION_BADGE_COLORS[item.jurisdiction] ||
              'bg-slate-100 text-slate-700 ring-slate-500/20';
            const topicBadge = TOPIC_BADGE_COLORS[item.topic_tag] || TOPIC_BADGE_COLORS.Other;
            const secCfg =
              SECTION_CONFIG[item.content_section] || SECTION_CONFIG['Government Announcements'];

            return (
              <article
                key={item.item_id}
                className="group py-5 flex items-start justify-between gap-5"
              >
                <div className="w-32 h-28 shrink-0 rounded-lg border border-slate-200 bg-slate-100 flex items-center justify-center text-xs font-medium text-slate-400">
                  Image
                </div>
                {/* Left Column: Title, Summary, Metadata */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-bold ring-1 ring-inset ${secCfg.badgeBg}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${secCfg.dotColor}`} />
                      {item.content_section}
                    </span>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-md font-bold text-[11px] ring-1 ring-inset ${jurBadge}`}
                      title={item.jurisdiction}
                    >
                      {jurCode}
                    </span>
                    {item.topic_tag && (
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${topicBadge}`}
                      >
                        {item.topic_tag}
                      </span>
                    )}
                  </div>

                  <h3
                    onClick={() => onSelectItem(item)}
                    className="text-[15px] font-bold text-slate-900 group-hover:text-brand-700 cursor-pointer leading-snug transition-colors"
                  >
                    {item.title}
                  </h3>

                  {item.summary && (
                    <p
                      onClick={() => onSelectItem(item)}
                      className="text-xs sm:text-[13px] text-slate-600 mt-1 leading-relaxed line-clamp-2 cursor-pointer"
                    >
                      {item.summary}
                    </p>
                  )}

                  {/* Metadata Sub-line */}
                  <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-slate-500">
                    <span className="font-semibold text-slate-700">
                      {item.source_name || 'Official Release'}
                    </span>
                    <span className="text-slate-300">|</span>
                    <span className="tabular-nums font-medium text-slate-500">
                      {item.published_date || 'N/A'}
                    </span>
                    {item.user_notes && (
                      <>
                        <span className="text-slate-300">|</span>
                        <span
                          onClick={() => onSelectItem(item)}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 text-[11px] font-semibold cursor-pointer"
                          title={item.user_notes}
                        >
                          <MessageSquareText className="w-3 h-3" /> Analyst Note
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Right Column: Link button on top + Thumbs Up / Thumbs Down underneath (matching news.png mockup) */}
                <div className="flex flex-col items-end gap-2 shrink-0 pt-0.5">
                  {item.source_url ? (
                    <a
                      href={item.source_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center gap-1.5 w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-brand-50 hover:border-brand-300 hover:text-brand-700 text-slate-700 text-xs font-semibold shadow-2xs transition-all"
                      title="Open source article in new tab"
                    >
                      Link
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <button
                      onClick={() => onSelectItem(item)}
                      className="inline-flex items-center justify-center gap-1 w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 text-xs font-semibold"
                    >
                      Details
                    </button>
                  )}

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() =>
                        onFeedbackChange(item.item_id, {
                          vote: item.user_vote === 1 ? 0 : 1,
                        })
                      }
                      className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                        item.user_vote === 1
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-600 shadow-2xs'
                          : 'bg-white border-slate-200 text-slate-400 hover:text-emerald-600 hover:border-emerald-200 hover:bg-emerald-50/40'
                      }`}
                      title="Thumbs up (saves relevance vote to SQLite)"
                    >
                      <ThumbsUpIcon className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() =>
                        onFeedbackChange(item.item_id, {
                          vote: item.user_vote === -1 ? 0 : -1,
                        })
                      }
                      className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                        item.user_vote === -1
                          ? 'bg-rose-50 border-rose-300 text-rose-600 shadow-2xs'
                          : 'bg-white border-slate-200 text-slate-400 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50/40'
                      }`}
                      title="Thumbs down (saves relevance vote to SQLite)"
                    >
                      <ThumbsDownIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </article>
            );
          })
        )}
      </div>
    </div>
  );
}

