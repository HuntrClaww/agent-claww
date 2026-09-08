import { useState } from 'react';
import { Search, X, HelpCircle } from 'lucide-react';
import { HELP_TOPICS, searchHelpTopics } from '../lib/helpContent';
import HelpPopup from './HelpPopup';

/**
 * Global searchable help entry point (Phase 8.5). Lists every topic in
 * helpContent.ts, filterable by a search box. Selecting a topic opens
 * the same HelpPopup used by the per-field "?" buttons, so there's
 * exactly one rendering of any given topic's content, reached from
 * either the field it lives next to or this central hub.
 */
export default function HelpHub({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [query, setQuery] = useState('');
  const [openTopicId, setOpenTopicId] = useState<string | null>(null);

  if (!isOpen) return null;

  const results = searchHelpTopics(query);

  return (
    <>
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div
          className="bg-slate-800 border border-slate-700 w-full max-w-md rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[75vh]"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-5 pt-5 pb-3 border-b border-slate-700 flex items-center justify-between">
            <h3 className="text-lg font-bold text-teal-400 flex items-center gap-2">
              <HelpCircle size={18} /> Help
            </h3>
            <button onClick={onClose} className="text-slate-500 hover:text-slate-300">
              <X size={18} />
            </button>
          </div>

          <div className="px-5 pt-3 pb-2">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search help topics…"
                autoFocus
                className="w-full bg-slate-900 border border-slate-600 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500 transition-colors"
              />
            </div>
          </div>

          <div className="px-2 pb-4 overflow-y-auto">
            {results.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-6 px-3">
                No topics match "{query}". Try a different word, or browse everything by clearing the search.
              </p>
            ) : (
              <ul className="space-y-1">
                {results.map(topic => (
                  <li key={topic.id}>
                    <button
                      onClick={() => setOpenTopicId(topic.id)}
                      className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-slate-700/60 transition-colors"
                    >
                      <p className="text-sm font-medium text-slate-200">{topic.title}</p>
                      {topic.intro && (
                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{topic.intro}</p>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {query === '' && (
              <p className="text-[11px] text-slate-600 text-center mt-2 px-3">
                {HELP_TOPICS.length} topic{HELP_TOPICS.length === 1 ? '' : 's'} available
              </p>
            )}
          </div>
        </div>
      </div>

      {openTopicId && <HelpPopup topicId={openTopicId} onClose={() => setOpenTopicId(null)} />}
    </>
  );
}
