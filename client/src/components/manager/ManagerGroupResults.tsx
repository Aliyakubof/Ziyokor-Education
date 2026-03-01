import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../api';
import { History, Medal } from 'lucide-react';

interface Group {
    id: string;
    name: string;
}

interface Result {
    id: string;
    quiz_title: string;
    total_questions: number;
    created_at: string;
    player_results: any[];
}

interface ManagerGroupResultsProps {
    group: Group;
    onBack: () => void;
}

const ManagerGroupResults: React.FC<ManagerGroupResultsProps> = ({ group, onBack }) => {
    const [results, setResults] = useState<Result[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchResults = async () => {
            try {
                const res = await apiFetch(`/api/manager/groups/${group.id}/results`);
                const data = await res.json();
                setResults(Array.isArray(data) ? data : []);
            } catch (err) {
                console.error('Error fetching group results:', err);
                setResults([]);
            } finally {
                setLoading(false);
            }
        };
        fetchResults();
    }, [group.id]);

    const calculateAverage = (players: any[], totalQuestions: number) => {
        if (!players || players.length === 0 || totalQuestions === 0) return 0;
        const totalScore = players.reduce((sum, p) => sum + (Number(p.score) || 0), 0);
        const maxPossibleAll = players.length * totalQuestions;
        return Math.round((totalScore / maxPossibleAll) * 100);
    };

    return (
        <div className="animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-200">
                <div>
                    <button onClick={onBack} className="text-slate-500 hover:text-indigo-600 font-medium text-sm flex items-center gap-2 mb-2 transition-colors">
                        ← Orqaga
                    </button>
                    <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3">
                        <History className="text-teal-600" /> {group.name} - Unit Test Natijalari
                    </h2>
                </div>
            </div>

            {loading ? (
                <div className="text-center py-12">Yuklanmoqda...</div>
            ) : results.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 rounded-2xl border border-slate-200 text-slate-500 font-medium">
                    Oxirgi olingan test natijalari topilmadi.
                </div>
            ) : (
                <div className="space-y-4">
                    {results.map((result) => {
                        const avgScore = calculateAverage(result.player_results, result.total_questions);

                        return (
                            <div key={result.id} className="bg-white border text-left border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow group/item">
                                <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-4">
                                    <div>
                                        <h3 className="text-xl font-bold text-slate-800 mb-1">{result.quiz_title}</h3>
                                        <p className="text-slate-500 text-sm font-medium">Sana: {new Date(result.created_at).toLocaleString('uz-UZ')}</p>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="bg-slate-50 border border-slate-200 px-4 py-2 rounded-xl text-center">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">O'rtacha Ball</p>
                                            <p className={`text-lg font-black ${avgScore >= 70 ? 'text-teal-600' : avgScore >= 40 ? 'text-orange-500' : 'text-red-500'}`}>
                                                {avgScore}%
                                            </p>
                                        </div>
                                        <div className="bg-indigo-50 text-indigo-700 px-4 py-2 rounded-xl border border-indigo-100 font-bold text-center">
                                            <p className="text-[10px] uppercase tracking-widest font-black text-indigo-400 mb-1">Qatnashdi</p>
                                            <p className="text-lg leading-none">{result.player_results?.length || 0} ta</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-4 pt-4 border-t border-slate-100">
                                    <div className="flex items-center gap-2 mb-3 text-slate-700 font-bold text-sm uppercase tracking-widest">
                                        <Medal size={16} className="text-orange-500" />
                                        O'quvchilar natijalari:
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                                        {(result.player_results || []).map((player: any, idx: number) => {
                                            const pScore = Number(player.score) || 0;
                                            const pMax = result.total_questions || 1;
                                            const pPercentage = Math.round((pScore / pMax) * 100);
                                            return (
                                                <div key={idx} className="bg-slate-50 p-3 rounded-lg flex justify-between items-center border border-slate-100 hover:border-indigo-200 transition-colors">
                                                    <span className="font-semibold text-slate-800 text-sm truncate max-w-[120px]" title={player.name || 'Noma\'lum'}>
                                                        {player.name || 'Noma\'lum'}
                                                    </span>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs font-bold text-slate-500 bg-slate-200 px-2 py-0.5 rounded">{pScore}/{pMax}</span>
                                                        <span className={`text-xs font-black px-2 py-0.5 rounded border ${pPercentage >= 70 ? 'bg-teal-50 text-teal-700 border-teal-200' : pPercentage >= 40 ? 'bg-orange-50 text-orange-600 border-orange-200' : 'bg-red-50 text-red-600 border-red-200'}`}>
                                                            {pPercentage}%
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default ManagerGroupResults;
