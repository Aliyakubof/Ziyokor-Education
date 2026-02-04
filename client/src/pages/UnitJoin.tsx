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
        socket.connect();

        socket.on('joined', () => {
            setJoined(true);
            setError('');
        });

        socket.on('game-started', () => {
            navigate('/play');
        });

        socket.on('error', (msg) => {
            setError(msg);
        });

        // Anti-Cheat: Visibility Change listener
        const handleVisibilityChange = () => {
            if (joined && pin && studentId) {
                const status = document.hidden ? 'Cheating' : 'Online';
                socket.emit('student-status-update', { pin, studentId, status });
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            socket.off('joined');
            socket.off('game-started');
            socket.off('error');
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [joined, pin, studentId, navigate]);

    const handleJoin = (e: React.FormEvent) => {
        e.preventDefault();
        if (!pin || !studentId) return;
        socket.emit('student-join', { pin, studentId });
    };

    if (joined) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
                <div className="bg-slate-800 border border-slate-700 rounded-3xl p-12 text-center max-w-md w-full shadow-2xl">
                    <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
                        <LogIn className="text-emerald-500" size={40} />
                    </div>
                    <h1 className="text-3xl font-black mb-4">Siz kirdingiz!</h1>
                    <p className="text-slate-400 mb-8">
                        O'qituvchi o'yinni boshlashini kuting. Iltimos, bu oynadan chiqib ketmang!
                    </p>
                    <div className="flex items-center justify-center gap-2 text-amber-400 text-sm bg-amber-400/10 p-4 rounded-xl border border-amber-400/20">
                        <AlertCircle size={18} />
                        <span>Oynadan chiqsangiz, o'qituvchiga xabar boradi.</span>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
            <div className="bg-white rounded-3xl p-10 shadow-2xl w-full max-w-md border border-slate-200">
                <div className="flex flex-col items-center mb-10">
                    <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center mb-4 rotate-3">
                        <span className="text-white text-3xl font-black">Z</span>
                    </div>
                    <h1 className="text-2xl font-black text-slate-900">Ziyokor Education</h1>
                    <p className="text-slate-500 mt-2 text-center">7 xonali ID raqamingizni kiriting</p>
                </div>

                <form onSubmit={handleJoin} className="space-y-6">
                    <div>
                        <input
                            type="text"
                            value={pin}
                            onChange={(e) => setPin(e.target.value)}
                            placeholder="Game PIN"
                            className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 text-slate-900 font-bold text-center text-xl focus:outline-none focus:border-slate-900 transition-all placeholder:text-slate-300"
                            required
                        />
                    </div>
                    <div>
                        <input
                            type="text"
                            value={studentId}
                            onChange={(e) => setStudentId(e.target.value)}
                            placeholder="7 xonali ID"
                            className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 text-slate-900 font-bold text-center text-xl focus:outline-none focus:border-slate-900 transition-all placeholder:text-slate-300"
                            required
                        />
                    </div>

                    {error && (
                        <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm text-center font-medium">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black py-5 rounded-2xl text-xl transition-all shadow-lg active:scale-95"
                    >
                        QO'SHILISH
                    </button>
                </form>
            </div>
        </div>
    );
};

export default UnitJoin;
