import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiFetch } from '../api';
import {
    ChevronLeft, Swords, Trophy, Timer,
    Flame, ShieldAlert,
    TrendingUp, Award
} from 'lucide-react';


export default function BattleDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [battle, setBattle] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [timeLeft, setTimeLeft] = useState('');

    useEffect(() => {
        fetchDetails();
    }, [id]);

    useEffect(() => {
        if (!battle?.endsAt) return;

        const updateTimer = () => {
            const ends = new Date(battle.endsAt).getTime();
            const now = new Date().getTime();
            const diff = ends - now;

            if (diff <= 0) {
                setTimeLeft('Tugadi');
                return false;
            }

            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);

            setTimeLeft(`${days}k ${hours}s ${minutes}d ${seconds}s`);
            return true;
        };

        updateTimer();
        const timer = setInterval(updateTimer, 1000);

        return () => clearInterval(timer);
    }, [battle]);

    const fetchDetails = async () => {
        try {
            const res = await apiFetch(`/api/battles/${id}/details`);
            if (res.ok) {
                const data = await res.json();
                setBattle(data);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center">
            <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
        </div>
    );

    if (!battle) return (
        <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 text-center">
            <ShieldAlert size={64} className="text-rose-500 mb-4" />
            <h1 className="text-2xl font-black mb-2">Battle topilmadi</h1>
            <button onClick={() => navigate(-1)} className="text-indigo-400 font-bold">Orqaga qaytish</button>
        </div>
    );

    // Since we don't have user.groupId easily here without fetch, we check name or just use the IDs

    const scoreTotal = battle.score_a + battle.score_b || 1;
    const percentA = Math.round((battle.score_a / scoreTotal) * 100);
    const percentB = 100 - percentA;

    return (
        <div className="min-h-screen bg-slate-950 text-white font-sans pb-10">
            {/* Header */}
            <div className="relative h-64 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-indigo-600/30 to-slate-950 z-0"></div>
                <div className="absolute top-[-50px] left-[-50px] w-64 h-64 bg-indigo-600 rounded-full blur-[100px] opacity-20"></div>

                <div className="relative z-10 p-6 flex items-center justify-between">
                    <button
                        onClick={() => navigate(-1)}
                        className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/10"
                    >
                        <ChevronLeft />
                    </button>
                    <div className="flex items-center gap-2 bg-indigo-500/20 backdrop-blur-md px-4 py-2 rounded-full border border-indigo-500/30">
                        <Timer size={16} className="text-indigo-400" />
                        <span className="text-sm font-black tracking-wider">{timeLeft}</span>
                    </div>
                </div>

                <div className="relative z-10 text-center mt-4">
                    <div className="inline-flex items-center gap-2 bg-rose-600 text-white px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest mb-2 shadow-lg shadow-rose-600/30">
                        <Swords size={14} /> Haftalik Battle
                    </div>
                </div>
            </div>

            {/* Battle Arena */}
            <div className="px-4 md:px-6 -mt-16 relative z-20">
                <div className="bg-slate-900/80 backdrop-blur-xl rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-8 border border-white/5 shadow-2xl relative overflow-hidden">
                    {/* VS Elements */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-0 opacity-10 pointer-events-none hidden md:block">
                        <span className="text-9xl font-black italic tracking-tighter">VS</span>
                    </div>

                    <div className="flex flex-row justify-between items-center relative z-10 gap-2 md:gap-4 mb-8 md:mb-10">
                        {/* Group A */}
                        <div className="flex-1 text-center">
                            <div className="w-14 h-14 md:w-20 md:h-20 bg-gradient-to-tr from-indigo-500 to-blue-600 rounded-2xl md:rounded-3xl mx-auto mb-3 md:mb-4 flex items-center justify-center shadow-lg shadow-indigo-500/30 rotate-3 transition-transform hover:rotate-6">
                                <ShieldAlert size={28} className="text-white md:hidden" />
                                <ShieldAlert size={36} className="text-white hidden md:block" />
                            </div>
                            <h3 className="font-black text-[10px] md:text-sm uppercase tracking-tight mb-1 truncate max-w-[80px] md:max-w-none mx-auto">{battle.group_a_name}</h3>
                            <div className="text-lg md:text-2xl font-black text-indigo-400">{battle.score_a.toLocaleString()}</div>
                        </div>

                        {/* VS Divider */}
                        <div className="w-10 h-10 md:w-14 md:h-14 bg-slate-950 rounded-full flex items-center justify-center border-2 border-slate-800 shadow-xl relative shrink-0">
                            <span className="text-sm md:text-xl font-black italic text-rose-500">VS</span>
                            <div className="absolute -top-0.5 -right-0.5 w-3 h-3 md:w-4 md:h-4 bg-rose-500 rounded-full blur-sm opacity-50 animate-pulse"></div>
                        </div>

                        {/* Group B */}
                        <div className="flex-1 text-center">
                            <div className="w-14 h-14 md:w-20 md:h-20 bg-gradient-to-tr from-rose-500 to-orange-600 rounded-2xl md:rounded-3xl mx-auto mb-3 md:mb-4 flex items-center justify-center shadow-lg shadow-rose-500/30 -rotate-3 transition-transform hover:-rotate-6">
                                <Flame size={28} className="text-white md:hidden" />
                                <Flame size={36} className="text-white hidden md:block" />
                            </div>
                            <h3 className="font-black text-[10px] md:text-sm uppercase tracking-tight mb-1 truncate max-w-[80px] md:max-w-none mx-auto">{battle.group_b_name}</h3>
                            <div className="text-lg md:text-2xl font-black text-rose-400">{battle.score_b.toLocaleString()}</div>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="relative h-6 bg-slate-950 rounded-full overflow-hidden flex border border-white/5 shadow-inner mb-2">
                        <div
                            className="h-full bg-gradient-to-r from-indigo-600 to-indigo-400 transition-all duration-1000 ease-out relative"
                            style={{ width: `${percentA}%` }}
                        >
                            <div className="absolute inset-0 opacity-30 bg-[linear-gradient(45deg,rgba(255,255,255,0.2)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.2)_50%,rgba(255,255,255,0.2)_75%,transparent_75%,transparent)] bg-[length:20px_20px] animate-shimmer"></div>
                        </div>
                        <div
                            className="h-full bg-gradient-to-l from-rose-600 to-rose-400 transition-all duration-1000 ease-out relative"
                            style={{ width: `${percentB}%` }}
                        >
                            <div className="absolute inset-0 opacity-20 bg-[linear-gradient(-45deg,rgba(255,255,255,0.2)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.2)_50%,rgba(255,255,255,0.2)_75%,transparent_75%,transparent)] bg-[length:20px_20px] animate-shimmer"></div>
                        </div>
                        {/* Middle Pointer */}
                        <div className="absolute top-0 bottom-0 w-1 bg-white/20 left-[50%] -translate-x-1/2"></div>
                    </div>
                    <div className="flex justify-between text-[10px] font-black uppercase text-slate-500 tracking-widest">
                        <span>{percentA}% Power</span>
                        <span>{percentB}% Power</span>
                    </div>
                </div>

                {/* Leaderboards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mt-6 md:mt-8">
                    {/* Top Contributors Group A */}
                    <div className="bg-slate-900/50 rounded-3xl p-5 md:p-6 border border-white/5">
                        <h3 className="text-indigo-400 font-black text-[10px] md:text-xs uppercase tracking-widest mb-4 flex items-center gap-2">
                            <TrendingUp size={14} /> {battle.group_a_name} Top-3
                        </h3>
                        <div className="space-y-2.5 md:space-y-3">
                            {battle.membersA.map((m: any, idx: number) => (
                                <div key={idx} className="flex items-center justify-between bg-white/5 p-3 rounded-2xl border border-white/5 group hover:bg-indigo-500/10 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center font-black text-indigo-400 text-[10px] md:text-xs">
                                            {idx + 1}
                                        </div>
                                        <div>
                                            <div className="text-xs md:text-sm font-bold truncate max-w-[100px] md:max-w-[120px] text-indigo-100">{m.name}</div>
                                            <div className="text-[10px] text-indigo-400 font-bold uppercase">{m.coins} Coins</div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xs md:text-sm font-black text-indigo-400">+{m.weekly_battle_score}</div>
                                        <div className="text-[10px] font-bold text-slate-500 italic">XP</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Top Contributors Group B */}
                    <div className="bg-slate-900/50 rounded-3xl p-5 md:p-6 border border-white/5">
                        <h3 className="text-rose-400 font-black text-[10px] md:text-xs uppercase tracking-widest mb-4 flex items-center gap-2">
                            <TrendingUp size={14} /> {battle.group_b_name} Top-3
                        </h3>
                        <div className="space-y-2.5 md:space-y-3">
                            {battle.membersB.map((m: any, idx: number) => (
                                <div key={idx} className="flex items-center justify-between bg-white/5 p-3 rounded-2xl border border-white/5 group hover:bg-rose-500/10 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-rose-500/20 flex items-center justify-center font-black text-rose-400 text-[10px] md:text-xs">
                                            {idx + 1}
                                        </div>
                                        <div>
                                            <div className="text-xs md:text-sm font-bold truncate max-w-[100px] md:max-w-[120px] text-rose-100">{m.name}</div>
                                            <div className="text-[10px] text-rose-400 font-bold uppercase">{m.coins} Coins</div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xs md:text-sm font-black text-rose-400">+{m.weekly_battle_score}</div>
                                        <div className="text-[10px] font-bold text-slate-500 italic">XP</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Reward Section */}
                <div className="mt-6 md:mt-8 bg-gradient-to-tr from-amber-500/10 to-orange-500/10 rounded-3xl p-5 md:p-6 border border-amber-500/20 relative overflow-hidden">
                    <div className="relative z-10 flex items-center gap-4 md:gap-6">
                        <div className="w-14 h-14 md:w-16 md:h-16 bg-amber-500/20 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/10 shrink-0">
                            <Trophy size={28} className="text-amber-500 md:hidden" />
                            <Trophy size={32} className="text-amber-500 hidden md:block" />
                        </div>
                        <div>
                            <h3 className="font-black text-base md:text-lg text-amber-500 leading-tight">G'oliblik Mukofoti</h3>
                            <p className="text-[10px] md:text-xs text-amber-500/80 font-medium">Har bir g'olib o'quvchi +500 Coins va maxsus "Champion" avatariga ega bo'ladi!</p>
                        </div>
                    </div>
                    <div className="absolute top-0 right-0 p-2 opacity-20 md:opacity-100">
                        <Award size={32} className="text-amber-500 rotate-12 md:hidden" />
                        <Award size={48} className="text-amber-500 rotate-12 hidden md:block" />
                    </div>
                </div>
            </div>
        </div>
    );
}
