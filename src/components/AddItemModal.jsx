import React, { useState } from 'react';
import { X, PlusCircle } from 'lucide-react';
import { NEWS_JURISDICTIONS } from '../constants/jurisdictions';

export default function AddItemModal({ isOpen, onClose, onItemCreated }) {
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [jurisdiction, setJurisdiction] = useState('Ontario');
  const [contentSection, setContentSection] = useState('Government Announcements');
  const [topicTag, setTopicTag] = useState('Ministerial Announcement');
  const [sourceName, setSourceName] = useState('Government of Ontario Newsroom');
  const [sourceUrl, setSourceUrl] = useState('');
  const [publishedDate, setPublishedDate] = useState(new Date().toISOString().slice(0, 10));
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          summary,
          jurisdiction,
          content_section: contentSection,
          topic_tag: topicTag,
          source_name: sourceName,
          source_url: sourceUrl,
          published_date: publishedDate,
        }),
      });
      if (res.ok) {
        const created = await res.json();
        onItemCreated(created);
        setTitle('');
        setSummary('');
        setSourceUrl('');
        onClose();
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden">
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PlusCircle className="w-5 h-5 text-brand-400" />
            <h3 className="text-base font-bold">Log Manual Intelligence Item</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Headline / Title *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Ontario and Federal Government Sign Bilateral Health Workforce Agreement"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Jurisdiction</label>
              <select
                value={jurisdiction}
                onChange={(e) => setJurisdiction(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
              >
                {NEWS_JURISDICTIONS.filter((j) => j.code !== 'All').map((j) => (
                  <option key={j.code} value={j.name}>
                    {j.name} ({j.code})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Content Section</label>
              <select
                value={contentSection}
                onChange={(e) => setContentSection(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
              >
                <option value="Government Announcements">Government Announcements</option>
                <option value="Health Care Funding">Health Care Funding</option>
                <option value="Health Ministers News">Health Ministers News</option>
                <option value="Articles and Research Reports">Articles and Research Reports</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Topic Tag</label>
              <select
                value={topicTag}
                onChange={(e) => setTopicTag(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
              >
                <option value="Ministerial Announcement">Ministerial Announcement</option>
                <option value="Federal Funding">Federal Funding</option>
                <option value="Primary Care">Primary Care</option>
                <option value="Health Workforce">Health Workforce</option>
                <option value="Mental Health and Addictions">Mental Health and Addictions</option>
                <option value="Capital and Infrastructure">Capital and Infrastructure</option>
                <option value="Public Health">Public Health</option>
                <option value="Health Services and Access">Health Services and Access</option>
                <option value="Digital Health">Digital Health</option>
                <option value="Pharmacare">Pharmacare</option>
                <option value="MAID">MAID</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Published Date</label>
              <input
                type="date"
                value={publishedDate}
                onChange={(e) => setPublishedDate(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Source Name</label>
              <input
                type="text"
                value={sourceName}
                onChange={(e) => setSourceName(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Source URL</label>
              <input
                type="url"
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                placeholder="https://..."
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Executive Summary</label>
            <textarea
              rows={3}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Summarize key funding figures, timelines, and intergovernmental impact..."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold shadow-sm"
            >
              {submitting ? 'Saving to SQLite...' : 'Save Intelligence Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
