export default function Auth({ onLogin, onGuest }: { onLogin: () => void, onGuest: () => void }) {
    return (
        <div className="flex min-h-screen items-center justify-center px-4 font-sans">
            <div className="w-full max-w-md p-8 space-y-6 glass-panel rounded-xl border shadow-2xl">
                <div className="text-center">
                    <div className="text-5xl mb-3">🎭</div>
                    <h1
                        className="text-4xl font-bold bg-clip-text text-transparent mb-2"
                        style={{ backgroundImage: 'linear-gradient(90deg, var(--user-accent), var(--user-accent-secondary))' }}
                    >StageEgo</h1>
                    <p className="text-slate-300 font-medium mb-2">Chat with any character, your way</p>
                    <p className="text-slate-400 text-sm">Switch freely between characters in Generic Mode, or lock in for an immersive one-on-one in Personality Mode.</p>
                </div>

                <div className="space-y-3">
                    <button
                        onClick={onLogin}
                        className="w-full flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 text-white py-3 rounded-lg transition-colors border border-slate-600 font-medium"
                    >
                        🔐 Continue with Google
                    </button>
                    <button
                        onClick={onLogin}
                        className="w-full flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 text-white py-3 rounded-lg transition-colors border border-slate-600 font-medium"
                    >
                        🐙 Continue with GitHub
                    </button>
                </div>

                <div className="relative flex items-center py-2">
                    <div className="flex-grow border-t border-slate-700"></div>
                    <span className="flex-shrink-0 mx-4 text-slate-500 text-sm">or</span>
                    <div className="flex-grow border-t border-slate-700"></div>
                </div>

                <button
                    onClick={onGuest}
                    className="w-full bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-500 hover:to-teal-600 text-white py-3 rounded-lg font-medium transition-all shadow-md hover:shadow-lg"
                >
                    🚀 Start as Guest (Local Storage)
                </button>

                <p className="text-xs text-slate-500 text-center pt-4 border-t border-slate-700">
                    StageEgo: An AI character chatbot. No data stored on external servers in guest mode.
                </p>
            </div>
        </div>
    );
}
