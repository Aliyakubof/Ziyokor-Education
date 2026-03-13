import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../api';
import { useAuth } from '../AuthContext';
import { ArrowLeft, Lock, Star, Sparkles, MapPin } from 'lucide-react';
import { motion, useScroll, useTransform } from 'framer-motion';
import premiumMap from '../assets/map_premium.png';

// Atmospheric Particle
const Particle = ({ delay, type }: { delay: number, type: 'petal' | 'light' }) => {
    const randomX = Math.random() * 100;
    const duration = type === 'petal' ? 8 + Math.random() * 8 : 15 + Math.random() * 10;
    
    return (
        <motion.div
            initial={{ y: -20, x: `${randomX}%`, opacity: 0, rotate: 0 }}
            animate={{ 
                y: '110vh', 
                x: `${randomX + (Math.random() * 30 - 15)}%`,
                opacity: [0, 0.6, 0.6, 0],
                rotate: type === 'petal' ? 720 : 0,
                scale: type === 'light' ? [0.5, 1.2, 0.5] : 1
            }}
            transition={{ 
                duration, 
                repeat: Infinity, 
                delay, 
                ease: "linear" 
            }}
            className={`absolute pointer-events-none z-1 ${type === 'petal' ? 'w-3 h-3 bg-pink-200/40' : 'w-1 h-20 bg-yellow-100/10 blur-xl'}`}
            style={type === 'petal' ? { borderRadius: '40% 60% 50% 50%' } : {}}
        />
    );
};

