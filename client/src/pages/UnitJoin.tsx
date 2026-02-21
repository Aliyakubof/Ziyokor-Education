import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { socket } from '../socket';
import { LogIn, AlertCircle } from 'lucide-react';

const UnitJoin = () => {
    const { pin: urlPin } = useParams();
    const navigate = useNavigate();
    const [pin, setPin] = useState(urlPin || '');
    const [studentId, setStudentId] = useState('');
    const [error, setError] = useState('');
    const [joined, setJoined] = useState(false);

    useEffect(() => {
        // Auto-fill studentId from localStorage if available (e.g. from Dashboard)
        const savedId = localStorage.getItem('student-id');
        let currentStudentId = studentId;

        if (savedId && !studentId) {
            setStudentId(savedId);
            currentStudentId = savedId;
        }

        socket.connect();

        // If we have both PIN and StudentId, attempt auto-join
        if (urlPin && currentStudentId && !joined) {
            localStorage.setItem('kahoot-pin', urlPin);
            localStorage.setItem('student-id', currentStudentId);
            socket.emit('student-join', { pin: urlPin, studentId: currentStudentId });
        }

        socket.on('joined', () => {
            setJoined(true);
            setError('');
        });

        socket.on('game-started', () => {
            navigate('/play');
        });

        socket.on('unit-game-started', () => {
            navigate('/play');
        });

        socket.on('error', (msg) => {
            setError(msg);
        });

        // Anti-Cheat: Visibility Change listener (only send Cheating, never revert to Online)
        const handleVisibilityChange = () => {
            if (document.hidden && joined && pin && studentId) {
                socket.emit('student-status-update', { pin, studentId, status: 'Cheating' });
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            socket.off('joined');
            socket.off('game-started');
            socket.off('unit-game-started');
            socket.off('error');
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [navigate]); // Stable dependencies to avoid re-mounting listeners

    const handleJoin = (e: React.FormEvent) => {
        e.preventDefault();
        if (!pin || !studentId) return;
        localStorage.setItem('kahoot-pin', pin); // Store for PlayerGame
        localStorage.setItem('student-id', studentId); // Store for PlayerGame State recovery
        socket.emit('student-join', { pin, studentId });
    };

    if (joined) {
        return (
            <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden bg-brand-dark">
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                    <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/20 rounded-full blur-[100px]"></div>
                    <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-teal-500/20 rounded-full blur-[100px]"></div>
                </div>

                <div className="bg-white rounded-[3rem] p-10 text-center max-w-md w-full shadow-xl border border-slate-200 relative z-10">
                    <div className="w-24 h-24 bg-gradient-to-tr from-emerald-500 to-teal-600 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-xl shadow-emerald-500/20 animate-float">
                        <LogIn className="text-white" size={44} />
                    </div>
                    <h1 className="text-4xl font-black text-slate-800 mb-4 tracking-tight">Siz kirdingiz!</h1>
                    <p className="text-slate-500 mb-10 font-medium leading-relaxed">
                        O'qituvchi testni boshlashini kuting. <br />
                        <span className="text-emerald-600 font-bold">Iltimos, bu oynadan chiqib ketmang!</span>
                    </p>

                    <div className="flex flex-col items-center gap-2 text-orange-600 bg-orange-50 p-5 rounded-2xl border border-orange-200">
                        <div className="flex items-center gap-2">
                            <AlertCircle size={20} className="animate-pulse text-orange-500" />
                            <span className="text-xs font-black uppercase tracking-widest">Diqqat! Anti-Cheat</span>
                        </div>
                        <p className="text-[10px] font-medium text-slate-500 text-center">
                            Oynadan chiqsangiz yoki boshqa ilovaga o'tsangiz, o'qituvchiga ogohlantirish boradi.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden bg-brand-dark">
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/20 rounded-full blur-[100px]"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-500/20 rounded-full blur-[100px]"></div>
            </div>

            <div className="w-full max-w-md z-10">
                <div className="bg-white rounded-[3rem] p-10 shadow-xl border border-slate-200">
                    <div className="flex flex-col items-center mb-10">
                        <div className="w-20 h-20 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-[1.5rem] flex items-center justify-center mb-6 shadow-xl shadow-blue-500/20 animate-float">
                            <h1 className="text-white text-4xl font-black">Z</h1>
                        </div>
                        <h1 className="text-3xl font-black text-slate-800 mb-2 tracking-tight">Ziyokor Unit</h1>
                        <p className="text-slate-400 font-bold text-xs uppercase tracking-[0.2em]">Test Tizimiga Kirish</p>
                    </div>

                    <form onSubmit={handleJoin} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4">Guruh PIN</label>
                            <input
                                type="text"
                                value={pin}
                                onChange={(e) => setPin(e.target.value)}
                                placeholder="0000000"
                                className="w-full bg-slate-50 border-2 border-slate-200 rounded-[2rem] px-6 py-5 text-slate-800 font-black text-center text-3xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all placeholder:text-slate-300 tracking-[0.2em]"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4">Sizning ID raqamingiz</label>
                            <input
                                type="text"
                                value={studentId}
                                onChange={(e) => setStudentId(e.target.value)}
                                placeholder="ID kiriting"
                                className="w-full bg-slate-50 border-2 border-slate-200 rounded-[2rem] px-6 py-5 text-slate-800 font-black text-center text-2xl focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all placeholder:text-slate-300"
                                required
                            />
                        </div>

                        {error && (
                            <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-500 text-xs text-center font-black uppercase tracking-widest animate-pulse">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black py-6 rounded-[2rem] text-xl transition-all shadow-xl shadow-blue-500/20 btn-premium flex items-center justify-center gap-3 mt-4 active:scale-95"
                        >
                            <span>TESTGA KIRISH</span>
                            <LogIn size={24} />
                        </button>
                    </form>
                </div>

                <p className="text-slate-400 text-[10px] text-center mt-10 font-bold uppercase tracking-widest">
                    7 xonali ID o'qituvchi tomonidan beriladi
                </p>
            </div>
        </div>
    );
};

export default UnitJoin;
