import { X } from 'lucide-react';
import { findHelpTopic } from '../lib/helpContent';

/**
 * Generic help popup, rendering a topic from helpContent.ts. Replaces
 * the bespoke per-feature popup JSX that used to live directly in
 * SettingsModal.tsx/CharacterSelect.tsx - same visual pattern, single
 * source of truth for the content.
 *
 * Usage: {showHelp && <HelpPopup topicId="voice-studio" onClose={() => setShowHelp(false)} />}
 */
export default function HelpPopup({ topicId, onClose }: { topicId: string; onClose: () => void }) {
  const topic = findHelpTopic(topicId);
  if (!topic) return null; // unknown id - fail quietly rather than showing a broken popup

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4" onClick={onClose}>
      <div
        className="bg-slate-800 border border-slate-700 w-full max-w-lg rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 pt-5 pb-3 border-b border-slate-700 flex items-center justify-between">
          <h3 className="text-lg font-bold text-teal-400">{topic.title}</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300">
            <X size={18} />
          </button>
        </div>
        <div className="p-5 overflow-y-auto space-y-4 text-sm text-slate-300">
          {topic.intro && <p className="text-slate-400">{topic.intro}</p>}
          {topic.steps && topic.steps.length > 0 && (
            <ol className="list-decimal list-inside space-y-2.5">
              {topic.steps.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          )}
          {topic.note && (
            <p className="text-xs text-slate-500 border-t border-slate-700 pt-3">{topic.note}</p>
          )}
        </div>
      </div>
    </div>
  );
}
