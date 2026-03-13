import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../api';
import { useAuth } from '../AuthContext';
import { ArrowLeft, Lock, Star, Flower2 } from 'lucide-react';
import { motion, useScroll, useTransform } from 'framer-motion';
import springMap from '../assets/map_spring.png';

// Falling Petal Component
const FallingPetal = ({ delay }: { delay: number }) => {
    const randomX = Math.random() * 100;
    const duration = 10 + Math.random() * 10;
    
    return (
        <motion.div
            initial={{ y: -20, x: `${randomX}%`, opacity: 0, rotate: 0 }}
            animate={{ 
                y: '110vh', 
                x: `${randomX + (Math.random() * 20 - 10)}%`, // Slight horizontal drift
                opacity: [0, 0.8, 0.8, 0],
                rotate: 720
            }}
            transition={{ 
                duration, 
                repeat: Infinity, 
                delay, 
                ease: "linear" 
            }}
            className="absolute w-3 h-3 bg-pink-200/60 rounded-full blur-[1px] pointer-events-none z-1"
            style={{ borderRadius: '40% 60% 50% 50%' }} // Petal shape
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
    const bgY = useTransform(scrollY, [0, 2000], [0, 400]);

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
        <div className="min-h-screen bg-[#e8f5e9] flex flex-col font-sans selection:bg-pink-100 selection:text-pink-900 relative overflow-hidden">
            {/* Spring Map Background with Parallax */}
            <motion.div 
                style={{ 
                    backgroundImage: `url(${springMap})`,
                    y: bgY
                }}
                className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-80 z-0 scale-110"
            />
            
            {/* Soft Spring Overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-white/10 via-transparent to-[#c8e6c9]/30 z-0" />

            {/* Falling Petals Animation */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden z-2">
                {Array.from({ length: 25 }).map((_, i) => (
                    <FallingPetal key={i} delay={i * 0.8} />
                ))}
            </div>

            {/* Header */}
            <header className="sticky top-0 z-40 bg-white/40 backdrop-blur-md border-b border-pink-100">
                <div className="px-4 h-16 flex items-center justify-between mx-auto w-full max-w-lg">
                    <button
                        onClick={() => navigate('/student/dashboard')}
                        className="w-10 h-10 flex items-center justify-center rounded-full bg-white/80 border border-pink-200 text-pink-500 hover:bg-pink-50 active:scale-95 transition-all shadow-sm"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="flex-1 text-center font-black text-xl text-emerald-800 uppercase tracking-widest drop-shadow-sm">
                        Bahorgi Jang
                    </div>
                    <div className="w-10"></div>
                </div>
            </header>

            <main className="flex-1 relative z-10 overflow-x-hidden overflow-y-auto px-4 py-8 sm:px-6 custom-scrollbar pb-32 w-full max-w-lg mx-auto flex flex-col items-center">
                <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="mb-8 text-center relative z-10 w-full"
                >
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/90 backdrop-blur-md rounded-2xl shadow-sm border border-emerald-100 mb-4">
                        <Flower2 className="text-pink-400 animate-pulse" size={20} />
                        <span className="text-emerald-900 font-black text-sm uppercase tracking-wider">Bahor Fasli</span>
                    </div>
                    <h1 className="text-4xl font-black text-emerald-900 tracking-tight drop-shadow-sm leading-none">
                        Bilim Bog'i
                    </h1>
                </motion.div>

                {!isActive ? (
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex-1 flex flex-col items-center justify-center -mt-20 px-4"
                    >
                         <div className="bg-white/80 backdrop-blur-2xl p-10 rounded-[3rem] border border-pink-50 text-center shadow-xl space-y-6">
                             <div className="text-6xl animate-bounce">🌸</div>
                             <div>
                                <h2 className="text-3xl font-black text-emerald-900 mb-3 tracking-tighter">Yaqinda...</h2>
                                <p className="text-emerald-800/70 font-medium max-w-[200px] mx-auto text-sm leading-relaxed">
                                    Bog'da yangi gullar ochilmoqda. Tez orada janglar boshlanadi!
                                </p>
                             </div>
                         </div>
                    </motion.div>
                ) : loading ? (
                    <div className="text-center py-20 text-emerald-800/30 font-black animate-pulse text-xl">Bog' yuklanmoqda...</div>
                ) : (
                    <div className="relative w-full flex flex-col items-center">
                        {/* Winding path line */}
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
                                    stroke="rgba(16, 185, 129, 0.3)"
                                    strokeWidth="3"
                                    strokeDasharray="1 10"
                                    strokeLinecap="round"
                                    style={{ vectorEffect: 'non-scaling-stroke' }}
                                />
                            </svg>
                        </div>

                        {/* Staggered nodes */}
                        <div className="flex flex-col w-full relative z-10 space-y-12 sm:space-y-14 pb-16 pt-4">
                            {mapNodes.map((node, i) => {
                                const offsetClass = i % 2 !== 0 ? 'mr-auto ml-4 sm:ml-12' : 'ml-auto mr-4 sm:mr-12';
                                return (
                                    <motion.div 
                                        key={node.levelNumber}
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        whileInView={{ opacity: 1, scale: 1 }}
                                        viewport={{ once: true, margin: "-50px" }}
                                        className={`relative group w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0 ${offsetClass}`}
                                    >
                                        <button
                                            disabled={node.isLocked}
                                            onClick={() => node.battle && navigate(`/student/vocab-battle/play/${node.battle.id}`)}
                                            className={`
                                                absolute inset-0 rounded-full flex flex-col items-center justify-center gap-1 transition-all duration-300
                                                shadow-lg border-4
                                                ${node.isLocked
                                                    ? 'bg-white/40 backdrop-blur-sm border-gray-100 text-gray-300 cursor-not-allowed shadow-none'
                                                    : 'bg-white border-emerald-400 text-emerald-700 hover:border-pink-400 hover:scale-110 active:scale-95 cursor-pointer shadow-emerald-200/50 z-10'
                                                }
                                            `}
                                        >
                                            <div className={`absolute -top-3 px-2 py-0.5 rounded-full shadow-sm border font-black tracking-widest uppercase text-[8px] ${node.isLocked ? 'bg-gray-100 border-gray-200 text-gray-400' : 'bg-emerald-500 border-emerald-400 text-white'}`}>
                                                {node.isLocked ? <Lock size={8} className="inline mr-0.5" /> : <Flower2 size={8} className="inline mr-0.5" />}
                                                Lv.{node.levelNumber}
                                            </div>
                                            
                                            <div className="text-2xl sm:text-3xl font-black drop-shadow-sm leading-none">
                                                {node.levelNumber}
                                            </div>

                                            {!node.isLocked && (
                                                <div className="flex gap-0.5">
                                                    {Array.from({ length: 3 }).map((_, starIdx) => (
                                                        <Star 
                                                            key={starIdx} 
                                                            size={10} 
                                                            className={starIdx < node.stars ? "fill-pink-400 text-pink-500" : "fill-gray-100 text-gray-200"} 
                                                        />
                                                    ))}
                                                </div>
                                            )}
                                        </button>
                                        
                                        {!node.isLocked && (
                                            <div className="absolute -inset-2 rounded-full border border-pink-200 animate-ping opacity-20 pointer-events-none" />
                                        )}

                                        {!node.isLocked && (
                                            <div className={`absolute top-1/2 -mt-4 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none min-w-max bg-white/95 backdrop-blur text-emerald-900 text-[10px] font-black py-2 px-3 rounded-xl shadow-xl z-20 whitespace-nowrap
                                                ${i % 2 === 0 ? 'left-full ml-3' : 'right-full mr-3'}`}
                                            >
                                                {node.battle?.title || "Boshlash"}
                                                <div className={`absolute top-1/2 -mt-1 w-2 h-2 bg-white transform rotate-45 ${i % 2 === 0 ? '-left-1' : '-right-1'}`}></div>
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
