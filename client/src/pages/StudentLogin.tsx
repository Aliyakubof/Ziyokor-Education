import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { apiFetch } from '../api';
import { useAuth } from '../AuthContext';
import { User, Lock, ArrowRight, Loader2, KeyRound } from 'lucide-react';
import logo from '../assets/logo.jpeg';

export default function StudentLogin() {
    const navigate = useNavigate();
    const { login } = useAuth();

    // Steps: 'id' -> 'password' (create or verify)
    const [step, setStep] = useState<'id' | 'password'>('id');
    const [loading, setLoading] = useState(false);

    // Data
    const [id, setId] = useState('');
    const [password, setPassword] = useState('');
    const [studentName, setStudentName] = useState('');
    const [isFirstTime, setIsFirstTime] = useState(false); // If true, create password. If false, verify.

    const handleCheckId = async (e: React.FormEvent) => {
        e.preventDefault();
        if (id.length !== 7) {
            alert("Iltimos, 7 xonali ID kiriting");
            return;
        }

        setLoading(true);
        try {
            const res = await apiFetch('/api/student/check-id', {
                method: 'POST',
                body: JSON.stringify({ id })
            });

            if (res.ok) {
                const data = await res.json();
                setStudentName(data.name);
                setIsFirstTime(!data.hasPassword);
                setStep('password');
            } else {
                alert("Bunday ID li o'quvchi topilmadi");
            }
        } catch (err) {
            console.error(err);
            alert("Xatolik yuz berdi");
        } finally {
            setLoading(false);
        }
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!password.trim()) return;

        setLoading(true);
        try {
            const res = await apiFetch('/api/student/login', {
                method: 'POST',
                body: JSON.stringify({ id, password })
            });

            if (res.ok) {
                const data = await res.json();
                login(data.token, data.user, 'student');
                navigate('/student/dashboard');
            } else {
                const error = await res.json();
                alert(error.error || "Kirishda xatolik");
            }
        } catch (err) {
            console.error(err);
            alert("Xatolik yuz berdi");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 font-sans">
            <div className="w-full max-w-md">
                {/* Logo & Header */}
                <div className="text-center mb-8">
                    <img src={logo} alt="Ziyokor" className="h-20 w-auto mx-auto rounded-2xl shadow-lg mb-4" />
                    <h1 className="text-3xl font-bold text-slate-900">O'quvchi Kabineti</h1>
                    <p className="text-slate-500 mt-2">Shaxsiy natijalarni kuzatib boring</p>
                </div>

                {/* Card */}
                <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
                    <div className="p-8">
                        {step === 'id' ? (
                            <form onSubmit={handleCheckId} className="space-y-6">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">
                                        ID Raqamingiz
                                    </label>
                                    <div className="relative">
                                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                                        <input
                                            type="text"
                                            value={id}
                                            onChange={(e) => setId(e.target.value.replace(/\D/g, '').slice(0, 7))}
                                            placeholder="1234567"
                                            className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-lg font-bold text-slate-900 tracking-widest focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all placeholder:text-slate-300 placeholder:font-normal placeholder:tracking-normal"
                                            autoFocus
                                        />
                                    </div>
                                    <p className="text-xs text-slate-400 mt-2 pl-1">
                                        7 xonali ID raqamingizni kiriting
                                    </p>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading || id.length < 7}
                                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/20"
                                >
                                    {loading ? (
                                        <Loader2 className="animate-spin" size={20} />
                                    ) : (
                                        <>
                                            Davom etish <ArrowRight size={20} />
                                        </>
                                    )}
                                </button>
                            </form>
                        ) : (
                            <form onSubmit={handleLogin} className="space-y-6 animate-in slide-in-from-right fade-in duration-300">
                                <div className="text-center mb-6">
                                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-indigo-50 text-indigo-600 mb-3">
                                        <User size={32} />
                                    </div>
                                    <h3 className="text-xl font-bold text-slate-900">{studentName}</h3>
                                    <p className="text-sm text-slate-500">ID: {id}</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">
                                        {isFirstTime ? "Yangi Parol O'ylab Toping" : "Parolingizni Kiriting"}
                                    </label>
                                    <div className="relative">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                                        <input
                                            type="password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder={isFirstTime ? "Yangi parol..." : "******"}
                                            className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-lg font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                                            autoFocus
                                        />
                                    </div>
                                    {isFirstTime && (
                                        <p className="text-xs text-amber-600 mt-2 pl-1 flex items-center gap-1">
                                            <KeyRound size={12} /> Bu parolni eslab qoling! Keyingi safar kerak bo'ladi.
                                        </p>
                                    )}
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setStep('id');
                                            setPassword('');
                                        }}
                                        className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-3.5 rounded-xl transition-all"
                                    >
                                        Ortga
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={loading || !password.trim()}
                                        className="flex-[2] bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/20"
                                    >
                                        {loading ? (
                                            <Loader2 className="animate-spin" size={20} />
                                        ) : (
                                            <>
                                                {isFirstTime ? "Saqlash va Kirish" : "Kirish"}
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                    <div className="bg-slate-50 p-4 text-center border-t border-slate-100">
                        <Link to="/" className="text-sm font-medium text-slate-500 hover:text-indigo-600 transition-colors">
                            Bosh sahifaga qaytish
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
