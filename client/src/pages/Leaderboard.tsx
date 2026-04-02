import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { apiFetch } from '../api';
import { Trophy, Medal, ChevronLeft, Users, Globe, Flame, Coins, Swords, ShieldAlert } from 'lucide-react';
import { socket } from '../socket';

export default function Leaderboard() {
    const { user, role } = useAuth();
    const navigate = useNavigate();
    const [view, setView] = useState<'global' | 'group' | 'battles'>('global');
    const [type, setType] = useState<'coins' | 'streaks' | 'vocab'>('coins');
    const [data, setData] = useState<any[]>([]);
    const [battleData, setBattleData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [challengingId, setChallengingId] = useState<string | null>(null);
    const [selectingQuizForTarget, setSelectingQuizForTarget] = useState<{id: string, name: string} | null>(null);
    const [availableQuizzes, setAvailableQuizzes] = useState<any[]>([]);
    const [isLoadingQuizzes, setIsLoadingQuizzes] = useState(false);

    useEffect(() => {
        if (role === 'student' && !socket.connected) {
            socket.connect();
        }

        const onDuelStarted = ({ pin }: { pin: string }) => {
            navigate(`/unit-join/${pin}`);
        };

        socket.on('duel-started', onDuelStarted);

        return () => {
            socket.off('duel-started', onDuelStarted);
        };
    }, [role, navigate]);

    useEffect(() => {
        if (view === 'battles') {
            fetchBattles();
        } else {
            fetchLeaderboard();
        }
    }, [view, type]);

    const fetchLeaderboard = async () => {
        setLoading(true);
        try {
            let url = `/api/leaderboard?type=${type}&limit=50&view=${view}`;
            if (user?.groupId) {
                url += `&groupId=${user.groupId}`;
            }
            const res = await apiFetch(url);
            if (res.ok) setData(await res.json());
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchBattles = async () => {
        setLoading(true);
        try {
            const res = await apiFetch('/api/battles/leaderboard');
            if (res.ok) setBattleData(await res.json());
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const getRankIcon = (rank: number) => {
        if (rank === 0) return <Trophy className="text-yellow-400" size={24} />;
        if (rank === 1) return <Medal className="text-slate-300" size={24} />;
        if (rank === 2) return <Medal className="text-amber-600" size={24} />;
        return <span className="text-slate-400 font-bold">{rank + 1}</span>;
    };

    const handleChallengeClick = async (targetId: string, targetName: string) => {
        if (!user?.id) return;
        setSelectingQuizForTarget({ id: targetId, name: targetName });
        setIsLoadingQuizzes(true);
        try {
            const res = await apiFetch(`/api/students/${user.id}/available-duel-quizzes`);
            if (res.ok) setAvailableQuizzes(await res.json());
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoadingQuizzes(false);
        }
    };

    const confirmChallenge = (quizId: string, quizTitle: string) => {
        if (!user?.id || !selectingQuizForTarget) return;
        setChallengingId(selectingQuizForTarget.id);
        
        socket.emit('duel-invite', {
            targetStudentId: selectingQuizForTarget.id,
            studentName: user.name,
            quizId,
            quizTitle
        });

        setSelectingQuizForTarget(null);
        setTimeout(() => setChallengingId(null), 3000);
    };

    return (
        <div className="min-h-screen font-sans pb-10 transition-colors duration-500" style={{ backgroundColor: 'var(--bg-color)' }}>
            {/* Header */}
            <div 
                className="pt-8 pb-16 px-6 text-white relative overflow-hidden transition-all duration-500"
                style={{ background: `linear-gradient(to bottom right, var(--primary-color, #4f46e5), var(--secondary-color, #4338ca))` }}
            >
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
                <button
                    onClick={() => navigate(-1)}
                    className="mb-6 p-2 bg-white/10 rounded-xl hover:bg-white/20 transition-colors"
                >
                    <ChevronLeft size={24} />
                </button>
                <h1 className="text-3xl font-black mb-2 flex items-center gap-3">
                    <Trophy className="opacity-80" size={32} />
                    Peshqadamlar
                </h1>
                <p className="text-white/80 font-medium">Eng yaxshi o'quvchilar ro'yxati</p>
            </div>

            {/* Controls */}
            <div className="px-4 -mt-10 relative z-10 space-y-4">
                {/* Tabs */}
                <div className="p-1.5 rounded-2xl flex gap-2 transition-colors border" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
                    <button
                        onClick={() => setView('global')}
                        className={`flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${view === 'global' ? 'text-white shadow-lg' : 'opacity-50 hover:opacity-100'}`}
                        style={{ 
                            backgroundColor: view === 'global' ? 'var(--primary-color)' : 'transparent',
                            color: view === 'global' ? 'white' : 'var(--text-color)'
                        }}
                    >
                        <Globe size={18} /> Global
                    </button>
                    <button
                        onClick={() => setView('group')}
                        className={`flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${view === 'group' ? 'text-white shadow-lg' : 'opacity-50 hover:opacity-100'}`}
                        style={{ 
                            backgroundColor: view === 'group' ? 'var(--primary-color)' : 'transparent',
                            color: view === 'group' ? 'white' : 'var(--text-color)'
                        }}
                    >
                        <Users size={18} /> Guruh
                    </button>
                    <button
                        onClick={() => setView('battles')}
                        className={`flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${view === 'battles' ? 'bg-rose-600 text-white shadow-lg shadow-rose-200' : 'opacity-50 hover:opacity-100'}`}
                        style={{ 
                            color: view === 'battles' ? 'white' : 'var(--text-color)'
                        }}
                    >
                        <Swords size={18} /> Battle
                    </button>
                </div>

                {/* Type Filter (only for non-battle views) */}
                {view !== 'battles' && (
                    <div className="flex gap-2 flex-wrap">
                        <button
                            onClick={() => setType('coins')}
                            className={`px-4 py-2 rounded-full font-bold text-xs flex items-center gap-1.5 border-2 transition-all ${type === 'coins' ? 'bg-yellow-400/10 border-yellow-400 text-yellow-700' : 'bg-white border-slate-100 text-slate-400'}`}
                        >
                            <Coins size={14} /> Tangalar
                        </button>
                        <button
                            onClick={() => setType('streaks')}
                            className={`px-4 py-2 rounded-full font-bold text-xs flex items-center gap-1.5 border-2 transition-all ${type === 'streaks' ? 'bg-orange-500/10 border-orange-500 text-orange-700' : 'bg-white border-slate-100 text-slate-400'}`}
                        >
                            <Flame size={14} /> Streak
                        </button>
                        <button
                            onClick={() => setType('vocab')}
                            className={`px-4 py-2 rounded-full font-bold text-xs flex items-center gap-1.5 border-2 transition-all ${type === 'vocab' ? 'bg-emerald-500/10 border-emerald-500 text-emerald-700' : 'bg-white border-slate-100 text-slate-400'}`}
                        >
                            <Trophy size={14} /> Vocab Battle
                        </button>
                    </div>
                )}

                {/* List */}
                <div className="rounded-3xl overflow-hidden border shadow-sm transition-colors" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
                    {loading ? (
                        <div className="py-20 text-center">
                            <div className="w-10 h-10 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-4" style={{ borderColor: 'var(--primary-color)' }}></div>
                            <p className="font-medium opacity-50" style={{ color: 'var(--text-color)' }}>Yuklanmoqda...</p>
                        </div>
                    ) : view === 'battles' ? (
                        battleData.length > 0 ? (
                            <div className="divide-y divide-slate-50">
                                {battleData.map((battle: any) => {
                                    const total = battle.score_a + battle.score_b || 1;
                                    const pctA = Math.round((battle.score_a / total) * 100);
                                    const pctB = 100 - pctA;
                                    const isEqual = battle.score_a === 0 && battle.score_b === 0;
                                    return (
                                        <div
                                            key={battle.id}
                                            onClick={() => navigate(`/student/battle/${battle.id}`)}
                                            className="p-4 hover:opacity-80 cursor-pointer transition-colors border-b"
                                            style={{ borderColor: 'var(--border-color)' }}
                                        >
                                            {/* Group names */}
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    <ShieldAlert size={16} style={{ color: 'var(--primary-color)' }} />
                                                    <span className="font-black text-sm truncate max-w-[110px]" style={{ color: 'var(--text-color)' }}>{battle.group_a_name}</span>
                                                </div>
                                                <span className="text-[10px] font-black opacity-40 uppercase tracking-widest" style={{ color: 'var(--text-color)' }}>VS</span>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-black text-sm truncate max-w-[110px]" style={{ color: 'var(--text-color)' }}>{battle.group_b_name}</span>
                                                    <Flame size={16} className="text-rose-500" />
                                                </div>
                                            </div>
                                            {/* Score bar */}
                                            <div className="flex h-2.5 rounded-full overflow-hidden bg-slate-100 mb-1.5">
                                                <div
                                                    className="bg-indigo-500 transition-all duration-500"
                                                    style={{ width: `${isEqual ? 50 : pctA}%` }}
                                                />
                                                <div
                                                    className="bg-rose-500 transition-all duration-500"
                                                    style={{ width: `${isEqual ? 50 : pctB}%` }}
                                                />
                                            </div>
                                            {/* Scores */}
                                            <div className="flex justify-between text-xs font-black">
                                                <span className="text-indigo-600">{battle.score_a.toLocaleString()} XP</span>
                                                <span className="text-[10px] text-slate-400 font-semibold">{battle.level}</span>
                                                <span className="text-rose-600">{battle.score_b.toLocaleString()} XP</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="py-20 text-center px-10">
                                <Swords size={48} className="mx-auto mb-4 text-slate-200" />
                                <p className="text-slate-400 font-medium">Hozircha faol battle yo'q</p>
                            </div>
                        )
                    ) : data.length > 0 ? (
                        <div className="divide-y divide-slate-50">
                            {data.map((player, idx) => (
                                <div
                                    key={player.id}
                                    className={`flex items-center gap-4 p-4 transition-colors border-b last:border-0`}
                                    style={{ 
                                        backgroundColor: player.id === user?.id ? 'color-mix(in srgb, var(--primary-color), transparent 90%)' : 'transparent',
                                        borderColor: 'var(--border-color)'
                                    }}
                                >
                                    {/* Handle opacity for user.id match manually since style object doesn't support backgroundOpacity */}
                                    <div className="w-8 flex justify-center">
                                        {getRankIcon(idx)}
                                    </div>
                                    <div className="w-12 h-12 rounded-full overflow-hidden border-2 bg-black/5 flex-shrink-0" style={{ borderColor: 'var(--border-color)' }}>
                                        <img
                                            src={player.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${player.name}`}
                                            alt={player.name}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-bold truncate" style={{ color: 'var(--text-color)' }}>
                                            {player.name}
                                            {player.id === user?.id && <span className="ml-2 text-[10px] bg-white/20 px-1.5 py-0.5 rounded-full" style={{ color: 'inherit' }}>Siz</span>}
                                        </h3>
                                    </div>
                                    
                                    {/* Duel features temporarily removed */}

                                    <div className="text-right">
                                        {type === 'vocab' ? (
                                            <div className="flex flex-col items-end">
                                                <div className="flex items-center gap-1 font-black text-emerald-600">
                                                    {player.stats_value?.toLocaleString() || 0}
                                                    <Trophy size={14} className="text-emerald-500" />
                                                </div>
                                                <span className="text-[9px] font-bold text-slate-400 uppercase">Vocab XP</span>
                                            </div>
                                        ) : type === 'coins' ? (
                                            <div className="flex flex-col items-end">
                                                <div className="flex items-center gap-1 font-black" style={{ color: 'var(--text-color)' }}>
                                                    {player.stats_value?.toLocaleString() || player.coins?.toLocaleString() || 0}
                                                    <Coins size={14} className="text-yellow-500" />
                                                </div>
                                                <span className="text-[9px] font-bold text-slate-400 uppercase">Coins</span>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-end">
                                                <div className="flex items-center gap-1 font-black text-orange-600">
                                                    {player.stats_value || player.streak_count || 0}
                                                    <Flame size={14} className="fill-orange-500" />
                                                </div>
                                                <span className="text-[9px] font-bold text-slate-400 uppercase">Streak</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="py-20 text-center px-10">
                            <Users size={48} className="mx-auto mb-4 text-slate-200" />
                            <p className="text-slate-400 font-medium">Hozircha ma'lumotlar yo'q</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Quiz Selection Modal */}
            {selectingQuizForTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="glass-premium rounded-3xl p-6 w-full max-w-md shadow-2xl transition-all" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
                        <h3 className="text-xl font-black mb-2 flex items-center gap-2" style={{ color: 'var(--text-color)' }}>
                            <Swords className="text-rose-500" size={24} /> 
                            {selectingQuizForTarget.name} bilan duel
                        </h3>
                        <p className="text-sm font-bold opacity-60 mb-4" style={{ color: 'var(--text-color)' }}>Duel o'ynash uchun test tanlang:</p>
                        
                        {isLoadingQuizzes ? (
                            <div className="py-10 text-center flex flex-col items-center">
                                <div className="w-8 h-8 border-4 border-t-transparent border-rose-500 rounded-full animate-spin mb-2" />
                                <p className="text-xs font-bold opacity-60" style={{ color: 'var(--text-color)' }}>Testlar yuklanmoqda...</p>
                            </div>
                        ) : availableQuizzes.length === 0 ? (
                            <div className="py-10 text-center bg-rose-500/10 rounded-2xl border border-rose-500/20">
                                <ShieldAlert className="mx-auto text-rose-500 mb-2" size={32} />
                                <p className="text-sm font-bold text-rose-600">Sizning darajangizda faol duel testlari mavjud emas.</p>
                            </div>
                        ) : (
                            <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
                                {availableQuizzes.map(q => (
                                    <button
                                        key={q.id}
                                        onClick={() => confirmChallenge(q.id, q.title)}
                                        className="w-full relative overflow-hidden group p-4 rounded-2xl border transition-all hover:scale-[1.02] active:scale-95 text-left flex items-center justify-between"
                                        style={{ backgroundColor: 'var(--bg-color)', borderColor: 'var(--border-color)' }}
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-r from-rose-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                        <span className="font-bold relative z-10" style={{ color: 'var(--text-color)' }}>{q.title}</span>
                                        <div className="p-2 rounded-xl bg-rose-500/10 text-rose-500 relative z-10 group-hover:bg-rose-500 group-hover:text-white transition-colors">
                                            <Swords size={16} />
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                        
                        <div className="mt-6 flex justify-end">
                            <button 
                                onClick={() => setSelectingQuizForTarget(null)} 
                                className="px-5 py-2.5 font-bold rounded-xl transition-colors opacity-70 hover:opacity-100"
                                style={{ backgroundColor: 'var(--bg-color)', color: 'var(--text-color)' }}
                            >
                                Bekor qilish
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
