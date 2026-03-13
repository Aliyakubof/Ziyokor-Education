import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { socket } from '../socket';
import { Swords, ChevronLeft, X, Check, Loader2, AlertCircle } from 'lucide-react';

export default function DuelLobby() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [invitations, setInvitations] = useState<any[]>([]);
    const [socketConnected, setSocketConnected] = useState(false);
    const [status, setStatus] = useState<string | null>(null);
    const [hasActiveQuizzes, setHasActiveQuizzes] = useState<boolean | null>(null);

    useEffect(() => {
        // Connect socket if not connected
        if (!socket.connected) {
            socket.connect();
        }

        // Register student socket so server can find us for duel invites
        const registerStudent = () => {
            if (user?.id) {
                socket.emit('student-register', { studentId: user.id });
            }
        };

        const onConnect = () => {
            setSocketConnected(true);
            registerStudent();
        };
        const onDisconnect = () => setSocketConnected(false);

        // If already connected, register immediately
        if (socket.connected && user?.id) {
            socket.emit('student-register', { studentId: user.id });
        }
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

        const checkQuizzes = async () => {
            try {
                const res = await fetch(`${(window as any).VITE_BACKEND_URL || ''}/api/duel-quizzes`);
                if (res.ok) {
                    const data = await res.json();
                    // Assuming user object has daraja or we just check if any active exist
                    const activeExist = data.some((q: any) => q.is_active !== false);
                    setHasActiveQuizzes(activeExist);
                }
            } catch (err) {
                console.error(err);
            }
        };

        checkQuizzes();
        setSocketConnected(socket.connected);

        return () => {
            socket.off('connect', onConnect);
            socket.off('disconnect', onDisconnect);
            socket.off('duel-invited', onInvite);
            socket.off('duel-started', onDuelStarted);
            socket.off('error', onError);
        };
    }, []);


    const acceptInvite = (invitation: any) => {
        socket.emit('duel-accept', { fromId: invitation.fromId });
        setInvitations(prev => prev.filter(i => i.fromId !== invitation.fromId));
    };

    const rejectInvite = (fromId: string) => {
        setInvitations(prev => prev.filter(i => i.fromId !== fromId));
    };

    return (
        <div className="min-h-screen bg-slate-50 font-sans pb-10 transition-colors duration-500">
            {/* Header */}
            <div 
                className="pt-8 pb-16 px-6 text-white relative overflow-hidden transition-all duration-500"
                style={{ background: `linear-gradient(to bottom right, var(--primary-color, #e11d48), var(--secondary-color, #881337))` }}
            >
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
                <button
                    onClick={() => navigate(-1)}
                    className="mb-6 p-2 bg-white/10 rounded-xl hover:bg-white/20 transition-colors"
                >
                    <ChevronLeft size={24} />
                </button>
                <h1 className="text-3xl font-black mb-2 flex items-center gap-3 text-white">
                    <Swords className="opacity-80" size={32} />
                    Duellar
                </h1>
                <p className="text-white/80 font-medium font-sm">Boshqa o'quvchilar bilan bellashing</p>

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

                {/* Search Player Card / Soon Message */}
                {hasActiveQuizzes === false ? (
                    <div className="glass-premium rounded-3xl p-6 flex flex-col items-center justify-center py-12">
                        <Loader2 className="animate-spin text-rose-300 mb-4" size={48} />
                        <h2 className="text-xl font-black text-slate-800 mb-2 uppercase tracking-tight">
                            TEZ ORADA...
                        </h2>
                        <p className="text-sm font-bold text-slate-500 text-center max-w-sm">
                            Hozirda duellar vaqtinchalik o'chirilgan. Savollar bazasi yangilanmoqda.
                        </p>
                    </div>
                ) : hasActiveQuizzes === true ? (
                    <div className="glass-premium rounded-3xl p-6 flex flex-col items-center justify-center py-12">
                        <Swords className="text-rose-500 mb-4 animate-bounce" size={48} />
                        <h2 className="text-xl font-black text-slate-800 mb-2">
                            Duelga tayyormisiz?
                        </h2>
                        <p className="text-sm font-bold text-slate-500 text-center max-w-sm">
                            Boshqa o'quvchilar sizni taklif qilishini kuting yoki taklifnomalarni tekshiring.
                        </p>
                    </div>
                ) : (
                    <div className="flex justify-center py-12">
                        <Loader2 className="animate-spin text-rose-400" size={32} />
                    </div>
                )}

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
