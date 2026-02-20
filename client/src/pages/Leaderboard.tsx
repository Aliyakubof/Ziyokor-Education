import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { apiFetch } from '../api';
import { Trophy, Medal, ChevronLeft, Users, Globe, Flame, Coins } from 'lucide-react';

export default function Leaderboard() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [view, setView] = useState<'global' | 'group'>('global');
    const [type, setType] = useState<'coins' | 'streaks'>('coins');
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchLeaderboard();
    }, [view, type]);

    const fetchLeaderboard = async () => {
        setLoading(true);
        try {
            let url = `/api/leaderboard?type=${type}&limit=50`;
            if (view === 'group' && user?.groupId) {
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

    const getRankIcon = (rank: number) => {
        if (rank === 0) return <Trophy className="text-yellow-400" size={24} />;
        if (rank === 1) return <Medal className="text-slate-300" size={24} />;
        if (rank === 2) return <Medal className="text-amber-600" size={24} />;
        return <span className="text-slate-400 font-bold">{rank + 1}</span>;
    };

    return (
        <div className="min-h-screen bg-slate-50 font-sans pb-10">
            {/* Header */}
            <div className="bg-gradient-to-br from-indigo-800 to-violet-900 pt-8 pb-16 px-6 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
                <button
                    onClick={() => navigate(-1)}
                    className="mb-6 p-2 bg-white/10 rounded-xl hover:bg-white/20 transition-colors"
                >
                    <ChevronLeft size={24} />
                </button>
                <h1 className="text-3xl font-black mb-2 flex items-center gap-3">
                    <Trophy className="text-yellow-400 fill-yellow-400/20" size={32} />
                    Peshqadamlar
                </h1>
                <p className="text-indigo-200 font-medium">Eng yaxshi o'quvchilar ro'yxati</p>
            </div>

            {/* Controls */}
            <div className="px-4 -mt-10 relative z-10 space-y-4">
                {/* Tabs */}
                <div className="bg-white p-1.5 rounded-2xl shadow-xl flex gap-2">
                    <button
                        onClick={() => setView('global')}
                        className={`flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${view === 'global' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                        <Globe size={18} /> Global
                    </button>
                    <button
                        onClick={() => setView('group')}
                        className={`flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${view === 'group' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                        <Users size={18} /> Guruh
                    </button>
                </div>

                {/* Type Filter */}
                <div className="flex gap-2">
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
                </div>

                {/* List */}
                <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                    {loading ? (
                        <div className="py-20 text-center">
                            <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                            <p className="text-slate-400 font-medium">Yuklanmoqda...</p>
                        </div>
                    ) : data.length > 0 ? (
                        <div className="divide-y divide-slate-50">
                            {data.map((player, idx) => (
                                <div
                                    key={player.id}
                                    className={`flex items-center gap-4 p-4 transition-colors ${player.id === user?.id ? 'bg-indigo-50/50' : 'hover:bg-slate-50/50'}`}
                                >
                                    <div className="w-8 flex justify-center">
                                        {getRankIcon(idx)}
                                    </div>
                                    <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-slate-100 bg-slate-50 flex-shrink-0">
                                        <img
                                            src={player.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${player.name}`}
                                            alt={player.name}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className={`font-bold truncate ${player.id === user?.id ? 'text-indigo-600' : 'text-slate-800'}`}>
                                            {player.name}
                                            {player.id === user?.id && <span className="ml-2 text-[10px] bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-full">Siz</span>}
                                        </h3>
                                        <p className="text-[10px] text-slate-400 font-semibold uppercase">{player.group_name}</p>
                                    </div>
                                    <div className="text-right">
                                        {type === 'coins' ? (
                                            <div className="flex items-center gap-1 font-black text-slate-700">
                                                {player.coins.toLocaleString()}
                                                <Coins size={14} className="text-yellow-500" />
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-1 font-black text-orange-600">
                                                {player.streak_count}
                                                <Flame size={14} className="fill-orange-500" />
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
        </div>
    );
}
