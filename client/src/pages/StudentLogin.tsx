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
                login(data.user, 'student');
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
        <div className="min-h-screen flex flex-col items-center justify-center p-4 font-sans transition-colors duration-500" style={{ backgroundColor: 'var(--bg-color)' }}>
            <div className="w-full max-w-md">
                {/* Logo & Header */}
                <div className="text-center mb-8">
                    <img src={logo} alt="Ziyokor" className="h-20 w-auto mx-auto rounded-2xl shadow-lg mb-4" />
                    <h1 className="text-3xl font-bold" style={{ color: 'var(--text-color)' }}>O'quvchi Kabineti</h1>
                    <p className="mt-2 opacity-60" style={{ color: 'var(--text-color)' }}>Shaxsiy natijalarni kuzatib boring</p>
                </div>

                {/* Card */}
                <div className="rounded-2xl shadow-xl border overflow-hidden transition-colors" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
                    <div className="p-8">
                        {step === 'id' ? (
                            <form onSubmit={handleCheckId} className="space-y-6">
                                <div>
                                    <label className="block text-sm font-bold mb-2 opacity-70" style={{ color: 'var(--text-color)' }}>
                                        ID Raqamingiz
                                    </label>
                                    <div className="relative">
                                        <User className="absolute left-4 top-1/2 -translate-y-1/2 opacity-40" size={20} style={{ color: 'var(--text-color)' }} />
                                        <input
                                            type="text"
                                            value={id}
                                            onChange={(e) => setId(e.target.value.replace(/\D/g, '').slice(0, 7))}
                                            placeholder="1234567"
                                            className="w-full pl-12 pr-4 py-3.5 border rounded-xl font-mono text-lg font-bold tracking-widest focus:outline-none transition-all placeholder:opacity-30"
                                            style={{ backgroundColor: 'var(--bg-color)', borderColor: 'var(--border-color)', color: 'var(--text-color)' }}
                                            autoFocus
                                        />
                                    </div>
                                    <p className="text-xs mt-2 pl-1 opacity-40" style={{ color: 'var(--text-color)' }}>
                                        7 xonali ID raqamingizni kiriting
                                    </p>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading || id.length < 7}
                                    className="w-full text-white font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                                    style={{ backgroundColor: 'var(--primary-color)' }}
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
                                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-3" style={{ backgroundColor: 'color-mix(in srgb, var(--primary-color), transparent 90%)', color: 'var(--primary-color)' }}>
                                        <User size={32} />
                                    </div>
                                    <h3 className="text-xl font-bold" style={{ color: 'var(--text-color)' }}>{studentName}</h3>
                                    <p className="text-sm opacity-60" style={{ color: 'var(--text-color)' }}>ID: {id}</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold mb-2 opacity-70" style={{ color: 'var(--text-color)' }}>
                                        {isFirstTime ? "Yangi Parol O'ylab Toping" : "Parolingizni Kiriting"}
                                    </label>
                                    <div className="relative">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 opacity-40" size={20} style={{ color: 'var(--text-color)' }} />
                                        <input
                                            type="password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder={isFirstTime ? "Yangi parol..." : "******"}
                                            className="w-full pl-12 pr-4 py-3.5 border rounded-xl text-lg font-medium focus:outline-none transition-all"
                                            style={{ backgroundColor: 'var(--bg-color)', borderColor: 'var(--border-color)', color: 'var(--text-color)' }}
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
                                        className="flex-1 font-bold py-3.5 rounded-xl transition-all"
                                        style={{ backgroundColor: 'var(--bg-color)', color: 'var(--text-color)' }}
                                    >
                                        Ortga
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={loading || !password.trim()}
                                        className="flex-[2] text-white font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                                        style={{ backgroundColor: 'var(--primary-color)' }}
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
                    <div className="p-4 text-center border-t transition-colors" style={{ backgroundColor: 'color-mix(in srgb, var(--card-bg), black 2%)', borderColor: 'var(--border-color)' }}>
                        <Link to="/" className="text-sm font-medium opacity-60 hover:opacity-100 transition-opacity" style={{ color: 'var(--text-color)' }}>
                            Bosh sahifaga qaytish
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
