import { useState } from 'react';

export default function Auth({ onLogin, onGuest }: { onLogin: () => void, onGuest: () => void }) {
    const [email, setEmail] = useState('');

    return (
        <div className="flex min-h-screen items-center justify-center bg-slate-900 px-4 font-sans">
            <div className="w-full max-w-md p-8 space-y-6 bg-slate-800 rounded-xl border border-slate-700 shadow-2xl">
                <div className="text-center">
                    <h1 className="text-3xl font-bold text-teal-400 mb-2">AI Persona Chat</h1>
                    <p className="text-slate-400">Sign in to sync your custom characters and chats.</p>
                </div>

                <div className="space-y-4">
                    <button
                        onClick={onLogin}
                        className="w-full flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 text-white py-3 rounded-lg transition-colors border border-slate-600"
                    >
                        Continue with Google
                    </button>
                    <button
                        onClick={onLogin}
                        className="w-full flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 text-white py-3 rounded-lg transition-colors border border-slate-600"
                    >
                        Continue with GitHub
                    </button>
                </div>

                <div className="relative flex items-center py-2">
                    <div className="flex-grow border-t border-slate-700"></div>
                    <span className="flex-shrink-0 mx-4 text-slate-500 text-sm">or</span>
                    <div className="flex-grow border-t border-slate-700"></div>
                </div>

                <button
                    onClick={onGuest}
                    className="w-full bg-teal-600 hover:bg-teal-500 text-white py-3 rounded-lg font-medium transition-colors shadow-md"
                >
                    Try as Guest (Local Storage)
                </button>
            </div>
        </div>
    );
}
