import React from 'react';
import { Trophy, ShoppingBag, BookOpen, Swords } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const NavGrid: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="grid grid-cols-2 gap-3">
            <button
                onClick={() => navigate('/student/leaderboard')}
                className="p-6 rounded-3xl shadow-sm border flex flex-col items-center gap-3 transition-colors group"
                style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}
            >
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform" style={{ backgroundColor: 'var(--bg-color)', color: 'var(--primary-color)' }}>
                    < Trophy size={24} />
                </div>
                <span className="font-bold text-sm" style={{ color: 'var(--text-color)' }}>Peshqadamlar</span>
            </button>
            <button
                onClick={() => navigate('/student/shop')}
                className="p-6 rounded-3xl shadow-sm border flex flex-col items-center gap-3 transition-colors group"
                style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}
            >
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform" style={{ backgroundColor: 'var(--bg-color)', color: 'var(--emerald-500, #10b981)' }}>
                    <ShoppingBag size={24} />
                </div>
                <span className="font-bold text-sm" style={{ color: 'var(--text-color)' }}>Do'kon</span>
            </button>
            <button
                onClick={() => navigate('/student/practice')}
                className="p-6 rounded-3xl shadow-sm border flex flex-col items-center gap-3 transition-colors group"
                style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}
            >
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform" style={{ backgroundColor: 'var(--bg-color)', color: 'var(--primary-color)' }}>
                    <BookOpen size={24} />
                </div>
                <span className="font-bold text-sm" style={{ color: 'var(--text-color)' }}>Mashqlar</span>
            </button>
            <button
                onClick={() => navigate('/student/duels')}
                className="p-6 rounded-3xl shadow-sm border flex flex-col items-center gap-3 transition-colors group"
                style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}
            >
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform" style={{ backgroundColor: 'var(--bg-color)', color: 'var(--rose-500, #f43f5e)' }}>
                    <Swords size={24} />
                </div>
                <span className="font-bold text-sm" style={{ color: 'var(--text-color)' }}>Duellar</span>
            </button>
        </div>
    );
};

export default React.memo(NavGrid);
