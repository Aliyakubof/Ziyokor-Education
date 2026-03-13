import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../api';
import { useAuth } from '../AuthContext';
import { ArrowLeft, Lock, Star, Swords, Sparkles, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';

// Firefly/Particle Component
const Particle = ({ i }: { i: number }) => {
    const size = Math.random() * 4 + 2;
    const duration = 15 + Math.random() * 20;
    const delay = Math.random() * -20;
    
    return (
        <motion.div
            initial={{ 
                x: `${Math.random() * 100}%`, 
                y: `${Math.random() * 100}%`,
                opacity: 0 
            }}
            animate={{ 
                y: ['-10%', '110%'],
                x: ['0%', '10%', '-10%', '0%'],
                opacity: [0, 0.4, 0.4, 0]
            }}
            transition={{ 
                duration, 
                repeat: Infinity, 
                delay, 
                ease: "linear" 
            }}
            className="absolute bg-emerald-300 rounded-full blur-[2px] pointer-events-none z-0"
            style={{ width: size, height: size }}
        />
    );
};

export default function VocabularyBattleLevels() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [levels, setLevels] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isActive, setIsActive] = useState(true);

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
        <div className="min-h-screen bg-[#040d08] flex flex-col font-sans selection:bg-emerald-500 selection:text-white relative overflow-hidden">
            {/* Dynamic Background */}
            <div className="fixed inset-0 z-0 bg-[radial-gradient(circle_at_50%_0%,#0c2a1c_0%,#040d08_70%)]" />
            
            {/* Ambient Glows */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[20%] -left-[10%] w-[50%] h-[50%] bg-emerald-900/20 blur-[120px] rounded-full" />
                <div className="absolute bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-teal-900/10 blur-[100px] rounded-full" />
            </div>

            {/* Floating Particles */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                {Array.from({ length: 30 }).map((_, i) => (
                    <Particle key={i} i={i} />
                ))}
            </div>

            {/* Simple Premium Header */}
            <header className="sticky top-0 z-40 bg-black/20 backdrop-blur-md border-b border-white/5">
                <div className="px-4 h-16 flex items-center justify-between mx-auto w-full max-w-lg">
                    <button
                        onClick={() => navigate('/student/dashboard')}
                        className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-emerald-400 hover:bg-white/10 transition-all active:scale-90"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="flex-1 text-center">
                        <h2 className="text-lg font-black text-white uppercase tracking-[0.3em] font-serif drop-shadow-md">
                            Vocabulary Battle
                        </h2>
                    </div>
                    <div className="w-10"></div>
                </div>
            </header>

            <main className="flex-1 relative z-10 px-4 py-12 w-full max-w-lg mx-auto overflow-x-hidden overflow-y-auto custom-scrollbar">
                {!isActive ? (
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex flex-col items-center justify-center py-32 text-center"
                    >
                        <div className="w-24 h-24 bg-emerald-500/10 rounded-full flex items-center justify-center mb-8 border border-emerald-500/20">
                            <Sparkles className="text-emerald-400 w-10 h-10 animate-pulse" />
                        </div>
                        <h3 className="text-3xl font-black text-white mb-4 italic">TEZ ORADA...</h3>
                        <p className="text-emerald-100/40 font-medium max-w-[260px] leading-relaxed">
                            Yangi so'zlar jangi tayyorlanmoqda. O'z bilimingizni charxlab turing!
                        </p>
                    </motion.div>
                ) : loading ? (
                    <div className="flex flex-col items-center justify-center py-20 text-emerald-500/30">
                        <div className="w-8 h-8 border-2 border-current border-t-transparent rounded-full animate-spin mb-4" />
                        <span className="font-black uppercase tracking-widest text-xs">Yuklanmoqda...</span>
                    </div>
                ) : (
                    <div className="relative pt-4 pb-32">
                        {/* Winding Magical Stream/Path */}
                        <div className="absolute inset-0 pointer-events-none opacity-20">
                            <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                                <path
                                    d={`M 50 0 ${mapNodes.map((_, i) => {
                                        const side = i % 2 === 0 ? 1 : -1;
                                        const x = 50 + side * 25;
                                        const y = (i * 100) / mapNodes.length;
                                        const prevY = ((i - 1) * 100) / mapNodes.length;
                                        const midY = (y + prevY) / 2;
                                        return `Q ${x} ${midY}, 50 ${y}`;
                                    }).join(' ')}`}
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    className="text-emerald-500"
                                    strokeDasharray="1 8"
                                    style={{ vectorEffect: 'non-scaling-stroke' }}
                                />
                            </svg>
                        </div>

                        {/* Level Nodes */}
                        <div className="relative z-10 flex flex-col items-center space-y-12">
                            {mapNodes.map((node, i) => {
                                const isEven = i % 2 === 0;
                                return (
                                    <motion.div
                                        key={node.levelNumber}
                                        initial={{ opacity: 0, x: isEven ? 50 : -50 }}
                                        whileInView={{ opacity: 1, x: 0 }}
                                        viewport={{ once: true, margin: "-50px" }}
                                        className={`relative w-full flex ${isEven ? 'justify-end pr-8' : 'justify-start pl-8'}`}
                                    >
                                        <button
                                            disabled={node.isLocked}
                                            onClick={() => node.battle && navigate(`/student/vocab-battle/play/${node.battle.id}`)}
                                            className={`
                                                relative w-20 h-20 sm:w-24 sm:h-24 rounded-3xl flex flex-col items-center justify-center transition-all duration-300 group
                                                ${node.isLocked 
                                                    ? 'bg-white/5 border border-white/5 text-white/10 cursor-not-allowed grayscale' 
                                                    : 'bg-emerald-500 border-2 border-emerald-400 text-white shadow-[0_0_30px_rgba(16,185,129,0.3)] hover:scale-110 active:scale-95'
                                                }
                                            `}
                                        >
                                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-xl border border-white/10 px-2 py-0.5 rounded-full text-[8px] font-black tracking-widest text-emerald-400 whitespace-nowrap">
                                                LVL {node.levelNumber}
                                            </div>
                                            
                                            <div className="text-3xl font-black mb-1 italic">
                                                {node.levelNumber}
                                            </div>

                                            {!node.isLocked && (
                                                <div className="flex gap-0.5 mb-1">
                                                    {[1, 2, 3].map(s => (
                                                        <Star key={s} size={10} className={s <= node.stars ? "fill-white" : "fill-white/20 text-transparent"} />
                                                    ))}
                                                </div>
                                            )}

                                            {node.isLocked ? (
                                                <Lock size={12} className="opacity-40" />
                                            ) : (
                                                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-white/20 rounded-lg text-[8px] font-black uppercase">
                                                    <span>Boshlash</span>
                                                    <ChevronRight size={8} />
                                                </div>
                                            )}

                                            {/* Level Connection Tooltip */}
                                            {!node.isLocked && (
                                                <div className={`absolute top-1/2 -translate-y-1/2 min-w-max transition-all opacity-0 group-hover:opacity-100 hidden sm:block
                                                    ${isEven ? 'right-[110%] pr-4' : 'left-[110%] pl-4'}`}
                                                >
                                                    <div className="bg-black/60 backdrop-blur-2xl border border-white/10 p-3 rounded-2xl shadow-2xl">
                                                        <p className="text-white font-black text-xs uppercase mb-1">{node.battle?.title || "Jang Maydoni"}</p>
                                                        <div className="flex items-center gap-2 text-[10px] text-emerald-400 font-bold uppercase tracking-widest">
                                                            <Swords size={12} />
                                                            <span>Tayyormisiz?</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Pulse effect for current level */}
                                            {!node.isLocked && node.stars === 0 && (
                                                <div className="absolute inset-0 rounded-3xl bg-emerald-500 animate-ping opacity-20 pointer-events-none" />
                                            )}
                                        </button>
                                    </motion.div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </main>
            
            {/* Bottom Gradient Fade */}
            <div className="fixed bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#040d08] to-transparent pointer-events-none z-30" />
        </div>
    );
}

