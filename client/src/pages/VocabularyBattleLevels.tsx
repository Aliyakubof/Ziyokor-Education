import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../api';
import { useAuth } from '../AuthContext';
import { ArrowLeft, Lock, Star } from 'lucide-react';

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
        <div className="min-h-screen bg-slate-50 flex flex-col font-sans selection:bg-indigo-100 selection:text-indigo-900">
            {/* Header */}
            <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-slate-200/50">
                <div className="px-4 h-16 sm:h-20 flex items-center justify-between mx-auto w-full">
                    <button
                        onClick={() => navigate('/student/dashboard')}
                        className="w-10 h-10 flex items-center justify-center rounded-2xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-indigo-600 active:scale-95 transition-all shadow-sm"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="flex-1 text-center font-black text-lg text-slate-800 uppercase tracking-widest drop-shadow-sm">
                        Lug'at Battle
                    </div>
                    <div className="w-10"></div> {/* Spacer for center alignment */}
                </div>
            </header>

            <main className="flex-1 overflow-x-hidden overflow-y-auto px-4 py-12 sm:px-6 custom-scrollbar pb-32 w-full max-w-lg mx-auto relative flex flex-col items-center">
                <div className="mb-12 text-center relative z-10 w-full">
                    <h1 className="text-3xl font-black text-slate-800 tracking-tight mb-2">Bosqichlar Xaritasi</h1>
                    <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Cho'qqiga qadar yetib boring!</p>
                </div>

                {loading ? (
                    <div className="text-center py-20 text-slate-400 font-bold animate-pulse">Yuklanmoqda...</div>
                ) : (
                    <div className="relative w-full flex flex-col items-center">
                        {/* Winding dashed line behind the nodes */}
                        <div className="absolute inset-0 w-full h-full pointer-events-none -z-0">
                            <svg className="w-full h-full stroke-slate-200" preserveAspectRatio="none">
                                <path
                                    d="M 50% 0 Q 80% 5%, 50% 10% T 50% 20% T 50% 30% T 50% 40% T 50% 50% T 50% 60% T 50% 70% T 50% 80% T 50% 90% T 50% 100%"
                                    fill="none"
                                    strokeWidth="4"
                                    strokeDasharray="12 12"
                                    style={{
                                        vectorEffect: 'non-scaling-stroke',
                                        d: "path('M 50% 0 " + mapNodes.map((_, i) => {
                                            if (i === 0) return '';
                                            const direction = i % 2 === 0 ? '-40%' : '40%';
                                            return `Q calc(50% + ${direction}) ${(i * 100) / mapNodes.length - 2}%, 50% ${(i * 100) / mapNodes.length}%`;
                                        }).join(' ') + "')"
                                    }}
                                />
                            </svg>
                        </div>

                        {/* Staggered nodes */}
                        <div className="flex flex-col w-full relative z-10 space-y-10 sm:space-y-12 pb-16 pt-8">
                            {mapNodes.map((node, i) => {
                                // Reverse direction for staggering if needed, since i is now 0-29 (top to bottom)
                                const offsetClass = i % 2 !== 0 ? 'mr-auto ml-8 sm:ml-16' : 'ml-auto mr-8 sm:mr-16';
                                return (
                                    <div key={node.levelNumber} className={`relative group w-24 h-24 sm:w-28 sm:h-28 flex-shrink-0 ${offsetClass}`}>
                                        <button
                                            disabled={node.isLocked}
                                            onClick={() => node.battle && navigate(`/student/vocab-battle/play/${node.battle.id}`)}
                                            className={`
                                                absolute inset-0 rounded-[2.5rem] flex flex-col items-center justify-center gap-1.5 transition-all duration-300
                                                shadow-xl border-4
                                                ${node.isLocked
                                                    ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                                                    : 'bg-white border-indigo-400 text-indigo-600 hover:border-indigo-500 hover:bg-indigo-50 hover:-translate-y-2 hover:scale-105 active:scale-95 cursor-pointer shadow-indigo-500/20 shadow-2xl z-10'
                                                }
                                            `}
                                        >
                                            <div className="absolute -top-4 bg-white px-3 py-1 rounded-full shadow-md border border-slate-100 text-[10px] font-black tracking-widest uppercase">
                                                {node.isLocked ? (
                                                    <span className="text-slate-400 flex items-center gap-1"><Lock size={10} /> Yopiq</span>
                                                ) : (
                                                    <span className="text-indigo-500">Ochiq</span>
                                                )}
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
                                            <div className="absolute top-1/2 -mt-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none min-w-max bg-slate-800 text-white text-xs font-bold py-2 px-4 rounded-xl shadow-xl z-20 whitespace-nowrap
                                                ${i % 2 === 0 ? 'left-full ml-4' : 'right-full mr-4'}"
                                            >
                                                {node.battle?.title || "Boshlash"}
                                                <div className={`absolute top-1/2 -mt-1 w-2 h-2 bg-slate-800 transform rotate-45 ${i % 2 === 0 ? '-left-1' : '-right-1'}`}></div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
