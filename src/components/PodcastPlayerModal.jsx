import React, { useState, useEffect, useMemo } from 'react';
import { X, Play, Pause, SkipForward, SkipBack, Volume2, Radio, Sparkles, ExternalLink } from 'lucide-react';

export default function PodcastPlayerModal({ isOpen, onClose, groupedSections, activeJurisdiction, dateRange, briefTitle, briefHighlights }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [rate, setRate] = useState(1.0);

  const segments = useMemo(() => {
    if (briefHighlights?.length) {
      return [
        {
          section: 'Weekly Brief',
          title: briefTitle,
          jurisdiction: '',
          script: `${briefTitle}. ${briefHighlights.length} key highlights follow.`,
          item: null,
        },
        ...briefHighlights.map((text, idx) => ({
          section: 'Key Highlights',
          title: `Highlight ${idx + 1}`,
          jurisdiction: '',
          script: text,
          item: null,
        })),
      ];
    }
    if (!groupedSections) return [];
    const list = [];
    const jurText = activeJurisdiction === 'All' ? 'all Canadian jurisdictions' : activeJurisdiction;
    const dateText =
      dateRange?.startDate || dateRange?.endDate
        ? `covering ${dateRange.startDate || 'earliest records'} to ${dateRange.endDate || 'present'}`
        : 'covering the latest intergovernmental intelligence window';

    list.push({
      section: 'Executive Overview',
      title: 'Intergovernmental Health Intelligence Briefing',
      jurisdiction: activeJurisdiction,
      script: `Welcome to the Canadian Health Intergovernmental Intelligence Hub audio briefing, ${dateText} for ${jurText}. Here are the top developments across Government Announcements, Health Care Funding, Health Ministers News, and Research Reports.`,
      item: null,
    });

    const sectionOrder = [
      'Government Announcements',
      'Health Care Funding',
      'Health Ministers News',
      'Articles and Research Reports',
    ];

    for (const sec of sectionOrder) {
      const items = groupedSections[sec] || [];
      const topItems = items.slice(0, 2);
      topItems.forEach((item, idx) => {
        const cleanSummary = (item.summary || '').replace(/\s+/g, ' ').trim();
        list.push({
          section: sec,
          title: item.title,
          jurisdiction: item.jurisdiction,
          date: item.published_date || '',
          script: `${ idx === 0 ? `In ${sec}: ` : 'Next, ' }From ${item.jurisdiction}, published ${item.published_date || 'recently'}: ${item.title}. ${cleanSummary}`,
          item,
        });
      });
    }

    return list;
  }, [groupedSections, activeJurisdiction, dateRange, briefTitle, briefHighlights]);

  useEffect(() => {
    if (!isOpen) {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      setIsPlaying(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !isPlaying || segments.length === 0) return;
    if (!('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel();
    const current = segments[activeIndex];
    if (!current) return;

    const utterance = new SpeechSynthesisUtterance(current.script);
    utterance.rate = rate;
    utterance.onend = () => {
      if (activeIndex < segments.length - 1) {
        setActiveIndex((prev) => prev + 1);
      } else {
        setIsPlaying(false);
      }
    };
    window.speechSynthesis.speak(utterance);

    return () => {
      window.speechSynthesis.cancel();
    };
  }, [isOpen, isPlaying, activeIndex, rate, segments]);

  if (!isOpen) return null;

  const currentSegment = segments[activeIndex] || segments[0];

  const togglePlay = () => {
    if (!('speechSynthesis' in window)) return;
    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Top Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-brand-950 to-slate-900 text-white px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-400/30 flex items-center justify-center text-rose-400">
              <Radio className={`w-5 h-5 ${isPlaying ? 'animate-pulse' : ''}`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-rose-400 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" /> Executive Podcast Summary
                </span>
                <span className="text-xs bg-white/10 px-2 py-0.5 rounded-full text-slate-300">
                  {segments.length} Segments
                </span>
              </div>
              <h3 className="text-base font-bold text-white mt-0.5">
                FPT Health Intelligence Audio Briefing
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            title="Close player"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Active Segment Display */}
        {currentSegment && (
          <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span className="font-semibold text-brand-700 uppercase tracking-wide">
                {currentSegment.section}
              </span>
              <span>
                Track {activeIndex + 1} of {segments.length}
              </span>
            </div>
            <h4 className="text-sm font-bold text-slate-900">{currentSegment.title}</h4>
            <p className="text-xs text-slate-600 mt-1.5 leading-relaxed line-clamp-3">
              {currentSegment.script}
            </p>
          </div>
        )}

        {/* Audio Controls Bar */}
        <div className="px-6 py-3.5 bg-white border-b border-slate-200 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveIndex((i) => Math.max(0, i - 1))}
              disabled={activeIndex === 0}
              className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40"
              title="Previous segment"
            >
              <SkipBack className="w-4 h-4" />
            </button>
            <button
              onClick={togglePlay}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm shadow-sm transition-all"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              {isPlaying ? 'Pause Briefing' : 'Play Briefing'}
            </button>
            <button
              onClick={() => setActiveIndex((i) => Math.min(segments.length - 1, i + 1))}
              disabled={activeIndex >= segments.length - 1}
              className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40"
              title="Next segment"
            >
              <SkipForward className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-3">
            <Volume2 className="w-4 h-4 text-slate-400" />
            <div className="flex items-center bg-slate-100 rounded-lg p-0.5 text-xs font-medium">
              {[1.0, 1.25, 1.5].map((r) => (
                <button
                  key={r}
                  onClick={() => setRate(r)}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    rate === r ? 'bg-white text-slate-900 shadow-sm font-semibold' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {r}x
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Playlist / Transcript Chapters */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
          {segments.map((seg, idx) => {
            const active = idx === activeIndex;
            return (
              <div
                key={idx}
                onClick={() => {
                  setActiveIndex(idx);
                  setIsPlaying(true);
                }}
                className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
                  active
                    ? 'bg-brand-50/80 border-brand-300 ring-1 ring-brand-500/20'
                    : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-[11px] font-medium text-slate-500">
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold">
                      {seg.section}
                    </span>
                    {seg.jurisdiction && <span>• {seg.jurisdiction}</span>}
                    {seg.date && <span>• {seg.date}</span>}
                  </div>
                  <p className={`text-sm font-semibold mt-1 ${active ? 'text-brand-900' : 'text-slate-800'}`}>
                    {seg.title}
                  </p>
                </div>
                {seg.item?.source_url && (
                  <a
                    href={seg.item.source_url}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="p-1.5 text-slate-400 hover:text-brand-600 rounded-lg hover:bg-white"
                    title="Open source article"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
