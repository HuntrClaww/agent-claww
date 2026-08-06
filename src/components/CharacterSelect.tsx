export default function CharacterSelect({ onSelect }: { onSelect: (mode: string) => void }) {
  const modes = [
    {
      id: 'freedom',
      title: 'Freedom to Express',
      desc: 'Creative, casual, human-like. Uses slang and pushes back.',
      icon: '🔥'
    },
    {
      id: 'friendly',
      title: 'Just Friendly',
      desc: 'Warm, helpful, and supportive. Great for daily assistance.',
      icon: '✌️'
    },
    {
      id: 'professional',
      title: 'Strictly Professional',
      desc: 'Concise, formal, no filler. Bullet points and action items.',
      icon: '💼'
    },
    {
      id: 'custom',
      title: 'True to Character (Custom)',
      desc: 'Build your own character with a backstory and development arc.',
      icon: '🎭'
    }
  ];

  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="max-w-2xl w-full">
        <h2 className="text-3xl font-bold text-slate-100 mb-2 text-center">Who are you chatting with?</h2>
        <p className="text-slate-400 mb-8 text-center">Select a personality mode to begin.</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {modes.map((mode) => (
            <button
              key={mode.id}
              onClick={() => onSelect(mode.id)}
              className="flex flex-col items-start p-6 bg-slate-800 border border-slate-700 rounded-xl hover:border-teal-500 hover:bg-slate-750 transition-all text-left group"
            >
              <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">{mode.icon}</div>
              <h3 className="text-xl font-bold text-teal-400 mb-2">{mode.title}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">{mode.desc}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
