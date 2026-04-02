import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../api';
import { useAuth } from '../AuthContext';
import { ArrowLeft, Star, Sparkles, Swords, Trophy } from 'lucide-react';
import { motion } from 'framer-motion';

// Ambient magical particles removed in favor of holographic map elements

export default function VocabularyBattleLevels() {
    const navigate = useNavigate();
    const { user, activeThemeId } = useAuth();
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
                            Vocab Battle
                        </h2>
                    </div>
                    <div className="w-10"></div>
                </div>
            </header>

            {/* Fully Enriched & Mobile Responsive Theme Maps */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 bg-[var(--bg-color)]">
                {activeThemeId === 'theme-emerald' ? (
                    <div className="absolute inset-0 pointer-events-none overflow-hidden">
                        {/* Deep Forest Gradient Base */}
                        <div className="absolute inset-0 bg-gradient-to-t from-[var(--primary-color)]/20 to-transparent" />
                        
                        {/* Huge Full-screen Topo Forest Hills */}
                        <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMax slice" className="absolute bottom-0 w-full h-[80vh] opacity-[0.25] mix-blend-screen">
                             <path d="M-20,60 Q15,10 50,45 T120,25 L120,100 L-20,100 Z" fill="var(--secondary-color)"/>
                             <path d="M-20,75 Q25,35 60,65 T120,45 L120,100 L-20,100 Z" fill="var(--primary-color)"/>
                             <path d="M-20,95 Q40,55 80,85 T130,55 L130,100 L-20,100 Z" fill="var(--accent-color)"/>
                        </svg>

                        {/* Magical Fireflies */}
                        {Array.from({ length: 30 }).map((_, i) => (
                            <div key={i} className="absolute rounded-full bg-green-200 shadow-[0_0_12px_4px_rgba(7ade80,0.4)] animate-[float-up_10s_ease-in-out_infinite]" 
                                style={{
                                    width: Math.random() * 4 + 2 + 'px', 
                                    height: Math.random() * 4 + 2 + 'px',
                                    left: `${Math.random() * 100}%`, 
                                    animationDuration: `${Math.random() * 5 + 8}s`,
                                    animationDelay: `-${Math.random() * 10}s`
                                }} 
                            />
                        ))}
                    </div>
                ) : activeThemeId === 'theme-sunset' ? (
                    <div className="absolute inset-0 pointer-events-none overflow-hidden bg-gradient-to-t from-[var(--primary-color)]/10 to-transparent">
                        {/* Giant Sun */}
                        <div className="absolute top-[-10%] right-[-10%] w-[80vw] h-[80vw] max-w-[600px] max-h-[600px] rounded-full blur-3xl opacity-40 bg-[var(--accent-color)]" />
                        <div className="absolute top-[5%] right-[5%] w-[40vw] h-[40vw] max-w-[200px] max-h-[200px] rounded-full blur-xl opacity-80 bg-gradient-to-br from-yellow-300 to-[var(--primary-color)]" />
                        
                        {/* Infinite Pyramids/Dunes */}
                        <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMax slice" className="absolute bottom-0 w-full h-[70vh] opacity-[0.25] mix-blend-multiply">
                             <polygon points="-10,120 15,35 45,75 75,25 110,90 110,120" fill="var(--secondary-color)"/>
                             <polygon points="-10,120 0,55 30,85 65,35 95,75 120,45 120,120" fill="var(--primary-color)"/>
                             <polygon points="-10,120 25,75 55,100 85,55 120,90 120,120" fill="var(--accent-color)"/>
                        </svg>

                        {/* Mirage floating light specks */}
                        {Array.from({ length: 15 }).map((_, i) => (
                            <div key={i} className="absolute rounded-full bg-orange-200 blur-[2px] animate-[platform-float_8s_ease-in-out_infinite]" style={{ width: Math.random()*8+4+'px', height: Math.random()*8+4+'px', left: Math.random()*100+'%', top: Math.random()*40+60+'%', animationDelay: `-${Math.random()*10}s` }} />
                        ))}
                    </div>
                ) : activeThemeId === 'theme-cyber' ? (
                    <div className="absolute inset-0 pointer-events-none overflow-hidden bg-slate-950">
                        {/* Deep Space Radial */}
                        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,var(--primary-color)_200%)] opacity-30" />
                        
                        {/* Huge HUD Grid Perspective */}
                        <div className="absolute inset-0 opacity-[0.25]" style={{
                            backgroundImage: `linear-gradient(var(--accent-color) 2px, transparent 2px), linear-gradient(90deg, var(--accent-color) 2px, transparent 2px)`,
                            backgroundSize: '50px 50px',
                            transform: 'perspective(800px) rotateX(60deg) scale(2.5) translateY(-50%)',
                            transformOrigin: 'top center'
                        }} />
                        
                        {/* Scanning HUD Vertical Wave */}
                        <div className="absolute top-0 w-full h-[15vh] bg-gradient-to-b from-transparent to-[var(--primary-color)] opacity-40 animate-[scanline_4s_linear_infinite]" />
                        
                        {/* Floating Digital Data Squares */}
                        {Array.from({ length: 20 }).map((_, i) => (
                            <div key={i} className="absolute border flex items-center justify-center opacity-30 mix-blend-screen animate-pulse" 
                                style={{ 
                                    left: Math.random()*100+'%', top: Math.random()*100+'%', 
                                    width: Math.random()*80+20+'px', height: Math.random()*80+20+'px', 
                                    borderRadius: Math.random() > 0.6 ? '50%' : '15%',
                                    borderColor: 'var(--primary-color)'
                                }}>
                                {Math.random() > 0.7 && <div className="w-[10%] h-[10%] rounded-full bg-[var(--accent-color)] opacity-50" />}
                            </div>
                        ))}
                    </div>
                ) : activeThemeId === 'theme-sakura' ? (
                    <div className="absolute inset-0 pointer-events-none overflow-hidden bg-gradient-to-b from-transparent to-[var(--primary-color)]/10">
                        {/* Deep Sun / Giant Sakura Base */}
                        <div className="absolute bottom-[-20%] left-[-20%] w-[100vw] h-[100vw] rounded-full blur-3xl opacity-30 bg-gradient-to-tr from-[var(--secondary-color)] to-[var(--primary-color)]" />
                        
                        {/* Soft Japanese Cloud Vectors */}
                        <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMax slice" className="absolute bottom-0 w-full h-[60vh] opacity-30 mix-blend-multiply">
                             <circle cx="-10" cy="90" r="35" fill="var(--primary-color)"/>
                             <circle cx="30" cy="85" r="45" fill="var(--secondary-color)"/>
                             <circle cx="70" cy="95" r="40" fill="var(--accent-color)"/>
                             <circle cx="120" cy="80" r="50" fill="var(--primary-color)"/>
                        </svg>

                        {/* Sakura Petals continuously falling */}
                        {Array.from({ length: 40 }).map((_, i) => (
                            <div key={i} className="absolute bg-[var(--accent-color)] opacity-50 rounded-tl-full rounded-br-full rounded-tr-md rounded-bl-md animate-[float-up_12s_linear_infinite]" 
                                style={{ 
                                    width: Math.random()*8+6+'px', height: Math.random()*8+6+'px', 
                                    left: `${Math.random()*120 - 10}%`, 
                                    animationDuration: `${Math.random()*10+8}s`,
                                    animationDelay: `-${Math.random()*15}s`,
                                    transform: `rotate(${Math.random()*360}deg)`
                                }} />
                        ))}
                    </div>
                ) : activeThemeId === 'theme-ocean' ? (
                    <div className="absolute inset-0 pointer-events-none overflow-hidden bg-gradient-to-b from-[var(--bg-color)] to-[var(--primary-color)]/30">
                        {/* Water Surface Waves */}
                        <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMin slice" className="absolute top-0 w-full h-[25vh] opacity-[0.25] mix-blend-multiply">
                             <path d="M-10,0 L120,0 L120,20 Q80,35 50,20 T-10,15 Z" fill="var(--secondary-color)"/>
                             <path d="M-10,0 L120,0 L120,30 Q80,10 50,30 T-10,25 Z" fill="var(--accent-color)" opacity="0.6"/>
                        </svg>

                        {/* Light rays penetrating deep ocean */}
                        <div className="absolute inset-0 opacity-20 mix-blend-screen" style={{ background: 'repeating-linear-gradient(160deg, transparent, transparent 15vh, var(--accent-color) 16vh, transparent 17vh)' }} />
                        
                        {/* Deep Sea Trenches */}
                        <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMax slice" className="absolute bottom-0 w-full h-[60vh] opacity-30 mix-blend-multiply">
                             <path d="M-20,100 L-20,55 Q15,75 50,45 T130,65 L130,100 Z" fill="var(--primary-color)"/>
                             <path d="M-20,100 L-20,75 Q25,95 60,70 T130,85 L130,100 Z" fill="var(--secondary-color)"/>
                        </svg>

                        {/* Rising Bubbles */}
                        {Array.from({ length: 30 }).map((_, i) => (
                            <div key={i} className="absolute rounded-full border-[2px] border-[var(--accent-color)] opacity-50 animate-[float-up_8s_ease-in_infinite]" 
                                style={{ 
                                    width: Math.random()*12+4+'px', height: Math.random()*12+4+'px', 
                                    left: `${Math.random() * 100}%`, 
                                    animationDuration: `${Math.random()*8+6}s`,
                                    animationDelay: `-${Math.random()*10}s` 
                                }} />
                        ))}
                    </div>
                ) : (
                    // Default Classic Cartographic Explorer Map
                    <div className="absolute inset-0 pointer-events-none overflow-hidden bg-[var(--bg-color)]">
                        {/* Beautiful Cartographic Grid Pattern */}
                        <div className="absolute inset-0 opacity-[0.06]" style={{
                            backgroundImage: `linear-gradient(var(--text-color) 1px, transparent 1px), linear-gradient(90deg, var(--text-color) 1px, transparent 1px)`,
                            backgroundSize: '100px 100px',
                            backgroundPosition: 'center center'
                        }} />
                        <div className="absolute inset-0 opacity-[0.02]" style={{
                            backgroundImage: `linear-gradient(var(--text-color) 1px, transparent 1px), linear-gradient(90deg, var(--text-color) 1px, transparent 1px)`,
                            backgroundSize: '20px 20px',
                            backgroundPosition: 'center center'
                        }} />
                        
                        {/* Huge Compass & Geography Data Rings */}
                        <div className="absolute top-[-5%] right-[-15%] w-[80vw] h-[80vw] max-w-[800px] max-h-[800px] border-[1px] border-dashed rounded-full opacity-10 animate-[spin_120s_linear_infinite]" style={{ borderColor: 'var(--primary-color)' }} />
                        <div className="absolute bottom-[-10%] left-[-20%] w-[100vw] h-[100vw] max-w-[1000px] max-h-[1000px] border-[2px] border-dotted rounded-full opacity-[0.05] animate-[spin_90s_reverse_linear_infinite]" style={{ borderColor: 'var(--text-color)' }} />
                        
                        {/* Structured Low-Poly Modern Path Vectors */}
                        <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMax slice" className="absolute bottom-0 w-full h-[60vh] opacity-[0.25] mix-blend-multiply">
                            <polygon points="-20,100 -20,40 10,25 35,55 55,20 75,65 95,30 120,50 120,100" fill="var(--primary-color)" />
                            <polygon points="-20,100 -20,60 15,35 45,75 70,25 90,60 120,45 120,100" fill="var(--secondary-color)" opacity="0.6"/>
                            <polygon points="-20,100 -20,80 20,55 55,85 85,45 120,65 120,100" fill="var(--accent-color)" opacity="0.4"/>
                        </svg>
                    </div>
                )}
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

            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes dash {
                    to {
                        stroke-dashoffset: -1000;
                    }
                }
                .floating-platform {
                    animation: platform-float 5s ease-in-out infinite;
                }
                @keyframes platform-float {
                    0%, 100% { transform: translateY(0px) rotate(0deg); }
                    50% { transform: translateY(-15px) rotate(1deg); }
                }
                @keyframes scanline {
                    0% { transform: translateY(-100%); opacity: 0; }
                    20% { opacity: 0.5; }
                    100% { transform: translateY(110vh); opacity: 0; }
                }
                @keyframes float-up {
                    0% { transform: translateY(110vh) scale(0.6); opacity: 0; }
                    20% { opacity: 0.8; }
                    80% { opacity: 0.8; }
                    100% { transform: translateY(-20vh) scale(1.4); opacity: 0; }
                }
            `}} />
        </div>
    );
}

