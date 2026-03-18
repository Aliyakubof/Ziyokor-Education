import React from 'react';
import { Trophy } from 'lucide-react';

interface RankCardProps {
    stats: {
        rank: number;
        gamesPlayed: number;
        isHero?: boolean;
        hasTrophy?: boolean;
    };
}

const RankCard: React.FC<RankCardProps> = ({ stats }) => {
    return (
        <div className="p-4 rounded-2xl shadow-sm border flex items-center justify-between px-6 relative overflow-hidden transition-colors" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
            {stats.isHero && (
                <div className="absolute top-0 right-0 bg-yellow-400 text-slate-900 text-[10px] font-black px-3 py-1 rounded-bl-xl shadow-md uppercase tracking-tighter">
                    Hafta Qahramoni 🎖️
                </div>
            )}
            <div className="flex items-center gap-4">
                <div className={`w-12 h-12 ${stats.hasTrophy ? 'bg-amber-100 text-amber-600' : 'bg-slate-100/50 text-slate-400'} rounded-2xl flex items-center justify-center`}>
                    <Trophy size={28} className={stats.hasTrophy ? 'animate-bounce' : ''} />
                </div>
                <div>
                    <h4 className="font-black" style={{ color: 'var(--text-color)' }}>#{stats.rank}</h4>
                    <p className="text-[10px] font-bold uppercase tracking-widest opacity-50" style={{ color: 'var(--text-color)' }}>Global O'rin</p>
                </div>
            </div>
            <div className="text-right">
                <div className="text-sm font-black text-emerald-600">{stats.gamesPlayed}</div>
                <p className="text-[10px] font-bold uppercase tracking-widest opacity-50" style={{ color: 'var(--text-color)' }}>O'yinlar</p>
            </div>
        </div>
    );
};

export default React.memo(RankCard);
