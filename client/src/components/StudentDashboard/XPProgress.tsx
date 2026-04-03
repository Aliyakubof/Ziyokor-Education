import React from 'react';

interface XPProgressProps {
    totalScore: number;
    isLoading: boolean;
}

const XPProgress: React.FC<XPProgressProps> = ({ totalScore, isLoading }) => {
    // Level Calculation (Simple logic: 1000 XP = 1 Level)
    const level = Math.floor(totalScore / 1000) + 1;
    const currentLevelProgress = totalScore % 1000;
    const progressPercent = (currentLevelProgress / 1000) * 100;

    return (
        <div 
            className="rounded-2xl p-4 border min-h-[120px] mb-6 transition-all duration-500"
            style={{ 
                backgroundColor: 'var(--card-bg)', 
                borderColor: 'var(--border-color)',
                boxShadow: `0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 0 40px -5px var(--primary-color)22` 
            }}
        >
            {isLoading && !totalScore ? (
                <div className="animate-skeleton space-y-3">
                    <div className="flex justify-between items-end">
                        <div className="w-20 h-8 bg-white/20 rounded"></div>
                        <div className="w-16 h-8 bg-white/20 rounded"></div>
                    </div>
                    <div className="w-full bg-white/10 h-3 rounded-full"></div>
                </div>
            ) : (
                <>
                    <div className="flex justify-between items-end mb-2 relative z-10">
                        <div>
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">Daraja</span>
                            <div className="text-4xl font-black flex items-center gap-2" style={{ color: 'var(--text-color)' }}>
                                {level} <span className="text-sm font-bold opacity-60 mt-2">Level</span>
                            </div>
                        </div>
                        <div className="text-right">
                            <span className="text-3xl font-black" style={{ color: 'var(--primary-color)' }}>{(totalScore ?? 0).toLocaleString()}</span>
                            <span className="text-[10px] font-black opacity-40 block uppercase tracking-wider">Total XP</span>
                        </div>
                    </div>
                    <div className="w-full bg-black/20 rounded-full h-3 overflow-hidden">
                        <div
                            className="bg-gradient-to-r from-yellow-400 to-orange-500 h-full rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(250,204,21,0.5)]"
                            style={{ width: `${progressPercent}%` }}
                        ></div>
                    </div>
                    <div className="flex justify-between text-[10px] font-black mt-1.5 uppercase tracking-widest opacity-40">
                        <span>{currentLevelProgress} XP</span>
                        <span>{1000 - currentLevelProgress} XP to Lvl {level + 1}</span>
                    </div>
                </>
            )}
        </div>
    );
};

export default React.memo(XPProgress);
