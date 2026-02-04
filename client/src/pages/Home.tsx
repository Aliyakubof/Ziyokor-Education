import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { LogIn, LogOut, Settings, Users, PlusCircle, CheckCircle2 } from 'lucide-react';

export default function Home() {
    const { isAuthenticated, role, logout, user } = useAuth();
    const navigate = useNavigate();

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-8 text-white relative overflow-hidden">
            {/* Top Navigation / Auth */}
            <div className="absolute top-8 right-8 z-20">
                {isAuthenticated ? (
                    <div className="flex items-center gap-4 glass p-2 pr-4 rounded-2xl border-slate-700/30">
                        <div className="w-10 h-10 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center font-bold text-lg shadow-lg">
                            {user?.name?.[0].toUpperCase()}
                        </div>
                        <div className="flex flex-col leading-tight">
                            <span className="text-sm font-bold text-white">{user?.name}</span>
                            <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">{role}</span>
                        </div>
                        <button
                            onClick={() => {
                                logout();
                                navigate('/login');
                            }}
                            className="bg-red-500/10 hover:bg-red-500/20 text-red-500 p-2 rounded-xl transition-all border border-red-500/10 ml-2"
                            title="Chiqish"
                        >
                            <LogOut size={18} />
                        </button>
                    </div>
                ) : (
                    <Link
                        to="/login"
                        className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-8 py-3 rounded-2xl font-bold transition-all shadow-xl shadow-blue-500/20 active:scale-95"
                    >
                        <LogIn size={20} />
                        <span>Kirish</span>
                    </Link>
                )}
            </div>

            <div className="text-center mb-20 z-10">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-6 border-slate-700/30 animate-float">
                    <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                    <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">Premium Education Platform</span>
                </div>
                <h1 className="text-8xl font-black mb-4 bg-gradient-to-b from-white via-white to-slate-500 bg-clip-text text-transparent text-glow">
                    Ziyokor
                </h1>
                <p className="text-xl text-slate-400 font-medium tracking-wide">Intellektual Quiz va Test Tizimi</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full max-w-6xl z-10">
                {/* Admin Panel Link */}
                <Link
                    to="/admin"
                    className="glass-blue p-8 rounded-[2rem] flex flex-col items-center justify-center gap-6 transition-all hover:scale-[1.03] group btn-premium"
                >
                    <div className="bg-blue-500/10 p-5 rounded-2xl group-hover:bg-blue-500/20 transition-all duration-500 group-hover:rotate-12">
                        <Settings size={36} className="text-blue-400" />
                    </div>
                    <div className="text-center">
                        <span className="block font-bold text-xl mb-1">Admin Panel</span>
                        <span className="text-xs text-slate-500 font-medium">O'qituvchilar boshqaruvi</span>
                    </div>
                </Link>

                {/* Teacher Link */}
                <Link
                    to="/teacher"
                    className="glass-emerald p-8 rounded-[2rem] flex flex-col items-center justify-center gap-6 transition-all hover:scale-[1.03] group btn-premium"
                >
                    <div className="bg-emerald-500/10 p-5 rounded-2xl group-hover:bg-emerald-500/20 transition-all duration-500 group-hover:-rotate-12">
                        <Users size={36} className="text-emerald-400" />
                    </div>
                    <div className="text-center">
                        <span className="block font-bold text-xl mb-1">O'qituvchi</span>
                        <span className="text-xs text-slate-500 font-medium">Guruhlar va o'quvchilar</span>
                    </div>
                </Link>

                {/* Create Quiz Link */}
                <Link
                    to="/create"
                    className="glass-indigo p-8 rounded-[2rem] flex flex-col items-center justify-center gap-6 transition-all hover:scale-[1.03] group btn-premium"
                >
                    <div className="bg-indigo-500/10 p-5 rounded-2xl group-hover:bg-indigo-500/20 transition-all duration-500 group-hover:scale-110">
                        <PlusCircle size={36} className="text-indigo-400" />
                    </div>
                    <div className="text-center">
                        <span className="block font-bold text-xl mb-1">Quiz yaratish</span>
                        <span className="text-xs text-slate-500 font-medium">Yangi testlar to'plami</span>
                    </div>
                </Link>

                {/* Unit Join Link (Renamed from O'yinga kirish) */}
                <Link
                    to="/join"
                    className="glass p-8 rounded-[2rem] flex flex-col items-center justify-center gap-6 transition-all hover:scale-[1.03] group border-slate-700/50 btn-premium"
                >
                    <div className="bg-slate-500/10 p-5 rounded-2xl group-hover:bg-slate-500/20 transition-all duration-500 group-hover:translate-y-[-5px]">
                        <CheckCircle2 size={36} className="text-slate-300" />
                    </div>
                    <div className="text-center">
                        <span className="block font-bold text-xl mb-1 text-glow">Unitga kirish</span>
                        <span className="text-xs text-slate-500 font-medium">Test topshirish bo'limi</span>
                    </div>
                </Link>
            </div>

            <div className="mt-20 flex flex-col items-center gap-4 z-10">
                <p className="text-slate-500 italic text-sm text-center max-w-lg bg-slate-900/40 px-6 py-2 rounded-full border border-slate-800/50">
                    O'quvchilar 7 xonali ID orqali Unit testga ulanishlari mumkin
                </p>
            </div>
        </div>
    );
}
