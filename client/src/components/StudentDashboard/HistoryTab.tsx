import React from 'react';
import { History, Calendar, Gamepad2 } from 'lucide-react';

interface HistoryTabProps {
    history: any[];
}

const HistoryTab: React.FC<HistoryTabProps> = ({ history }) => {
    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('uz-UZ', {
            day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
        });
    };

    return (
        <div className="space-y-3 pb-20">
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2 mb-4">
                <History className="text-indigo-600" />
                O'yinlar Tarixi
            </h2>
            {history.length > 0 ? (
                history.map((game, idx) => (
                    <div key={idx} className="p-4 rounded-2xl border shadow-sm flex items-center justify-between transition-colors" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
                        <div>
                            <h4 className="font-bold text-sm mb-1" style={{ color: 'var(--text-color)' }}>{game.quiz_title}</h4>
                            <div className="flex items-center gap-2 text-xs font-medium opacity-50" style={{ color: 'var(--text-color)' }}>
                                <Calendar size={12} />
                                {formatDate(game.created_at)}
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-sm font-black" style={{ color: 'var(--primary-color)' }}>+{game.score} XP</div>
                            <div className="flex flex-col items-end gap-1 mt-1">
                                <div className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${game.percentage >= 70 ? 'bg-emerald-100 text-emerald-700' :
                                    'bg-rose-100 text-rose-700'
                                    }`}>
                                    {Math.round(game.percentage)}%
                                </div>
                                {game.total_questions > 0 && (
                                    <span className="text-[10px] font-bold opacity-40" style={{ color: 'var(--text-color)' }}>
                                        {Math.round(game.score)} / {game.total_questions}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                ))
            ) : (
                <div className="text-center py-12 text-slate-400 bg-white rounded-3xl border border-slate-100">
                    <Gamepad2 size={48} className="mx-auto mb-3 opacity-20" />
                    <p>Hozircha o'yinlar yo'q</p>
                </div>
            )}
        </div>
    );
};

export default React.memo(HistoryTab);
