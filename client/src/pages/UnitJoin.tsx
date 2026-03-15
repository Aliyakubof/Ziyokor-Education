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
            navigate('/play', { replace: true });
        });

        socket.on('unit-game-started', () => {
            navigate('/play', { replace: true });
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
            <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden transition-colors" style={{ backgroundColor: 'var(--bg-color)' }}>
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                    <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/10 rounded-full blur-[100px]"></div>
                    <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-teal-500/10 rounded-full blur-[100px]"></div>
                </div>

                <div className="rounded-[3rem] p-10 text-center max-w-md w-full shadow-xl border relative z-10 transition-colors" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
                    <div className="w-24 h-24 bg-gradient-to-tr from-emerald-500 to-teal-600 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-xl shadow-emerald-500/20 animate-float">
                        <LogIn className="text-white" size={44} />
                    </div>
                    <h1 className="text-4xl font-black mb-4 tracking-tight" style={{ color: 'var(--text-color)' }}>Siz kirdingiz!</h1>
                    <p className="mb-10 font-medium leading-relaxed opacity-60" style={{ color: 'var(--text-color)' }}>
                        O'qituvchi testni boshlashini kuting. <br />
                        <span className="font-bold" style={{ color: 'var(--primary-color)' }}>Iltimos, bu oynadan chiqib ketmang!</span>
                    </p>

                    <div className="flex flex-col items-center gap-2 border p-5 rounded-2xl transition-colors" style={{ backgroundColor: 'var(--bg-color)', borderColor: 'var(--border-color)' }}>
                        <div className="flex items-center gap-2">
                            <AlertCircle size={16} className="opacity-40" style={{ color: 'var(--text-color)' }} />
                            <span className="text-xs font-semibold opacity-40 uppercase" style={{ color: 'var(--text-color)' }}>Iltimos, bu sahifadan ketmang</span>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden transition-colors" style={{ backgroundColor: 'var(--bg-color)' }}>
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/20 rounded-full blur-[100px]"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-500/20 rounded-full blur-[100px]"></div>
            </div>

            <div className="w-full max-w-md z-10">
                <div className="rounded-[3rem] p-10 shadow-xl border transition-colors" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
                    <div className="flex flex-col items-center mb-10">
                        <div className="w-20 h-20 rounded-[1.5rem] flex items-center justify-center mb-6 shadow-xl animate-float" style={{ backgroundColor: 'var(--primary-color)' }}>
                            <h1 className="text-white text-4xl font-black">Z</h1>
                        </div>
                        <h1 className="text-3xl font-black mb-2 tracking-tight" style={{ color: 'var(--text-color)' }}>Ziyokor Unit</h1>
                        <p className="font-bold text-xs uppercase tracking-[0.2em] opacity-40" style={{ color: 'var(--text-color)' }}>Test Tizimiga Kirish</p>
                    </div>

                    <form onSubmit={handleJoin} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest ml-4 opacity-40" style={{ color: 'var(--text-color)' }}>Guruh PIN</label>
                            <input
                                type="text"
                                value={pin}
                                onChange={(e) => setPin(e.target.value)}
                                placeholder="0000000"
                                className="w-full border-2 rounded-[2rem] px-6 py-5 font-black text-center text-3xl focus:outline-none transition-all tracking-[0.2em]"
                                style={{ backgroundColor: 'var(--bg-color)', borderColor: 'var(--border-color)', color: 'var(--text-color)' }}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest ml-4 opacity-40" style={{ color: 'var(--text-color)' }}>Sizning ID raqamingiz</label>
                            <input
                                type="text"
                                value={studentId}
                                onChange={(e) => setStudentId(e.target.value)}
                                placeholder="ID kiriting"
                                className="w-full border-2 rounded-[2rem] px-6 py-5 font-black text-center text-2xl focus:outline-none transition-all"
                                style={{ backgroundColor: 'var(--bg-color)', borderColor: 'var(--border-color)', color: 'var(--text-color)' }}
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
                            className="w-full text-white font-black py-6 rounded-[2rem] text-xl transition-all shadow-xl flex items-center justify-center gap-3 mt-4 active:scale-95"
                            style={{ backgroundColor: 'var(--primary-color)' }}
                        >
                            <span>TESTGA KIRISH</span>
                            <LogIn size={24} />
                        </button>
                    </form>
                </div>

                <p className="text-[10px] text-center mt-10 font-bold uppercase tracking-widest opacity-40" style={{ color: 'var(--text-color)' }}>
                    7 xonali ID o'qituvchi tomonidan beriladi
                </p>
            </div>
        </div>
    );
};

export default UnitJoin;
