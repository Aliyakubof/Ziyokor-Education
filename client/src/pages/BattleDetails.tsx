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
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

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
        <div className="min-h-screen flex flex-col items-center justify-center transition-colors" style={{ backgroundColor: 'var(--bg-color)' }}>
            <motion.div
                animate={{ rotate: 360, scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className="w-16 h-16 border-t-4 border-indigo-500 rounded-full shadow-[0_0_20px_rgba(99,102,241,0.5)] mb-4"
            />
            <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-indigo-400 font-black tracking-widest uppercase text-[10px] md:text-xs"
            >
                Arena yuklanmoqda...
            </motion.p>
        </div>
    );

    if (!battle) return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center transition-colors" style={{ backgroundColor: 'var(--bg-color)' }}>
            <ShieldAlert size={64} className="text-rose-500 mb-4" />
            <h1 className="text-2xl font-black mb-2">Battle topilmadi</h1>
            <button onClick={() => navigate(-1)} className="text-indigo-400 font-bold">Orqaga qaytish</button>
        </div>
    );

    const scoreA = battle.score_a ?? 0;
    const scoreB = battle.score_b ?? 0;
    const scoreTotal = scoreA + scoreB || 1;
    let percentA = Number(((scoreA / scoreTotal) * 100).toFixed(1));
    let percentB = Number((100 - percentA).toFixed(1));

    if (battle.score_a === 0 && battle.score_b === 0) {
        percentA = 50;
        percentB = 50;
    }

    return (
        <div className="min-h-screen font-sans pb-20 relative overflow-hidden transition-colors duration-500" style={{ backgroundColor: 'var(--bg-color)', color: 'var(--text-color)' }}>
            {/* Animated Background Elements */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 transition-opacity duration-1000">
                {!isMobile && (
                    <>
                        <motion.div
                            animate={{ x: [0, 50, 0], y: [0, 30, 0] }}
                            transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                            className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full blur-[120px] opacity-20"
                            style={{ backgroundColor: 'var(--primary-color)' }}
                        />
                        <motion.div
                            animate={{ x: [0, -40, 0], y: [0, 60, 0] }}
                            transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
                            className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full blur-[120px] opacity-20"
                            style={{ backgroundColor: 'var(--secondary-color)' }}
                        />
                    </>
                )}
                <div className="absolute inset-0 opacity-10 md:opacity-20" style={{ backgroundImage: "url('https://www.transparenttextures.com/patterns/carbon-fibre.png')", mixBlendMode: 'overlay' }}></div>
                <div className="absolute inset-0 opacity-40 transition-colors" style={{ backgroundColor: 'var(--bg-color)' }}></div>
            </div>

            {/* Header Section */}
            <div className="relative z-20 p-4 md:p-8 flex items-center justify-between pointer-events-auto">
                <motion.button
                    whileHover={{ scale: 1.1, x: -2 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => navigate(-1)}
                    className="w-10 h-10 md:w-12 md:h-12 backdrop-blur-xl rounded-xl md:rounded-2xl flex items-center justify-center border shadow-xl"
                    style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)', color: 'var(--text-color)' }}
                >
                    <ChevronLeft size={20} />
                </motion.button>

                <div className="flex flex-col items-center opacity-0 pointer-events-none">
                    <div className="w-10 md:w-12" />
                </div>

                <div className="w-10 md:w-12" /> {/* Spacer */}
            </div>

            <main className="relative z-10 px-4 md:px-8 lg:px-12 max-w-7xl mx-auto">
                <div className="text-center mb-8 md:mb-12">
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="inline-flex items-center gap-2 bg-gradient-to-r from-rose-600 to-rose-500 px-4 py-1.5 md:px-6 md:py-2.5 rounded-full shadow-[0_0_20px_rgba(225,29,72,0.4)] mb-3 md:mb-4"
                    >
                        <Swords size={16} className="text-white animate-bounce md:w-[20px]" />
                        <span className="text-[10px] md:text-sm font-black uppercase tracking-[0.2em]">Haftalik Battle</span>
                    </motion.div>
                    <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.1 }}
                        className="flex flex-col items-center gap-2 md:gap-4"
                    >
                        <div className="flex items-center gap-2 text-indigo-400/60 font-black uppercase tracking-[0.3em] text-[10px] md:text-xs">
                            <Timer size={14} className="animate-pulse" />
                            VAQT TUGASHIGA
                        </div>
                        <div className="text-4xl md:text-7xl lg:text-8xl font-black italic tracking-tighter tabular-nums drop-shadow-[0_0_20px_rgba(255,255,255,0.1)]" style={{ color: 'var(--text-color)' }}>
                            {timeLeft}
                        </div>
                    </motion.div>
                </div>

                {/* Main Battle Card */}
                <motion.div
                    ref={arenaRef}
                    initial={{ y: 50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.6, type: "spring" }}
                    className="relative group "
                >
                    {/* Glow behind card */}
                    <div className="absolute -inset-1 bg-gradient-to-r from-indigo-600 to-rose-600 rounded-[2rem] md:rounded-[3rem] blur opacity-10 group-hover:opacity-30 transition duration-1000"></div>

                    <div className="relative md:backdrop-blur-3xl rounded-[2rem] md:rounded-[3rem] p-6 md:p-12 border shadow-2xl overflow-hidden transition-colors" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
                        {/* Shimmer Effect */}
                        {!isMobile && <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 pointer-events-none" />}

                        <div className="flex flex-col md:flex-row justify-between items-center gap-8 md:gap-12 relative z-10">
                            {/* Team A */}
                            <motion.div
                                whileHover={{ scale: 1.05 }}
                                className="w-full md:flex-1 text-center order-2 md:order-1"
                            >
                                <div className="relative mb-4 md:mb-6 inline-block">
                                    <div className="absolute inset-0 bg-indigo-500 rounded-[1.5rem] md:rounded-[2rem] blur-xl opacity-20" />
                                    <div className="w-20 h-20 md:w-32 md:h-32 lg:w-40 lg:h-40 bg-gradient-to-br from-indigo-500 to-blue-700 rounded-[1.5rem] md:rounded-[2.5rem] flex items-center justify-center shadow-2xl border-2 relative z-10 md:rotate-3" style={{ borderColor: 'var(--card-bg)' }}>
                                        <ShieldAlert className="text-white w-10 md:w-16 lg:w-20" size={40} />
                                    </div>
                                    <motion.div
                                        animate={!isMobile ? { scale: [1, 1.2, 1] } : {}}
                                        transition={{ duration: 2, repeat: Infinity }}
                                        className="absolute -top-3 -left-3 md:-top-4 md:-left-4"
                                    >
                                        <Zap size={20} className="text-indigo-400 fill-indigo-400 md:w-[24px]" />
                                    </motion.div>
                                </div>
                                <h2 className="text-xs md:text-xl font-black uppercase tracking-widest mb-1 md:mb-2 truncate px-4" style={{ color: 'var(--text-color)' }}>{battle.group_a_name}</h2>
                                {battle.teacher_a_name && (
                                    <div className="text-[10px] md:text-xs font-bold uppercase tracking-widest -mt-1 md:-mt-2 mb-2 opacity-60">
                                        Ustoz: {battle.teacher_a_name}
                                    </div>
                                )}
                                <div className="text-3xl md:text-6xl font-black tabular-nums drop-shadow-[0_0_10px_rgba(99,102,241,0.5)]" style={{ color: 'var(--primary-color)' }}>
                                    {(battle.score_a ?? 0).toLocaleString()}
                                </div>
                            </motion.div>

                            {/* VS Divider */}
                            <div className="flex flex-col items-center gap-1 md:gap-2 order-1 md:order-2">
                                <motion.div
                                    animate={!isMobile ? { scale: [1, 1.05, 1] } : {}}
                                    transition={{ duration: 3, repeat: Infinity }}
                                    className="w-16 h-16 md:w-24 md:h-24 lg:w-28 lg:h-28 rounded-full flex items-center justify-center border-2 md:border-4 shadow-2xl relative"
                                    style={{ backgroundColor: 'var(--bg-color)', borderColor: 'var(--border-color)' }}
                                >
                                    <span className="text-2xl md:text-4xl lg:text-5xl font-black italic bg-clip-text text-transparent bg-gradient-to-tr from-rose-500 to-indigo-500">VS</span>
                                    {!isMobile && <div className="absolute inset-0 rounded-full border animate-ping opacity-10" style={{ borderColor: 'var(--primary-color)' }} />}
                                </motion.div>
                                <div className="flex items-center gap-1 text-[8px] md:text-[10px] font-black tracking-widest uppercase opacity-30">
                                    <Sparkles size={10} className="md:w-[12px]" /> LIVE ARENA <Sparkles size={10} className="md:w-[12px]" />
                                </div>
                            </div>

                            {/* Team B */}
                            <motion.div
                                whileHover={{ scale: 1.05 }}
                                className="w-full md:flex-1 text-center order-3"
                            >
                                <div className="relative mb-4 md:mb-6 inline-block">
                                    <div className="w-20 h-20 md:w-32 md:h-32 lg:w-40 lg:h-40 bg-gradient-to-br from-rose-500 to-orange-600 rounded-[1.5rem] md:rounded-[2.5rem] flex items-center justify-center shadow-2xl border-2 relative z-10 md:-rotate-3" style={{ borderColor: 'var(--card-bg)' }}>
                                        <Flame className="text-white w-10 md:w-16 lg:w-20" size={40} />
                                    </div>
                                    <motion.div
                                        animate={!isMobile ? { scale: [1, 1.2, 1] } : {}}
                                        transition={{ duration: 2, repeat: Infinity, delay: 1 }}
                                        className="absolute -top-3 -right-3 md:-top-4 md:-right-4"
                                    >
                                        <Target size={20} className="text-rose-400 fill-rose-400 md:w-[24px]" />
                                    </motion.div>
                                </div>
                                <h2 className="text-xs md:text-xl font-black uppercase tracking-widest mb-1 md:mb-2 truncate px-4" style={{ color: 'var(--text-color)' }}>{battle.group_b_name}</h2>
                                {battle.teacher_b_name && (
                                    <div className="text-[10px] md:text-xs font-bold uppercase tracking-widest -mt-1 md:-mt-2 mb-2 opacity-60">
                                        Ustoz: {battle.teacher_b_name}
                                    </div>
                                )}
                                <div className="text-3xl md:text-6xl font-black tabular-nums drop-shadow-[0_0_10px_rgba(244,63,94,0.5)]" style={{ color: 'var(--rose-400)' }}>
                                    {(battle.score_b ?? 0).toLocaleString()}
                                </div>
                            </motion.div>
                        </div>

                        {/* Power Meter */}
                        <div className="mt-10 md:mt-16 relative">
                            <div className="relative h-8 md:h-12 bg-slate-950/80 rounded-xl md:rounded-[1.5rem] p-1 flex border border-white/5 shadow-inner overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${percentA}%` }}
                                    transition={{ duration: 1.5, delay: 0.5, ease: "circOut" }}
                                    className="h-full bg-gradient-to-r from-indigo-700 via-indigo-500 to-indigo-400 rounded-l-lg md:rounded-l-[1rem] relative overflow-hidden"
                                >
                                    <div className="absolute inset-0 opacity-20 bg-[linear-gradient(45deg,rgba(255,255,255,0.3)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.3)_50%,rgba(255,255,255,0.3)_75%,transparent_75%,transparent)] bg-[length:20px_20px] md:bg-[length:30px_30px] animate-shimmer"></div>
                                </motion.div>
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${percentB}%` }}
                                    transition={{ duration: 1.5, delay: 0.5, ease: "circOut" }}
                                    className="h-full bg-gradient-to-l from-rose-700 via-rose-500 to-rose-400 rounded-r-lg md:rounded-r-[1rem] relative overflow-hidden"
                                >
                                    <div className="absolute inset-0 opacity-20 bg-[linear-gradient(-45deg,rgba(255,255,255,0.3)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.3)_50%,rgba(255,255,255,0.3)_75%,transparent_75%,transparent)] bg-[length:20px_20px] md:bg-[length:30px_30px] animate-shimmer"></div>
                                </motion.div>

                                <div className="absolute top-0 bottom-0 w-1 md:w-2 bg-white/40 left-[50%] -translate-x-1/2 blur-[2px] z-20"></div>
                            </div>

                            <div className="flex justify-between items-center mt-3 md:mt-4 px-1">
                                <div className="flex items-center gap-1.5 md:gap-2 text-indigo-400 font-black italic tracking-wider text-[10px] md:text-sm">
                                    <Flame size={14} className="md:w-[20px] fill-indigo-500/50" />
                                    <span>{percentA}% POWER</span>
                                </div>
                                <div className="flex items-center gap-1.5 md:gap-2 text-rose-400 font-black italic tracking-wider text-[10px] md:text-sm">
                                    <span>{percentB}% POWER</span>
                                    <Flame size={14} className="md:w-[20px] fill-rose-500/50" />
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Contributors Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-14 mt-12 md:mt-24 relative">
                    {/* Team A Contributors */}
                    <div className="space-y-4 md:space-y-6">
                        <div className="flex items-center justify-between px-2">
                            <h3 className="text-indigo-400 font-black text-[10px] md:text-sm uppercase tracking-[0.2em] flex items-center gap-2">
                                <TrendingUp size={16} className="md:w-[18px]" /> {battle.group_a_name} LEGENDS
                            </h3>
                            <span className="h-[1px] flex-1 ml-4 bg-indigo-500/20"></span>
                        </div>
                        <div className="space-y-3 md:space-y-4">
                            <AnimatePresence>
                                {battle.membersA.map((m: any, idx: number) => (
                                        <motion.div
                                            key={idx}
                                            initial={!isMobile ? { x: -20, opacity: 0 } : { opacity: 0 }}
                                            whileInView={!isMobile ? { x: 0, opacity: 1 } : { opacity: 1 }}
                                            viewport={{ once: true }}
                                            transition={!isMobile ? { delay: 0.05 * idx } : { duration: 0.2 }}
                                            className="flex items-center justify-between backdrop-blur-md p-3 md:p-4 rounded-2xl md:rounded-[1.5rem] border hover:bg-indigo-500/5 transition-all shadow-lg"
                                            style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}
                                        >
                                        <div className="flex items-center gap-3 md:gap-4 overflow-hidden">
                                            <div className="w-8 h-8 md:w-10 md:h-10 shrink-0 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center font-black text-indigo-400 text-xs md:text-sm">
                                                {idx + 1}
                                            </div>
                                            <div className="overflow-hidden">
                                                <div className="text-xs md:text-base font-black uppercase tracking-tight truncate" style={{ color: 'var(--text-color)' }}>{m.name}</div>
                                                <div className="text-[9px] md:text-[10px] font-bold uppercase truncate opacity-50">
                                                    {m.coins || 0} COINS
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right shrink-0 ml-2">
                                            <div className="text-sm md:text-xl font-black tracking-tighter" style={{ color: 'var(--primary-color)' }}>+{m.weekly_battle_score}</div>
                                            <div className="text-[8px] md:text-[9px] font-black opacity-30 uppercase tracking-widest">XP</div>
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    </div>

                    {/* Team B Contributors */}
                    <div className="space-y-4 md:space-y-6">
                        <div className="flex items-center justify-between px-2">
                            <h3 className="text-rose-400 font-black text-[10px] md:text-sm uppercase tracking-[0.2em] flex items-center gap-2">
                                <TrendingUp size={16} className="md:w-[18px]" /> {battle.group_b_name} LEGENDS
                            </h3>
                            <span className="h-[1px] flex-1 ml-4 bg-rose-500/20"></span>
                        </div>
                        <div className="space-y-3 md:space-y-4">
                            <AnimatePresence>
                                {battle.membersB.map((m: any, idx: number) => (
                                    <motion.div
                                        key={idx}
                                        initial={!isMobile ? { x: 20, opacity: 0 } : { opacity: 0 }}
                                        whileInView={!isMobile ? { x: 0, opacity: 1 } : { opacity: 1 }}
                                        viewport={{ once: true }}
                                        transition={!isMobile ? { delay: 0.05 * idx } : { duration: 0.2 }}
                                        className="flex items-center justify-between p-3 md:p-4 rounded-2xl md:rounded-[1.5rem] border hover:bg-rose-500/5 transition-all shadow-lg"
                                        style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}
                                    >
                                        <div className="flex items-center gap-3 md:gap-4 overflow-hidden">
                                            <div className="w-8 h-8 md:w-10 md:h-10 shrink-0 rounded-xl bg-rose-600/20 border border-rose-500/30 flex items-center justify-center font-black text-rose-400 text-xs md:text-sm">
                                                {idx + 1}
                                            </div>
                                            <div className="overflow-hidden">
                                                <div className="text-xs md:text-base font-black uppercase tracking-tight truncate" style={{ color: 'var(--text-color)' }}>{m.name}</div>
                                                <div className="text-[9px] md:text-[10px] font-bold uppercase truncate opacity-50">
                                                    {m.coins || 0} COINS
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right shrink-0 ml-2">
                                            <div className="text-sm md:text-xl font-black text-rose-400 tracking-tighter">+{m.weekly_battle_score}</div>
                                            <div className="text-[8px] md:text-[9px] font-black opacity-30 uppercase tracking-widest">XP</div>
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>

                {/* Rewards Card */}
                <motion.div
                    initial={{ y: 30, opacity: 0 }}
                    whileInView={{ y: 0, opacity: 1 }}
                    viewport={{ once: true }}
                    className="mt-16 md:mt-24 lg:mt-32 bg-gradient-to-tr from-amber-600/20 via-orange-500/10 to-transparent rounded-[2rem] md:rounded-[3.5rem] p-6 md:p-12 border border-amber-500/30 relative overflow-hidden group mb-10 shadow-2xl"
                >
                    <div className="absolute top-0 right-0 p-4 md:p-8 transform translate-x-1/4 -translate-y-1/4 opacity-10 group-hover:opacity-20 transition-opacity duration-1000 rotate-12">
                        <Trophy size={200} className="text-amber-500" />
                    </div>

                    <div className="relative z-10 flex flex-col md:flex-row items-center gap-6 md:gap-12 text-center md:text-left">
                        <div className="w-16 h-16 md:w-28 md:h-28 bg-amber-500/20 rounded-2xl md:rounded-[2.5rem] flex items-center justify-center border-2 border-amber-500/40 shadow-[0_0_30px_rgba(245,158,11,0.2)]">
                            <Trophy size={32} className="text-amber-500 md:hidden" />
                            <Trophy size={56} className="text-amber-500 hidden md:block" />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-black text-xl md:text-3xl lg:text-4xl text-amber-500 uppercase italic tracking-tighter mb-2 md:mb-3">VICTORY REWARDS</h3>
                            <p className="text-[11px] md:text-base lg:text-lg font-medium leading-relaxed max-w-2xl opacity-90" style={{ color: 'var(--text-color)' }}>
                                G'olib guruh talabalari <span className="font-black" style={{ color: 'var(--primary-color)' }}>+500 COINS</span>,
                                maxsus <span className="font-black" style={{ color: 'var(--accent-color)' }}>"CHAMPION"</span> unvoni va profil uchun oltin ramkaga ega bo'ladilar!
                            </p>
                        </div>
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="w-full md:w-auto bg-amber-500 text-slate-950 font-black px-6 py-3 md:px-10 md:py-4 rounded-xl md:rounded-2xl text-[10px] md:text-sm uppercase tracking-[0.2em] shadow-xl shadow-amber-500/20 flex items-center justify-center gap-2"
                        >
                            <Award size={18} />
                            Batafsil
                        </motion.button>
                    </div>
                </motion.div>
            </main>
        </div>
    );
}
