import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { LogIn, LogOut, Settings, Users, Gamepad2, PlusCircle } from 'lucide-react';

export default function Home() {
    const { isAuthenticated, role, logout, user } = useAuth();
    const navigate = useNavigate();

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 p-8 text-white relative overflow-hidden">
            {/* Top Navigation / Auth */}
            <div className="absolute top-8 right-8 z-20">
                {isAuthenticated ? (
                    <div className="flex items-center gap-4">
                        <div className="flex flex-col items-end">
                            <span className="text-sm font-bold text-white">{user?.name}</span>
                            <span className="text-xs text-slate-400 capitalize">{role}</span>
                        </div>
                        <button
                            onClick={() => {
                                logout();
                                navigate('/login');
                            }}
                            className="bg-red-500/10 hover:bg-red-500/20 text-red-400 p-3 rounded-2xl border border-red-500/20 transition-all active:scale-95"
                            title="Chiqish"
                        >
                            <LogOut size={20} />
                        </button>
                    </div>
                ) : (
                    <Link
                        to="/login"
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-2xl font-bold transition-all shadow-lg shadow-blue-900/40 active:scale-95"
                    >
                        <LogIn size={20} />
                        <span>Kirish</span>
                    </Link>
                )}
            </div>

            <h1 className="text-7xl font-black mb-16 bg-gradient-to-r from-blue-400 via-indigo-500 to-purple-600 bg-clip-text text-transparent text-center animate-fade-in">
                Ziyokor Education
            </h1>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full max-w-6xl z-10">
                {/* Admin Panel Link */}
                <Link
                    to="/admin"
                    className="bg-blue-600/90 hover:bg-blue-500 p-8 rounded-3xl flex flex-col items-center justify-center gap-4 transition-all hover:scale-105 shadow-xl shadow-blue-900/20 group backdrop-blur-sm"
                >
                    <div className="bg-white/10 p-4 rounded-2xl group-hover:bg-white/20 transition-colors">
                        <Settings size={32} className="text-white" />
                    </div>
                    <span className="font-bold text-xl">Admin Panel</span>
                </Link>

                {/* Teacher Link */}
                <Link
                    to="/teacher"
                    className="bg-emerald-600/90 hover:bg-emerald-500 p-8 rounded-3xl flex flex-col items-center justify-center gap-4 transition-all hover:scale-105 shadow-xl shadow-emerald-900/20 group backdrop-blur-sm"
                >
                    <div className="bg-white/10 p-4 rounded-2xl group-hover:bg-white/20 transition-colors">
                        <Users size={32} className="text-white" />
                    </div>
                    <span className="font-bold text-xl">O'qituvchi</span>
                </Link>

                {/* Create Quiz Link */}
                <Link
                    to="/create"
                    className="bg-indigo-600/90 hover:bg-indigo-500 p-8 rounded-3xl flex flex-col items-center justify-center gap-4 transition-all hover:scale-105 shadow-xl shadow-indigo-900/20 group backdrop-blur-sm"
                >
                    <div className="bg-white/10 p-4 rounded-2xl group-hover:bg-white/20 transition-colors">
                        <PlusCircle size={32} className="text-white" />
                    </div>
                    <span className="font-bold text-xl">Quiz yaratish</span>
                </Link>

                {/* Play/Join Link */}
                <Link
                    to="/join"
                    className="bg-slate-800/80 hover:bg-slate-700 p-8 rounded-3xl border border-slate-700/50 flex flex-col items-center justify-center gap-4 transition-all hover:scale-105 group backdrop-blur-sm"
                >
                    <div className="bg-white/10 p-4 rounded-2xl group-hover:bg-white/20 transition-colors">
                        <Gamepad2 size={32} className="text-white" />
                    </div>
                    <span className="font-bold text-xl">O'yinga kirish</span>
                </Link>
            </div>

            <p className="mt-16 text-slate-500 italic text-sm text-center max-w-lg">
                Unit Quiz o'quvchilar uchun ID orqali kirish QR-kod yoki havola orqali amalga oshiriladi
            </p>

            {/* Background elements */}
            <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl"></div>
            <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl"></div>
        </div>
    );
}
