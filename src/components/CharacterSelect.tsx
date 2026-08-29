export default function CharacterSelect({ onSelect }: { onSelect: (mode: string) => void }) {
  const modes = [
    {
      id: 'presentation_coach',
      title: 'Presentation Coach',
      desc: 'Refine your delivery. Analyze pacing, tone, and audience engagement for public speaking and pitches.',
      icon: '🎤'
    },
    {
      id: 'acting_coach',
      title: 'Acting Coach',
      desc: 'Master character development. Get feedback on emotional authenticity, scene analysis, and performance techniques.',
      icon: '🎭'
    },
    {
      id: 'improv_buddy',
      title: 'Improv Buddy',
      desc: 'Build confidence through improvisation. Real-time suggestions for games, energy, and spontaneity.',
      icon: '✨'
    },
    {
      id: 'debate_strategist',
      title: 'Debate Strategist',
      desc: 'Sharpen your arguments. Get feedback on rhetoric, rebuttals, and persuasive delivery techniques.',
      icon: '🧠'
    },
    {
      id: 'confidence_builder',
      title: 'Confidence Builder',
      desc: 'Overcome stage fright. Personalized exercises and motivation to elevate your stage presence.',
      icon: '💪'
    },
    {
      id: 'voice_coach',
      title: 'Voice & Presence Coach',
      desc: 'Perfect your vocal delivery. Guidance on projection, breathing, pacing, and physical presence.',
      icon: '🎵'
    }
  ];

  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-8">
          <h2 className="text-4xl font-bold text-slate-100 mb-3">Choose Your Coach</h2>
          <p className="text-slate-400 text-lg">Select a coaching mode to begin mastering your performance.</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {modes.map((mode) => (
            <button
              key={mode.id}
              onClick={() => onSelect(mode.id)}
              className="flex flex-col items-start p-6 bg-gradient-to-br from-slate-800 to-slate-750 border border-slate-700 rounded-xl hover:border-teal-500 hover:from-slate-750 hover:to-slate-700 transition-all text-left group shadow-md hover:shadow-lg"
            >
              <div className="text-5xl mb-4 group-hover:scale-110 transition-transform duration-200">{mode.icon}</div>
              <h3 className="text-lg font-bold text-teal-300 mb-2 group-hover:text-teal-200 transition-colors">{mode.title}</h3>
              <p className="text-sm text-slate-400 leading-relaxed group-hover:text-slate-300 transition-colors">{mode.desc}</p>
            </button>
          ))}
        </div>

        <p className="text-center text-xs text-slate-500 mt-8 pt-6 border-t border-slate-700">
          💡 Tip: StageEgo adapts to your goals. Start with any coach and switch anytime to explore different approaches.
        </p>
      </div>
    </div>
  );
}
