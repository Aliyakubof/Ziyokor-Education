import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, Phone, Lock, AlertCircle } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { apiFetch } from '../api';

const Login = () => {
    const [identifier, setIdentifier] = useState(''); // Phone or ID
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { login, isAuthenticated, role } = useAuth();

    // Auto-redirect if already logged in
    useEffect(() => {
        if (isAuthenticated && role) {
            navigate('/');
        }
    }, [isAuthenticated, role, navigate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            // Determine if it's a student ID (7 digits) or phone number
            const cleanIdentifier = identifier.replace(/\D/g, '');
            const isStudentId = cleanIdentifier.length === 7;

            let url = '/api/login';
            let body: any = { password };

            if (isStudentId) {
                url = '/api/student/login';
                body.id = cleanIdentifier;
            } else {
                body.phone = identifier; // Send original identifier, let backend handle cleaning if needed or just send cleaned?
                // Existing /api/login expects 'phone'.
                // Let's send the input value as is, but maybe the state variable name 'phone' was strict?
                // The backend query usually handles it.
            }

            const res = await apiFetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Kirishda xatolik');
            }

            // For student login, the response structure might be slightly different?
            // /api/student/login returns { token, user: {...} }
            // /api/login returns { token, user: {...}, role: ... }
            // Student login returns role: 'student' inside user object in my previous implementation?
            // Let's check app.ts...
            // /api/student/login: res.json({ token, user: { role: 'student', ... } })
            // /api/login: res.json({ token, user: {...}, role: 'admin'|'teacher' })

            const userRole = data.role || data.user.role;
            login(data.token || 'mock-token', data.user, userRole);

            if (userRole === 'student') {
                navigate('/student/dashboard');
            } else if (userRole === 'admin') {
                navigate('/admin');
            } else {
                navigate('/teacher'); // or /
            }

        } catch (err: any) {
            setError(err.message || 'Xatolik yuz berdi');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center px-6 relative overflow-hidden bg-slate-50">
            {/* Background Decorations */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-100 rounded-full blur-3xl opacity-60 animate-float"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-100 rounded-full blur-3xl opacity-60 animate-float" style={{ animationDelay: '2s' }}></div>
            </div>

            <div className="w-full max-w-md z-10">
                <div className="bg-white rounded-[2rem] p-10 shadow-xl shadow-slate-200/50 border border-slate-100">
                    <div className="flex flex-col items-center mb-10">
                        <div className="w-20 h-20 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-3xl flex items-center justify-center mb-6 shadow-lg shadow-blue-500/30 animate-float">
                            <LogIn className="w-10 h-10 text-white" />
                        </div>
                        <h1 className="text-3xl font-black text-slate-900 mb-2 tracking-tight">Xush Kelibsiz</h1>
                        <p className="text-slate-500 text-center font-medium">Boshqaruv paneliga kiring</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {error && (
                            <div className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-2xl flex items-center gap-3">
                                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                                <p className="text-sm font-bold">{error}</p>
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Telefon raqam yoki ID</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
                                    <Phone className="w-5 h-5" />
                                </div>
                                <input
                                    type="text"
                                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 pl-12 pr-4 py-4 rounded-2xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400 font-medium hover:bg-white"
                                    value={identifier}
                                    onChange={(e) => setIdentifier(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Parol</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                                    <Lock className="w-5 h-5" />
                                </div>
                                <input
                                    type="password"
                                    placeholder="••••"
                                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 pl-12 pr-4 py-4 rounded-2xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400 font-medium hover:bg-white"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className={`w-full bg-slate-900 hover:bg-slate-800 text-white font-black py-4 rounded-2xl shadow-xl shadow-slate-900/10 btn-premium flex items-center justify-center gap-3 ${loading ? 'opacity-70' : ''}`}
                        >
                            {loading ? (
                                <div className="w-6 h-6 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
                            ) : (
                                <>
                                    <span>Tizimga kirish</span>
                                    <LogIn className="w-5 h-5" />
                                </>
                            )}
                        </button>
                    </form>
                </div>

                <p className="text-center text-slate-400 text-sm font-medium mt-8">
                    &copy; 2026 Ziyokor Education. Barcha huquqlar himoyalangan.
                </p>
            </div>
        </div>
    );
};

export default Login;