export default function VocabularyBattleLevels() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [levels, setLevels] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isActive, setIsActive] = useState(true);

    const { scrollY } = useScroll();
    // Subtle parallax that keeps the map looking sharp
    const bgY = useTransform(scrollY, [0, 5000], [0, 500]);

    useEffect(() => {
        if (user?.id) fetchLevels();
    }, [user?.id]);

    const fetchLevels = async () => {
        try {
            const res = await apiFetch(`/api/student/vocab-battles/levels?studentId=${user?.id}`);
            if (res.ok) {
                const data = await res.json();
                if (data.isActive === false) {
                    setIsActive(false);
                } else {
                    setLevels(data.levels || []);
                    setIsActive(true);
                }
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const mapNodes = Array.from({ length: 30 }, (_, i) => {
        const levelNum = i + 1;
        const battle = levels.find(l => Number(l.level) === levelNum);
        return {
            levelNumber: levelNum,
            battle,
            isLocked: !battle || battle.isLocked,
            stars: battle?.stars || 0
        };
    });

    return (
        <div className="min-h-screen bg-[#0a1a0a] flex flex-col font-sans selection:bg-emerald-100 selection:text-emerald-900 relative overflow-hidden">
            {/* Ultra-High-Res Background Layer */}
            <div className="fixed inset-0 z-0">
                <motion.div 
                    style={{ 
                        backgroundImage: `url(${premiumMap})`,
                        y: bgY
                    }}
                    className="absolute inset-0 bg-[length:100%_auto] bg-top bg-no-repeat scale-[1.02]"
                />
                {/* Dynamic Lighting Overlay */}
                <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/40" />
                <div className="absolute inset-0 bg-[#0d2a1c]/10 mix-blend-overlay" />
            </div>

            {/* Atmospheric Effects */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden z-2">
                {Array.from({ length: 15 }).map((_, i) => (
                    <Particle key={`p-${i}`} delay={i * 1.2} type="petal" />
                ))}
                {Array.from({ length: 5 }).map((_, i) => (
                    <Particle key={`l-${i}`} delay={i * 4} type="light" />
                ))}
            </div>

            {/* Premium Header */}
            <header className="sticky top-0 z-40 bg-black/10 backdrop-blur-2xl border-b border-white/5">
                <div className="px-4 h-16 sm:h-20 flex items-center justify-between mx-auto w-full max-w-lg">
                    <button
                        onClick={() => navigate('/student/dashboard')}
                        className="w-11 h-11 flex items-center justify-center rounded-2xl bg-white/5 border border-white/10 text-white hover:bg-white/10 active:scale-95 transition-all shadow-2xl group"
                    >
                        <ArrowLeft className="w-6 h-6 group-hover:-translate-x-1 transition-transform" />
                    </button>
                    <div className="flex-1 flex flex-col items-center">
                        <div className="flex items-center gap-1.5 px-3 py-0.5 bg-emerald-500/20 rounded-full border border-emerald-500/30 mb-0.5">
                            <Sparkles size={12} className="text-emerald-400" />
                            <span className="text-[9px] font-black text-emerald-300 uppercase tracking-[0.2em]">Adventure Map</span>
                        </div>
                        <div className="font-black text-2xl text-white uppercase tracking-tighter drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)]">
                            Jang <span className="text-emerald-400">Maydoni</span>
                        </div>
                    </div>
                    <div className="w-11"></div>
                </div>
            </header>

            <main className="flex-1 relative z-10 overflow-x-hidden overflow-y-auto px-6 py-10 custom-scrollbar pb-40 w-full max-w-lg mx-auto flex flex-col items-center">
                {!isActive ? (
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex-1 flex flex-col items-center justify-center pt-20"
                    >
                         <div className="bg-black/60 backdrop-blur-3xl p-12 rounded-[3.5rem] border border-white/10 text-center shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] space-y-8">
                             <div className="w-24 h-24 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto border border-emerald-500/40">
                                <Sparkles className="text-emerald-400 w-12 h-12" />
                             </div>
                             <div>
                                <h2 className="text-4xl font-black text-white mb-4 tracking-tighter">Yaqinda...</h2>
                                <p className="text-white/60 font-medium max-w-[240px] mx-auto text-base leading-relaxed">
                                    Xarita yangi darajalar bilan to'ldirilmoqda. Ozgina sabr qiling!
                                </p>
                             </div>
                         </div>
                    </motion.div>
                ) : loading ? (
                    <div className="text-center py-20">
                        <div className="w-12 h-12 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mx-auto mb-4" />
                        <span className="text-white/40 font-black uppercase tracking-widest text-sm">Xarita yuklanmoqda...</span>
                    </div>
                ) : (
                    <div className="relative w-full flex flex-col items-center">
                        {/* Winding Magical Path */}
                        <div className="absolute inset-0 w-full h-full pointer-events-none">
                            <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                                <defs>
                                    <linearGradient id="pathGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#10b981" stopOpacity="0.1" />
                                        <stop offset="100%" stopColor="#fb7185" stopOpacity="0.1" />
                                    </linearGradient>
                                </defs>
                                <path
                                    d={`M 50 0 ${mapNodes.map((_, i) => {
                                        if (i === 0) return '';
                                        const x = 50 + (i % 2 === 0 ? -28 : 28);
                                        const y = (i * 100) / mapNodes.length;
                                        const prevY = ((i - 1) * 100) / mapNodes.length;
                                        const midY = (y + prevY) / 2;
                                        return `Q ${x} ${midY}, 50 ${y}`;
                                    }).join(' ')}`}
                                    fill="none"
                                    stroke="url(#pathGrad)"
                                    strokeWidth="4"
                                    strokeLinecap="round"
                                    strokeDasharray="1 12"
                                    style={{ vectorEffect: 'non-scaling-stroke' }}
                                />
                            </svg>
                        </div>

                        {/* Staggered Game-Pin Nodes */}
                        <div className="flex flex-col w-full relative z-10 space-y-16 sm:space-y-20 pb-20 pt-4">
                            {mapNodes.map((node, i) => {
                                const offsetClass = i % 2 !== 0 ? 'mr-auto' : 'ml-auto';
                                return (
                                    <motion.div 
                                        key={node.levelNumber}
                                        initial={{ opacity: 0, scale: 0.8, y: 20 }}
                                        whileInView={{ opacity: 1, scale: 1, y: 0 }}
                                        viewport={{ once: true, margin: "-100px" }}
                                        className={`relative group w-24 h-24 sm:w-28 sm:h-28 flex-shrink-0 ${offsetClass}`}
                                    >
                                        <button
                                            disabled={node.isLocked}
                                            onClick={() => node.battle && navigate(`/student/vocab-battle/play/${node.battle.id}`)}
                                            className={`
                                                relative w-full h-full rounded-[2rem] flex flex-col items-center justify-center gap-1 transition-all duration-500
                                                shadow-[0_15px_35px_-10px_rgba(0,0,0,0.5)] border-2
                                                ${node.isLocked
                                                    ? 'bg-black/40 backdrop-blur-md border-white/5 text-white/20 cursor-not-allowed'
                                                    : 'bg-gradient-to-br from-white to-emerald-50 border-white text-emerald-900 hover:scale-110 active:scale-95 cursor-pointer z-10'
                                                }
                                            `}
                                        >
                                            {/* Level Badge */}
                                            <div className={`
                                                absolute -top-3 px-3 py-1 rounded-full shadow-2xl border font-black tracking-tighter text-[10px] flex items-center gap-1
                                                ${node.isLocked 
                                                    ? 'bg-white/10 border-white/10 text-white/30 truncate' 
                                                    : 'bg-emerald-600 border-white text-white drop-shadow-lg'
                                                }
                                            `}>
                                                {node.isLocked ? <Lock size={10} /> : <Sparkles size={10} />}
                                                LEVEL {node.levelNumber}
                                            </div>
                                            
                                            <div className={`text-4xl font-black ${node.isLocked ? 'blur-[1px]' : 'drop-shadow-md text-emerald-950 font-black'}`}>
                                                {node.levelNumber}
                                            </div>

                                            {!node.isLocked && (
                                                <div className="flex gap-0.5 mt-0.5">
                                                    {Array.from({ length: 3 }).map((_, starIdx) => (
                                                        <Star 
                                                            key={starIdx} 
                                                            size={14} 
                                                            className={starIdx < node.stars ? "fill-yellow-400 text-yellow-500 drop-shadow-md" : "fill-emerald-100 text-emerald-200"} 
                                                        />
                                                    ))}
                                                </div>
                                            )}

                                            {/* Marker Bottom Pin Effect */}
                                            <div className={`absolute -bottom-2 w-4 h-4 rotate-45 border-white transition-all duration-500 ${node.isLocked ? 'bg-black/40 border-b border-r' : 'bg-white border-b border-r shadow-xl'}`} />
                                            
                                            {/* Glow Effect for Active Levels */}
                                            {!node.isLocked && (
                                                <div className="absolute inset-0 rounded-[2rem] bg-emerald-400/20 blur-2xl animate-pulse -z-1" />
                                            )}
                                        </button>
                                        
                                        {!node.isLocked && (
                                            <div className={`absolute top-1/2 -mt-5 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none min-w-max bg-black/80 backdrop-blur-xl text-white text-xs font-black py-2.5 px-4 rounded-2xl shadow-2xl z-20 whitespace-nowrap border border-white/10
                                                ${i % 2 === 0 ? 'left-full ml-6' : 'right-full mr-6'}`}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <MapPin size={12} className="text-emerald-400" />
                                                    {node.battle?.title || "Sarguzashtni boshlash"}
                                                </div>
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
