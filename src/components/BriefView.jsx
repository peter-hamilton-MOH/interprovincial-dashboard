import React, { useState, useEffect, useCallback } from 'react';
import { Plus, ChevronDown, X, Sparkles, MessageSquare, Headphones } from 'lucide-react';
import NewsFeedView from './NewsFeedView';
import ItemDetailDrawer from './ItemDetailDrawer';

const secondaryButtonClass =
  'inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-2xs transition-colors';
const primaryButtonClass =
  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-xs font-semibold text-white shadow-sm transition-colors';
const cardClass = 'rounded-2xl border border-slate-200 bg-white shadow-sm';
const inputClass =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:ring-2 focus:ring-brand-500 focus:outline-none';

const DEFAULT_NEWS_FILTERS = {
  search: '',
  jurisdiction: 'All',
  topicTag: 'All',
  sourceGroup: 'All',
  feedback: 'all',
};

function weekFromPath() {
  const match = window.location.pathname.match(/^\/brief\/(\d{4}-\d{2}-\d{2})\/?$/);
  return match ? match[1] : null;
}

function formatPostedDate(isoString) {
  return new Date(isoString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatIsoDay(isoDate) {
  return new Date(`${isoDate}T00:00:00Z`).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

export default function BriefView({ meta }) {
  const [selectedWeek, setSelectedWeek] = useState(weekFromPath);
  const [weekMenuOpen, setWeekMenuOpen] = useState(false);
  const [data, setData] = useState(null);
  const [loadingWeek, setLoadingWeek] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const [newsFilters, setNewsFilters] = useState(DEFAULT_NEWS_FILTERS);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [newsData, setNewsData] = useState(null);
  const [loadingNews, setLoadingNews] = useState(false);
  const [newsRefresh, setNewsRefresh] = useState(0);
  const [selectedItem, setSelectedItem] = useState(null);
  const [podcastOpen, setPodcastOpen] = useState(false);

  useEffect(() => {
    const onPopState = () => setSelectedWeek(weekFromPath());
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const [composing, setComposing] = useState(false);
  const [author, setAuthor] = useState('');
  const [noteBody, setNoteBody] = useState('');
  const [formError, setFormError] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(newsFilters.search), 220);
    return () => clearTimeout(timer);
  }, [newsFilters.search]);

  const fetchWeek = useCallback(async (week) => {
    setLoadingWeek(true);
    try {
      const res = await fetch(week ? `/api/brief/week?week=${week}` : '/api/brief/week');
      if (!res.ok) throw new Error(`request failed with status ${res.status}`);
      setData(await res.json());
      setLoadError(null);
    } catch (err) {
      setLoadError(err.message);
    } finally {
      setLoadingWeek(false);
    }
  }, []);

  useEffect(() => {
    fetchWeek(selectedWeek);
  }, [selectedWeek, fetchWeek]);

  const weekStart = data?.week.weekStart;
  const collectedThrough = data?.week.collectedThrough;

  useEffect(() => {
    if (!weekStart) return;
    const params = new URLSearchParams({
      startDate: weekStart,
      endDate: collectedThrough,
      unifiedLimit: '1500',
    });
    if (newsFilters.jurisdiction !== 'All') params.set('jurisdiction', newsFilters.jurisdiction);
    if (newsFilters.topicTag !== 'All') params.set('topicTag', newsFilters.topicTag);
    if (newsFilters.sourceGroup !== 'All') params.set('sourceGroup', newsFilters.sourceGroup);
    if (newsFilters.feedback !== 'all') params.set('feedback', newsFilters.feedback);
    if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());

    let cancelled = false;
    setLoadingNews(true);
    fetch(`/api/news-grouped?${params.toString()}`)
      .then((res) => {
        if (!res.ok) throw new Error(`request failed with status ${res.status}`);
        return res.json();
      })
      .then((json) => {
        if (!cancelled) setNewsData(json);
      })
      .catch((err) => console.error('Failed to fetch week articles:', err))
      .finally(() => {
        if (!cancelled) setLoadingNews(false);
      });
    return () => {
      cancelled = true;
    };
  }, [
    weekStart,
    collectedThrough,
    newsFilters.jurisdiction,
    newsFilters.topicTag,
    newsFilters.sourceGroup,
    newsFilters.feedback,
    debouncedSearch,
    newsRefresh,
  ]);

  const handleFeedbackChange = async (itemId, payload) => {
    const res = await fetch(`/api/items/${itemId}/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return;
    const updated = await res.json();
    setSelectedItem((prev) => (prev && prev.item_id === itemId ? updated : prev));
    setNewsRefresh((n) => n + 1);
  };

  const closeComposer = () => {
    setComposing(false);
    setFormError(null);
  };

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!data) return;
    setSaving(true);
    setFormError(null);
    try {
      const res = await fetch('/api/brief/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ week: data.week.weekStart, author, body: noteBody }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Failed to save note');
      setData((prev) => ({ ...prev, notes: [payload, ...prev.notes] }));
      setNoteBody('');
      setComposing(false);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const hasActiveNewsFilters =
    newsFilters.search !== '' ||
    newsFilters.jurisdiction !== 'All' ||
    newsFilters.topicTag !== 'All' ||
    newsFilters.sourceGroup !== 'All' ||
    newsFilters.feedback !== 'all';

  if (loadingWeek && !data) {
    return (
      <div className="max-w-5xl mx-auto space-y-8 animate-pulse">
        <div className="h-10 w-80 rounded bg-slate-200" />
        <div className="h-24 max-w-2xl rounded-xl bg-slate-200/60" />
        <div className="h-64 rounded-xl bg-slate-200/50" />
      </div>
    );
  }

  if (loadError || !data) {
    return (
      <div className="max-w-4xl mx-auto bg-white rounded-2xl border border-slate-200/90 shadow-sm p-10 text-center">
        <p className="text-sm font-semibold text-slate-700">
          {loadError ? `Could not load the brief: ${loadError}` : 'No brief data is available.'}
        </p>
      </div>
    );
  }

  const { week, weeks, days, highlights, notes } = data;
  const todayIndex = days.findIndex((day) => day.isToday);
  const lastPastDayIndex = days.findLastIndex((day) => !day.isFuture);
  const lineTransitionIndex = todayIndex >= 0 ? todayIndex : lastPastDayIndex;
  const lineTransitionPercent = days.length > 1 ? (lineTransitionIndex / (days.length - 1)) * 100 : 100;
  const weekTotal = days.reduce((sum, day) => sum + (day.count ?? 0), 0);
  const isPastWeek = week.weekStart !== weeks[0].weekStart;

  const selectWeek = (weekStart) => {
    const isCurrent = weeks[0].weekStart === weekStart;
    setSelectedWeek(isCurrent ? null : weekStart);
    window.history.pushState({}, '', isCurrent ? '/brief' : `/brief/${weekStart}`);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-8 pt-2">
      <section>
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-600">Weekly Brief</p>
        <div className="relative mt-1 inline-block">
          <button
            type="button"
            onClick={() => setWeekMenuOpen((open) => !open)}
            aria-haspopup="listbox"
            aria-expanded={weekMenuOpen}
            className="-mx-2 inline-flex items-center gap-2 rounded-lg px-2 py-0.5 text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight hover:bg-slate-200/60 transition-colors"
          >
            {week.label}
            <ChevronDown
              className={`w-5 h-5 text-slate-500 transition-transform ${weekMenuOpen ? 'rotate-180' : ''}`}
            />
          </button>
          {weekMenuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setWeekMenuOpen(false)} />
              <ul
                role="listbox"
                className="custom-scrollbar absolute left-0 z-20 mt-2 max-h-72 w-64 overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
              >
                {weeks.map((w) => {
                  const selected = w.weekStart === week.weekStart;
                  return (
                    <li key={w.weekStart}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={selected}
                        onClick={() => {
                          selectWeek(w.weekStart);
                          setWeekMenuOpen(false);
                        }}
                        className={`w-full px-4 py-2 text-left text-sm ${
                          selected ? 'bg-brand-50 font-semibold text-brand-800' : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {w.label}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>
        <p className="mt-2 text-sm text-slate-500">
          Collected through <span className="font-semibold text-slate-700">{formatIsoDay(week.collectedThrough)}</span>
        </p>
      </section>

      <section className={`${cardClass} px-6 pt-5 pb-6`}>
        <div className="mb-5 flex items-center justify-between gap-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Articles Collected</h3>
          <span className="text-xs text-slate-500">
            <span className="text-sm font-bold text-slate-900 tabular-nums">{weekTotal.toLocaleString()}</span> this week
          </span>
        </div>
        <div className="flex justify-between">
          {days.map((day) => (
            <span
              key={day.date}
              className={`w-20 whitespace-nowrap text-center text-xs ${day.isFuture ? 'text-slate-300 font-normal' : day.isToday ? 'text-brand-700 font-[900]' : 'text-slate-600 font-normal'}`}
            >
              {day.dayName}
            </span>
          ))}
        </div>
        <div className="relative mt-3 flex justify-between items-center">
          <div className="absolute top-1/2 -translate-y-1/2 left-10 right-10">
            <div className="absolute left-0 top-0 border-t-2 border-brand-300" style={{ width: `${lineTransitionPercent}%` }} />
            <div
              className="absolute right-0 top-0 border-t-2 border-dashed border-slate-300"
              style={{ width: `${100 - lineTransitionPercent}%` }}
            />
          </div>
          {days.map((day) => (
            <div key={day.date} className="relative z-10 w-20 flex justify-center">
              {day.isFuture ? (
                <span className="w-2.5 h-2.5 rounded-full bg-slate-200" />
              ) : (
                <span
                  className={`rounded-full flex items-center justify-center text-xs tabular-nums ${
                    day.isToday
                      ? 'w-9 h-9 font-[900] bg-white border-2 border-brand-600 text-brand-700 shadow-sm'
                      : 'w-7 h-7 font-normal bg-brand-50 text-brand-800 ring-1 ring-brand-100'
                  }`}
                >
                  {day.count}
                </span>
              )}
            </div>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <section className={`${cardClass} flex flex-col h-[375px] p-5`}>
          <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-200">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                <Sparkles className="w-4 h-4" />
              </span>
              <h3 className="text-base font-bold text-slate-900">Key Highlights</h3>
            </div>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600 tabular-nums">
              {highlights.length}
            </span>
          </div>
          {isPastWeek && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand-100 bg-brand-50 p-3">
              <p className="text-sm text-slate-700">Missed this week? Get up to speed quickly!</p>
              <button
                type="button"
                onClick={() => setPodcastOpen((open) => !open)}
                aria-expanded={podcastOpen}
                className={primaryButtonClass}
              >
                <Headphones className="w-3.5 h-3.5" />
                {podcastOpen ? 'Hide player' : 'Listen'}
              </button>
              {podcastOpen && (
                <audio controls autoPlay src="/assets/sample_podcast.m4a" className="w-full" />
              )}
            </div>
          )}
          <ul className="mt-4 flex-1 min-h-0 overflow-y-auto pr-3 custom-scrollbar space-y-3 text-sm leading-relaxed text-slate-700">
            {highlights.map((h, idx) => (
              <li key={h.highlight_id ?? idx} className="flex gap-3">
                <span className="mt-[0.55rem] h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />
                <span>{h.body}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className={`${cardClass} flex flex-col h-[375px] p-5`}>
          <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-200">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                <MessageSquare className="w-4 h-4" />
              </span>
              <h3 className="text-base font-bold text-slate-900">Shared Notes</h3>
            </div>
            <button
              type="button"
              onClick={() => (composing ? closeComposer() : setComposing(true))}
              className={primaryButtonClass}
            >
              <Plus className="w-3.5 h-3.5" />
              Add Note
            </button>
          </div>
          {notes.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center text-center">
              <MessageSquare className="w-7 h-7 text-slate-300" />
              <p className="mt-2 text-sm text-slate-500">No notes yet. Be the first to add one.</p>
            </div>
          ) : (
            <div className="mt-4 flex-1 min-h-0 overflow-y-auto pr-3 custom-scrollbar divide-y divide-slate-100">
              {notes.map((note) => (
                <article key={note.note_id} className="flex gap-3 py-4 first:pt-0 last:pb-0">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
                    {note.author.charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm">
                      <span className="font-semibold text-slate-900">{note.author}</span>
                      <span className="ml-2 text-xs text-slate-400">{formatPostedDate(note.created_at)}</span>
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-slate-700">{note.body}</p>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      <div className="pt-4">
        <NewsFeedView
          title="Articles This Week"
          groupedData={newsData}
          loading={loadingNews}
          meta={meta}
          filters={{
            search: newsFilters.search,
            jurisdiction: newsFilters.jurisdiction,
            startDate: '',
            endDate: '',
            topicTag: newsFilters.topicTag,
            sourceGroup: newsFilters.sourceGroup,
            feedback: newsFilters.feedback,
          }}
          showDateFilter={false}
          onFilterChange={(patch) => setNewsFilters((prev) => ({ ...prev, ...patch }))}
          onDatePreset={() => {}}
          onSelectItem={(item) => setSelectedItem(item)}
          onFeedbackChange={handleFeedbackChange}
          onResetFilters={() => setNewsFilters(DEFAULT_NEWS_FILTERS)}
          hasActiveFilters={hasActiveNewsFilters}
        />
      </div>

      {composing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4"
          onClick={closeComposer}
        >
          <form
            onSubmit={handleAddNote}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <h4 className="text-base font-bold text-slate-900">Add Shared Note</h4>
              <button
                type="button"
                onClick={closeComposer}
                aria-label="Close"
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <input
              type="text"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="Your name"
              className={inputClass}
            />
            <textarea
              rows={3}
              value={noteBody}
              onChange={(e) => setNoteBody(e.target.value)}
              placeholder="Write a shared note..."
              className={inputClass}
            />
            {formError && <p className="text-xs font-semibold text-rose-600">{formError}</p>}
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={closeComposer} className={secondaryButtonClass}>
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || !author.trim() || !noteBody.trim()}
                className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold text-white shadow-2xs transition-colors"
              >
                {saving ? 'Posting...' : 'Post Note'}
              </button>
            </div>
          </form>
        </div>
      )}

      <ItemDetailDrawer
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
        onFeedbackChange={handleFeedbackChange}
      />
    </div>
  );
}
