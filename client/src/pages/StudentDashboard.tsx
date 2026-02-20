import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { apiFetch } from '../api';
import {
    LogOut, History, Calendar,
    Gamepad2, Zap,
    LayoutDashboard, UserCircle, ChevronRight,
    Trophy, ShoppingBag, Swords, BookOpen, Flame, Coins
} from 'lucide-react';
import logo from '../assets/logo.jpeg';

export default function StudentDashboard() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'home' | 'history' | 'profile'>('home');
    const [stats, setStats] = useState({
        gamesPlayed: 0,
        totalScore: 0,
        rank: 0,
        coins: 0,
        streakCount: 0,
        isHero: false,
        hasTrophy: false,
        weeklyBattleScore: 0,
        groupId: ''
    });
    const [battle, setBattle] = useState<any>(null);
    const [history, setHistory] = useState<any[]>([]);
    const [pin, setPin] = useState('');

    useEffect(() => {
        if (user?.id) {
            fetchData();
        }
    }, [user]);

    const fetchData = async () => {
        try {
            const statsRes = await apiFetch(`/api/student/${user?.id}/stats`);
            const statsData = await statsRes.json();
            setStats(statsData);
            if (statsData.groupId) {
                const battleRes = await apiFetch(`/api/battles/current/${statsData.groupId}`);
                if (battleRes.ok) setBattle(await battleRes.json());
            }

            const historyRes = await apiFetch(`/api/student/${user?.id}/history`);
            if (historyRes.ok) setHistory(await historyRes.json());
        } catch (err) {
            console.error(err);
        }
    };

    const isWeekend = () => {
        const day = new Date().getDay();
        return day === 0 || day === 6;
    };

    const handleJoinGame = (e: React.FormEvent) => {
        e.preventDefault();
        if (pin.length === 6) {
            if (user?.id) {
                localStorage.setItem('student-id', user.id);
            }
            navigate(`/unit-join/${pin}`);
        } else {
            alert("Iltimos, 6 xonali PIN kodni to'g'ri kiriting");
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('uz-UZ', {
            day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
        });
    };

    // Level Calculation (Simple logic: 1000 XP = 1 Level)
    const level = Math.floor(stats.totalScore / 1000) + 1;
    const currentLevelProgress = stats.totalScore % 1000;
    const progressPercent = (currentLevelProgress / 1000) * 100;

    return (
        <div className="min-h-screen bg-slate-50 font-sans pb-24 md:pb-0 relative overflow-hidden">
            {/* Background Gradients */}
            <div className="absolute top-0 left-0 w-full h-[300px] bg-gradient-to-b from-indigo-900 via-indigo-800 to-transparent z-0"></div>
            <div className="absolute top-[-50px] right-[-50px] w-64 h-64 bg-violet-600 rounded-full blur-3xl opacity-30 z-0"></div>
            <div className="absolute top-[100px] left-[-30px] w-40 h-40 bg-blue-500 rounded-full blur-3xl opacity-20 z-0"></div>

            {/* Header Section */}
            <header className="relative z-10 px-6 pt-8 pb-6 text-white">
                <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border-2 border-white/30 shadow-lg">
                            <span className="text-2xl font-black">
                                {user?.name?.charAt(0).toUpperCase()}
                            </span>
                        </div>
                        <div>
                            <h1 className="text-xl font-bold leading-none mb-1">{user?.name}</h1>
                            <div className="flex items-center gap-2 text-indigo-200 text-sm font-medium">
                                <span className="bg-white/10 px-2 py-0.5 rounded text-xs">ID: {user?.id}</span>
                                <span>{user?.groupName}</span>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm p-1.5 rounded-xl border border-white/10">
                        <img src={logo} alt="Logo" className="w-8 h-8 rounded-lg" />
                    </div>
                </div>

                {/* Level Progress */}
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 shadow-xl">
                    <div className="flex justify-between items-end mb-2">
                        <div>
                            <span className="text-xs font-bold text-indigo-200 uppercase tracking-wider">Daraja</span>
                            <div className="text-3xl font-black flex items-center gap-2">
                                {level} <span className="text-sm font-bold text-indigo-300 mt-2">Level</span>
                            </div>
                        </div>
                        <div className="text-right">
                            <span className="text-2xl font-bold text-yellow-400">{stats.totalScore.toLocaleString()}</span>
                            <span className="text-xs font-bold text-indigo-200 block">Total XP</span>
                        </div>
                    </div>
                    <div className="w-full bg-black/20 rounded-full h-3 overflow-hidden">
                        <div
                            className="bg-gradient-to-r from-yellow-400 to-orange-500 h-full rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(250,204,21,0.5)]"
                            style={{ width: `${progressPercent}%` }}
                        ></div>
                    </div>
                    <div className="flex justify-between text-[10px] font-bold text-indigo-300 mt-1 uppercase">
                        <span>{currentLevelProgress} XP</span>
                        <span>{1000 - currentLevelProgress} XP to Lvl {level + 1}</span>
                    </div>
                </div>

                {/* Group Battle Progress Bar */}
                {battle && (
                    <div className="mt-4 bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-[10px] font-black text-indigo-200 uppercase tracking-widest flex items-center gap-1">
                                <Swords size={12} /> Haftalik Battle
                            </span>
                            {isWeekend() && (
                                <span className="bg-orange-500 text-[10px] font-black px-2 py-0.5 rounded-full animate-pulse shadow-lg shadow-orange-500/20">
                                    Double XP Weekend 🔥
                                </span>
                            )}
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="flex-1">
                                <div className="flex justify-between text-xs font-bold mb-1">
                                    <span className="text-white truncate max-w-[100px]">Guruh</span>
                                    <span className="text-indigo-300 truncate max-w-[100px]">
                                        {battle.group_a_id === stats.groupId ? battle.group_b_name : battle.group_a_name}
                                    </span>
                                </div>
                                <div className="h-2 w-full bg-black/20 rounded-full overflow-hidden flex">
                                    <div
                                        className="h-full bg-indigo-400 transition-all duration-1000"
                                        style={{ width: `${Math.round(((battle.group_a_id === stats.groupId ? battle.score_a : battle.score_b) / (battle.score_a + battle.score_b || 1)) * 100)}%` }}
                                    ></div>
                                    <div
                                        className="h-full bg-rose-400 transition-all duration-1000"
                                        style={{ width: `${100 - Math.round(((battle.group_a_id === stats.groupId ? battle.score_a : battle.score_b) / (battle.score_a + battle.score_b || 1)) * 100)}%` }}
                                    ></div>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-lg font-black text-indigo-100">
                                    {battle.group_a_id === stats.groupId ? battle.score_a : battle.score_b}
                                    <span className="text-[10px] text-indigo-400 ml-1">XP</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </header>

            <main className="relative z-10 px-4 -mt-4 space-y-4">

                {activeTab === 'home' && (
                    <>
                        {/* Action Card: Join Game */}
                        <div className="bg-white rounded-3xl p-6 shadow-xl shadow-indigo-900/5 border border-white relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full -mr-10 -mt-10 group-hover:scale-150 transition-transform duration-500"></div>
                            <h2 className="text-lg font-black text-slate-900 mb-4 relative z-10 flex items-center gap-2">
                                <Gamepad2 className="text-indigo-600" />
                                O'yinga Kirish
                            </h2>
                            <form onSubmit={handleJoinGame} className="relative z-10">
                                <input
                                    type="text"
                                    placeholder="6 xonali PIN kiriting"
                                    value={pin}
                                    onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 font-mono text-lg font-bold text-center tracking-widest text-slate-800 placeholder:text-slate-300 focus:border-indigo-500 focus:outline-none transition-colors mb-3"
                                />
                                <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-indigo-500/30 flex items-center justify-center gap-2 transition-all active:scale-95">
                                    <Zap size={20} className="fill-white" /> Boshlash
                                </button>
                            </form>
                        </div>

                        {/* Recent Stats Grid */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-center items-center text-center">
                                <div className="w-10 h-10 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center mb-2">
                                    <Coins size={20} />
                                </div>
                                <span className="text-2xl font-black text-slate-800">{stats.coins.toLocaleString()}</span>
                                <span className="text-xs font-bold text-slate-400">Tangalar</span>
                            </div>
                            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-center items-center text-center">
                                <div className="w-10 h-10 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mb-2">
                                    <Flame size={20} />
                                </div>
                                <span className="text-2xl font-black text-slate-800">{stats.streakCount}</span>
                                <span className="text-xs font-bold text-slate-400">Kunlik Streak</span>
                            </div>
                        </div>

                        {/* Gamification Navigation Grid */}
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => navigate('/student/leaderboard')}
                                className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center gap-3 hover:bg-indigo-50 transition-colors group"
                            >
                                <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <Trophy size={24} />
                                </div>
                                <span className="font-bold text-sm text-slate-700">Peshqadamlar</span>
                            </button>
                            <button
                                onClick={() => navigate('/student/shop')}
                                className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center gap-3 hover:bg-emerald-50 transition-colors group"
                            >
                                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <ShoppingBag size={24} />
                                </div>
                                <span className="font-bold text-sm text-slate-700">Do'kon</span>
                            </button>
                            <button
                                onClick={() => navigate('/student/practice')}
                                className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center gap-3 hover:bg-blue-50 transition-colors group"
                            >
                                <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <BookOpen size={24} />
                                </div>
                                <span className="font-bold text-sm text-slate-700">Mashqlar</span>
                            </button>
                            <button
                                onClick={() => navigate('/student/duels')}
                                className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center gap-3 hover:bg-rose-50 transition-colors group"
                            >
                                <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <Swords size={24} />
                                </div>
                                <span className="font-bold text-sm text-slate-700">Duellar</span>
                            </button>
                        </div>

                        {/* Rank card moved below or integrated */}
                        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between px-6 relative overflow-hidden">
                            {stats.isHero && (
                                <div className="absolute top-0 right-0 bg-yellow-400 text-[10px] font-black px-3 py-1 rounded-bl-xl shadow-md uppercase tracking-tighter">
                                    Hafta Qahramoni 🎖️
                                </div>
                            )}
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 ${stats.hasTrophy ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-400'} rounded-2xl flex items-center justify-center`}>
                                    <Trophy size={28} className={stats.hasTrophy ? 'animate-bounce' : ''} />
                                </div>
                                <div>
                                    <h4 className="font-black text-slate-800">#{stats.rank}</h4>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Global O'rin</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-sm font-black text-emerald-600">{stats.gamesPlayed}</div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">O'yinlar</p>
                            </div>
                        </div>

                        {/* Telegram Banner */}
                        <a
                            href={`https://t.me/Z_education_bot?start=${user?.id}`}
                            target="_blank"
                            rel="noreferrer"
                            className="block bg-gradient-to-r from-sky-500 to-blue-600 rounded-2xl p-4 text-white shadow-lg shadow-sky-500/20 relative overflow-hidden"
                        >
                            <div className="relative z-10 flex items-center justify-between">
                                <div>
                                    <h3 className="font-bold text-sm">Botga ulanish</h3>
                                    <p className="text-xs text-sky-100 opacity-90">Natijalarni telefonda oling</p>
                                </div>
                                <div className="bg-white/20 p-2 rounded-full">
                                    <ChevronRight size={20} />
                                </div>
                            </div>
                            <div className="absolute -bottom-4 -right-4 w-20 h-20 bg-white/10 rounded-full blur-xl"></div>
                        </a>
                    </>
                )}

                {activeTab === 'history' && (
                    <div className="space-y-3 pb-20">
                        <h2 className="text-lg font-black text-slate-900 flex items-center gap-2 mb-4">
                            <History className="text-indigo-600" />
                            O'yinlar Tarixi
                        </h2>
                        {history.length > 0 ? (
                            history.map((game, idx) => (
                                <div key={idx} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
                                    <div>
                                        <h4 className="font-bold text-slate-800 text-sm mb-1">{game.quiz_title}</h4>
                                        <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
                                            <Calendar size={12} />
                                            {formatDate(game.created_at)}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-sm font-black text-indigo-600">+{game.score} XP</div>
                                        <div className="flex flex-col items-end gap-1 mt-1">
                                            <div className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${game.percentage > 59 ? 'bg-emerald-100 text-emerald-700' :
                                                'bg-red-100 text-red-700'
                                                }`}>
                                                {Math.round(game.percentage)}%
                                            </div>
                                            {game.total_questions > 0 && (
                                                <span className="text-[10px] font-bold text-slate-400">
                                                    {Math.round(game.score / 100)} / {game.total_questions}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-12 text-slate-400 bg-white rounded-3xl border border-slate-100">
                                <Gamepad2 size={48} className="mx-auto mb-3 opacity-20" />
                                <p>Hozircha o'yinlar yo'q</p>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'profile' && (
                    <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 text-center">
                        <div className="w-24 h-24 bg-gradient-to-tr from-indigo-500 to-purple-600 rounded-full mx-auto mb-4 flex items-center justify-center text-4xl font-black text-white shadow-xl shadow-indigo-500/30">
                            {user?.name?.charAt(0).toUpperCase()}
                        </div>
                        <h2 className="text-xl font-black text-slate-900 mb-1">{user?.name}</h2>
                        <p className="text-slate-500 font-medium mb-6">{user?.groupName}</p>

                        <div className="space-y-2">
                            <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                                <span className="text-sm font-bold text-slate-500">ID Raqam</span>
                                <span className="font-mono font-bold text-slate-900">{user?.id}</span>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                                <span className="text-sm font-bold text-slate-500">O'qituvchi</span>
                                <span className="font-bold text-slate-900">{user?.teacherName}</span>
                            </div>
                        </div>

                        <button
                            onClick={logout}
                            className="w-full mt-8 bg-red-50 text-red-600 font-bold py-3 rounded-xl hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
                        >
                            <LogOut size={18} /> Chiqish
                        </button>
                    </div>
                )}

            </main>

            {/* Bottom Navigation */}
            <div className="fixed bottom-0 left-0 w-full bg-white border-t border-slate-200 px-6 py-2 z-50 pb-safe md:pb-2">
                <div className="max-w-md mx-auto flex justify-between items-center">
                    <button
                        onClick={() => setActiveTab('home')}
                        className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${activeTab === 'home' ? 'text-indigo-600 -translate-y-2' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        <div className={`p-2 rounded-full ${activeTab === 'home' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : ''}`}>
                            <LayoutDashboard size={24} />
                        </div>
                        <span className="text-[10px] font-bold">Asosiy</span>
                    </button>

                    <button
                        onClick={() => setActiveTab('history')}
                        className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${activeTab === 'history' ? 'text-indigo-600 -translate-y-2' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        <div className={`p-2 rounded-full ${activeTab === 'history' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : ''}`}>
                            <History size={24} />
                        </div>
                        <span className="text-[10px] font-bold">Tarix</span>
                    </button>

                    <button
                        onClick={() => setActiveTab('profile')}
                        className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${activeTab === 'profile' ? 'text-indigo-600 -translate-y-2' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        <div className={`p-2 rounded-full ${activeTab === 'profile' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : ''}`}>
                            <UserCircle size={24} />
                        </div>
                        <span className="text-[10px] font-bold">Profil</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
