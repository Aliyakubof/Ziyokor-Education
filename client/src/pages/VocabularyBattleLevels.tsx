import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../api';
import { useAuth } from '../AuthContext';
import { ArrowLeft, Star, ChevronRight } from 'lucide-react';
import { motion, useScroll, useTransform } from 'framer-motion';
import premiumMap from '../assets/map_final_premium.png';

// Ambient Sparkle Component
const Sparkle = () => {
    const size = Math.random() * 3 + 1;
    const duration = 10 + Math.random() * 15;
    
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ 
                opacity: [0, 0.5, 0],
                scale: [0, 1.2, 0],
                y: [0, -100]
            }}
            transition={{ 
                duration, 
                repeat: Infinity, 
                delay: Math.random() * 10,
                ease: "easeInOut" 
            }}
            className="absolute bg-white rounded-full blur-[1px] pointer-events-none z-1"
            style={{ 
                width: size, 
                height: size,
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`
            }}
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
    const bgY = useTransform(scrollY, [0, 2000], [0, 150]); // Subtle parallax

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
        <div className="min-h-screen bg-emerald-950 flex flex-col font-sans selection:bg-emerald-400 selection:text-white relative overflow-hidden">
            {/* Fixed High-Resolution Map Background */}
            <div className="fixed inset-0 z-0">
                <motion.div 
                    style={{ 
                        backgroundImage: `url(${premiumMap})`,
                        y: bgY
                    }}
                    className="absolute inset-x-0 -inset-y-20 bg-cover bg-center bg-no-repeat opacity-90 scale-105"
                />
                {/* Visual Polish Overlays */}
                <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/30" />
                <div className="absolute inset-0 backdrop-blur-[1px] opacity-20" />
            </div>

            {/* Ambient Sparkles */}
            <div className="fixed inset-0 z-1 pointer-events-none">
                {Array.from({ length: 20 }).map((_, i) => (
                    <Sparkle key={i} />
                ))}
            </div>

            {/* Simple Premium Header */}
            <header className="sticky top-0 z-40 bg-white/10 backdrop-blur-xl border-b border-white/10">
                <div className="px-4 h-16 flex items-center justify-between mx-auto w-full max-w-lg">
                    <button
                        onClick={() => navigate('/student/dashboard')}
                        className="w-10 h-10 flex items-center justify-center rounded-2xl bg-black/20 border border-white/10 text-white hover:bg-black/40 transition-all active:scale-90"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="flex-1 text-center">
                        <h2 className="text-xl font-black text-white uppercase tracking-[0.2em] drop-shadow-lg italic">
                            Vocabulary battle
                        </h2>
                    </div>
                    <div className="w-10"></div>
                </div>
            </header>

            <main className="flex-1 relative z-10 px-4 py-8 w-full max-w-lg mx-auto overflow-x-hidden overflow-y-auto custom-scrollbar">
                {!isActive ? (
                    <div className="flex flex-col items-center justify-center py-32 text-center">
                         <div className="bg-black/60 backdrop-blur-3xl p-12 rounded-[3.5rem] border border-white/10 shadow-2xl space-y-6">
                             <div className="text-6xl animate-bounce">🗺️</div>
                             <div>
                                <h2 className="text-4xl font-black text-white mb-4 italic tracking-tighter uppercase">TEZ ORADA...</h2>
                                <p className="text-white/60 font-medium max-w-[240px] mx-auto text-base leading-relaxed">
                                    Xarita yangi sarguzashtlar bilan to'ldirilmoqda. Tayyor turing!
                                </p>
                             </div>
                         </div>
                    </div>
                ) : loading ? (
                    <div className="text-center py-20">
                        <div className="w-12 h-12 border-4 border-white/10 border-t-white rounded-full animate-spin mx-auto mb-4" />
                        <span className="text-white/40 font-black uppercase tracking-widest text-xs">Yuklanmoqda...</span>
                    </div>
                ) : (
                    <div className="relative pt-4 pb-40">
                        {/* Winding Adventure Path Lines */}
                        <div className="absolute inset-0 pointer-events-none z-0 opacity-40">
                            <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                                <path
                                    d={`M 50 0 ${mapNodes.map((_, i) => {
                                        const side = i % 2 === 0 ? 1 : -1;
                                        const x = 50 + side * 28;
                                        const y = (i * 100) / mapNodes.length;
                                        const prevY = ((i - 1) * 100) / mapNodes.length;
                                        const midY = (y + prevY) / 2;
                                        return `Q ${x} ${midY}, 50 ${y}`;
                                    }).join(' ')}`}
                                    fill="none"
                                    stroke="white"
                                    strokeWidth="2.5"
                                    strokeDasharray="4 8"
                                    style={{ vectorEffect: 'non-scaling-stroke' }}
                                />
                            </svg>
                        </div>

                        {/* High-End Interactive Level Nodes */}
                        <div className="relative z-10 flex flex-col items-center space-y-12">
                            {mapNodes.map((node, i) => {
                                const isEven = i % 2 === 0;
                                return (
                                    <motion.div
                                        key={node.levelNumber}
                                        initial={{ opacity: 0, scale: 0.8, y: 20 }}
                                        whileInView={{ opacity: 1, scale: 1, y: 0 }}
                                        viewport={{ once: true, margin: "-50px" }}
                                        className={`relative w-full flex ${isEven ? 'justify-end pr-10' : 'justify-start pl-10'}`}
                                    >
                                        <button
                                            disabled={node.isLocked}
                                            onClick={() => node.battle && navigate(`/student/vocab-battle/play/${node.battle.id}`)}
                                            className={`
                                                relative w-22 h-22 sm:w-26 sm:h-26 rounded-[2.5rem] flex flex-col items-center justify-center transition-all duration-500 group
                                                shadow-[0_20px_40px_-10px_rgba(0,0,0,0.5)] border-2
                                                ${node.isLocked 
                                                    ? 'bg-black/60 backdrop-blur-xl border-white/5 text-white/20 cursor-not-allowed' 
                                                    : 'bg-white border-white text-emerald-950 hover:scale-110 active:scale-95 shadow-emerald-500/20'
                                                }
                                            `}
                                        >
                                            <div className={`absolute -top-3 px-3 py-1 rounded-full text-[9px] font-black tracking-widest border shadow-lg ${node.isLocked ? 'bg-black/80 border-white/5 text-white/30' : 'bg-emerald-600 border-white text-white'}`}>
                                                LVL {node.levelNumber}
                                            </div>
                                            
                                            <div className={`text-4xl font-black italic ${node.isLocked ? 'blur-[1px]' : 'drop-shadow-sm'}`}>
                                                {node.levelNumber}
                                            </div>

                                            {!node.isLocked && (
                                                <div className="flex gap-0.5 mt-1">
                                                    {[1, 2, 3].map(s => (
                                                        <Star 
                                                            key={s} 
                                                            size={12} 
                                                            className={s <= node.stars ? "fill-yellow-400 text-yellow-500 drop-shadow-md" : "fill-gray-100 text-gray-200"} 
                                                        />
                                                    ))}
                                                </div>
                                            )}

                                            {!node.isLocked && node.stars === 0 && (
                                                <div className="absolute -inset-1.5 rounded-[2.8rem] border-2 border-emerald-400 animate-ping opacity-30 pointer-events-none" />
                                            )}

                                            {/* Battle Indicator Tooltip */}
                                            {!node.isLocked && (
                                                <div className={`absolute top-1/2 -translate-y-1/2 min-w-max transition-all opacity-0 group-hover:opacity-100 hidden sm:flex
                                                    ${isEven ? 'right-[115%] pr-4' : 'left-[115%] pl-4'}`}
                                                >
                                                    <div className="bg-white/95 backdrop-blur-xl border border-white p-3 rounded-2xl shadow-2xl flex items-center gap-3">
                                                        <div className="flex flex-col">
                                                            <span className="text-[10px] text-emerald-600 font-black uppercase tracking-wider">Mavzu:</span>
                                                            <span className="text-xs text-emerald-950 font-black">{node.battle?.title || "Sarguzasht"}</span>
                                                        </div>
                                                        <ChevronRight size={16} className="text-emerald-500" />
                                                    </div>
                                                </div>
                                            )}
                                        </button>
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

