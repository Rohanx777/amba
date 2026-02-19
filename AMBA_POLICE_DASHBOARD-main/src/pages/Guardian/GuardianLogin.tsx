import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Eye, Lock } from 'lucide-react';

export default function GuardianLogin() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            setError(error.message);
            setLoading(false);
        } else {
            navigate('/guardian/dashboard');
        }
    };

    return (
        <div className="flex min-h-screen bg-slate-950 text-slate-100 items-center justify-center p-4">
            <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
                {/* Ambient Background Effect */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -ml-32 -mb-32"></div>

                <div className="relative z-10">
                    <div className="flex justify-center mb-6">
                        <div className="bg-slate-800 p-4 rounded-full border border-slate-700 shadow-inner">
                            <Eye className="w-10 h-10 text-cyan-400" />
                        </div>
                    </div>

                    <h2 className="text-3xl font-black text-center mb-2 tracking-tighter">
                        GUARDIAN<span className="text-cyan-400">PORTAL</span>
                    </h2>
                    <p className="text-slate-500 text-center mb-8 text-sm uppercase tracking-widest font-medium">
                        Tactical Overwatch System
                    </p>

                    <form onSubmit={handleLogin} className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Email Frequency</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:border-cyan-500 transition-colors"
                                placeholder="parent@example.com"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Access Code</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:border-cyan-500 transition-colors"
                                placeholder="••••••••"
                            />
                        </div>

                        {error && (
                            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm text-center">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 group"
                        >
                            {loading ? 'Authenticating...' : (
                                <>
                                    <Lock className="w-4 h-4" />
                                    ESTABLISH P2P LINK
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <button onClick={() => navigate('/')} className="text-slate-600 text-xs hover:text-slate-400 transition-colors">
                            ← Return to Police Command
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
