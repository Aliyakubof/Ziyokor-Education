import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { LogIn, Settings, Users, PlusCircle, ArrowRight } from 'lucide-react';
import { apiFetch } from '../api';
import logo from '../assets/logo.jpeg';

export default function Home() {
    const { isAuthenticated, role, logout, user } = useAuth();
    const navigate = useNavigate();
    const [pin, setPin] = useState('');
    const [stats, setStats] = useState({
        teachers: 0,
        groups: 0,
        quizzes: 0
    });

    useEffect(() => {
        if (isAuthenticated) {
            fetchStats();
        }
    }, [isAuthenticated, role, user]);

    const fetchStats = async () => {
        try {
            if (role === 'admin') {
                const res = await apiFetch('/api/admin/stats');
                const data = await res.json();
                setStats(data);
            } else if (role === 'teacher' && user?.id) {
                const res = await apiFetch(`/api/teacher/${user.id}/stats`);
                const data = await res.json();
                setStats({ ...data, teachers: 0 }); // Teachers don't see teacher count
            } else {
                // Guest or public view - maybe show general stats if needed, or just 0
                const quizRes = await apiFetch('/api/unit-quizzes');
                const quizzes = await quizRes.json();
                setStats(prev => ({ ...prev, quizzes: Array.isArray(quizzes) ? quizzes.length : 0 }));
            }
        } catch (err) {
            console.error("Error fetching stats:", err);
        }
    };

    const handleJoin = (e: React.FormEvent) => {
        e.preventDefault();
        if (pin.length === 7) {
            navigate(`/unit-join/${pin}`);
        } else {
            alert("Iltimos, 7 xonali ID kiriting");
        }
    };

    return (
        <div className="min-h-screen bg-transparent font-sans text-slate-900 flex flex-col">
            {/* Navbar */}
            <nav className="border-b border-slate-100 py-4 px-6 md:px-12 flex justify-between items-center bg-white sticky top-0 z-50">
                <div className="flex items-center gap-2">
                    <img src={logo} alt="Ziyokor" className="h-10 w-auto rounded-lg" />
                    <span className="font-bold text-xl tracking-tight text-slate-900">Ziyokor</span>
                </div>

                <div>
                    {isAuthenticated ? (
                        <div className="flex items-center gap-4">
                            <span className="text-sm font-semibold text-slate-600 hidden md:inline">{user?.name}</span>
                            <button
                                onClick={() => {
                                    logout();
                                    navigate('/login');
                                }}
                                className="text-sm font-bold text-red-600 hover:text-red-700 transition-colors"
                            >
                                Chiqish
                            </button>
                        </div>
                    ) : (
                        <Link
                            to="/login"
                            className="text-sm font-bold text-indigo-600 hover:text-indigo-700 transition-colors flex items-center gap-1"
                        >
                            <LogIn size={16} /> Kirish
                        </Link>
                    )}
                </div>
            </nav>

            {/* Hero Section */}
            <main className="flex-1 max-w-7xl mx-auto w-full p-6 md:p-12 flex flex-col items-center justify-center text-center">
                <h1 className="text-5xl md:text-7xl font-bold text-slate-900 mb-6 tracking-tight">
                    Ziyokor
                </h1>
                <p className="text-xl md:text-2xl text-slate-600 font-medium max-w-2xl mx-auto mb-16">
                    Intellektual Quiz va Test Tizimi
                </p>

                {/* Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full max-w-6xl">

                    {/* Admin - Only for Admin */}
                    {role === 'admin' && (
                        <Link to="/admin" className="group bg-slate-50 hover:bg-white border border-slate-200 hover:border-indigo-200 rounded-2xl p-8 transition-all hover:shadow-xl hover:shadow-indigo-500/10 flex flex-col items-center relative overflow-hidden">
                            <div className="bg-blue-100 text-blue-600 p-4 rounded-xl mb-6 group-hover:scale-110 transition-transform">
                                <Settings size={32} />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 mb-2">Admin Panel</h3>
                            <p className="text-slate-500 text-sm font-medium mb-4">O'qituvchilar boshqaruvi</p>
                            <span className="inline-flex items-center justify-center bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                                {stats.teachers} ta O'qituvchi
                            </span>
                        </Link>
                    )}

                    {/* Student Dashboard */}
                    {role === 'student' && (
                        <Link to="/student/dashboard" className="group bg-slate-50 hover:bg-white border border-slate-200 hover:border-indigo-200 rounded-2xl p-8 transition-all hover:shadow-xl hover:shadow-indigo-500/10 flex flex-col items-center relative overflow-hidden">
                            <div className="bg-indigo-100 text-indigo-600 p-4 rounded-xl mb-6 group-hover:scale-110 transition-transform">
                                <Users size={32} />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 mb-2">Kabinetim</h3>
                            <p className="text-slate-500 text-sm font-medium mb-4">Statistika va Tarix</p>
                        </Link>
                    )}

                    {/* Teacher - Only for Admin or Teacher */}
                    {(role === 'admin' || role === 'teacher') && (
                        <Link to={role === 'admin' ? "/admin/groups" : "/teacher"} className="group bg-slate-50 hover:bg-white border border-slate-200 hover:border-emerald-200 rounded-2xl p-8 transition-all hover:shadow-xl hover:shadow-emerald-500/10 flex flex-col items-center relative overflow-hidden">
                            <div className="bg-emerald-100 text-emerald-600 p-4 rounded-xl mb-6 group-hover:scale-110 transition-transform">
                                <Users size={32} />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 mb-2">O'qituvchi</h3>
                            <p className="text-slate-500 text-sm font-medium mb-4">Guruhlar va o'quvchilar</p>
                            {role === 'teacher' && (
                                <span className="inline-flex items-center justify-center bg-emerald-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                                    {stats.groups} ta Guruh
                                </span>
                            )}
                        </Link>
                    )}

                    {/* Create Quiz - Only for Admin or Teacher */}
                    {(role === 'admin' || role === 'teacher') && (
                        <Link to="/create" className="group bg-slate-50 hover:bg-white border border-slate-200 hover:border-violet-200 rounded-2xl p-8 transition-all hover:shadow-xl hover:shadow-violet-500/10 flex flex-col items-center relative overflow-hidden">
                            <div className="bg-violet-100 text-violet-600 p-4 rounded-xl mb-6 group-hover:scale-110 transition-transform">
                                <PlusCircle size={32} />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 mb-2">Quiz yaratish</h3>
                            <p className="text-slate-500 text-sm font-medium mb-4">Yangi testlar to'plami</p>
                            <span className="inline-flex items-center justify-center bg-violet-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                                {stats.quizzes} ta Quiz
                            </span>
                        </Link>
                    )}

                    {/* Unit Entry (Input) */}
                    <div className="col-span-1 md:col-span-2 lg:col-span-1 bg-indigo-600 rounded-2xl p-8 text-white flex flex-col items-center relative overflow-hidden shadow-xl shadow-indigo-600/20">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
                        <h3 className="text-lg font-bold mb-1 relative z-10">Unitga kirish</h3>
                        <p className="text-indigo-200 text-xs font-medium mb-6 relative z-10">Test topshirish bo'limi</p>

                        <form onSubmit={handleJoin} className="w-full relative z-10">
                            <input
                                type="text"
                                placeholder="7 xonali ID"
                                value={pin}
                                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 7))}
                                className="w-full bg-white/20 border border-white/30 rounded-xl px-4 py-3 text-white placeholder:text-indigo-200 font-mono text-center font-bold tracking-widest focus:outline-none focus:bg-white/30 mb-3"
                            />
                            <button type="submit" className="w-full bg-white text-indigo-600 font-bold py-3 rounded-xl hover:bg-indigo-50 transition-colors flex items-center justify-center gap-2">
                                Boshlash <ArrowRight size={16} />
                            </button>
                        </form>
                    </div>
                </div>
            </main>

            <footer className="py-6 text-center text-slate-400 text-sm font-medium">
                &copy; {new Date().getFullYear()} Ziyokor Education Platform
            </footer>
        </div>
    );
}
