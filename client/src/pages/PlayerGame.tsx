import { useEffect, useState } from 'react';
import { socket } from '../socket';
import { Trophy, Clock, CheckCircle2, AlertCircle, Send, XCircle } from 'lucide-react';

interface QuestionData {
    text: string;
    options: string[];
    timeLimit: number;
    questionIndex: number;
    totalQuestions: number;
    correctIndex: number;
    type?: 'multiple-choice' | 'text-input' | 'true-false' | 'fill-blank' | 'find-mistake' | 'rewrite';
}

export default function PlayerGame() {
    const [view, setView] = useState<'WAITING' | 'PLAYING' | 'ANSWERED' | 'FINISHED'>('WAITING');
    const [rank, setRank] = useState<{ rank: number; score: number } | null>(null);
    const [question, setQuestion] = useState<QuestionData | null>(null);
    const [textAnswer, setTextAnswer] = useState('');

    const [isConnected, setIsConnected] = useState(socket.connected);
    const [isCheating, setIsCheating] = useState(false);

    useEffect(() => {
        const onConnect = () => setIsConnected(true);
        const onDisconnect = () => setIsConnected(false);

        socket.on('connect', onConnect);
        socket.on('disconnect', onDisconnect);

        socket.on('game-started', () => {
            setView('WAITING');
        });

        socket.on('question-start', (q) => {
            setQuestion(q);
            setView('PLAYING');
            setTextAnswer('');
        });

        socket.on('game-over', (leaderboard) => {
            setView('FINISHED');
            const myId = socket.id;
            const myRank = leaderboard.findIndex((p: any) => p.id === myId || p.id === (socket as any).studentId) + 1;
            const myScore = leaderboard.find((p: any) => p.id === myId || p.id === (socket as any).studentId)?.score || 0;
            setRank({ rank: myRank, score: myScore });
        });

        // Anti-Cheat: Visibility Change
        const handleVisibilityChange = () => {
            const pin = localStorage.getItem('kahoot-pin');
            const studentId = localStorage.getItem('student-id') || socket.id;

            if (document.hidden) {
                // User switched tabs or minimized
                if (socket.connected && pin) {
                    setIsCheating(true);
                    socket.emit('student-status-update', { pin, studentId, status: 'Cheating' });
                }
            } else {
                // User came back
                if (socket.connected && pin) {
                    // We DO NOT revert isCheating here automatically, so they see the warning overlay
                    socket.emit('student-status-update', { pin, studentId, status: 'Online' });
                }
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            socket.off('connect', onConnect);
            socket.off('disconnect', onDisconnect);
            socket.off('game-started');
            socket.off('question-start');
            socket.off('game-over');
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, []);

    const sendAnswer = (val: number | string) => {
        const pin = localStorage.getItem('kahoot-pin');
        if (!pin) return;
        socket.emit('player-answer', { pin, answer: val });
        setView('ANSWERED');
    };

    if (view === 'FINISHED') {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen p-6 relative overflow-hidden bg-transparent">

                <div className="bg-white rounded-[3rem] p-10 text-center max-w-md w-full shadow-xl border border-slate-200 relative z-10">
                    <div className="w-24 h-24 bg-gradient-to-tr from-yellow-400 to-orange-500 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-xl shadow-yellow-500/20 animate-float">
                        <Trophy className="text-white" size={48} />
                    </div>

                    <h1 className="text-4xl font-black text-slate-800 mb-2 tracking-tight">Test Tugadi!</h1>
                    <p className="text-slate-500 font-bold text-xs uppercase tracking-widest mb-10">Sizning natijangiz</p>

                    <div className="relative mb-10">
                        <div className="text-[120px] font-black text-slate-800 leading-none tracking-tighter">
                            {rank?.rank}
                        </div>
                        <div className="text-2xl font-black text-blue-500 absolute bottom-4 right-1/4 translate-x-12 uppercase">
                            {rank?.rank === 1 ? 'st' : rank?.rank === 2 ? 'nd' : rank?.rank === 3 ? 'rd' : 'th'} O'rin
                        </div>
                    </div>

                    <div className="bg-blue-50 border-blue-100 border p-6 rounded-[2rem] shadow-md">
                        <div className="text-sm font-black text-blue-400 uppercase tracking-widest mb-1">To'plangan Ball</div>
                        <div className="text-4xl font-black text-slate-800">{rank?.score}</div>
                    </div>

                    <button
                        onClick={() => window.location.href = '/'}
                        className="mt-10 w-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 font-black py-4 rounded-2xl transition-all border border-slate-200"
                    >
                        CHIQISH
                    </button>
                </div>
            </div>
        );
    }



    if (isCheating) {
        return (
            <div className="fixed inset-0 bg-red-900/95 z-[60] flex flex-col items-center justify-center p-6 text-center backdrop-blur-md">
                <AlertCircle className="text-white w-20 h-20 mb-6 animate-pulse" />
                <h2 className="text-3xl font-black text-white mb-4 uppercase tracking-widest">OGOHLANTIRISH!</h2>
                <p className="text-white/80 font-bold text-lg mb-8 max-w-md leading-relaxed">
                    Siz ilovadan chiqdingiz yoki boshqa oynaga o'tdingiz. Bu "Aldash" (Cheating) deb baholandi va o'qituvchiga xabar yuborildi.
                </p>
                <button
                    onClick={() => setIsCheating(false)}
                    className="bg-white text-red-600 px-8 py-4 rounded-2xl font-black hover:scale-105 transition-transform shadow-xl"
                >
                    TUSHUNDIM, DAVOM ETISH
                </button>
            </div>
        );
    }

    if (!isConnected) {
        return (
            <div className="fixed inset-0 bg-black/80 z-50 flex flex-col items-center justify-center p-6 text-center backdrop-blur-sm">
                <div className="w-20 h-20 border-4 border-white/20 border-t-white rounded-full animate-spin mb-6"></div>
                <h2 className="text-2xl font-black text-white mb-2">Aloqa uzildi</h2>
                <p className="text-slate-300 font-medium max-w-xs">Internet bilan bog'lanish qayta tiklanmoqda... Iltimos kuting.</p>
            </div>
        );
    }

    if (view === 'WAITING' || view === 'ANSWERED') {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen p-6 relative overflow-hidden bg-transparent">

                <div className="flex flex-col items-center gap-8 z-10">
                    <div className="relative">
                        <div className="w-32 h-32 border-4 border-slate-200 border-t-blue-500 rounded-full animate-spin"></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                            {view === 'WAITING' ? (
                                <Clock className="text-blue-500 animate-pulse" size={40} />
                            ) : (
                                <CheckCircle2 className="text-emerald-500 animate-bounce" size={40} />
                            )}
                        </div>
                    </div>

                    <div className="text-center">
                        <h2 className="text-3xl font-black text-slate-900 mb-2 tracking-tight">
                            {view === 'WAITING' ? "Tayyor turing!" : "Javob yuborildi!"}
                        </h2>
                        <p className="text-slate-500 font-bold text-xs uppercase tracking-[0.2em] animate-pulse">
                            {view === 'WAITING' ? "Savol yuklanmoqda..." : "Keyingi savolni kuting"}
                        </p>
                    </div>

                    {view === 'ANSWERED' && (
                        <div className="bg-emerald-50 border border-emerald-100 px-8 py-4 rounded-2xl flex items-center gap-3">
                            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></span>
                            <span className="text-sm font-black text-emerald-600 uppercase tracking-widest">Muvaffaqiyatli</span>
                        </div>
                    )}
                </div>

                <div className="absolute bottom-10 flex flex-col items-center gap-2">
                    <AlertCircle className="text-slate-400" size={24} />
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Don't leave the app</p>
                </div>
            </div>
        );
    }

    if (['text-input', 'fill-blank', 'find-mistake', 'rewrite'].includes(question?.type || '')) {
        return (
            <div className="min-h-screen flex items-center justify-center p-6 bg-transparent">
                <div className="w-full max-w-md bg-white rounded-[2.5rem] p-8 shadow-xl border border-slate-200">
                    <h2 className="text-center text-xl font-bold text-slate-800 mb-8">
                        {question?.type === 'fill-blank' ? "Fill in the Blank" :
                            question?.type === 'find-mistake' ? "Find and fix the mistake" :
                                question?.type === 'rewrite' ? "Rewrite the sentence" :
                                    "Enter your answer"}
                    </h2>
                    <input
                        type="text"
                        value={textAnswer}
                        onChange={(e) => setTextAnswer(e.target.value)}
                        className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl px-6 py-4 text-center text-xl font-bold text-slate-800 focus:outline-none focus:border-indigo-500 transition-all placeholder:text-slate-300 mb-6"
                        placeholder="Answer..."
                        autoFocus
                    />
                    <button
                        onClick={() => textAnswer.trim() && sendAnswer(textAnswer.trim())}
                        disabled={!textAnswer.trim()}
                        className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-200 disabled:text-slate-400 text-white font-black py-4 rounded-2xl transition-all shadow-lg shadow-indigo-500/20 active:scale-95 flex items-center justify-center gap-2"
                    >
                        <Send size={20} /> SUBMIT
                    </button>
                </div>
            </div>
        );
    }

    if (question?.type === 'true-false') {
        return (
            <div className="h-[100dvh] grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-transparent">
                <button
                    onClick={() => sendAnswer(0)} // True
                    className="bg-blue-500 hover:bg-blue-600 rounded-[2rem] flex flex-col items-center justify-center group active:scale-95 transition-all shadow-xl relative overflow-hidden"
                >
                    <div className="w-16 h-16 md:w-24 md:h-24 bg-white/20 rounded-full flex items-center justify-center text-3xl md:text-5xl mb-2 md:mb-4 text-white">
                        <CheckCircle2 size={32} className="md:w-12 md:h-12" />
                    </div>
                    <span className="text-xl md:text-2xl font-black text-white uppercase tracking-widest">TRUE</span>
                </button>

                <button
                    onClick={() => sendAnswer(1)} // False
                    className="bg-red-500 hover:bg-red-600 rounded-[2rem] flex flex-col items-center justify-center group active:scale-95 transition-all shadow-xl relative overflow-hidden"
                >
                    <div className="w-16 h-16 md:w-24 md:h-24 bg-white/20 rounded-full flex items-center justify-center text-3xl md:text-5xl mb-2 md:mb-4 text-white">
                        <XCircle size={32} className="md:w-12 md:h-12" />
                    </div>
                    <span className="text-xl md:text-2xl font-black text-white uppercase tracking-widest">FALSE</span>
                </button>
            </div>
        );
    }

    return (
        <div className="h-[100dvh] grid grid-cols-2 grid-rows-2 gap-3 md:gap-4 p-3 md:p-4 bg-transparent">
            <button
                onClick={() => sendAnswer(0)}
                className="bg-white border-2 border-slate-100 hover:border-blue-300 rounded-3xl md:rounded-[2.5rem] flex flex-col items-center justify-center group active:scale-95 transition-all shadow-xl relative overflow-hidden"
            >
                <div className="absolute inset-0 bg-blue-50 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="w-14 h-14 md:w-20 md:h-20 bg-blue-500 rounded-xl md:rounded-2xl flex items-center justify-center text-2xl md:text-4xl shadow-lg shadow-blue-500/20 mb-2 md:mb-4 group-hover:scale-110 transition-transform relative z-10">
                    <span className="text-white drop-shadow-md">▲</span>
                </div>
                <span className="text-[10px] md:text-xs font-black text-blue-400 uppercase tracking-widest opacity-60 group-hover:opacity-100 transition-opacity relative z-10">A variant</span>
            </button>

            <button
                onClick={() => sendAnswer(1)}
                className="bg-white border-2 border-slate-100 hover:border-emerald-300 rounded-3xl md:rounded-[2.5rem] flex flex-col items-center justify-center group active:scale-95 transition-all shadow-xl relative overflow-hidden"
            >
                <div className="absolute inset-0 bg-emerald-50 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="w-14 h-14 md:w-20 md:h-20 bg-emerald-500 rounded-xl md:rounded-2xl flex items-center justify-center text-2xl md:text-4xl shadow-lg shadow-emerald-500/20 mb-2 md:mb-4 group-hover:scale-110 transition-transform relative z-10">
                    <span className="text-white drop-shadow-md">◆</span>
                </div>
                <span className="text-[10px] md:text-xs font-black text-emerald-400 uppercase tracking-widest opacity-60 group-hover:opacity-100 transition-opacity relative z-10">B variant</span>
            </button>

            <button
                onClick={() => sendAnswer(2)}
                className="bg-white border-2 border-slate-100 hover:border-orange-300 rounded-3xl md:rounded-[2.5rem] flex flex-col items-center justify-center group active:scale-95 transition-all shadow-xl relative overflow-hidden"
            >
                <div className="absolute inset-0 bg-orange-50 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="w-14 h-14 md:w-20 md:h-20 bg-orange-500 rounded-xl md:rounded-2xl flex items-center justify-center text-2xl md:text-4xl shadow-lg shadow-orange-500/20 mb-2 md:mb-4 group-hover:scale-110 transition-transform relative z-10">
                    <span className="text-white drop-shadow-md">●</span>
                </div>
                <span className="text-[10px] md:text-xs font-black text-orange-400 uppercase tracking-widest opacity-60 group-hover:opacity-100 transition-opacity relative z-10">C variant</span>
            </button>

            <button
                onClick={() => sendAnswer(3)}
                className="bg-white border-2 border-slate-100 hover:border-indigo-300 rounded-3xl md:rounded-[2.5rem] flex flex-col items-center justify-center group active:scale-95 transition-all shadow-xl relative overflow-hidden"
            >
                <div className="absolute inset-0 bg-indigo-50 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="w-14 h-14 md:w-20 md:h-20 bg-indigo-500 rounded-xl md:rounded-2xl flex items-center justify-center text-2xl md:text-4xl shadow-lg shadow-indigo-500/20 mb-2 md:mb-4 group-hover:scale-110 transition-transform relative z-10">
                    <span className="text-white drop-shadow-md">■</span>
                </div>
                <span className="text-[10px] md:text-xs font-black text-indigo-400 uppercase tracking-widest opacity-60 group-hover:opacity-100 transition-opacity relative z-10">D variant</span>
            </button>
        </div>
    );
}
