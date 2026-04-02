import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../api';
import { useAuth } from '../AuthContext';
import { ArrowLeft, Star, Sparkles, Swords, Trophy } from 'lucide-react';
import { motion } from 'framer-motion';

// Ambient magical particles removed in favor of holographic map elements

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

    const mapNodes = levels.map((battle) => {
        return {
            levelNumber: battle.level,
            battle,
            isLocked: battle.isLocked,
            stars: battle.stars || 0
        };
    });

    return (
        <div className="min-h-screen flex flex-col font-sans selection:text-white relative overflow-hidden transition-colors duration-500" style={{ backgroundColor: 'var(--bg-color)', color: 'var(--text-color)' }}>
            
            {/* Header - Fixed to top */}
            <header className="absolute top-0 left-0 right-0 z-50 backdrop-blur-xl border-b transition-colors shadow-sm" style={{ backgroundColor: 'rgba(0,0,0,0.15)', borderColor: 'var(--border-color)' }}>
                <div className="px-5 h-16 flex items-center justify-between mx-auto w-full max-w-lg">
                    <button
                        onClick={() => navigate('/student/dashboard')}
                        className="w-10 h-10 flex items-center justify-center rounded-2xl border transition-all active:scale-90 hover:scale-105"
                        style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)', color: 'var(--primary-color)' }}
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="flex-1 text-center">
                        <h2 className="text-xl font-black uppercase tracking-[0.2em] font-serif italic drop-shadow-lg" style={{ color: 'var(--text-color)' }}>
                            Xarita
                        </h2>
                    </div>
                    <div className="w-10"></div>
                </div>
            </header>

            {/* Clean Map Background */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden z-0" style={{ background: 'var(--bg-color)' }}>
                {/* Subtle Map Grid */}
                <div className="absolute inset-0 opacity-[0.03]" style={{
                    backgroundImage: `linear-gradient(var(--text-color) 2px, transparent 2px), linear-gradient(90deg, var(--text-color) 2px, transparent 2px)`,
                    backgroundSize: '80px 80px',
                    transform: 'perspective(1000px) rotateX(45deg) scale(2) translateY(-20%)',
                    transformOrigin: 'top center'
                }} />

                {/* Soft landscape gradient mountains */}
                <div className="absolute bottom-0 w-full h-[40vh] md:h-[50vh] opacity-20 mix-blend-screen overflow-hidden">
                    <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMax slice" className="w-full h-full absolute bottom-0 object-bottom">
                        <defs>
                            <linearGradient id="grad1" x1="0%" y1="0%" x2="0%" y2="100%">
                                <stop offset="0%" stopColor="var(--primary-color)" />
                                <stop offset="100%" stopColor="transparent" />
                            </linearGradient>
                            <linearGradient id="grad2" x1="0%" y1="0%" x2="0%" y2="100%">
                                <stop offset="0%" stopColor="var(--secondary-color)" />
                                <stop offset="100%" stopColor="transparent" />
                            </linearGradient>
                            <linearGradient id="grad3" x1="0%" y1="0%" x2="0%" y2="100%">
                                <stop offset="0%" stopColor="var(--accent-color)" />
                                <stop offset="100%" stopColor="transparent" />
                            </linearGradient>
                        </defs>
                        <polygon points="-20,100 -20,50 15,30 30,60 45,20 60,70 80,35 120,55 120,100" fill="url(#grad1)" />
                        <polygon points="-20,100 -20,65 20,40 40,80 65,30 85,65 120,45 120,100" fill="url(#grad2)" />
                        <polygon points="-20,100 -20,80 25,60 50,75 75,50 120,70 120,100" fill="url(#grad3)" />
                    </svg>
                </div>
            </div>

            {/* Scrollable Main Area */}
            <main className="flex-1 w-full overflow-y-auto overflow-x-hidden custom-scrollbar pt-16 pb-10" style={{ backgroundColor: 'var(--bg-color)' }}>
                
                {/* Full Height Inner Wrapper for Background to scroll relative to */}
                <div className="min-h-full flex flex-col relative w-full">
                    
                    {/* Connected Road (Replaces the downward stretched paper trail) */}
                    {/* The original full-height SVG trail caused stretched lines on mobile, we removed it for a cleaner approach */}

                    {/* Centered Content Container for Nodes */}
                    <div className="relative z-20 w-full max-w-lg mx-auto flex-1 px-4 py-12 flex flex-col">
                        {!isActive ? (
                            <div className="flex flex-col items-center justify-center py-40 text-center animate-in fade-in zoom-in duration-700">
                                 <div className="relative group">
                                    <div className="absolute inset-0 blur-3xl rounded-full scale-150 transition-all duration-500 opacity-30" style={{ backgroundColor: 'var(--primary-color)' }} />
                                    <div className="relative p-10 rounded-[3rem] border shadow-[0_40px_80px_-20px_rgba(0,0,0,0.5)] backdrop-blur-md" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
                                        <Sparkles className="w-16 h-16 mx-auto mb-6 animate-[spin_4s_linear_infinite]" style={{ color: 'var(--primary-color)' }} />
                                        <h3 className="text-3xl font-black mb-3 italic tracking-tighter uppercase" style={{ color: 'var(--text-color)' }}>Tez orada...</h3>
                                        <p className="font-medium max-w-[240px] mx-auto text-sm leading-relaxed opacity-60" style={{ color: 'var(--text-color)' }}>
                                            Yangi sarguzasht xaritasi o'rganilmoqda. Qaytib keling!
                                        </p>
                                    </div>
                                 </div>
                            </div>
                        ) : loading ? (
                    <div className="flex flex-col items-center justify-center py-40">
                        <div className="w-12 h-12 border-4 border-t-transparent rounded-full animate-spin mb-4" style={{ borderColor: 'var(--primary-color)', borderTopColor: 'transparent' }} />
                        <span className="font-black uppercase tracking-[0.3em] text-[10px] opacity-50" style={{ color: 'var(--text-color)' }}>Xarita yuklanmoqda...</span>
                    </div>
                ) : (
                    <div className="relative pt-8 pb-48">

                        {/* Interactive Map Nodes */}
                        <div className="relative z-10 flex flex-col items-center space-y-16">
                            {mapNodes.map((node, i) => {
                                const isEven = i % 2 === 0;
                                const isCurrent = !node.isLocked && node.stars === 0;
                                
                                return (
                                    <motion.div
                                        key={node.levelNumber}
                                        initial={{ opacity: 0, scale: 0.8, x: isEven ? 40 : -40 }}
                                        whileInView={{ opacity: 1, scale: 1, x: 0 }}
                                        viewport={{ once: true, margin: "-100px" }}
                                        className={`relative w-full flex ${isEven ? 'justify-end pr-10' : 'justify-start pl-10'}`}
                                    >
                                        <button
                                            disabled={node.isLocked}
                                            onClick={() => node.battle && navigate(`/student/vocab-battle/play/${node.battle.id}`)}
                                            className={`
                                                relative w-24 h-24 sm:w-28 sm:h-28 rounded-3xl flex flex-col items-center justify-center transition-all duration-500 group
                                                shadow-[0_20px_50px_-10px_rgba(0,0,0,0.6)] border-b-4 border-r-2 transition-transform floating-platform
                                                ${node.isLocked 
                                                    ? 'opacity-75 grayscale-[50%] shadow-none scale-95 border-dashed cursor-not-allowed' 
                                                    : 'hover:scale-110 active:scale-95 z-20'
                                                }
                                            `}
                                            style={{ 
                                                backgroundColor: node.isLocked ? 'var(--bg-color)' : 'var(--card-bg)', 
                                                borderColor: node.isLocked ? 'var(--text-color)' : 'var(--primary-color)',
                                                color: 'var(--text-color)',
                                                animationDelay: `${i * 0.3}s`
                                            }}
                                        >
                                            {/* Top Pin Label */}
                                            <div className={`
                                                absolute -top-4 shadow-lg px-4 py-1.5 rounded-full text-[10px] sm:text-xs font-black tracking-widest border transition-all duration-500
                                                ${node.isLocked ? 'opacity-0' : 'flex items-center gap-1'}
                                            `} style={{ backgroundColor: 'var(--primary-color)', borderColor: 'var(--border-color)', color: '#fff' }}>
                                                {node.stars === 3 && <Trophy size={10} />} LVL {node.levelNumber}
                                            </div>
                                            
                                            {/* Level Number */}
                                            <div className={`text-5xl font-black italic tracking-tighter transition-all ${node.isLocked ? 'opacity-30' : 'drop-shadow-[0_0_15px_rgba(255,255,255,0.4)]'}`} style={{ color: node.isLocked ? 'var(--text-color)' : 'var(--primary-color)' }}>
                                                {node.levelNumber}
                                            </div>

                                            {/* Stars Status */}
                                            {!node.isLocked && (
                                                <div className="absolute -bottom-3 bg-[var(--card-bg)] border px-3 py-1 rounded-full flex gap-1 shadow-sm" style={{ borderColor: 'var(--border-color)' }}>
                                                    {[1, 2, 3].map(s => (
                                                        <Star 
                                                            key={s} 
                                                            size={12} 
                                                            className={`transition-colors ${s <= node.stars ? "filter drop-shadow-md" : "opacity-20"}`}
                                                            style={{ 
                                                                color: s <= node.stars ? '#f59e0b' : 'var(--text-color)', 
                                                                fill: s <= node.stars ? '#f59e0b' : 'transparent' 
                                                            }}
                                                        />
                                                    ))}
                                                </div>
                                            )}

                                            {/* Current Level Pulsing Halo */}
                                            {isCurrent && (
                                                <div className="absolute -inset-2 rounded-[2rem] border-2 animate-[ping_2s_infinite] pointer-events-none" style={{ borderColor: 'var(--primary-color)', opacity: 0.6 }} />
                                            )}

                                            {/* Desktop Battle Tooltip */}
                                            {!node.isLocked && (
                                                <div className={`
                                                    absolute top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all duration-300 hidden sm:flex pointer-events-none z-20
                                                    ${isEven ? 'right-[120%] pr-4' : 'left-[120%] pl-4'}
                                                `}>
                                                    <div className="p-4 rounded-3xl shadow-2xl border flex flex-col min-w-[150px] whitespace-nowrap" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--primary-color)' }}>
                                                        <span className="text-[9px] font-black uppercase tracking-widest mb-1 opacity-60" style={{ color: 'var(--text-color)' }}>Sarguzasht:</span>
                                                        <span className="text-sm font-bold leading-tight truncate" style={{ color: 'var(--text-color)' }}>{node.battle?.title || "Jang Maydoni"}</span>
                                                        <div className="flex items-center gap-1.5 mt-3 text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--primary-color)' }}>
                                                            <Swords size={14} />
                                                            <span>Jangga kirish</span>
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
                    </div>
                </div>
            </main>

            {/* Bottom Ambient Fade */}
            <div className="fixed bottom-0 left-0 right-0 h-48 pointer-events-none z-30 transition-all duration-500" style={{ background: `linear-gradient(to top, var(--bg-color), transparent)` }} />

            <style dangerouslySetInnerHTML={{ __html: `
                @keyframes dash {
                    to {
                        stroke-dashoffset: -1000;
                    }
                }
                .floating-platform {
                    animation: platform-float 5s ease-in-out infinite;
                }
                @keyframes platform-float {
                    0%, 100% { transform: translateY(0px); }
                    50% { transform: translateY(-10px); }
                }
            `}} />
        </div>
    );
}

