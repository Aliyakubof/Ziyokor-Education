import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { apiFetch } from '../api';
import { socket } from '../socket';
import { Swords, ChevronLeft, Search, UserPlus, X, Check, Loader2, AlertCircle } from 'lucide-react';

export default function DuelLobby() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [searching, setSearching] = useState(false);
    const [invitations, setInvitations] = useState<any[]>([]);
    const [socketConnected, setSocketConnected] = useState(false);
    const [status, setStatus] = useState<string | null>(null);

    useEffect(() => {
        // Connect socket if not connected
        if (!socket.connected) {
            socket.connect();
        }

        const onConnect = () => setSocketConnected(true);
        const onDisconnect = () => setSocketConnected(false);
        const onInvite = (invitation: any) => {
            setInvitations(prev => [...prev.filter(i => i.fromId !== invitation.fromId), invitation]);
            setStatus(`Sizga ${invitation.fromName}dan duel taklifi keldi!`);
        };
        const onDuelStarted = ({ pin }: { pin: string }) => {
            navigate(`/unit-join/${pin}`);
        };
        const onError = (msg: string) => setStatus(`Xatolik: ${msg}`);

        socket.on('connect', onConnect);
        socket.on('disconnect', onDisconnect);
        socket.on('duel-invited', onInvite);
        socket.on('duel-started', onDuelStarted);
        socket.on('error', onError);

        setSocketConnected(socket.connected);

        return () => {
            socket.off('connect', onConnect);
            socket.off('disconnect', onDisconnect);
            socket.off('duel-invited', onInvite);
            socket.off('duel-started', onDuelStarted);
            socket.off('error', onError);
        };
    }, []);

    const handleSearch = async () => {
        if (!searchQuery.trim()) return;
        setSearching(true);
        try {
            const res = await apiFetch(`/api/students/search?q=${searchQuery}`);
            if (res.ok) {
                const results = await res.json();
                setSearchResults(results.filter((s: any) => s.id !== user?.id));
            }
        } catch (err) {
            console.error(err);
        } finally {
            setSearching(false);
        }
    };

    const sendInvite = (targetStudent: any) => {
        if (!socketConnected) {
            setStatus("Socket ulanmagan");
            return;
        }
        socket.emit('duel-invite', {
            targetStudentId: targetStudent.id,
            studentName: user?.name
        });
        setStatus(`${targetStudent.name}ga taklif yuborildi`);
    };

    const acceptInvite = (invitation: any) => {
        socket.emit('duel-accept', { fromId: invitation.fromId });
        setInvitations(prev => prev.filter(i => i.fromId !== invitation.fromId));
    };

    const rejectInvite = (fromId: string) => {
        setInvitations(prev => prev.filter(i => i.fromId !== fromId));
    };

    return (
        <div className="min-h-screen bg-slate-50 font-sans pb-10">
            {/* Header */}
            <div className="bg-gradient-to-br from-rose-700 to-red-900 pt-8 pb-16 px-6 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
                <button
                    onClick={() => navigate(-1)}
                    className="mb-6 p-2 bg-white/10 rounded-xl hover:bg-white/20 transition-colors"
                >
                    <ChevronLeft size={24} />
                </button>
                <h1 className="text-3xl font-black mb-2 flex items-center gap-3 text-red-100">
                    <Swords className="text-red-400" size={32} />
                    Duellar
                </h1>
                <p className="text-rose-200 font-medium font-sm">Boshqa o'quvchilar bilan bellashing</p>

                <div className={`absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold ${socketConnected ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-red-500/20 text-red-300 border border-red-500/30'}`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${socketConnected ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`}></div>
                    {socketConnected ? 'ONLINE' : 'OFFLINE'}
                </div>
            </div>

            <div className="px-4 -mt-10 relative z-10 space-y-6">
                {/* Status Alert */}
                {status && (
                    <div className="p-4 bg-indigo-600 text-white rounded-2xl shadow-xl flex items-center justify-between animate-in fade-in slide-in-from-top-4 duration-300">
                        <div className="flex items-center gap-3">
                            <AlertCircle size={20} />
                            <span className="text-sm font-bold">{status}</span>
                        </div>
                        <button onClick={() => setStatus(null)}><X size={18} /></button>
                    </div>
                )}

                {/* Invitations Section */}
                {invitations.length > 0 && (
                    <div className="space-y-3">
                        <h3 className="font-bold text-rose-600 uppercase text-xs tracking-widest pl-2 flex items-center gap-2">
                            Duel takliflari <span className="w-2 h-2 bg-rose-500 rounded-full animate-ping"></span>
                        </h3>
                        {invitations.map((inv) => (
                            <div key={inv.fromId} className="bg-white p-4 rounded-3xl border-2 border-rose-100 shadow-lg flex items-center justify-between">
                                <div>
                                    <h4 className="font-black text-slate-800 text-base">{inv.fromName}</h4>
                                    <p className="text-xs text-slate-400 font-bold">Sizni duelga chaqirdi!</p>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => rejectInvite(inv.fromId)}
                                        className="w-10 h-10 bg-slate-100 text-slate-500 rounded-xl flex items-center justify-center hover:bg-slate-200"
                                    >
                                        <X size={20} />
                                    </button>
                                    <button
                                        onClick={() => acceptInvite(inv)}
                                        className="w-12 h-12 bg-rose-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-rose-200 hover:bg-rose-700"
                                    >
                                        <Check size={24} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Search Player Card */}
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
                    <h2 className="text-lg font-black text-slate-900 mb-4 flex items-center gap-2">
                        <Search className="text-rose-600" size={20} />
                        Raqibni izlash
                    </h2>
                    <div className="flex gap-2 mb-4">
                        <div className="relative flex-1">
                            <input
                                type="text"
                                placeholder="ID yoki ism..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 py-3 text-sm font-bold text-slate-800 placeholder:text-slate-300 focus:border-rose-500 focus:outline-none transition-colors"
                            />
                        </div>
                        <button
                            onClick={handleSearch}
                            disabled={searching}
                            className="bg-rose-600 text-white p-3 rounded-2xl hover:bg-rose-700 transition-colors shadow-lg shadow-rose-200 flex items-center justify-center min-w-[50px]"
                        >
                            {searching ? <Loader2 className="animate-spin" size={24} /> : <Search size={22} />}
                        </button>
                    </div>

                    {/* Search Results */}
                    <div className="space-y-2">
                        {searchResults.length > 0 ? (
                            searchResults.map((player) => (
                                <div key={player.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center border border-slate-200 font-bold text-rose-600">
                                            {player.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-800 text-sm">{player.name}</h4>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase">{player.group_name}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => sendInvite(player)}
                                        className="bg-white text-rose-600 p-2 rounded-xl border border-rose-100 hover:bg-rose-600 hover:text-white transition-all shadow-sm"
                                    >
                                        <UserPlus size={20} />
                                    </button>
                                </div>
                            ))
                        ) : searching ? null : searchQuery ? (
                            <p className="text-center py-4 text-slate-400 text-sm font-medium">Hech kim topilmadi</p>
                        ) : null}
                    </div>
                </div>

                {/* Info Card */}
                <div className="bg-rose-50 p-6 rounded-3xl border border-rose-100/50">
                    <h3 className="font-black text-rose-700 mb-2">Duel qoidalari</h3>
                    <ul className="text-xs font-bold text-rose-600/80 space-y-2">
                        <li className="flex gap-2">
                            <span className="w-1.5 h-1.5 bg-rose-400 rounded-full mt-1 shrink-0"></span>
                            Ikki o'quvchi bir vaqtda bir xil testni topshiradi.
                        </li>
                        <li className="flex gap-2">
                            <span className="w-1.5 h-1.5 bg-rose-400 rounded-full mt-1 shrink-0"></span>
                            G'olibga qo'shimcha tangalar va XP beriladi.
                        </li>
                        <li className="flex gap-2">
                            <span className="w-1.5 h-1.5 bg-rose-400 rounded-full mt-1 shrink-0"></span>
                            Mag'lubiyat uchun streak kamaymaydi.
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
