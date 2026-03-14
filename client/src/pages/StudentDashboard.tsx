import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { apiFetch } from '../api';
import { motion } from 'framer-motion';
import {
    LogOut, History, Calendar,
    Gamepad2, Zap,
    LayoutDashboard, UserCircle, ChevronRight,
    Trophy, ShoppingBag, Swords, BookOpen, Coins, Lock, Camera
} from 'lucide-react';
import imageCompression from 'browser-image-compression';
import logo from '../assets/logo.jpeg';

export default function StudentDashboard() {
    const { user, logout, setActiveThemeId } = useAuth();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'home' | 'history' | 'profile'>('home');
    const [stats, setStats] = useState(() => {
        const cached = localStorage.getItem(`stats_${user?.id}`);
        return cached ? JSON.parse(cached) : {
            gamesPlayed: 0,
            totalScore: 0,
            rank: 0,
            coins: 0,
            streakCount: 0,
            isHero: false,
            hasTrophy: false,
            weeklyBattleScore: 0,
            groupId: '',
            avatarUrl: null as string | null,
            hasAvatarUnlock: false
        };
    });
    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
    const [battle, setBattle] = useState<any>(() => {
        const cached = localStorage.getItem(`battle_${user?.id}`);
        return cached ? JSON.parse(cached) : null;
    });
    const [history, setHistory] = useState<any[]>([]);
    const [pin, setPin] = useState('');
    const [isLoading, setIsLoading] = useState(!localStorage.getItem(`stats_${user?.id}`));

    useEffect(() => {
        if (user?.id) {
            fetchData();
        }
    }, [user]);

    useEffect(() => {
        if (stats.active_theme_color) {
            setActiveThemeId(stats.active_theme_color);
        }
    }, [stats.active_theme_color, setActiveThemeId]);

    const fetchData = async () => {
        try {
            const statsRes = await apiFetch(`/api/student/${user?.id}/stats`);
            const statsData = await statsRes.json();
            setStats(statsData);
            localStorage.setItem(`stats_${user?.id}`, JSON.stringify(statsData));

            if (statsData.groupId) {
                const battleRes = await apiFetch(`/api/battles/current/${statsData.groupId}`);
                if (battleRes.ok) {
                    const battleData = await battleRes.json();
                    setBattle(battleData);
                    localStorage.setItem(`battle_${user?.id}`, JSON.stringify(battleData));
                }
            }

            const historyRes = await apiFetch(`/api/student/${user?.id}/history`);
            if (historyRes.ok) setHistory(await historyRes.json());
            setIsLoading(false);
        } catch (err) {
            console.error(err);
            setIsLoading(false);
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

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user?.id) return;

        try {
            setIsUploadingAvatar(true);
            const options = {
                maxSizeMB: 0.1, // 100KB limits
                maxWidthOrHeight: 400,
                useWebWorker: true,
                fileType: "image/jpeg"
            };

            const compressedBlob = await imageCompression(file, options);

            // Read as base64
            const reader = new FileReader();
            reader.readAsDataURL(compressedBlob);
            reader.onloadend = async () => {
                const base64data = reader.result;

                const res = await apiFetch(`/api/student/${user.id}/avatar`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ avatar_url: base64data })
                });

                if (res.ok) {
                    setStats((prev: any) => ({ ...prev, avatarUrl: base64data as string }));
                } else {
                    const errInfo = await res.json();
                    alert(errInfo.error || "Rasm joylashda xatolik yuz berdi");
                }
                setIsUploadingAvatar(false);
            };
        } catch (error) {
            console.error(error);
            alert("Rasmni qayta ishlashda xatolik!");
            setIsUploadingAvatar(false);
        }
    };

    return (
        <div className="min-h-screen font-sans pb-24 md:pb-12 relative overflow-hidden transition-colors duration-500" style={{ backgroundColor: 'var(--bg-color)' }}>
            {/* Background Gradients */}
            <div 
                className="absolute top-0 left-0 w-full h-full z-0 opacity-100 transition-colors duration-1000"
                style={{ background: `linear-gradient(to bottom, var(--bg-gradient-from, #f8fafc), var(--bg-gradient-to, transparent))` }}
            ></div>
            <div 
                className="absolute top-[-100px] right-[-100px] w-[500px] h-[500px] rounded-full blur-[120px] z-0 opacity-50"
                style={{ backgroundColor: 'var(--primary-color, #4f46e5)' }}
            ></div>
            <div 
                className="absolute top-[200px] left-[-100px] w-[400px] h-[400px] rounded-full blur-[100px] z-0 opacity-30"
                style={{ backgroundColor: 'var(--secondary-color, #3b82f6)' }}
            ></div>

            <div className="max-w-7xl mx-auto md:px-8 relative z-10">
                <div className="flex flex-col lg:grid lg:grid-cols-12 lg:gap-8 lg:pt-12">

                    {/* Left Column / Header Section (Mobile: Top, Laptop: Aside) */}
                    <header className="lg:col-span-4 px-6 pt-8 pb-6 text-white h-fit lg:sticky lg:top-8">
                <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border-2 border-white/30 shadow-lg overflow-hidden relative">
                            {stats.avatarUrl ? (
                                <img src={stats.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-2xl font-black">
                                    {user?.name?.charAt(0).toUpperCase()}
                                </span>
                            )}
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
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 shadow-xl min-h-[120px] mb-6">
                    {isLoading && !stats.totalScore ? (
                        <div className="animate-skeleton space-y-3">
                            <div className="flex justify-between items-end">
                                <div className="w-20 h-8 bg-white/20 rounded"></div>
                                <div className="w-16 h-8 bg-white/20 rounded"></div>
                            </div>
                            <div className="w-full bg-white/10 h-3 rounded-full"></div>
                        </div>
                    ) : (
                        <>
                            <div className="flex justify-between items-end mb-2">
                                <div>
                                    <span className="text-xs font-bold uppercase tracking-wider opacity-70">Daraja</span>
                                    <div className="text-3xl font-black flex items-center gap-2">
                                        {level} <span className="text-sm font-bold opacity-80 mt-2">Level</span>
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
                        </>
                    )}
                </div>

                {/* Group Battle Hero Card */}
                <div className="min-h-[160px]">
                    {isLoading && !battle ? (
                        <div className="w-full h-[160px] bg-white/5 backdrop-blur-md rounded-3xl animate-skeleton border border-white/10"></div>
                    ) : battle ? (
                        <motion.div
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => navigate(`/student/battle/${battle.id}`)}
                            className="relative group cursor-pointer"
                        >
                            {/* Glow effect behind the card */}
                            <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-rose-500 rounded-3xl blur opacity-30 group-hover:opacity-50 transition duration-500"></div>

                            <div className="relative bg-indigo-950/40 backdrop-blur-xl rounded-3xl p-5 border border-white/10 shadow-2xl overflow-hidden">
                                {/* Animated stripes background */}
                                <div className="absolute inset-0 opacity-10 bg-[linear-gradient(45deg,rgba(255,255,255,0.1)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.1)_50%,rgba(255,255,255,0.1)_75%,transparent_75%,transparent)] bg-[length:20px_20px] animate-shimmer pointer-events-none"></div>

                                <div className="flex justify-between items-center mb-4 relative z-10">
                                    <span className="flex items-center gap-2 bg-indigo-500/20 px-3 py-1 rounded-full border border-indigo-400/30">
                                        <Swords size={14} className="text-indigo-400 animate-bounce" />
                                        <span className="text-[10px] font-black text-indigo-100 uppercase tracking-widest">Haftalik Battle</span>
                                    </span>

                                    <div className="flex items-center gap-2">
                                        {isWeekend() && (
                                            <motion.span
                                                animate={{ scale: [1, 1.1, 1] }}
                                                transition={{ duration: 2, repeat: Infinity }}
                                                className="bg-orange-500 text-[9px] font-black px-2 py-0.5 rounded-full shadow-lg shadow-orange-500/30"
                                            >
                                                Double XP 🔥
                                            </motion.span>
                                        )}
                                        <div className="w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center">
                                            <ChevronRight size={14} className="text-white/50 group-hover:text-white transition-colors" />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between gap-4 mb-5 relative z-10">
                                    {/* Our Group */}
                                    <div className="flex-1 text-center">
                                        <h4 className="text-xs font-black text-white/90 uppercase tracking-tight truncate leading-tight mb-0.5">
                                            {battle.group_a_id === stats.groupId ? battle.group_a_name : battle.group_b_name}
                                        </h4>
                                        <p className="text-[8px] font-bold text-indigo-300/60 uppercase truncate">Sizning Guruhingiz</p>
                                        <div className="mt-2 text-xl font-black text-indigo-400 tabular-nums">
                                            {battle.group_a_id === stats.groupId ? battle.score_a.toLocaleString() : battle.score_b.toLocaleString()}
                                        </div>
                                    </div>

                                    {/* VS Icon */}
                                    <div className="flex flex-col items-center">
                                        <div className="w-10 h-10 rounded-full bg-slate-900 border border-white/10 flex items-center justify-center shadow-xl">
                                            <span className="text-xs font-black italic text-transparent bg-clip-text bg-gradient-to-tr from-indigo-400 to-rose-400">VS</span>
                                        </div>
                                    </div>

                                    {/* Opponent Group */}
                                    <div className="flex-1 text-center">
                                        <h4 className="text-xs font-black text-white/90 uppercase tracking-tight truncate leading-tight mb-0.5">
                                            {battle.group_a_id === stats.groupId ? battle.group_b_name : battle.group_a_name}
                                        </h4>
                                        <p className="text-[8px] font-bold text-rose-300/60 uppercase truncate">
                                            Ustoz: {battle.group_a_id === stats.groupId ? battle.teacher_b_name : battle.teacher_a_name}
                                        </p>
                                        <div className="mt-2 text-xl font-black text-rose-400 tabular-nums">
                                            {battle.group_a_id === stats.groupId ? battle.score_b.toLocaleString() : battle.score_a.toLocaleString()}
                                        </div>
                                    </div>
                                </div>

                                {/* Mini Power Meter */}
                                <div className="relative h-2.5 bg-black/40 rounded-full overflow-hidden flex border border-white/5">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${Math.round(((battle.group_a_id === stats.groupId ? battle.score_a : battle.score_b) / (battle.score_a + battle.score_b || 1)) * 100)}%` }}
                                        transition={{ duration: 1.5, ease: "circOut" }}
                                        className="h-full bg-gradient-to-r from-indigo-600 to-indigo-400"
                                    ></motion.div>
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${100 - Math.round(((battle.group_a_id === stats.groupId ? battle.score_a : battle.score_b) / (battle.score_a + battle.score_b || 1)) * 100)}%` }}
                                        transition={{ duration: 1.5, ease: "circOut" }}
                                        className="h-full bg-gradient-to-l from-rose-600 to-rose-400"
                                    ></motion.div>
                                    <div className="absolute top-0 bottom-0 w-0.5 bg-white/20 left-[50%] -translate-x-1/2"></div>
                                </div>
                            </div>
                        </motion.div>
                    ) : null}
                </div>
                    </header>

                    {/* Right Column / Main Content Area */}
                    <main className="lg:col-span-8 px-4 -mt-4 lg:mt-0 space-y-6">

                {activeTab === 'home' && (
                    <>
                        {/* Action Card: Join Game */}
                        <div className="rounded-3xl p-6 shadow-xl shadow-indigo-900/5 border relative overflow-hidden group transition-colors" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
                            <div className="absolute top-0 right-0 w-32 h-32 rounded-full -mr-10 -mt-10 group-hover:scale-150 transition-transform duration-500 opacity-20" style={{ backgroundColor: 'var(--primary-color)' }}></div>
                            <h2 className="text-lg font-black mb-4 relative z-10 flex items-center gap-2" style={{ color: 'var(--text-color)' }}>
                                Testga Kirish
                            </h2>
                            <form onSubmit={handleJoinGame} className="relative z-10">
                                <input
                                    type="text"
                                    placeholder="6 xonali PIN kiriting"
                                    value={pin}
                                    onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                    className="w-full border-2 rounded-xl px-4 py-3 font-mono text-lg font-bold text-center tracking-widest focus:outline-none transition-colors mb-3"
                                    style={{ backgroundColor: 'var(--bg-color)', borderColor: 'var(--border-color)', color: 'var(--text-color)' }}
                                />
                                <button type="submit" className="w-full text-white font-bold py-3.5 rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95" style={{ backgroundColor: 'var(--primary-color)', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}>
                                    <Zap size={20} className="fill-white" /> Boshlash
                                </button>
                            </form>
                        </div>

                        {/* Recent Stats Grid */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="p-4 rounded-2xl shadow-sm border flex flex-col justify-center items-center text-center transition-colors" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
                                <div className="w-10 h-10 rounded-full flex items-center justify-center mb-2" style={{ backgroundColor: 'var(--bg-color)', color: 'var(--primary-color)' }}>
                                    <Coins size={20} />
                                </div>
                                <span className="text-2xl font-black" style={{ color: 'var(--text-color)' }}>{stats.coins.toLocaleString()}</span>
                                <span className="text-xs font-bold opacity-60" style={{ color: 'var(--text-color)' }}>Tangalar</span>
                            </div>
                            <button
                                onClick={() => navigate('/student/vocab-battles')}
                                className="p-4 rounded-2xl shadow-sm border flex flex-col justify-center items-center text-center transition-colors group"
                                style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}
                            >
                                <div className="w-10 h-10 rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition-transform" style={{ backgroundColor: 'var(--bg-color)', color: 'var(--accent-color)' }}>
                                    <BookOpen size={20} />
                                </div>
                                <span className="text-lg font-black leading-none" style={{ color: 'var(--text-color)' }}>Vocab Battle</span>
                                <span className="text-[10px] font-bold uppercase mt-1 opacity-60" style={{ color: 'var(--text-color)' }}>O'ynash</span>
                            </button>
                        </div>

                        {/* Gamification Navigation Grid */}
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => navigate('/student/leaderboard')}
                                className="p-6 rounded-3xl shadow-sm border flex flex-col items-center gap-3 transition-colors group"
                                style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}
                            >
                                <div className="w-12 h-12 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform" style={{ backgroundColor: 'var(--bg-color)', color: 'var(--primary-color)' }}>
                                    <Trophy size={24} />
                                </div>
                                <span className="font-bold text-sm" style={{ color: 'var(--text-color)' }}>Peshqadamlar</span>
                            </button>
                            <button
                                onClick={() => navigate('/student/shop')}
                                className="p-6 rounded-3xl shadow-sm border flex flex-col items-center gap-3 transition-colors group"
                                style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}
                            >
                                <div className="w-12 h-12 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform" style={{ backgroundColor: 'var(--bg-color)', color: 'var(--emerald-500, #10b981)' }}>
                                    <ShoppingBag size={24} />
                                </div>
                                <span className="font-bold text-sm" style={{ color: 'var(--text-color)' }}>Do'kon</span>
                            </button>
                            <button
                                onClick={() => navigate('/student/practice')}
                                className="p-6 rounded-3xl shadow-sm border flex flex-col items-center gap-3 transition-colors group"
                                style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}
                            >
                                <div className="w-12 h-12 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform" style={{ backgroundColor: 'var(--bg-color)', color: 'var(--primary-color)' }}>
                                    <BookOpen size={24} />
                                </div>
                                <span className="font-bold text-sm" style={{ color: 'var(--text-color)' }}>Mashqlar</span>
                            </button>
                            <button
                                onClick={() => navigate('/student/duels')}
                                className="p-6 rounded-3xl shadow-sm border flex flex-col items-center gap-3 transition-colors group"
                                style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}
                            >
                                <div className="w-12 h-12 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform" style={{ backgroundColor: 'var(--bg-color)', color: 'var(--rose-500, #f43f5e)' }}>
                                    <Swords size={24} />
                                </div>
                                <span className="font-bold text-sm" style={{ color: 'var(--text-color)' }}>Duellar</span>
                            </button>
                        </div>

                        {/* Rank card moved below or integrated */}
                        <div className="p-4 rounded-2xl shadow-sm border flex items-center justify-between px-6 relative overflow-hidden transition-colors" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
                            {stats.isHero && (
                                <div className="absolute top-0 right-0 bg-yellow-400 text-slate-900 text-[10px] font-black px-3 py-1 rounded-bl-xl shadow-md uppercase tracking-tighter">
                                    Hafta Qahramoni 🎖️
                                </div>
                            )}
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 ${stats.hasTrophy ? 'bg-amber-100 text-amber-600' : 'bg-slate-100/50 text-slate-400'} rounded-2xl flex items-center justify-center`}>
                                    <Trophy size={28} className={stats.hasTrophy ? 'animate-bounce' : ''} />
                                </div>
                                <div>
                                    <h4 className="font-black" style={{ color: 'var(--text-color)' }}>#{stats.rank}</h4>
                                    <p className="text-[10px] font-bold uppercase tracking-widest opacity-50" style={{ color: 'var(--text-color)' }}>Global O'rin</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-sm font-black text-emerald-600">{stats.gamesPlayed}</div>
                                <p className="text-[10px] font-bold uppercase tracking-widest opacity-50" style={{ color: 'var(--text-color)' }}>O'yinlar</p>
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
                                <div key={idx} className="p-4 rounded-2xl border shadow-sm flex items-center justify-between transition-colors" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
                                    <div>
                                        <h4 className="font-bold text-sm mb-1" style={{ color: 'var(--text-color)' }}>{game.quiz_title}</h4>
                                        <div className="flex items-center gap-2 text-xs font-medium opacity-50" style={{ color: 'var(--text-color)' }}>
                                            <Calendar size={12} />
                                            {formatDate(game.created_at)}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-sm font-black" style={{ color: 'var(--primary-color)' }}>+{game.score} XP</div>
                                        <div className="flex flex-col items-end gap-1 mt-1">
                                            <div className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${game.percentage > 59 ? 'bg-emerald-100 text-emerald-700' :
                                                'bg-rose-100 text-rose-700'
                                                }`}>
                                                {Math.round(game.percentage)}%
                                            </div>
                                            {game.total_questions > 0 && (
                                                <span className="text-[10px] font-bold opacity-40" style={{ color: 'var(--text-color)' }}>
                                                    {Math.round(game.score)} / {game.total_questions}
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
                    <div className="rounded-3xl p-6 shadow-sm border text-center relative transition-colors" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
                        {/* Avatar Section */}
                        <div className="relative w-28 h-28 mx-auto mb-4 group inline-block">
                            <div className="w-28 h-28 rounded-[2.5rem] flex items-center justify-center text-4xl font-black text-white shadow-xl overflow-hidden relative border-4 transition-all" style={{ background: `linear-gradient(to tr, var(--primary-color), var(--secondary-color))`, borderColor: 'var(--card-bg)', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.2)' }}>
                                {stats.avatarUrl ? (
                                    <img src={stats.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                                ) : (
                                    <span>{user?.name?.charAt(0).toUpperCase()}</span>
                                )}

                                {/* Overlay for Upload or Lock */}
                                <div className={`absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer ${isUploadingAvatar ? 'opacity-100' : ''}`}>
                                    {isUploadingAvatar ? (
                                        <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    ) : stats.hasAvatarUnlock ? (
                                        <label className="cursor-pointer w-full h-full flex flex-col items-center justify-center text-white">
                                            <Camera size={24} className="mb-1" />
                                            <span className="text-[10px] font-black uppercase">O'zgartirish</span>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={handleAvatarUpload}
                                                disabled={isUploadingAvatar}
                                            />
                                        </label>
                                    ) : (
                                        <div
                                            className="w-full h-full flex flex-col items-center justify-center text-white cursor-pointer"
                                            onClick={() => navigate('/student/shop')}
                                        >
                                            <Lock size={24} className="mb-1 text-rose-400" />
                                            <span className="text-[10px] font-black uppercase text-center px-2 leading-tight">Do'kondan <br /> Oling</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <h2 className="text-xl font-black mb-1" style={{ color: 'var(--text-color)' }}>{user?.name}</h2>
                        <p className="font-medium mb-6 opacity-60" style={{ color: 'var(--text-color)' }}>{user?.groupName}</p>

                        <div className="space-y-2">
                            <div className="flex justify-between items-center p-3 rounded-xl transition-colors" style={{ backgroundColor: 'var(--bg-color)' }}>
                                <span className="text-sm font-bold opacity-50" style={{ color: 'var(--text-color)' }}>ID Raqam</span>
                                <span className="font-mono font-bold" style={{ color: 'var(--text-color)' }}>{user?.id}</span>
                            </div>
                            <div className="flex justify-between items-center p-3 rounded-xl transition-colors" style={{ backgroundColor: 'var(--bg-color)' }}>
                                <span className="text-sm font-bold opacity-50" style={{ color: 'var(--text-color)' }}>O'qituvchi</span>
                                <span className="font-bold" style={{ color: 'var(--text-color)' }}>{user?.teacherName}</span>
                            </div>
                        </div>

                        <button
                            onClick={logout}
                            className="w-full mt-8 bg-rose-500/10 text-rose-500 font-bold py-3 rounded-xl hover:bg-rose-500/20 transition-colors flex items-center justify-center gap-2"
                        >
                            <LogOut size={18} /> Chiqish
                        </button>
                    </div>
                )}
                    </main>
                </div>
            </div>

            {/* Bottom Navigation (Mobile Only) */}
            <div className="fixed bottom-0 left-0 w-full border-t px-6 py-2 z-50 pb-safe md:hidden transition-colors duration-500" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>
                <div className="max-w-md mx-auto flex justify-between items-center">
                    <button
                        onClick={() => setActiveTab('home')}
                        className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${activeTab === 'home' ? '-translate-y-2' : 'opacity-40 hover:opacity-100'}`}
                        style={{ color: activeTab === 'home' ? 'var(--primary-color)' : 'var(--text-color)' }}
                    >
                        <div className={`p-2 rounded-full transition-all ${activeTab === 'home' ? 'text-white shadow-lg' : ''}`} style={{ backgroundColor: activeTab === 'home' ? 'var(--primary-color)' : 'transparent', boxShadow: activeTab === 'home' ? '0 10px 15px -3px rgba(0,0,0,0.1)' : 'none' }}>
                            <LayoutDashboard size={24} />
                        </div>
                        <span className="text-[10px] font-bold">Asosiy</span>
                    </button>

                    <button
                        onClick={() => setActiveTab('history')}
                        className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${activeTab === 'history' ? '-translate-y-2' : 'opacity-40 hover:opacity-100'}`}
                        style={{ color: activeTab === 'history' ? 'var(--primary-color)' : 'var(--text-color)' }}
                    >
                        <div className={`p-2 rounded-full transition-all ${activeTab === 'history' ? 'text-white shadow-lg' : ''}`} style={{ backgroundColor: activeTab === 'history' ? 'var(--primary-color)' : 'transparent', boxShadow: activeTab === 'history' ? '0 10px 15px -3px rgba(0,0,0,0.1)' : 'none' }}>
                            <History size={24} />
                        </div>
                        <span className="text-[10px] font-bold">Tarix</span>
                    </button>

                    <button
                        onClick={() => setActiveTab('profile')}
                        className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${activeTab === 'profile' ? '-translate-y-2' : 'opacity-40 hover:opacity-100'}`}
                        style={{ color: activeTab === 'profile' ? 'var(--primary-color)' : 'var(--text-color)' }}
                    >
                        <div className={`p-2 rounded-full transition-all ${activeTab === 'profile' ? 'text-white shadow-lg' : ''}`} style={{ backgroundColor: activeTab === 'profile' ? 'var(--primary-color)' : 'transparent', boxShadow: activeTab === 'profile' ? '0 10px 15px -3px rgba(0,0,0,0.1)' : 'none' }}>
                            <UserCircle size={24} />
                        </div>
                        <span className="text-[10px] font-bold">Profil</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
