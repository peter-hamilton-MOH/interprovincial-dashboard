import React, { useState, useEffect, useCallback } from 'react';
import {
  Calendar,
  RotateCcw,
  Plus,
  Bookmark,
  ThumbsUp,
  X,
} from 'lucide-react';
import {
  MapleLeafIcon,
  BriefIcon,
  NewsIcon,
  NewsStatsIcon,
  FundingIcon,
} from './components/Icons';
import { NEWS_JURISDICTIONS, FUNDING_JURISDICTIONS } from './constants/jurisdictions';
import NewsFeedView from './components/NewsFeedView';
import NewsStatsView from './components/NewsStatsView';
import FundingView from './components/FundingView';
import ItemDetailDrawer from './components/ItemDetailDrawer';
import AddItemModal from './components/AddItemModal';
import BriefView from './components/BriefView';

const NAV_ITEMS = [
  {
    id: 'brief',
    label: 'Weekly Brief',
    shortLabel: 'Weekly Brief',
    icon: BriefIcon,
  },
  {
    id: 'news',
    label: 'Articles',
    shortLabel: 'Articles',
    icon: NewsIcon,
  },
  {
    id: 'stats',
    label: 'Article Stats',
    shortLabel: 'Article Stats',
    icon: NewsStatsIcon,
  },
  {
    id: 'funding',
    label: 'Health Care Funding',
    shortLabel: 'Funding',
    icon: FundingIcon,
  },
];

const ROUTES = {
  brief: '/brief',
  news: '/articles',
  stats: '/article-stats',
  funding: '/funding',
};

const tabFromPath = (pathname) =>
  Object.keys(ROUTES).find((id) => ROUTES[id] === pathname.replace(/\/$/, '')) ?? 'brief';

const isKnownPath = (pathname) =>
  Object.values(ROUTES).includes(pathname) || /^\/brief\/\d{4}-\d{2}-\d{2}$/.test(pathname);

