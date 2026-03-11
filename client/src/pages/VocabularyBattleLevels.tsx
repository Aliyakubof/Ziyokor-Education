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
                <div className="px-4 h-16 sm:h-20 flex items-center justify-between max-w-4xl mx-auto w-full">
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

            <main className="flex-1 overflow-y-auto px-4 py-8 sm:px-6 custom-scrollbar pb-32 max-w-4xl mx-auto w-full">
                <div className="mb-8 text-center">
                    <h1 className="text-3xl font-black text-slate-800 tracking-tight mb-2">Bosqichlarni Tanlang</h1>
                    <p className="text-slate-500 font-medium">Barcha 30 ta qismni tugatishga harakat qiling!</p>
                </div>

                {loading ? (
                    <div className="text-center py-20 text-slate-400 font-bold animate-pulse">Yuklanmoqda...</div>
                ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4 sm:gap-6">
                        {mapNodes.map((node) => (
                            <button
                                key={node.levelNumber}
                                disabled={node.isLocked}
                                onClick={() => node.battle && navigate(`/student/vocab-battle/play/${node.battle.id}`)}
                                className={`
                                    relative aspect-square rounded-[2rem] flex flex-col items-center justify-center gap-2 transition-all duration-300
                                    ${node.isLocked
                                        ? 'bg-slate-100 border-2 border-slate-200 text-slate-400 cursor-not-allowed opacity-75'
                                        : 'bg-white border-2 border-indigo-200 text-indigo-600 hover:border-indigo-400 hover:bg-indigo-50 hover:-translate-y-1 hover:shadow-xl hover:shadow-indigo-500/20 active:scale-95 cursor-pointer shadow-sm'
                                    }
                                `}
                            >
                                {node.isLocked ? (
                                    <>
                                        <Lock size={24} className="opacity-50" />
                                        <span className="font-black text-xl">{node.levelNumber}</span>
                                    </>
                                ) : (
                                    <>
                                        <div className="absolute top-3 right-3 flex gap-0.5">
                                            {Array.from({ length: 3 }).map((_, i) => (
                                                <Star 
                                                    key={i} 
                                                    size={14} 
                                                    className={i < node.stars ? "fill-yellow-400 text-yellow-500 drop-shadow-sm scale-110" : "fill-slate-100 text-slate-200"} 
                                                />
                                            ))}
                                        </div>
                                        <div className="text-3xl font-black drop-shadow-sm">{node.levelNumber}</div>
                                        <div className="text-[10px] font-black uppercase tracking-widest px-2 text-center line-clamp-1 opacity-70">
                                            {node.battle?.title || "Boshlash"}
                                        </div>
                                    </>
                                )}
                            </button>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
