import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { socket } from '../socket';
import { Swords, ChevronLeft, X, Check, Loader2, AlertCircle, Search, UserMinus, BookOpen, Shield, Zap, Target, Award, Dice5 } from 'lucide-react';
import { apiFetch } from '../api';

export default function DuelLobby() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [invitations, setInvitations] = useState<any[]>([]);
    const [socketConnected, setSocketConnected] = useState(false);
    const [status, setStatus] = useState<string | null>(null);
    const [hasActiveQuizzes, setHasActiveQuizzes] = useState<boolean | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [challengingId, setChallengingId] = useState<string | null>(null);
    const [selectingQuizForTarget, setSelectingQuizForTarget] = useState<{id: string, name: string} | null>(null);
    const [availableQuizzes, setAvailableQuizzes] = useState<any[]>([]);
    const [isLoadingQuizzes, setIsLoadingQuizzes] = useState(false);

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
            setStatus(`Sizga ${invitation.fromName}dan duel taklifi keldi: ${invitation.quizTitle}`);
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
                const res = await apiFetch('/api/duel-quizzes');
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
        socket.emit('duel-accept', { fromId: invitation.fromId, quizId: invitation.quizId });
        setInvitations(prev => prev.filter(i => i.fromId !== invitation.fromId));
    };

    const rejectInvite = (fromId: string) => {
        setInvitations(prev => prev.filter(i => i.fromId !== fromId));
    };

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (searchTerm.length < 3) return;
        setIsSearching(true);
        try {
            const res = await apiFetch(`/api/students/search?q=${encodeURIComponent(searchTerm)}`);
            if (res.ok) setSearchResults(await res.json());
        } catch (err) {
            console.error(err);
        } finally {
            setIsSearching(false);
        }
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
                            <div key={inv.fromId} className="p-4 rounded-3xl border shadow-lg flex items-center justify-between transition-colors" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
                                <div>
                                    <h4 className="font-black text-base" style={{ color: 'var(--text-color)' }}>{inv.fromName}</h4>
                                    <p className="text-xs font-bold opacity-40" style={{ color: 'var(--text-color)' }}>Sizni duelga chaqirdi! ({inv.quizTitle})</p>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => rejectInvite(inv.fromId)}
                                        className="w-10 h-10 rounded-xl flex items-center justify-center opacity-70 hover:opacity-100 transition-opacity"
                                        style={{ backgroundColor: 'var(--bg-color)', color: 'var(--text-color)' }}
                                    >
                                        <X size={20} />
                                    </button>
                                    <button
                                        onClick={() => acceptInvite(inv)}
                                        className="w-12 h-12 text-white rounded-xl flex items-center justify-center shadow-lg transition-transform active:scale-95"
                                        style={{ backgroundColor: 'var(--primary-color)' }}
                                    >
                                        <Check size={24} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Duel Card / Search Section */}
                <div className="glass-premium rounded-3xl p-6 border transition-colors space-y-4" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 rounded-xl bg-rose-500/10 text-rose-500">
                            <Swords size={20} />
                        </div>
                        <h2 className="text-lg font-black" style={{ color: 'var(--text-color)' }}>Raqib qidirish</h2>
                    </div>

                    <form onSubmit={handleSearch} className="relative">
                        <input
                            type="text"
                            placeholder="Ism yoki ID orqali qidirish..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-11 pr-4 py-3 rounded-2xl border-2 focus:outline-none focus:border-rose-500 transition-colors bg-transparent"
                            style={{ color: 'var(--text-color)', borderColor: 'var(--border-color)' }}
                        />
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 opacity-30" size={18} style={{ color: 'var(--text-color)' }} />
                        <button 
                            type="submit" 
                            disabled={isSearching || searchTerm.length < 3}
                            className="absolute right-2 top-1.5 bottom-1.5 px-4 bg-rose-500 text-white rounded-xl text-xs font-bold disabled:opacity-50"
                        >
                            {isSearching ? <Loader2 className="animate-spin" size={16} /> : 'Qidirish'}
                        </button>
                    </form>

                    {/* Search Results */}
                    {searchResults.length > 0 ? (
                        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                            {searchResults.map((student) => (
                                <div key={student.id} className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-dashed" style={{ borderColor: 'var(--border-color)' }}>
                                    <div className="min-w-0">
                                        <p className="font-bold text-sm truncate" style={{ color: 'var(--text-color)' }}>{student.name}</p>
                                        <p className="text-[10px] opacity-50 font-medium" style={{ color: 'var(--text-color)' }}>ID: {student.id} | {student.group_name}</p>
                                    </div>
                                    <button
                                        onClick={() => handleChallengeClick(student.id, student.name)}
                                        disabled={challengingId === student.id || student.id === user?.id}
                                        className={`px-4 py-1.5 rounded-xl text-[10px] font-black transition-all active:scale-95 ${challengingId === student.id ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white hover:bg-rose-600 disabled:opacity-30'}`}
                                    >
                                        {challengingId === student.id ? 'Taklif yuborildi' : 'Challenge'}
                                    </button>
                                </div>
                            ))}
                        </div>
                    ) : searchTerm.length >= 3 && !isSearching && (
                        <div className="py-8 text-center opacity-40">
                            <UserMinus className="mx-auto mb-2" size={32} />
                            <p className="text-xs font-bold">Hech kim topilmadi</p>
                        </div>
                    )}

                    {hasActiveQuizzes === false && (
                        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center gap-2">
                            <AlertCircle size={16} className="text-amber-500" />
                            <p className="text-[10px] font-bold text-amber-600">Eslatma: Hozirda savollar bazasi yangilanmoqda, duel taklifi qabul qilinmasligi mumkin.</p>
                        </div>
                    )}
                </div>

                {/* Info Card */}
                <div className="p-6 rounded-3xl border transition-colors" style={{ backgroundColor: 'color-mix(in srgb, var(--primary-color), transparent 90%)', borderColor: 'var(--border-color)' }}>
                    <h3 className="font-black mb-2" style={{ color: 'var(--primary-color)' }}>Duel qoidalari</h3>
                    <ul className="text-xs font-bold space-y-2 opacity-70" style={{ color: 'var(--text-color)' }}>
                        <li className="flex gap-2">
                            <span className="w-1.5 h-1.5 rounded-full mt-1 shrink-0" style={{ backgroundColor: 'var(--primary-color)' }}></span>
                            Ikki o'quvchi bir vaqtda bir xil testni topshiradi.
                        </li>
                        <li className="flex gap-2">
                            <span className="w-1.5 h-1.5 rounded-full mt-1 shrink-0" style={{ backgroundColor: 'var(--primary-color)' }}></span>
                            G'olibga qo'shimcha tangalar va XP beriladi.
                        </li>
                        <li className="flex gap-2">
                            <span className="w-1.5 h-1.5 rounded-full mt-1 shrink-0" style={{ backgroundColor: 'var(--primary-color)' }}></span>
                            Mag'lubiyat uchun streak kamaymaydi.
                        </li>
                    </ul>
                </div>

                {/* Character Roles Section */}
                <div className="space-y-4">
                    <h3 className="font-black text-xs uppercase tracking-widest pl-2 opacity-50" style={{ color: 'var(--text-color)' }}>
                        Jangchi Qahramonlar
                    </h3>
                    <div className="grid grid-cols-1 gap-3">
                        {[
                            { name: "Bilimdon", desc: "Bilim - eng katta kuch. Har bir to'g'ri javob uchun barqaror va ishonchli zarar yetkazadi.", icon: BookOpen, color: "text-blue-500", bg: "bg-blue-500/10" },
                            { name: "Botir", desc: "Tezkor hujum ustasi. Tez va chaqqon javob berilganda raqibga juda katta zarar yetkazadi.", icon: Zap, color: "text-yellow-500", bg: "bg-yellow-500/10" },
                            { name: "Mergab", desc: "Aniq va xatosiz. Kombosini uzoq ushlab tura oladi va har bir kombinatsiya uchun qo'shimcha bonus oladi.", icon: Target, color: "text-emerald-500", bg: "bg-emerald-500/10" },
                            { name: "Lochin", desc: "O'tkir nigoh. Raqibning xatolaridan unumli foydalanadi va kutilmagan kuchli (kritik) zarba beradi.", icon: Award, color: "text-indigo-500", bg: "bg-indigo-500/10" },
                            { name: "Himoyachi", desc: "Mustahkam qalqon. O'z nomiga munosib - u raqibdan keladigan zararlarning bir qismini qaytara oladi.", icon: Shield, color: "text-rose-500", bg: "bg-rose-500/10" },
                            { name: "Omadli", desc: "Kutilmagan zarbalar ustasi. Har bir javobda omad kulib boqsa, zararni 2 barobargacha oshirishi mumkin.", icon: Dice5, color: "text-purple-500", bg: "bg-purple-500/10" }
                        ].map((hero, i) => (
                            <div key={i} className="p-4 rounded-[2rem] border transition-all hover:scale-[1.01]" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
                                <div className="flex items-start gap-4">
                                    <div className={`p-3 rounded-2xl ${hero.bg} ${hero.color} shrink-0`}>
                                        <hero.icon size={24} />
                                    </div>
                                    <div>
                                        <h4 className="font-black text-sm mb-1" style={{ color: 'var(--text-color)' }}>{hero.name}</h4>
                                        <p className="text-[11px] font-medium leading-relaxed opacity-60" style={{ color: 'var(--text-color)' }}>{hero.desc}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
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
                                <Loader2 className="animate-spin text-rose-500 mb-2" size={32} />
                                <p className="text-xs font-bold opacity-60" style={{ color: 'var(--text-color)' }}>Testlar yuklanmoqda...</p>
                            </div>
                        ) : availableQuizzes.length === 0 ? (
                            <div className="py-10 text-center bg-rose-500/10 rounded-2xl border border-rose-500/20">
                                <AlertCircle className="mx-auto text-rose-500 mb-2" size={32} />
                                <p className="text-sm font-bold text-rose-600">Sizning darajangizda hozircha faol duel testlari mavjud emas.</p>
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
