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

            {/* Programmatic Magical Sky & Coded Landscape -> HOLOGRAPHIC TOPO MAP */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden z-0" style={{ background: 'var(--bg-color)' }}>
                {/* Dotted Coordinate Grid (Map look) */}
                <div className="absolute inset-0 opacity-[0.1]" style={{
                    backgroundImage: `radial-gradient(var(--text-color) 1px, transparent 1px)`,
                    backgroundSize: '40px 40px',
                    transform: 'perspective(1000px) rotateX(40deg) scale(2.5) translateY(-20%)',
                    transformOrigin: 'top center'
                }} />

                {/* Topographic Contour Lines (Repeated Radial Gradients) */}
                <div className="absolute -inset-[50%] mix-blend-screen opacity-20 pointer-events-none animate-[pulse_10s_ease-in-out_infinite]" style={{
                    backgroundImage: `
                        repeating-radial-gradient(circle at 30% 70%, transparent 0, transparent 30px, var(--primary-color) 31px, transparent 32px),
                        repeating-radial-gradient(circle at 70% 30%, transparent 0, transparent 40px, var(--secondary-color) 41px, transparent 42px)
                    `,
                    backgroundSize: '100% 100%',
                    filter: 'drop-shadow(0 0 10px var(--primary-color))',
                    transform: 'perspective(500px) rotateX(30deg) scale(1.5)',
                }} />

                {/* Radar Sweep Effect */}
                <div className="absolute left-[30%] top-[70%] w-[150vw] h-[150vw] -translate-x-1/2 -translate-y-1/2 opacity-10 pointer-events-none overflow-hidden rounded-full">
                    <div className="absolute inset-0 origin-center animate-[spin_8s_linear_infinite]" style={{
                        background: `conic-gradient(from 0deg, transparent 70%, var(--accent-color) 100%)`
                    }} />
                </div>

                {/* Glowing Map Coordinate overlay rings */}
                <div className="absolute top-0 right-0 w-[40vw] h-[40vw] max-w-[500px] max-h-[500px] border border-dashed rounded-full opacity-10 animate-[spin_60s_linear_infinite]" style={{ borderColor: 'var(--text-color)', transform: 'translate(30%, -30%)' }} />
                <div className="absolute bottom-0 left-0 w-[60vw] h-[60vw] max-w-[800px] max-h-[800px] border-2 rounded-full opacity-5 animate-[spin_40s_linear_infinite]" style={{ borderColor: 'var(--primary-color)', transform: 'translate(-20%, 20%)', borderStyle: 'dotted' }} />

                {/* Ambient Colored Orbs for Depth */}
                <div className="absolute inset-0 opacity-30 mix-blend-screen"
                    style={{ background: `radial-gradient(circle at 20% 30%, var(--primary-color) 0%, transparent 40%), radial-gradient(circle at 80% 70%, var(--secondary-color) 0%, transparent 40%)` }} 
                />
                
                {/* Floating Map Data Nodes */}
                {Array.from({ length: 15 }).map((_, i) => {
                    const size = Math.random() * 4 + 2;
                    return (
                        <div key={i} className="absolute rounded-sm opacity-30 animate-pulse" style={{
                            width: size, height: size,
                            backgroundColor: 'var(--text-color)',
                            left: `${Math.random() * 100}%`,
                            top: `${Math.random() * 100}%`,
                            animationDelay: `${Math.random() * 2}s`
                        }} />
                    )
                })}
            </div>

            {/* Scrollable Main Area */}
            <main className="flex-1 w-full overflow-y-auto overflow-x-hidden custom-scrollbar pt-16 pb-10" style={{ backgroundColor: 'var(--bg-color)' }}>
                
                {/* Full Height Inner Wrapper for Background to scroll relative to */}
                <div className="min-h-full flex flex-col relative w-full">
                    
                    {/* Glowing Magical Leyline Trail (SVG) */}
                    <div className="absolute inset-0 pointer-events-none z-10 opacity-40 overflow-visible">
                        <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                            <defs>
                                <linearGradient id="lineGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                                    <stop offset="0%" stopColor="var(--primary-color)" />
                                    <stop offset="50%" stopColor="var(--accent-color)" />
                                    <stop offset="100%" stopColor="var(--secondary-color)" />
                                </linearGradient>
                            </defs>
                            <path
                                d={`M 50 0 ${mapNodes.map((_, i) => {
                                    const side = i % 2 === 0 ? 1 : -1;
                                    const x = 50 + side * 28;
                                    const y = (i * 100) / (mapNodes.length || 1);
                                    const prevY = ((i - 1) * 100) / (mapNodes.length || 1);
                                    const midY = (y + prevY) / 2;
                                    return `C 50 ${prevY + 5}, ${x} ${midY - 5}, ${x} ${midY} C ${x} ${midY + 5}, 50 ${y - 5}, 50 ${y}`;
                                }).join(' ')}`}
                                fill="none"
                                stroke="url(#lineGrad)"
                                strokeWidth="4"
                                strokeLinecap="round"
                                strokeDasharray="10 15"
                                className="animate-[dash_60s_linear_infinite]"
                                style={{ 
                                    filter: 'blur(4px)',
                                    //@ts-ignore (for styling in react)
                                    '--dash-offset': '1000'
                                }}
                            />
                            {/* Inner sharper glowing path */}
                            <path
                                d={`M 50 0 ${mapNodes.map((_, i) => {
                                    const side = i % 2 === 0 ? 1 : -1;
                                    const x = 50 + side * 28;
                                    const y = (i * 100) / (mapNodes.length || 1);
                                    const prevY = ((i - 1) * 100) / (mapNodes.length || 1);
                                    const midY = (y + prevY) / 2;
                                    return `C 50 ${prevY + 5}, ${x} ${midY - 5}, ${x} ${midY} C ${x} ${midY + 5}, 50 ${y - 5}, 50 ${y}`;
                                }).join(' ')}`}
                                fill="none"
                                stroke="white"
                                strokeWidth="1"
                                opacity="0.3"
                                strokeDasharray="5 10"
                            />
                        </svg>
                    </div>

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
                                                    ? 'opacity-40 cursor-not-allowed grayscale' 
                                                    : 'hover:scale-110 active:scale-95'
                                                }
                                            `}
                                            style={{ 
                                                backgroundColor: 'var(--card-bg)', 
                                                borderColor: node.isLocked ? 'var(--border-color)' : 'var(--primary-color)',
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

