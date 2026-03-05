import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiFetch } from '../api';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ChevronLeft, Swords, Trophy, Timer,
    Flame, ShieldAlert,
    TrendingUp, Award, Sparkles, Zap, Target
} from 'lucide-react';

export default function BattleDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [battle, setBattle] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [timeLeft, setTimeLeft] = useState('');
    const arenaRef = useRef<HTMLDivElement>(null);

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
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center">
            <motion.div
                animate={{ rotate: 360, scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className="w-16 h-16 border-t-4 border-indigo-500 rounded-full shadow-[0_0_20px_rgba(99,102,241,0.5)] mb-4"
            />
            <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-indigo-400 font-black tracking-widest uppercase text-xs"
            >
                Arena yuklanmoqda...
            </motion.p>
        </div>
    );

    if (!battle) return (
        <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center">
            <ShieldAlert size={64} className="text-rose-500 mb-4" />
            <h1 className="text-2xl font-black mb-2">Battle topilmadi</h1>
            <button onClick={() => navigate(-1)} className="text-indigo-400 font-bold">Orqaga qaytish</button>
        </div>
    );

    const scoreTotal = battle.score_a + battle.score_b || 1;
    let percentA = Number(((battle.score_a / scoreTotal) * 100).toFixed(1));
    let percentB = Number((100 - percentA).toFixed(1));

    if (battle.score_a === 0 && battle.score_b === 0) {
        percentA = 50;
        percentB = 50;
    }

    return (
        <div className="min-h-screen bg-slate-950 text-white font-sans pb-20 relative overflow-hidden">
            {/* Animated Background Elements */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
                <motion.div
                    animate={{ x: [0, 50, 0], y: [0, 30, 0] }}
                    transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                    className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/10 rounded-full blur-[120px]"
                />
                <motion.div
                    animate={{ x: [0, -40, 0], y: [0, 60, 0] }}
                    transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
                    className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-rose-600/10 rounded-full blur-[120px]"
                />
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 mix-blend-overlay"></div>
            </div>

            {/* Header Section */}
            <div className="relative z-10 p-6 md:p-8 flex items-center justify-between pointer-events-auto">
                <motion.button
                    whileHover={{ scale: 1.1, x: -2 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => navigate(-1)}
                    className="w-12 h-12 bg-white/5 backdrop-blur-xl rounded-2xl flex items-center justify-center border border-white/10 shadow-xl"
                >
                    <ChevronLeft className="text-white" />
                </motion.button>

                <div className="flex flex-col items-center">
                    <motion.div
                        initial={{ y: -20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        className="bg-indigo-500/10 backdrop-blur-md px-5 py-2.5 rounded-2xl border border-indigo-500/30 flex items-center gap-2 shadow-inner"
                    >
                        <Timer size={18} className="text-indigo-400 animate-pulse" />
                        <span className="text-sm font-black tracking-widest text-indigo-100 italic">{timeLeft}</span>
                    </motion.div>
                </div>

                <div className="w-12 h-12" /> {/* Spacer */}
            </div>

            <main className="relative z-10 px-4 md:px-8 max-w-6xl mx-auto">
                <div className="text-center mb-10">
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="inline-flex items-center gap-3 bg-gradient-to-r from-rose-600 to-rose-500 px-6 py-2.5 rounded-full shadow-[0_0_20px_rgba(225,29,72,0.4)] mb-4"
                    >
                        <Swords size={20} className="text-white animate-bounce" />
                        <span className="text-sm font-black uppercase tracking-[0.2em]">Haftalik Battle</span>
                    </motion.div>
                    <motion.h1
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.1 }}
                        className="text-4xl md:text-6xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-white/30"
                    >
                        GLORY ARENA
                    </motion.h1>
                </div>

                {/* Main Battle Card */}
                <motion.div
                    ref={arenaRef}
                    initial={{ y: 50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.6, type: "spring" }}
                    className="relative group perspective-1000"
                >
                    {/* Glow behind card */}
                    <div className="absolute -inset-1 bg-gradient-to-r from-indigo-600 to-rose-600 rounded-[3rem] blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>

                    <div className="relative bg-slate-900/60 backdrop-blur-3xl rounded-[3rem] p-8 md:p-12 border border-white/10 shadow-2xl overflow-hidden transform-gpu transition-all duration-500">
                        {/* Shimmer Effect */}
                        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 pointer-events-none" />

                        <div className="flex flex-col md:flex-row justify-between items-center gap-12 relative z-10">
                            {/* Team A */}
                            <motion.div
                                whileHover={{ scale: 1.05, y: -5 }}
                                className="flex-1 text-center"
                            >
                                <div className="relative mb-6 inline-block">
                                    <div className="absolute inset-0 bg-indigo-500 rounded-[2rem] blur-xl opacity-30 animate-pulse" />
                                    <div className="w-24 h-24 md:w-32 md:h-32 bg-gradient-to-br from-indigo-500 to-blue-700 rounded-[2.5rem] flex items-center justify-center shadow-2xl border-2 border-white/20 relative z-10 transform rotate-3">
                                        <ShieldAlert size={48} className="text-white" />
                                    </div>
                                    <motion.div
                                        animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                                        transition={{ duration: 2, repeat: Infinity }}
                                        className="absolute -top-4 -left-4"
                                    >
                                        <Zap size={24} className="text-indigo-400 fill-indigo-400" />
                                    </motion.div>
                                </div>
                                <h2 className="text-base md:text-xl font-black uppercase tracking-widest text-white/90 mb-2 truncate">{battle.group_a_name}</h2>
                                <motion.span
                                    className="text-4xl md:text-6xl font-black text-indigo-400 tabular-nums drop-shadow-[0_0_10px_rgba(99,102,241,0.5)]"
                                >
                                    {battle.score_a.toLocaleString()}
                                </motion.span>
                            </motion.div>

                            {/* VS Divider */}
                            <div className="flex flex-col items-center gap-2">
                                <motion.div
                                    animate={{
                                        scale: [1, 1.1, 1],
                                        rotate: [0, 5, -5, 0]
                                    }}
                                    transition={{ duration: 3, repeat: Infinity }}
                                    className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-slate-950 flex items-center justify-center border-4 border-white/5 shadow-[0_0_40px_rgba(0,0,0,0.5)] relative"
                                >
                                    <span className="text-3xl md:text-4xl font-black italic bg-clip-text text-transparent bg-gradient-to-tr from-rose-500 to-indigo-500">VS</span>
                                    <div className="absolute inset-0 rounded-full border border-white/10 animate-ping opacity-20" />
                                </motion.div>
                                <motion.div
                                    animate={{ opacity: [0.3, 0.7, 0.3] }}
                                    transition={{ duration: 1.5, repeat: Infinity }}
                                    className="flex items-center gap-1 text-white/30 text-[10px] font-black tracking-widest uppercase"
                                >
                                    <Sparkles size={10} /> Live Power <Sparkles size={10} />
                                </motion.div>
                            </div>

                            {/* Team B */}
                            <motion.div
                                whileHover={{ scale: 1.05, y: -5 }}
                                className="flex-1 text-center"
                            >
                                <div className="relative mb-6 inline-block">
                                    <div className="absolute inset-0 bg-rose-500 rounded-[2rem] blur-xl opacity-30 animate-pulse" />
                                    <div className="w-24 h-24 md:w-32 md:h-32 bg-gradient-to-br from-rose-500 to-orange-600 rounded-[2.5rem] flex items-center justify-center shadow-2xl border-2 border-white/20 relative z-10 transform -rotate-3">
                                        <Flame size={48} className="text-white" />
                                    </div>
                                    <motion.div
                                        animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                                        transition={{ duration: 2, repeat: Infinity, delay: 1 }}
                                        className="absolute -top-4 -right-4"
                                    >
                                        <Target size={24} className="text-rose-400 fill-rose-400" />
                                    </motion.div>
                                </div>
                                <h2 className="text-base md:text-xl font-black uppercase tracking-widest text-white/90 mb-2 truncate">{battle.group_b_name}</h2>
                                <motion.span
                                    className="text-4xl md:text-6xl font-black text-rose-400 tabular-nums drop-shadow-[0_0_10px_rgba(244,63,94,0.5)]"
                                >
                                    {battle.score_b.toLocaleString()}
                                </motion.span>
                            </motion.div>
                        </div>

                        {/* Power Meter */}
                        <div className="mt-12 md:mt-16 relative">
                            <div className="relative h-10 md:h-12 bg-slate-950/80 rounded-[1.5rem] p-1.5 flex border border-white/5 shadow-inner overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${percentA}%` }}
                                    transition={{ duration: 1.5, delay: 0.5, ease: "circOut" }}
                                    className="h-full bg-gradient-to-r from-indigo-700 via-indigo-500 to-indigo-400 rounded-l-[1rem] relative overflow-hidden"
                                >
                                    <div className="absolute inset-0 opacity-20 bg-[linear-gradient(45deg,rgba(255,255,255,0.3)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.3)_50%,rgba(255,255,255,0.3)_75%,transparent_75%,transparent)] bg-[length:30px_30px] animate-shimmer"></div>
                                </motion.div>
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${percentB}%` }}
                                    transition={{ duration: 1.5, delay: 0.5, ease: "circOut" }}
                                    className="h-full bg-gradient-to-l from-rose-700 via-rose-500 to-rose-400 rounded-r-[1rem] relative overflow-hidden"
                                >
                                    <div className="absolute inset-0 opacity-20 bg-[linear-gradient(-45deg,rgba(255,255,255,0.3)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.3)_50%,rgba(255,255,255,0.3)_75%,transparent_75%,transparent)] bg-[length:30px_30px] animate-shimmer"></div>
                                </motion.div>

                                {/* Energy Center Pulse */}
                                <div className="absolute top-0 bottom-0 w-2 bg-white/40 left-[50%] -translate-x-1/2 blur-sm z-20"></div>
                            </div>

                            <div className="flex justify-between items-center mt-4 px-2">
                                <motion.div
                                    animate={{ x: [-2, 2, -2] }}
                                    transition={{ duration: 2, repeat: Infinity }}
                                    className="flex items-center gap-2 text-indigo-400 font-black italic tracking-wider text-sm"
                                >
                                    <Flame size={20} className="fill-indigo-500/50" />
                                    <span>{percentA}% POWER</span>
                                </motion.div>
                                <motion.div
                                    animate={{ x: [2, -2, 2] }}
                                    transition={{ duration: 2, repeat: Infinity }}
                                    className="flex items-center gap-2 text-rose-400 font-black italic tracking-wider text-sm"
                                >
                                    <span>{percentB}% POWER</span>
                                    <Flame size={20} className="fill-rose-500/50" />
                                </motion.div>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Contributors Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10 mt-12 md:mt-20 relative">
                    {/* Team A Contributors */}
                    <div className="space-y-6">
                        <div className="flex items-center justify-between px-2">
                            <h3 className="text-indigo-400 font-black text-xs md:text-sm uppercase tracking-[0.3em] flex items-center gap-2">
                                <TrendingUp size={18} /> {battle.group_a_name} LEGENDS
                            </h3>
                            <span className="h-[2px] w-12 bg-indigo-500/30"></span>
                        </div>
                        <div className="space-y-4">
                            <AnimatePresence>
                                {battle.membersA.map((m: any, idx: number) => (
                                    <motion.div
                                        key={idx}
                                        initial={{ x: -30, opacity: 0 }}
                                        animate={{ x: 0, opacity: 1 }}
                                        transition={{ delay: 0.1 * idx }}
                                        whileHover={{ scale: 1.02, x: 5 }}
                                        className="flex items-center justify-between bg-white/5 backdrop-blur-md p-4 rounded-3xl border border-white/10 group hover:border-indigo-500/40 hover:bg-indigo-500/10 transition-all duration-300 shadow-xl"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center font-black text-indigo-400 text-sm shadow-inner group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                                {idx + 1}
                                            </div>
                                            <div>
                                                <div className="text-sm md:text-base font-black text-white group-hover:text-indigo-200 transition-colors uppercase tracking-tight">{m.name}</div>
                                                <div className="text-[10px] text-indigo-400/80 font-black uppercase flex items-center gap-1">
                                                    <Zap size={10} className="fill-indigo-400" /> {m.coins} COINS
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-sm md:text-lg font-black text-indigo-400 tracking-tighter">+{m.weekly_battle_score}</div>
                                            <div className="text-[9px] font-black text-slate-500 tracking-[0.2em] uppercase">Score</div>
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    </div>

                    {/* Team B Contributors */}
                    <div className="space-y-6">
                        <div className="flex items-center justify-between px-2">
                            <h3 className="text-rose-400 font-black text-xs md:text-sm uppercase tracking-[0.3em] flex items-center gap-2">
                                <TrendingUp size={18} /> {battle.group_b_name} LEGENDS
                            </h3>
                            <span className="h-[2px] w-12 bg-rose-500/30"></span>
                        </div>
                        <div className="space-y-4">
                            <AnimatePresence>
                                {battle.membersB.map((m: any, idx: number) => (
                                    <motion.div
                                        key={idx}
                                        initial={{ x: 30, opacity: 0 }}
                                        animate={{ x: 0, opacity: 1 }}
                                        transition={{ delay: 0.1 * idx }}
                                        whileHover={{ scale: 1.02, x: -5 }}
                                        className="flex items-center justify-between bg-white/5 backdrop-blur-md p-4 rounded-3xl border border-white/10 group hover:border-rose-500/40 hover:bg-rose-500/10 transition-all duration-300 shadow-xl"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-2xl bg-rose-600/20 border border-rose-500/30 flex items-center justify-center font-black text-rose-400 text-sm shadow-inner group-hover:bg-rose-600 group-hover:text-white transition-all">
                                                {idx + 1}
                                            </div>
                                            <div>
                                                <div className="text-sm md:text-base font-black text-white group-hover:text-rose-200 transition-colors uppercase tracking-tight">{m.name}</div>
                                                <div className="text-[10px] text-rose-400/80 font-black uppercase flex items-center gap-1">
                                                    <Zap size={10} className="fill-rose-400" /> {m.coins} COINS
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-sm md:text-lg font-black text-rose-400 tracking-tighter">+{m.weekly_battle_score}</div>
                                            <div className="text-[9px] font-black text-slate-500 tracking-[0.2em] uppercase">Score</div>
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>

                {/* Ultimate Rewards Card */}
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    whileInView={{ scale: 1, opacity: 1 }}
                    viewport={{ once: true }}
                    className="mt-20 bg-gradient-to-tr from-amber-600/20 via-orange-500/10 to-transparent rounded-[3rem] p-8 md:p-12 border border-amber-500/30 relative overflow-hidden group mb-10"
                >
                    <div className="absolute top-0 right-0 p-8 transform translate-x-1/4 -translate-y-1/4 opacity-10 group-hover:opacity-30 transition-opacity duration-1000 rotate-12">
                        <Trophy size={200} className="text-amber-500" />
                    </div>

                    <div className="relative z-10 flex flex-col md:flex-row items-center gap-8 md:gap-12 text-center md:text-left">
                        <motion.div
                            whileHover={{ rotate: [0, 10, -10, 0] }}
                            className="w-24 h-24 md:w-28 md:h-28 bg-amber-500/20 rounded-[2rem] flex items-center justify-center shadow-[0_0_50px_rgba(245,158,11,0.3)] border-2 border-amber-500/40"
                        >
                            <Trophy size={56} className="text-amber-500 drop-shadow-[0_0_10px_rgba(245,158,11,0.5)]" />
                        </motion.div>
                        <div className="flex-1">
                            <h3 className="font-black text-2xl md:text-3xl text-amber-500 uppercase italic tracking-tighter mb-3 leading-tight">VICTORY REWARDS</h3>
                            <p className="text-sm md:text-lg text-amber-100/80 font-medium leading-relaxed">
                                G'olib guruhning barcha faol o'quvchilari <span className="text-white font-black underline decoration-amber-500">+500 COINS</span>,
                                maxsus "CHAMPION" unvoni va profil uchun oltin hoshiyaga ega bo'ladilar!
                            </p>
                        </div>
                        <motion.button
                            whileHover={{ scale: 1.1, backgroundColor: "rgba(245,158,11, 1)" }}
                            whileTap={{ scale: 0.95 }}
                            className="bg-amber-500 text-slate-950 font-black px-8 py-4 rounded-2xl text-sm uppercase tracking-[0.2em] shadow-2xl shadow-amber-500/20"
                        >
                            <Award className="inline mr-2" /> Batafsil
                        </motion.button>
                    </div>
                </motion.div>
            </main>
        </div>
    );
}
