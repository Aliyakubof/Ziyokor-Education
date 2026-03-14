import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../api';
import { useAuth } from '../AuthContext';
import { ArrowLeft, Star, Sparkles, Swords } from 'lucide-react';
import { motion } from 'framer-motion';

// Atmospheric Particle (Fireflies/Stars)
const Particle = ({ delay }: { delay: number }) => {
    return (
        <motion.div
            initial={{ 
                x: `${Math.random() * 100}%`, 
                y: '110%', 
                opacity: 0,
                scale: Math.random() * 0.5 + 0.5
            }}
            animate={{ 
                y: '-10%',
                opacity: [0, 0.4, 0.4, 0],
                x: [`${Math.random() * 100}%`, `${Math.random() * 100}%`]
            }}
            transition={{ 
                duration: 15 + Math.random() * 10,
                repeat: Infinity,
                delay,
                ease: "linear"
            }}
            className="absolute w-1 h-1 bg-emerald-300 rounded-full blur-[1px] pointer-events-none z-0"
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
        <div className="min-h-screen flex flex-col font-sans selection:text-white relative overflow-hidden transition-colors duration-500" style={{ backgroundColor: 'var(--bg-color)', color: 'var(--text-color)' }}>
            {/* Immersive Background System */}
            <div className="fixed inset-0 z-0">
                {/* Deep Radial Gradient */}
                <div className="absolute inset-0 transition-opacity duration-500" style={{ background: `radial-gradient(circle at 50% -20%, var(--primary-color) 0%, var(--bg-color) 70%)`, opacity: 0.2 }} />
                
                {/* Nebula Glows */}
                <div className="absolute top-[30%] -left-[10%] w-[60%] h-[60%] blur-[150px] rounded-full mix-blend-screen opacity-10" style={{ backgroundColor: 'var(--primary-color)' }} />
                <div className="absolute bottom-[20%] -right-[10%] w-[50%] h-[50%] blur-[120px] rounded-full mix-blend-screen opacity-10" style={{ backgroundColor: 'var(--secondary-color)' }} />
                
                {/* Dynamic Particles */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    {Array.from({ length: 40 }).map((_, i) => (
                        <Particle key={i} delay={i * 0.8} />
                    ))}
                </div>
            </div>

            {/* Simple Premium Header */}
                        <header className="sticky top-0 z-40 backdrop-blur-xl border-b transition-colors" style={{ backgroundColor: 'rgba(0,0,0,0.1)', borderColor: 'var(--border-color)' }}>
                <div className="px-5 h-16 flex items-center justify-between mx-auto w-full max-w-lg">
                    <button
                        onClick={() => navigate('/student/dashboard')}
                        className="w-10 h-10 flex items-center justify-center rounded-xl border transition-all active:scale-90"
                        style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)', color: 'var(--primary-color)' }}
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="flex-1 text-center">
                        <h2 className="text-xl font-black uppercase tracking-[0.2em] font-serif italic drop-shadow-2xl" style={{ color: 'var(--text-color)' }}>
                            Vocabulary battle
                        </h2>
                    </div>
                    <div className="w-10"></div>
                </div>
            </header>

            <main className="flex-1 relative z-10 px-4 py-12 w-full max-w-lg mx-auto overflow-x-hidden overflow-y-auto custom-scrollbar">
                {!isActive ? (
                    <div className="flex flex-col items-center justify-center py-40 text-center animate-in fade-in zoom-in duration-700">
                         <div className="relative group">
                            <div className="absolute inset-0 bg-emerald-500/20 blur-3xl rounded-full scale-150 group-hover:bg-emerald-500/30 transition-all duration-500" />
                            <div className="relative bg-black/40 backdrop-blur-3xl p-14 rounded-[4rem] border border-white/10 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.5)]">
                                <Sparkles className="text-emerald-400 w-16 h-16 mx-auto mb-8 animate-pulse" />
                                <h3 className="text-4xl font-black text-white mb-4 italic tracking-tighter uppercase">TEZ ORADA...</h3>
                                <p className="text-emerald-100/40 font-medium max-w-[240px] mx-auto text-base leading-relaxed">
                                    Xarita yangi darajalar bilan to'ldirilmoqda. O'z bilimingizni boyitib turing!
                                </p>
                            </div>
                         </div>
                    </div>
                ) : loading ? (
                    <div className="flex flex-col items-center justify-center py-20 text-emerald-500/20">
                        <div className="w-10 h-10 border-2 border-current border-t-transparent rounded-full animate-spin mb-4" />
                        <span className="font-black uppercase tracking-[0.3em] text-[10px]">Loading Galaxy...</span>
                    </div>
                ) : (
                    <div className="relative pt-4 pb-48">
                        {/* Winding Neon Energy Path */}
                        <div className="absolute inset-0 pointer-events-none opacity-40">
                            <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                                <defs>
                                    <linearGradient id="neonPath" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="var(--primary-color)" />
                                        <stop offset="100%" stopColor="var(--secondary-color)" />
                                    </linearGradient>
                                    <filter id="neonGlow">
                                        <feGaussianBlur stdDeviation="1.5" result="blur" />
                                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                                    </filter>
                                </defs>
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
                                    stroke="url(#neonPath)"
                                    strokeWidth="3"
                                    filter="url(#neonGlow)"
                                    strokeDasharray="0.5 12"
                                    strokeLinecap="round"
                                    style={{ vectorEffect: 'non-scaling-stroke' }}
                                />
                            </svg>
                        </div>

                        {/* Interactive Galaxy Level Nodes */}
                        <div className="relative z-10 flex flex-col items-center space-y-14">
                            {mapNodes.map((node, i) => {
                                const isEven = i % 2 === 0;
                                return (
                                    <motion.div
                                        key={node.levelNumber}
                                        initial={{ opacity: 0, scale: 0.8, x: isEven ? 60 : -60 }}
                                        whileInView={{ opacity: 1, scale: 1, x: 0 }}
                                        viewport={{ once: true, margin: "-100px" }}
                                        className={`relative w-full flex ${isEven ? 'justify-end pr-10' : 'justify-start pl-10'}`}
                                    >
                                        <button
                                            disabled={node.isLocked}
                                            onClick={() => node.battle && navigate(`/student/vocab-battle/play/${node.battle.id}`)}
                                            className={`
                                                relative w-24 h-24 sm:w-28 sm:h-28 rounded-[2.5rem] flex flex-col items-center justify-center transition-all duration-500 group
                                                shadow-[0_20px_50px_-10px_rgba(0,0,0,0.6)] border transition-colors
                                                ${node.isLocked 
                                                    ? 'opacity-20 cursor-not-allowed grayscale' 
                                                    : 'hover:scale-110 active:scale-95'
                                                }
                                            `}
                                            style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)', color: 'var(--text-color)' }}
                                        >
                                            <div className={`
                                                absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[9px] font-black tracking-widest border transition-all duration-500
                                                ${node.isLocked 
                                                    ? 'opacity-50' 
                                                    : 'text-white shadow-lg'
                                                }
                                            `} style={{ backgroundColor: node.isLocked ? 'var(--bg-color)' : 'var(--primary-color)', borderColor: 'var(--border-color)' }}>
                                                LVL {node.levelNumber}
                                            </div>
                                            
                                            <div className={`text-5xl font-black italic tracking-tighter ${node.isLocked ? 'blur-[1px]' : 'drop-shadow-[0_0_15px_rgba(255,255,255,0.4)]'}`}>
                                                {node.levelNumber}
                                            </div>

                                            {!node.isLocked && (
                                                <div className="flex gap-1 mt-1">
                                                    {[1, 2, 3].map(s => (
                                                        <Star 
                                                            key={s} 
                                                            size={12} 
                                                            className={s <= node.stars ? "drop-shadow-[0_0_8px_rgba(52,211,153,0.6)]" : "opacity-10 fill-transparent"} 
                                                            style={{ color: s <= node.stars ? 'var(--primary-color)' : 'var(--text-color)', fill: s <= node.stars ? 'var(--primary-color)' : 'transparent' }}
                                                        />
                                                    ))}
                                                </div>
                                            )}

                                            {/* Particle Inner Glow for Active Nodes */}
                                            {!node.isLocked && (
                                                <div className="absolute inset-0 rounded-[2.5rem] bg-emerald-500/5 blur-xl group-hover:bg-emerald-500/10 transition-all duration-500" />
                                            )}

                                            {/* Pulsing Outer Core for Current Level */}
                                            {!node.isLocked && node.stars === 0 && (
                                                <div className="absolute -inset-1 rounded-[2.7rem] border border-emerald-400/30 animate-[ping_3s_infinite] pointer-events-none" />
                                            )}

                                            {/* Desktop Battle Tooltip */}
                                            {!node.isLocked && (
                                                <div className={`
                                                    absolute top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all duration-300 hidden sm:flex pointer-events-none
                                                    ${isEven ? 'right-[115%] pr-6' : 'left-[115%] pl-6'}
                                                `}>
                                                    <div className="bg-black/80 backdrop-blur-3xl border border-white/10 p-4 rounded-3xl shadow-2xl flex flex-col items-start min-w-[140px]">
                                                        <span className="text-[10px] text-emerald-400 font-black uppercase tracking-widest mb-1">Mavzu:</span>
                                                        <span className="text-sm text-white font-bold leading-tight">{node.battle?.title || "Jang Maydoni"}</span>
                                                        <div className="flex items-center gap-2 mt-3 text-[9px] text-white/40 font-black uppercase tracking-widest">
                                                            <Swords size={12} />
                                                            <span>Boshlaymizmi?</span>
                                                        </div>
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

            {/* Bottom Ambient Fade */}
            <div className="fixed bottom-0 left-0 right-0 h-40 pointer-events-none z-30 transition-all duration-500" style={{ background: `linear-gradient(to top, var(--bg-color), transparent)` }} />
        </div>
    );
}

