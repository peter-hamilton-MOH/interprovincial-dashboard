import React from 'react';
import {
  ExternalLink,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Bookmark,
  MessageSquareText,
} from 'lucide-react';
import { ThumbsUpIcon, ThumbsDownIcon } from './Icons';
import {
  JURISDICTION_BADGE_COLORS,
  JURISDICTION_CODE_MAP,
  TOPIC_BADGE_COLORS,
} from '../constants/jurisdictions';

export default function ArchiveView({
  archiveData,
  loading,
  meta,
  filters,
  onFilterChange,
  onSelectItem,
  onFeedbackChange,
}) {
  const items = archiveData?.items || [];
  const total = archiveData?.total || 0;
  const page = archiveData?.page || 1;
  const pageSize = archiveData?.pageSize || 25;
  const totalPages = archiveData?.totalPages || 1;

  const handleSort = (col) => {
    if (filters.sortBy === col) {
      onFilterChange({ sortDir: filters.sortDir === 'ASC' ? 'DESC' : 'ASC', page: 1 });
    } else {
      onFilterChange({ sortBy: col, sortDir: 'DESC', page: 1 });
    }
  };

  const handleExportCSV = () => {
    if (!items.length) return;
    const headers = [
      'published_date',
      'jurisdiction',
      'content_section',
      'topic_tag',
      'source_name',
      'title',
      'summary',
      'source_url',
      'user_vote',
      'user_notes',
    ];
    const escapeCell = (val) => {
      const s = val == null ? '' : String(val);
      return `"${s.replace(/"/g, '""')}"`;
    };
    const csvRows = [
      headers.join(','),
      ...items.map((r) => headers.map((h) => escapeCell(r[h])).join(',')),
    ];
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `intergovernmental_intelligence_export_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-3 pb-6">
      {/* Secondary Archive Filter Strip (Content Section, Topic Tag, Source Group, Curation & CSV Export) */}
      <div className="bg-white rounded-2xl border border-slate-200/90 px-4 py-3 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Content Section Filter */}
          <select
            value={filters.contentSection || 'All'}
            onChange={(e) => onFilterChange({ contentSection: e.target.value, page: 1 })}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="All">All Content Sections</option>
            {(meta?.contentSections || []).map((cs) => (
              <option key={cs.content_section} value={cs.content_section}>
                {cs.content_section} ({cs.count})
              </option>
            ))}
          </select>

          {/* Topic Tag Filter */}
          <select
            value={filters.topicTag || 'All'}
            onChange={(e) => onFilterChange({ topicTag: e.target.value, page: 1 })}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="All">All Topic Tags</option>
            {(meta?.topicTags || []).map((tt) => (
              <option key={tt.topic_tag} value={tt.topic_tag}>
                {tt.topic_tag} ({tt.count})
              </option>
            ))}
          </select>

          {/* Source Group Filter */}
          <select
            value={filters.sourceGroup || 'All'}
            onChange={(e) => onFilterChange({ sourceGroup: e.target.value, page: 1 })}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="All">All Source Groups</option>
            {(meta?.sourceGroups || []).map((sg) => (
              <option key={sg.display_source_group} value={sg.display_source_group}>
                {sg.display_source_group} ({sg.count})
              </option>
            ))}
          </select>

          {/* Feedback / Bookmark Filter */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-xl text-xs font-semibold">
            {[
              { id: 'all', label: 'All Items' },
              { id: 'liked', label: 'Upvoted 👍' },
              { id: 'bookmarked', label: 'Bookmarked ★' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => onFilterChange({ feedback: tab.id, page: 1 })}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  (filters.feedback || 'all') === tab.id
                    ? 'bg-white text-brand-700 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-slate-500">
            Showing <strong className="text-slate-900">{items.length}</strong> of{' '}
            <strong className="text-slate-900">{total.toLocaleString()}</strong> items
          </span>
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-2xs transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Archive Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/90 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th
                  onClick={() => handleSort('published_at')}
                  className="py-3 px-4 cursor-pointer hover:text-slate-900 whitespace-nowrap"
                >
                  <span className="inline-flex items-center gap-1">
                    Published <ArrowUpDown className="w-3 h-3" />
                  </span>
                </th>
                <th
                  onClick={() => handleSort('jurisdiction')}
                  className="py-3 px-3 cursor-pointer hover:text-slate-900 whitespace-nowrap"
                >
                  <span className="inline-flex items-center gap-1">
                    Jurisdiction <ArrowUpDown className="w-3 h-3" />
                  </span>
                </th>
                <th
                  onClick={() => handleSort('content_section')}
                  className="py-3 px-3 cursor-pointer hover:text-slate-900 whitespace-nowrap"
                >
                  <span className="inline-flex items-center gap-1">
                    Section <ArrowUpDown className="w-3 h-3" />
                  </span>
                </th>
                <th
                  onClick={() => handleSort('topic_tag')}
                  className="py-3 px-3 cursor-pointer hover:text-slate-900 whitespace-nowrap"
                >
                  <span className="inline-flex items-center gap-1">
                    Topic Tag <ArrowUpDown className="w-3 h-3" />
                  </span>
                </th>
                <th className="py-3 px-4 min-w-[280px]">Title & Summary</th>
                <th
                  onClick={() => handleSort('source_name')}
                  className="py-3 px-3 cursor-pointer hover:text-slate-900 whitespace-nowrap"
                >
                  <span className="inline-flex items-center gap-1">
                    Source <ArrowUpDown className="w-3 h-3" />
                  </span>
                </th>
                <th className="py-3 px-4 text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading && items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Loading intelligence archive from SQLite...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    No intelligence items match your current filter criteria.
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const jurCode = JURISDICTION_CODE_MAP[item.jurisdiction] || item.jurisdiction;
                  const jurBadge =
                    JURISDICTION_BADGE_COLORS[item.jurisdiction] ||
                    'bg-slate-100 text-slate-700 ring-slate-500/20';
                  const topicBadge = TOPIC_BADGE_COLORS[item.topic_tag] || TOPIC_BADGE_COLORS.Other;

                  return (
                    <tr
                      key={item.item_id}
                      className="hover:bg-slate-50/90 transition-colors group"
                    >
                      <td className="py-3 px-4 whitespace-nowrap font-medium text-slate-600 tabular-nums align-top">
                        {item.published_date || 'N/A'}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap align-top">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold ring-1 ring-inset ${jurBadge}`}
                          title={item.jurisdiction}
                        >
                          {jurCode}
                        </span>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap text-slate-600 font-medium align-top">
                        {item.content_section}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap align-top">
                        {item.topic_tag && (
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${topicBadge}`}
                          >
                            {item.topic_tag}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 align-top max-w-xl">
                        <div
                          onClick={() => onSelectItem(item)}
                          className="font-bold text-slate-900 group-hover:text-brand-700 cursor-pointer leading-snug"
                        >
                          {item.title}
                        </div>
                        {item.summary && (
                          <p
                            onClick={() => onSelectItem(item)}
                            className="text-slate-500 mt-1 line-clamp-2 leading-relaxed cursor-pointer"
                          >
                            {item.summary}
                          </p>
                        )}
                        {item.user_notes && (
                          <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            <MessageSquareText className="w-3 h-3" /> {item.user_notes}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-slate-600 align-top max-w-[170px] truncate" title={item.source_name}>
                        {item.source_name}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap align-top">
                        <div className="inline-flex items-center gap-1">
                          {item.source_url && (
                            <a
                              href={item.source_url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-slate-200 bg-white hover:bg-brand-50 hover:text-brand-700 text-slate-700 font-semibold text-[11px]"
                            >
                              Link <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                          <button
                            onClick={() =>
                              onFeedbackChange(item.item_id, {
                                vote: item.user_vote === 1 ? 0 : 1,
                              })
                            }
                            className={`p-1.5 rounded-lg border transition-colors ${
                              item.user_vote === 1
                                ? 'bg-emerald-50 border-emerald-300 text-emerald-600'
                                : 'bg-white border-slate-200 text-slate-400 hover:text-emerald-600'
                            }`}
                            title="Upvote"
                          >
                            <ThumbsUpIcon className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() =>
                              onFeedbackChange(item.item_id, {
                                vote: item.user_vote === -1 ? 0 : -1,
                              })
                            }
                            className={`p-1.5 rounded-lg border transition-colors ${
                              item.user_vote === -1
                                ? 'bg-rose-50 border-rose-300 text-rose-600'
                                : 'bg-white border-slate-200 text-slate-400 hover:text-rose-600'
                            }`}
                            title="Downvote"
                          >
                            <ThumbsDownIcon className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() =>
                              onFeedbackChange(item.item_id, {
                                bookmarked: !item.is_bookmarked,
                              })
                            }
                            className={`p-1.5 rounded-lg border transition-colors ${
                              item.is_bookmarked
                                ? 'bg-amber-50 border-amber-300 text-amber-500'
                                : 'bg-white border-slate-200 text-slate-400 hover:text-amber-500'
                            }`}
                            title="Bookmark"
                          >
                            <Bookmark className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <span>Rows per page:</span>
            <select
              value={pageSize}
              onChange={(e) => onFilterChange({ pageSize: Number(e.target.value), page: 1 })}
              className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-semibold"
            >
              {[15, 25, 50, 100].map((sz) => (
                <option key={sz} value={sz}>
                  {sz}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3">
            <span className="font-medium">
              Page <strong className="text-slate-900">{page}</strong> of{' '}
              <strong className="text-slate-900">{totalPages || 1}</strong>
            </span>
            <div className="flex items-center gap-1">
              <button
                disabled={page <= 1}
                onClick={() => onFilterChange({ page: page - 1 })}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => onFilterChange({ page: page + 1 })}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
