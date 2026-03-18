import React from 'react';
import { motion } from 'framer-motion';
import { Swords, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface BattleCardProps {
    battle: any;
    groupId: string;
    isLoading: boolean;
}

const BattleCard: React.FC<BattleCardProps> = ({ battle, groupId, isLoading }) => {
    const navigate = useNavigate();

    const isWeekend = () => {
        const day = new Date().getDay();
        return day === 0 || day === 6;
    };

    if (isLoading && !battle) {
        return <div className="w-full h-[160px] bg-white/5 backdrop-blur-md rounded-3xl animate-skeleton border border-white/10"></div>;
    }

    if (!battle) return null;

    return (
        <div className="min-h-[160px]">
            <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate(`/student/battle/${battle.id}`)}
                className="relative group cursor-pointer"
            >
                {/* Glow effect behind the card */}
                <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-rose-500 rounded-3xl blur opacity-30 group-hover:opacity-50 transition duration-500"></div>

                <div className="relative bg-indigo-950/40 backdrop-blur-xl rounded-3xl p-5 border border-white/10 shadow-2xl overflow-hidden">
                    {/* Animated stripes background */}
                    <div className="absolute inset-0 opacity-10 bg-[linear-gradient(45deg,rgba(255,255,255,0.1)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.1)_50%,rgba(255,255,255,0.1)_75%,transparent_75%,transparent)] bg-[length:20px_20px] animate-shimmer pointer-events-none"></div>

                    <div className="flex justify-between items-center mb-4 relative z-10">
                        <span className="flex items-center gap-2 bg-indigo-500/20 px-3 py-1 rounded-full border border-indigo-400/30">
                            <Swords size={14} className="text-indigo-400 animate-bounce" />
                            <span className="text-[10px] font-black text-indigo-100 uppercase tracking-widest">Haftalik Battle</span>
                        </span>

                        <div className="flex items-center gap-2">
                            {isWeekend() && (
                                <motion.span
                                    animate={{ scale: [1, 1.1, 1] }}
                                    transition={{ duration: 2, repeat: Infinity }}
                                    className="bg-orange-500 text-[9px] font-black px-2 py-0.5 rounded-full shadow-lg shadow-orange-500/30"
                                >
                                    Double XP 🔥
                                </motion.span>
                            )}
                            <div className="w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center">
                                <ChevronRight size={14} className="text-white/50 group-hover:text-white transition-colors" />
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-between gap-4 mb-5 relative z-10">
                        {/* Our Group */}
                        <div className="flex-1 text-center">
                            <h4 className="text-xs font-black text-white/90 uppercase tracking-tight truncate leading-tight mb-0.5">
                                {battle.group_a_id === groupId ? battle.group_a_name : battle.group_b_name}
                            </h4>
                            <p className="text-[8px] font-bold text-indigo-300/60 uppercase truncate">Sizning Guruhingiz</p>
                            <div className="mt-2 text-xl font-black text-indigo-400 tabular-nums">
                                {battle.group_a_id === groupId ? battle.score_a.toLocaleString() : battle.score_b.toLocaleString()}
                            </div>
                        </div>

                        {/* VS Icon */}
                        <div className="flex flex-col items-center">
                            <div className="w-10 h-10 rounded-full bg-slate-900 border border-white/10 flex items-center justify-center shadow-xl">
                                <span className="text-xs font-black italic text-transparent bg-clip-text bg-gradient-to-tr from-indigo-400 to-rose-400">VS</span>
                            </div>
                        </div>

                        {/* Opponent Group */}
                        <div className="flex-1 text-center">
                            <h4 className="text-xs font-black text-white/90 uppercase tracking-tight truncate leading-tight mb-0.5">
                                {battle.group_a_id === groupId ? battle.group_b_name : battle.group_a_name}
                            </h4>
                            <p className="text-[8px] font-bold text-rose-300/60 uppercase truncate">
                                Ustoz: {battle.group_a_id === groupId ? battle.teacher_b_name : battle.teacher_a_name}
                            </p>
                            <div className="mt-2 text-xl font-black text-rose-400 tabular-nums">
                                {battle.group_a_id === groupId ? battle.score_b.toLocaleString() : battle.score_a.toLocaleString()}
                            </div>
                        </div>
                    </div>

                    {/* Mini Power Meter */}
                    <div className="relative h-2.5 bg-black/40 rounded-full overflow-hidden flex border border-white/5">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.round(((battle.group_a_id === groupId ? battle.score_a : battle.score_b) / (battle.score_a + battle.score_b || 1)) * 100)}%` }}
                            transition={{ duration: 1.5, ease: "circOut" }}
                            className="h-full bg-gradient-to-r from-indigo-600 to-indigo-400"
                        ></motion.div>
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${100 - Math.round(((battle.group_a_id === groupId ? battle.score_a : battle.score_b) / (battle.score_a + battle.score_b || 1)) * 100)}%` }}
                            transition={{ duration: 1.5, ease: "circOut" }}
                            className="h-full bg-gradient-to-l from-rose-600 to-rose-400"
                        ></motion.div>
                        <div className="absolute top-0 bottom-0 w-0.5 bg-white/20 left-[50%] -translate-x-1/2"></div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default React.memo(BattleCard);
