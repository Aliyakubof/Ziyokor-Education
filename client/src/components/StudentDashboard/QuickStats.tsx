import React from 'react';
import { Coins, BookOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface QuickStatsProps {
    coins: number;
}

const QuickStats: React.FC<QuickStatsProps> = ({ coins }) => {
    const navigate = useNavigate();

    return (
        <div className="grid grid-cols-2 gap-3">
            <div 
                className="p-4 rounded-2xl shadow-sm border flex flex-col justify-center items-center text-center transition-colors" 
                style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}
            >
                <div 
                    className="w-10 h-10 rounded-full flex items-center justify-center mb-2" 
                    style={{ backgroundColor: 'var(--bg-color)', color: 'var(--primary-color)' }}
                >
                    <Coins size={20} />
                </div>
                <span className="text-2xl font-black" style={{ color: 'var(--text-color)' }}>{(coins ?? 0).toLocaleString()}</span>
                <span className="text-xs font-bold opacity-60" style={{ color: 'var(--text-color)' }}>Tangalar</span>
            </div>
            <button
                onClick={() => navigate('/student/vocab-battles')}
                className="p-4 rounded-2xl shadow-sm border flex flex-col justify-center items-center text-center transition-colors group"
                style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}
            >
                <div 
                    className="w-10 h-10 rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition-transform" 
                    style={{ backgroundColor: 'var(--bg-color)', color: 'var(--accent-color)' }}
                >
                    <BookOpen size={20} />
                </div>
                <span className="text-lg font-black leading-none" style={{ color: 'var(--text-color)' }}>Vocab Battle</span>
                <span className="text-[10px] font-bold uppercase mt-1 opacity-60" style={{ color: 'var(--text-color)' }}>O'ynash</span>
            </button>
        </div>
    );
};

export default React.memo(QuickStats);