export default function App() {
  const [activeTab, setActiveTab] = useState(() => tabFromPath(window.location.pathname));

  useEffect(() => {
    const { pathname } = window.location;
    const target = ROUTES[activeTab];
    if (pathname === target || pathname.startsWith(`${target}/`)) return;
    if (isKnownPath(pathname)) {
      window.history.pushState({}, '', target);
    } else {
      window.history.replaceState({}, '', target);
    }
  }, [activeTab]);

  useEffect(() => {
    const onPopState = () => setActiveTab(tabFromPath(window.location.pathname));
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);
  const [meta, setMeta] = useState(null);

  // Shared News / Stats Filters
  const [jurisdiction, setJurisdiction] = useState('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [topicTag, setTopicTag] = useState('All');
  const [sourceGroup, setSourceGroup] = useState('All');
  const [feedback, setFeedback] = useState('all'); // 'all' | 'liked' | 'bookmarked'
  const [page, setPage] = useState(1);
  const [seedSections, setSeedSections] = useState([]);

  // Funding Specific Filters
  const [fundingJurisdiction, setFundingJurisdiction] = useState('All');
  const [fundingYear, setFundingYear] = useState('All');
  const [sexGroup, setSexGroup] = useState('Both sexes');
  const [serviceCategory, setServiceCategory] = useState('total_health');
  const [metricType, setMetricType] = useState('total_expenditure');

  // Data States
  const [groupedData, setGroupedData] = useState(null);
  const [loadingNews, setLoadingNews] = useState(false);

  const [statsData, setStatsData] = useState(null);
  const [loadingStats, setLoadingStats] = useState(false);

  const [fundingData, setFundingData] = useState(null);
  const [loadingFunding, setLoadingFunding] = useState(false);

  // Modals & Drawers
  const [selectedItem, setSelectedItem] = useState(null);
  const [addModalOpen, setAddModalOpen] = useState(false);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 220);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch initial metadata
  const fetchMeta = useCallback(async () => {
    try {
      const res = await fetch('/api/meta');
      if (res.ok) {
        const data = await res.json();
        setMeta(data);
      }
    } catch (err) {
      console.error('Failed to fetch metadata:', err);
    }
  }, []);

  useEffect(() => {
    fetchMeta();
  }, [fetchMeta]);

  // Build query string for news and stats
  const buildNewsQueryParams = useCallback(() => {
    const params = new URLSearchParams();
    if (jurisdiction && jurisdiction !== 'All') params.set('jurisdiction', jurisdiction);
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    if (debouncedSearch) params.set('search', debouncedSearch);
    if (topicTag && topicTag !== 'All') params.set('topicTag', topicTag);
    if (sourceGroup && sourceGroup !== 'All') params.set('sourceGroup', sourceGroup);
    if (feedback && feedback !== 'all') params.set('feedback', feedback);
    return params;
  }, [
    jurisdiction,
    startDate,
    endDate,
    debouncedSearch,
    topicTag,
    sourceGroup,
    feedback,
  ]);

  // Fetch Grouped News (for 2x2 Recent News View & Podcast)
  const fetchGroupedNews = useCallback(async () => {
    setLoadingNews(true);
    try {
      const params = buildNewsQueryParams();
      const res = await fetch(`/api/news-grouped?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setGroupedData(data);
      }
    } catch (err) {
      console.error('Failed to fetch grouped news:', err);
    } finally {
      setLoadingNews(false);
    }
  }, [buildNewsQueryParams]);

  // Fetch News Stats
  const fetchStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const params = buildNewsQueryParams();
      const res = await fetch(`/api/news-stats?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setStatsData(data);
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    } finally {
      setLoadingStats(false);
    }
  }, [buildNewsQueryParams]);

  // Fetch Health Care Funding
  const fetchFunding = useCallback(async () => {
    setLoadingFunding(true);
    try {
      const params = new URLSearchParams({
        jurisdiction: fundingJurisdiction,
        year: fundingYear,
        sexGroup,
        serviceCategory,
        metricType,
      });
      const res = await fetch(`/api/funding?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setFundingData(data);
      }
    } catch (err) {
      console.error('Failed to fetch funding:', err);
    } finally {
      setLoadingFunding(false);
    }
  }, [fundingJurisdiction, fundingYear, sexGroup, serviceCategory, metricType]);

  useEffect(() => {
    fetchGroupedNews();
  }, [fetchGroupedNews]);

  useEffect(() => {
    if (activeTab === 'stats') {
      fetchStats();
    }
  }, [activeTab, fetchStats]);

  useEffect(() => {
    if (activeTab === 'funding') {
      fetchFunding();
    }
  }, [activeTab, fetchFunding]);

  // Handle Upvote / Downvote / Bookmark / Notes persisted to SQLite
  const handleFeedbackChange = async (itemId, payload) => {
    try {
      const res = await fetch(`/api/items/${itemId}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) return;
      const updatedItem = await res.json();

      // Update local state optimistically
      setGroupedData((prev) => {
        if (!prev) return prev;
        const nextSections = {};
        for (const [sec, list] of Object.entries(prev.sections || {})) {
          nextSections[sec] = list.map((it) => (it.item_id === itemId ? updatedItem : it));
        }
        const nextUnified = (prev.unifiedItems || []).map((it) =>
          it.item_id === itemId ? updatedItem : it
        );
        return { ...prev, sections: nextSections, unifiedItems: nextUnified };
      });

      if (selectedItem && selectedItem.item_id === itemId) {
        setSelectedItem(updatedItem);
      }

      fetchMeta();
      if (activeTab === 'stats') fetchStats();
    } catch (err) {
      console.error('Failed to update feedback:', err);
    }
  };

  const handleNewsFilterChange = (patch) => {
    if (patch.search !== undefined) setSearch(patch.search);
    if (patch.jurisdiction !== undefined) setJurisdiction(patch.jurisdiction);
    if (patch.startDate !== undefined) setStartDate(patch.startDate);
    if (patch.endDate !== undefined) setEndDate(patch.endDate);
    if (patch.topicTag !== undefined) setTopicTag(patch.topicTag);
    if (patch.sourceGroup !== undefined) setSourceGroup(patch.sourceGroup);
    if (patch.feedback !== undefined) setFeedback(patch.feedback);
    setPage(1);
  };

  const handleResetFilters = () => {
    if (activeTab === 'funding') {
      setFundingJurisdiction('All');
      setFundingYear('All');
      setSexGroup('Both sexes');
      setServiceCategory('total_health');
      setMetricType('total_expenditure');
    } else {
      setJurisdiction('All');
      setStartDate('');
      setEndDate('');
      setSearch('');
      setDebouncedSearch('');
      setTopicTag('All');
      setSourceGroup('All');
      setFeedback('all');
      setPage(1);
    }
  };

  const applyQuickDatePreset = (days) => {
    if (!meta?.maxDate) return;
    if (days === null) {
      setStartDate('');
      setEndDate('');
      return;
    }
    const maxD = new Date(meta.maxDate + 'T12:00:00Z');
    const minD = new Date(maxD);
    minD.setDate(minD.getDate() - days);
    setStartDate(minD.toISOString().slice(0, 10));
    setEndDate(meta.maxDate);
  };

  const handleStatsDrillDown = (drill) => {
    if (drill.jurisdiction) {
      setJurisdiction((prev) => (prev === drill.jurisdiction ? 'All' : drill.jurisdiction));
    }
    if (drill.contentSection) {
      setSeedSections([drill.contentSection]);
      setActiveTab('news');
    }
    if (drill.topicTag) {
      setTopicTag(drill.topicTag);
      setActiveTab('news');
    }
    if (drill.sourceGroup) {
      setSourceGroup(drill.sourceGroup);
      setActiveTab('news');
    }
  };

  const currentNav = NAV_ITEMS.find((n) => n.id === activeTab) || NAV_ITEMS[0];
  const activeJurisdictionList = activeTab === 'funding' ? FUNDING_JURISDICTIONS : NEWS_JURISDICTIONS;
  const currentJurisdictionVal = activeTab === 'funding' ? fundingJurisdiction : jurisdiction;

  const hasActiveNewsFilters =
    jurisdiction !== 'All' ||
    startDate !== '' ||
    endDate !== '' ||
    search !== '' ||
    topicTag !== 'All' ||
    sourceGroup !== 'All' ||
    feedback !== 'all';

  return (
    <div className="min-h-screen bg-slate-100/80 text-slate-900 flex flex-col">
      {/* Top Navigation Bar (matching news.png mockup) */}
      <nav className="bg-white border-b border-slate-200/90 py-3 shrink-0">
        <div className="max-w-5xl mx-auto px-4 sm:px-5 flex flex-wrap items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => {
              setActiveTab('brief');
              setSeedSections([]);
            }}
            title="Go to Brief"
            className="flex items-center gap-3 min-w-0 text-left cursor-pointer"
          >
            <MapleLeafIcon className="w-10 h-10 shrink-0" />
            <div className="leading-tight">
              <p className="text-sm font-bold text-slate-900">Intergovernmental</p>
              <p className="text-sm font-bold text-slate-900">Intelligence Dashboard</p>
            </div>
          </button>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {NAV_ITEMS.map((item) => {
              const IconComponent = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setSeedSections([]);
                  }}
                  title={item.label}
                  className={`flex flex-col items-center gap-1 min-w-[84px] px-3 py-2 rounded-xl border text-[11px] font-semibold transition-all ${
                    isActive
                      ? 'border-brand-200 bg-brand-50 text-brand-700 shadow-2xs'
                      : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <IconComponent className="w-5 h-5" />
                  <span className="whitespace-nowrap">{item.shortLabel}</span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Unified Top Header & Filter Control Bar (aligned with mock_ups/news.png across all pages) */}
        <header className={`bg-white border-b border-slate-200/90 py-3.5 sticky top-0 z-20 shadow-2xs ${['brief', 'news', 'stats', 'funding'].includes(activeTab) ? 'hidden' : ''}`}>
          <div className="max-w-5xl mx-auto px-4 sm:px-5 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3.5">
            {/* Left: Active View Title & Record Count */}
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
                {currentNav.label}
              </h1>

              <div className="flex items-center gap-2.5 mt-0.5">
                {!['funding', 'brief'].includes(activeTab) && groupedData && (
                  <span className="text-xs text-slate-400 font-medium">
                    • Showing {groupedData.totalMatched?.toLocaleString() || 0} matching records
                  </span>
                )}
              </div>
            </div>

            {/* Right: Top Row Controls + Jurisdiction Pill Strip */}
            <div className="flex flex-col items-start xl:items-end gap-2">
              {/* Control Strip: Play Podcast Summary, Date Range, Search, Quick Filters */}
              {activeTab === 'brief' ? null : activeTab !== 'funding' ? (
                <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto xl:justify-end">
                  {/* + Log Brief Button */}
                  <button
                    onClick={() => setAddModalOpen(true)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors"
                    title="Add manual intelligence item to SQLite"
                  >
                    <Plus className="w-3.5 h-3.5 text-brand-600" />
                    Add Brief
                  </button>

                  {/* Quick Curation Toggle on News Page */}
                  <button
                    onClick={() => setFeedback((f) => (f === 'liked' ? 'all' : 'liked'))}
                    className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full border text-xs font-semibold transition-colors ${
                      feedback === 'liked'
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                    title="Filter by Upvoted items"
                  >
                    <ThumbsUp className="w-3 h-3" />
                    {meta?.feedbackCounts?.liked || 0}
                  </button>

                  <button
                    onClick={() => setFeedback((f) => (f === 'bookmarked' ? 'all' : 'bookmarked'))}
                    className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full border text-xs font-semibold transition-colors ${
                      feedback === 'bookmarked'
                        ? 'bg-amber-50 border-amber-300 text-amber-700'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                    title="Filter by Bookmarked items"
                  >
                    <Bookmark className="w-3 h-3" />
                    {meta?.feedbackCounts?.bookmarked || 0}
                  </button>

                  {/* Date Range Control (matching news.png mockup) */}
                  <div className="inline-flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 text-xs">
                    <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <input
                      type="date"
                      value={startDate}
                      min={meta?.minDate || ''}
                      max={endDate || meta?.maxDate || ''}
                      onChange={(e) => {
                        setStartDate(e.target.value);
                        setPage(1);
                      }}
                      className="bg-transparent text-slate-700 font-medium focus:outline-none text-xs w-[112px]"
                      title="Start date"
                    />
                    <span className="text-slate-300">—</span>
                    <input
                      type="date"
                      value={endDate}
                      min={startDate || meta?.minDate || ''}
                      max={meta?.maxDate || ''}
                      onChange={(e) => {
                        setEndDate(e.target.value);
                        setPage(1);
                      }}
                      className="bg-transparent text-slate-700 font-medium focus:outline-none text-xs w-[112px]"
                      title="End date"
                    />
                    <div className="hidden sm:flex items-center gap-1 pl-1 border-l border-slate-200">
                      <button
                        onClick={() => applyQuickDatePreset(30)}
                        className="px-1.5 py-0.5 rounded hover:bg-slate-200/70 text-[10px] font-bold text-slate-600"
                        title="Last 30 days of dataset"
                      >
                        30D
                      </button>
                      <button
                        onClick={() => applyQuickDatePreset(90)}
                        className="px-1.5 py-0.5 rounded hover:bg-slate-200/70 text-[10px] font-bold text-slate-600"
                        title="Last 90 days of dataset"
                      >
                        90D
                      </button>
                      {(startDate || endDate) && (
                        <button
                          onClick={() => applyQuickDatePreset(null)}
                          className="p-0.5 rounded hover:bg-slate-200 text-slate-500"
                          title="Clear date filter"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  {hasActiveNewsFilters && (
                    <button
                      onClick={handleResetFilters}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold transition-colors"
                      title="Reset all filters"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Reset
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 font-medium">
                    CIHI National Health Expenditure Trends (NHEX) Gold Dataset
                  </span>
                  {(fundingJurisdiction !== 'All' ||
                    fundingYear !== 'All' ||
                    sexGroup !== 'Both sexes' ||
                    serviceCategory !== 'total_health') && (
                    <button
                      onClick={handleResetFilters}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold transition-colors"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Reset Filters
                    </button>
                  )}
                </div>
              )}

              {/* Jurisdiction Pill Selector Strip (All | Fed/CAN | ON | QC | BC | AB | MB | SK | NS | NB | NL | PE | YT | NT | NU) */}
              <div className={`flex items-center gap-1 flex-wrap ${activeTab === 'brief' ? 'hidden' : ''}`}>
                {activeJurisdictionList.map((jur) => {
                  const isActive = currentJurisdictionVal === jur.name;
                  return (
                    <button
                      key={jur.code}
                      onClick={() => {
                        if (activeTab === 'funding') {
                          setFundingJurisdiction((prev) =>
                            prev === jur.name && jur.name !== 'All' ? 'All' : jur.name
                          );
                        } else {
                          setJurisdiction((prev) =>
                            prev === jur.name && jur.name !== 'All' ? 'All' : jur.name
                          );
                          setPage(1);
                        }
                      }}
                      title={jur.fullName}
                      className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                        isActive
                          ? 'bg-brand-600 text-white shadow-2xs ring-1 ring-brand-700'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900'
                      }`}
                    >
                      {jur.code}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </header>

        {/* Page Viewport */}
        <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-5 py-4 sm:py-5 overflow-x-hidden">
          {activeTab === 'news' && (
            <NewsFeedView
              groupedData={groupedData}
              loading={loadingNews}
              meta={meta}
              filters={{ search, jurisdiction, startDate, endDate, topicTag, sourceGroup, feedback }}
              onFilterChange={handleNewsFilterChange}
              onDatePreset={applyQuickDatePreset}
              onSelectItem={(item) => setSelectedItem(item)}
              onFeedbackChange={handleFeedbackChange}
              onResetFilters={handleResetFilters}
              hasActiveFilters={hasActiveNewsFilters}
              initialSections={seedSections}
            />
          )}

          {activeTab === 'brief' && <BriefView meta={meta} />}

          {activeTab === 'stats' && (
            <NewsStatsView
              statsData={statsData}
              loading={loadingStats}
              onDrillDown={handleStatsDrillDown}
              meta={meta}
              startDate={startDate}
              endDate={endDate}
              onStartDateChange={(value) => {
                setStartDate(value);
                setPage(1);
              }}
              onEndDateChange={(value) => {
                setEndDate(value);
                setPage(1);
              }}
              onDatePreset={applyQuickDatePreset}
              jurisdictions={NEWS_JURISDICTIONS}
              currentJurisdiction={jurisdiction}
              onJurisdictionChange={(name) => {
                setJurisdiction((prev) => (prev === name && name !== 'All' ? 'All' : name));
                setPage(1);
              }}
              feedback={feedback}
              onFeedbackChange={(value) => setFeedback((f) => (f === value ? 'all' : value))}
              feedbackCounts={meta?.feedbackCounts}
              hasActiveFilters={hasActiveNewsFilters}
              onResetFilters={handleResetFilters}
            />
          )}

          {activeTab === 'funding' && (
            <FundingView
              fundingData={fundingData}
              loading={loadingFunding}
              selectedJurisdiction={fundingJurisdiction}
              selectedYear={fundingYear}
              onYearChange={setFundingYear}
              sexGroup={sexGroup}
              onSexGroupChange={setSexGroup}
              serviceCategory={serviceCategory}
              onServiceCategoryChange={setServiceCategory}
              metricType={metricType}
              onMetricTypeChange={setMetricType}
              jurisdictions={FUNDING_JURISDICTIONS}
              onJurisdictionChange={(name) =>
                setFundingJurisdiction((prev) => (prev === name && name !== 'All' ? 'All' : name))
              }
              hasActiveFilters={
                fundingJurisdiction !== 'All' ||
                fundingYear !== 'All' ||
                sexGroup !== 'Both sexes' ||
                serviceCategory !== 'total_health'
              }
              onResetFilters={handleResetFilters}
            />
          )}

        </main>
      </div>

      {/* Slide-over Intelligence Item Detail & Analyst Note Drawer */}
      <ItemDetailDrawer
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
        onFeedbackChange={handleFeedbackChange}
      />

      {/* Manual Intelligence Brief Entry Modal */}
      <AddItemModal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onItemCreated={() => {
          fetchMeta();
          fetchGroupedNews();
          if (activeTab === 'stats') fetchStats();
        }}
      />
    </div>
  );
}
