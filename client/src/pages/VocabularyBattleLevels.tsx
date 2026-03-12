import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../api';
import { useAuth } from '../AuthContext';
import { ArrowLeft, Lock, Star } from 'lucide-react';
import { motion } from 'framer-motion';

export default function VocabularyBattleLevels() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [levels, setLevels] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user?.id) fetchLevels();
    }, [user?.id]);

    const fetchLevels = async () => {
        try {
            const res = await apiFetch(`/api/student/vocab-battles/levels?studentId=${user?.id}`);
            if (res.ok) {
                const data = await res.json();
                // Data only has defined levels. We need a grid of exactly 30.
                setLevels(data);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    // Build exactly 30 map nodes
    const mapNodes = Array.from({ length: 30 }, (_, i) => {
        const levelNum = i + 1;
        const battle = levels.find(l => Number(l.level) === levelNum);
        return {
            levelNumber: levelNum,
            battle, // Will be undefined if admin didn't create it yet
            isLocked: !battle || battle.isLocked,
            stars: battle?.stars || 0
        };
    });

    return (
        <div className="min-h-screen bg-gradient-to-b from-sky-400 via-indigo-500 to-purple-600 flex flex-col font-sans selection:bg-indigo-100 selection:text-indigo-900 relative overflow-hidden">
            {/* Animated Background Elements */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-20 -left-20 w-80 h-80 bg-white/10 rounded-full blur-3xl animate-pulse" />
                <div className="absolute bottom-40 -right-20 w-96 h-96 bg-purple-400/20 rounded-full blur-3xl animate-pulse delay-700" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] opacity-20">
                    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full fill-none stroke-white/20" strokeWidth="0.2">
                        <circle cx="50" cy="50" r="40" />
                        <circle cx="50" cy="50" r="30" />
                        <circle cx="50" cy="50" r="20" />
                        <path d="M0,50 L100,50 M50,0 L50,100" />
                    </svg>
                </div>
            </div>

            {/* Header */}
            <header className="sticky top-0 z-40 bg-white/10 backdrop-blur-xl border-b border-white/10">
                <div className="px-4 h-16 sm:h-20 flex items-center justify-between mx-auto w-full max-w-lg">
                    <button
                        onClick={() => navigate('/student/dashboard')}
                        className="w-10 h-10 flex items-center justify-center rounded-2xl bg-white/20 border border-white/30 text-white hover:bg-white/30 active:scale-95 transition-all shadow-lg"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="flex-1 text-center font-black text-xl text-white uppercase tracking-widest drop-shadow-md">
                        Vocab Battle
                    </div>
                    <div className="w-10"></div>
                </div>
            </header>

            <main className="flex-1 relative z-10 overflow-x-hidden overflow-y-auto px-4 py-12 sm:px-6 custom-scrollbar pb-32 w-full max-w-lg mx-auto flex flex-col items-center">
                <motion.div 
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-12 text-center relative z-10 w-full"
                >
                    <h1 className="text-4xl font-black text-white tracking-tight mb-2 drop-shadow-lg">Bosqichlar</h1>
                    <p className="text-white/80 font-bold uppercase tracking-widest text-[10px] bg-black/10 backdrop-blur-sm inline-block px-3 py-1 rounded-full border border-white/10">
                        Cho'qqiga qarab OLGA!
                    </p>
                </motion.div>

                {loading ? (
                    <div className="text-center py-20 text-white/50 font-black animate-pulse text-xl">Yuklanmoqda...</div>
                ) : (
                    <div className="relative w-full flex flex-col items-center">
                        {/* Winding dashed line behind the nodes */}
                        <div className="absolute inset-0 w-full h-full pointer-events-none -z-0">
                            <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                                <path
                                    d={`M 50 0 ${mapNodes.map((_, i) => {
                                        if (i === 0) return '';
                                        const x = 50 + (i % 2 === 0 ? -25 : 25);
                                        const y = (i * 100) / mapNodes.length;
                                        const prevY = ((i - 1) * 100) / mapNodes.length;
                                        const midY = (y + prevY) / 2;
                                        return `Q ${x} ${midY}, 50 ${y}`;
                                    }).join(' ')}`}
                                    fill="none"
                                    stroke="rgba(255,255,255,0.3)"
                                    strokeWidth="1.5"
                                    strokeDasharray="4 4"
                                    style={{ vectorEffect: 'non-scaling-stroke' }}
                                />
                            </svg>
                        </div>

                        {/* Staggered nodes */}
                        <div className="flex flex-col w-full relative z-10 space-y-12 sm:space-y-16 pb-16 pt-8">
                            {mapNodes.map((node, i) => {
                                const offsetClass = i % 2 !== 0 ? 'mr-auto ml-4 sm:ml-12' : 'ml-auto mr-4 sm:mr-12';
                                return (
                                    <motion.div 
                                        key={node.levelNumber}
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        whileInView={{ opacity: 1, scale: 1 }}
                                        viewport={{ once: true }}
                                        className={`relative group w-24 h-24 sm:w-28 sm:h-28 flex-shrink-0 ${offsetClass}`}
                                    >
                                        <button
                                            disabled={node.isLocked}
                                            onClick={() => node.battle && navigate(`/student/vocab-battle/play/${node.battle.id}`)}
                                            className={`
                                                absolute inset-0 rounded-[2.5rem] flex flex-col items-center justify-center gap-1.5 transition-all duration-300
                                                shadow-2xl border-4
                                                ${node.isLocked
                                                    ? 'bg-white/10 border-white/10 text-white/20 cursor-not-allowed shadow-none'
                                                    : 'bg-white border-white text-indigo-600 hover:border-sky-300 hover:bg-sky-50 hover:-translate-y-2 hover:scale-110 active:scale-95 cursor-pointer shadow-indigo-900/40 z-10'
                                                }
                                            `}
                                        >
                                            <div className={`absolute -top-4 px-3 py-1 rounded-full shadow-md border font-black tracking-widest uppercase text-[9px] ${node.isLocked ? 'bg-slate-200 border-slate-300 text-slate-400' : 'bg-indigo-600 border-indigo-500 text-white'}`}>
                                                {node.isLocked ? <Lock size={10} className="inline mr-1" /> : <Star size={10} className="inline mr-1 fill-white" />}
                                                Level {node.levelNumber}
                                            </div>
                                            
                                            <div className="text-3xl sm:text-4xl font-black drop-shadow-sm leading-none mt-2">
                                                {node.levelNumber}
                                            </div>

                                            {!node.isLocked && (
                                                <div className="flex gap-0.5 mt-1">
                                                    {Array.from({ length: 3 }).map((_, starIdx) => (
                                                        <Star 
                                                            key={starIdx} 
                                                            size={12} 
                                                            className={starIdx < node.stars ? "fill-yellow-400 text-yellow-500 drop-shadow-sm" : "fill-slate-100 text-slate-200"} 
                                                        />
                                                    ))}
                                                </div>
                                            )}
                                        </button>
                                        
                                        {!node.isLocked && (
                                            <div className={`absolute top-1/2 -mt-4 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none min-w-max bg-white/95 backdrop-blur text-slate-800 text-xs font-black py-2 px-4 rounded-xl shadow-2xl z-20 whitespace-nowrap
                                                ${i % 2 === 0 ? 'left-full ml-4' : 'right-full mr-4'}`}
                                            >
                                                {node.battle?.title || "Boshlash"}
                                                <div className={`absolute top-1/2 -mt-1 w-2 h-2 bg-white/95 transform rotate-45 ${i % 2 === 0 ? '-left-1' : '-right-1'}`}></div>
                                            </div>
                                        )}
                                    </motion.div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
