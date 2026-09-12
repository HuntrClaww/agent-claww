import { useState } from 'react';
import { Search, X, ImageOff } from 'lucide-react';
import { searchCharacterCandidates, type CharacterCandidate } from '../lib/characterFetch';

/**
 * Shared character search UI for both modes:
 *  - Generic Mode: opened from a button next to the chat input. Picking
 *    a result just switches the active character - no confidence gate,
 *    since Generic Mode is meant to be quick and freely reversible.
 *  - Personality Mode: opened from character creation. Stricter -
 *    below CONFIDENCE_GATE, the person is asked to explicitly confirm
 *    ("use anyway") or back out to manual entry instead, since a
 *    Personality Mode character is a one-way commitment (no take-backs,
 *    per the app's own core rules).
 *
 * Deliberately does NOT auto-search as the person types - each search
 * fires 4 real network requests (see characterFetch.ts), so this waits
 * for an explicit Search action (button or Enter) rather than firing
 * on every keystroke.
 */

const CONFIDENCE_GATE = 50;

interface CharacterSearchModalProps {
  onClose: () => void;
  onSelect: (candidate: CharacterCandidate) => void;
  /** Personality Mode only - lets the person bail to the manual-entry form instead of accepting a low-confidence auto result. */
  onManualFallback?: () => void;
  mode: 'generic' | 'personality';
}

export default function CharacterSearchModal({ onClose, onSelect, onManualFallback, mode }: CharacterSearchModalProps) {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [progressText, setProgressText] = useState('');
  const [candidates, setCandidates] = useState<CharacterCandidate[] | null>(null);
  const [pendingLowConfidence, setPendingLowConfidence] = useState<CharacterCandidate | null>(null);

  const runSearch = async () => {
    const trimmed = query.trim();
    if (!trimmed || isSearching) return;
    setIsSearching(true);
    setCandidates(null);
    setPendingLowConfidence(null);
    const result = await searchCharacterCandidates(trimmed, (msg) => setProgressText(msg));
    setCandidates(result.candidates);
    setIsSearching(false);
  };

  const handlePick = (candidate: CharacterCandidate) => {
    if (mode === 'personality' && candidate.confidencePercent < CONFIDENCE_GATE) {
      setPendingLowConfidence(candidate);
      return;
    }
    onSelect(candidate);
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4" onClick={onClose}>
      <div
        className="bg-slate-800 border border-slate-700 w-full max-w-xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 pt-5 pb-3 border-b border-slate-700 flex items-center justify-between">
          <h3 className="text-lg font-bold text-teal-400">Find a character</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-3">
          <div className="flex gap-2">
            <input
              autoFocus
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && runSearch()}
              placeholder="Character name (e.g. Geralt of Rivia)"
              className="flex-1 bg-slate-900 border border-slate-600 rounded-lg px-4 py-2.5 text-slate-100 focus:outline-none focus:border-teal-500 transition-colors"
            />
            <button
              onClick={runSearch}
              disabled={isSearching || !query.trim()}
              className="flex items-center gap-1.5 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2.5 rounded-lg font-medium transition-colors"
            >
              <Search size={16} /> Search
            </button>
          </div>

          {/* Live status line - grayed-out, updates in place as each
              source resolves (real progress from onProgress above, not
              a canned animation). Not a chat message, not a banner -
              just quiet ambient text, same idea as a "thinking" state. */}
          {isSearching && (
            <p className="text-xs text-slate-500 italic transition-opacity duration-200">
              {progressText || 'Searching...'}
            </p>
          )}

          {!isSearching && candidates && candidates.length === 0 && (
            <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-4 text-sm text-slate-500">
              No matches found across Fandom, Wikipedia, AniList, or MyAnimeList. You can try a different
              spelling, or {mode === 'personality' ? 'switch to entering the character\'s details yourself.' : 'just type the name directly in chat and the AI will use its own knowledge.'}
              {mode === 'personality' && onManualFallback && (
                <button
                  onClick={onManualFallback}
                  className="block mt-2 text-teal-400 hover:text-teal-300 font-medium"
                >
                  Enter character details manually →
                </button>
              )}
            </div>
          )}

          {!isSearching && candidates && candidates.length > 0 && (
            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {candidates.length > 1 && (
                <p className="text-xs text-slate-500">
                  {candidates.length} sources returned different results — this often means more than one
                  character shares this name. Pick the one you meant.
                </p>
              )}
              {candidates.map((c, i) => (
                <button
                  key={`${c.source}-${i}`}
                  onClick={() => handlePick(c)}
                  className="w-full flex gap-3 text-left bg-slate-900/50 hover:bg-slate-900 border border-slate-700 hover:border-teal-600/50 rounded-lg p-3 transition-colors"
                >
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-slate-800 flex items-center justify-center shrink-0">
                    {c.thumbnailUrl ? (
                      <img src={c.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <ImageOff size={18} className="text-slate-600" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-slate-200 truncate">{c.name}</span>
                      <span className={`text-xs font-semibold shrink-0 ${
                        c.confidencePercent >= 70 ? 'text-green-400' : c.confidencePercent >= 50 ? 'text-amber-400' : 'text-red-400'
                      }`}>
                        {c.confidencePercent}%
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mb-1">{c.source}</div>
                    <p className="text-xs text-slate-400 line-clamp-2">{c.summary}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Personality Mode's confidence gate - shown instead of the
              list once a low-confidence pick is made, since this mode
              has no take-backs after commit. */}
          {pendingLowConfidence && (
            <div className="bg-amber-900/20 border border-amber-700 rounded-lg p-4 space-y-3">
              <p className="text-sm text-amber-200">
                I'm only <strong>{pendingLowConfidence.confidencePercent}% confident</strong> this is a strong
                match. Here's all the data found: <span className="italic text-amber-300/80">"{pendingLowConfidence.summary}"</span> — that
                may not be enough to build a solid character on, and Personality Mode can't be undone once
                you commit.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => onSelect(pendingLowConfidence)}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm font-medium px-3 py-2 rounded-lg transition-colors"
                >
                  Use this anyway
                </button>
                {onManualFallback && (
                  <button
                    onClick={onManualFallback}
                    className="flex-1 bg-teal-600 hover:bg-teal-500 text-white text-sm font-medium px-3 py-2 rounded-lg transition-colors"
                  >
                    Enter details myself instead
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
