import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, Phone, Lock, AlertCircle } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { apiFetch } from '../api';

const Login = () => {
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { login } = useAuth();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const res = await apiFetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone, password })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Kirishda xatolik');
            }

            login(data.user, data.role);

            if (data.role === 'admin') {
                navigate('/admin');
            } else {
                navigate('/teacher');
            }
        } catch (err: any) {
            setError(err.message || 'Xatolik yuz berdi');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
            <div className="w-full max-w-md z-10">
                <div className="glass rounded-[2.5rem] p-10 shadow-2xl border-slate-700/30">
                    <div className="flex flex-col items-center mb-10">
                        <div className="w-20 h-20 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-3xl flex items-center justify-center mb-6 shadow-xl shadow-blue-500/20 animate-float">
                            <LogIn className="w-10 h-10 text-white" />
                        </div>
                        <h1 className="text-4xl font-black text-white mb-2 tracking-tight">Xush Kelibsiz</h1>
                        <p className="text-slate-400 text-center font-medium">Boshqaruv paneliga kiring</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {error && (
                            <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-2xl flex items-center gap-3 animate-pulse">
                                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                                <p className="text-sm font-bold">{error}</p>
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Telefon raqam</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-slate-500 group-focus-within:text-blue-500 transition-colors">
                                    <Phone className="w-5 h-5" />
                                </div>
                                <input
                                    type="text"
                                    placeholder="998901234567"
                                    className="w-full bg-slate-900/40 border border-slate-700/50 text-white pl-12 pr-4 py-4 rounded-3xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 outline-none transition-all placeholder:text-slate-700 font-medium"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Parol</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-slate-500 group-focus-within:text-indigo-500 transition-colors">
                                    <Lock className="w-5 h-5" />
                                </div>
                                <input
                                    type="password"
                                    placeholder="••••"
                                    className="w-full bg-slate-900/40 border border-slate-700/50 text-white pl-12 pr-4 py-4 rounded-3xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 outline-none transition-all placeholder:text-slate-700 font-medium"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className={`w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black py-5 rounded-3xl shadow-xl shadow-blue-500/20 btn-premium flex items-center justify-center gap-3 ${loading ? 'opacity-70' : ''}`}
                        >
                            {loading ? (
                                <div className="w-6 h-6 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
                            ) : (
                                <>
                                    <span>Tizimga kirish</span>
                                    <LogIn className="w-6 h-6" />
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Login;
