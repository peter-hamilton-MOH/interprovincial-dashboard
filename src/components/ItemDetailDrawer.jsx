import React, { useState, useEffect } from 'react';
import { X, ExternalLink, Bookmark, Calendar, Building2, Tag, FileText, Check } from 'lucide-react';
import { ThumbsUpIcon, ThumbsDownIcon } from './Icons';
import { JURISDICTION_BADGE_COLORS, TOPIC_BADGE_COLORS } from '../constants/jurisdictions';

export default function ItemDetailDrawer({ item, onClose, onFeedbackChange }) {
  const [notes, setNotes] = useState('');
  const [savedToast, setSavedToast] = useState(false);

  useEffect(() => {
    if (item) {
      setNotes(item.user_notes || '');
      setSavedToast(false);
    }
  }, [item]);

  if (!item) return null;

  const jurBadge = JURISDICTION_BADGE_COLORS[item.jurisdiction] || 'bg-slate-100 text-slate-700 ring-slate-500/20';
  const topicBadge = TOPIC_BADGE_COLORS[item.topic_tag] || TOPIC_BADGE_COLORS.Other;

  const handleSaveNotes = async () => {
    await onFeedbackChange(item.item_id, { notes });
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-[2px]">
      <div className="bg-white w-full max-w-xl h-full shadow-2xl border-l border-slate-200 flex flex-col justify-between overflow-hidden animate-in slide-in-from-right">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold ring-1 ring-inset ${jurBadge}`}>
              {item.jurisdiction}
            </span>
            <span className="text-xs font-medium text-slate-500">
              {item.content_section}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6 custom-scrollbar">
          <div>
            <h2 className="text-lg font-bold text-slate-900 leading-snug">
              {item.title}
            </h2>
            <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                {item.source_name || 'Official Release'}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                {item.published_date || 'Date unspecified'}
              </span>
              {item.topic_tag && (
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border ${topicBadge}`}>
                  <Tag className="w-3 h-3" />
                  {item.topic_tag}
                </span>
              )}
            </div>
          </div>

          {/* Summary Box */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" /> Executive Summary
            </h3>
            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
              {item.summary || 'No summary text provided for this intelligence item.'}
            </p>
          </div>

          {/* Classification Attributes */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5">
              Intelligence Classification Flags
            </h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-lg border border-slate-200 bg-white flex items-center justify-between">
                <span className="text-slate-500">Source Group</span>
                <span className="font-semibold text-slate-800">{item.display_source_group}</span>
              </div>
              <div className="p-2.5 rounded-lg border border-slate-200 bg-white flex items-center justify-between">
                <span className="text-slate-500">Government Source</span>
                <span className="font-semibold text-slate-800">{item.is_government_source ? 'Yes' : 'No'}</span>
              </div>
              <div className="p-2.5 rounded-lg border border-slate-200 bg-white flex items-center justify-between">
                <span className="text-slate-500">Funding Related</span>
                <span className="font-semibold text-slate-800">{item.is_funding_related ? 'Yes' : 'No'}</span>
              </div>
              <div className="p-2.5 rounded-lg border border-slate-200 bg-white flex items-center justify-between">
                <span className="text-slate-500">Ministerial Brief</span>
                <span className="font-semibold text-slate-800">{item.is_minister_related ? 'Yes' : 'No'}</span>
              </div>
            </div>
          </div>

          {/* Analyst Notes (SQLite persisted) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Analyst Policy Notes (Saved to SQLite)
              </label>
              {savedToast && (
                <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> Saved
                </span>
              )}
            </div>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add intergovernmental briefing notes, Ontario policy implications, or follow-up items..."
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
            />
            <div className="mt-2 flex justify-end">
              <button
                onClick={handleSaveNotes}
                className="px-3.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors"
              >
                Save Note
              </button>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() =>
                onFeedbackChange(item.item_id, {
                  vote: item.user_vote === 1 ? 0 : 1,
                })
              }
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                item.user_vote === 1
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
              }`}
            >
              <ThumbsUpIcon className="w-3.5 h-3.5" />
              Relevant
            </button>
            <button
              onClick={() =>
                onFeedbackChange(item.item_id, {
                  vote: item.user_vote === -1 ? 0 : -1,
                })
              }
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                item.user_vote === -1
                  ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
              }`}
            >
              <ThumbsDownIcon className="w-3.5 h-3.5" />
              Less Relevant
            </button>
            <button
              onClick={() =>
                onFeedbackChange(item.item_id, {
                  bookmarked: !item.is_bookmarked,
                })
              }
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                item.is_bookmarked
                  ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
              }`}
            >
              <Bookmark className="w-3.5 h-3.5" />
              {item.is_bookmarked ? 'Bookmarked' : 'Bookmark'}
            </button>
          </div>

          {item.source_url && (
            <a
              href={item.source_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold shadow-sm transition-colors"
            >
              Open Source <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
