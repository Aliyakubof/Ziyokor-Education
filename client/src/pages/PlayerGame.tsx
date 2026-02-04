import { useEffect, useState } from 'react';
import { socket } from '../socket';
import { Trophy, Clock, CheckCircle2, AlertCircle, Play } from 'lucide-react';

export default function PlayerGame() {
    const [view, setView] = useState<'WAITING' | 'PLAYING' | 'ANSWERED' | 'FINISHED'>('WAITING');
    const [rank, setRank] = useState<{ rank: number; score: number } | null>(null);

    useEffect(() => {
        socket.on('game-started', () => {
            setView('WAITING');
        });

        socket.on('question-start', () => {
            setView('PLAYING');
        });

        socket.on('game-over', (leaderboard) => {
            setView('FINISHED');
            const myId = socket.id;
            const myRank = leaderboard.findIndex((p: any) => p.id === myId) + 1;
            const myScore = leaderboard.find((p: any) => p.id === myId)?.score || 0;
            setRank({ rank: myRank, score: myScore });
        });

        return () => {
            socket.off('game-started');
            socket.off('question-start');
            socket.off('game-over');
        };
    }, []);

    const sendAnswer = (idx: number) => {
        const pin = localStorage.getItem('kahoot-pin');
        if (!pin) return;
        socket.emit('player-answer', { pin, answerIndex: idx });
        setView('ANSWERED');
    };

    if (view === 'FINISHED') {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen p-6 relative overflow-hidden">
                <div className="absolute inset-0 bg-slate-950 -z-10"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.1),transparent)] blur-3xl"></div>

                <div className="glass rounded-[3rem] p-10 text-center max-w-md w-full shadow-2xl border-slate-700/30 relative z-10">
                    <div className="w-24 h-24 bg-gradient-to-tr from-yellow-400 to-orange-500 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-xl shadow-yellow-500/20 animate-float">
                        <Trophy className="text-white" size={48} />
                    </div>

                    <h1 className="text-4xl font-black text-white mb-2 tracking-tight">Test Tugadi!</h1>
                    <p className="text-slate-500 font-bold text-xs uppercase tracking-widest mb-10">Sizning natijangiz</p>

                    <div className="relative mb-10">
                        <div className="text-[120px] font-black text-white leading-none tracking-tighter text-glow">
                            {rank?.rank}
                        </div>
                        <div className="text-2xl font-black text-blue-500 absolute bottom-4 right-1/4 translate-x-12 uppercase">
                            {rank?.rank === 1 ? 'st' : rank?.rank === 2 ? 'nd' : rank?.rank === 3 ? 'rd' : 'th'} O'rin
                        </div>
                    </div>

                    <div className="glass-blue border-transparent p-6 rounded-[2rem] shadow-xl">
                        <div className="text-sm font-black text-blue-400 uppercase tracking-widest mb-1">To'plangan Ball</div>
                        <div className="text-4xl font-black text-white">{rank?.score}</div>
                    </div>

                    <button
                        onClick={() => window.location.href = '/'}
                        className="mt-10 w-full bg-slate-900/50 hover:bg-slate-800 text-slate-400 hover:text-white font-black py-4 rounded-2xl transition-all border border-slate-700/30"
                    >
                        CHIQISH
                    </button>
                </div>
            </div>
        );
    }

    if (view === 'WAITING' || view === 'ANSWERED') {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen p-6 relative overflow-hidden">
                <div className="absolute inset-0 bg-slate-950 -z-10"></div>

                <div className="flex flex-col items-center gap-8 z-10">
                    <div className="relative">
                        <div className="w-32 h-32 border-4 border-blue-500/10 border-t-blue-500 rounded-full animate-spin"></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                            {view === 'WAITING' ? (
                                <Clock className="text-blue-500 animate-pulse" size={40} />
                            ) : (
                                <CheckCircle2 className="text-emerald-500 animate-bounce" size={40} />
                            )}
                        </div>
                    </div>

                    <div className="text-center">
                        <h2 className="text-3xl font-black text-white mb-2 tracking-tight">
                            {view === 'WAITING' ? "Tayyor turing!" : "Javob yuborildi!"}
                        </h2>
                        <p className="text-slate-500 font-bold text-xs uppercase tracking-[0.2em] animate-pulse">
                            {view === 'WAITING' ? "Savol yuklanmoqda..." : "Keyingi savolni kuting"}
                        </p>
                    </div>

                    {view === 'ANSWERED' && (
                        <div className="glass-emerald border-transparent px-8 py-4 rounded-2xl flex items-center gap-3">
                            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></span>
                            <span className="text-sm font-black text-emerald-400 uppercase tracking-widest">Muvaffaqiyatli</span>
                        </div>
                    )}
                </div>

                <div className="absolute bottom-10 flex flex-col items-center gap-2">
                    <AlertCircle className="text-slate-800" size={24} />
                    <p className="text-[10px] font-black text-slate-800 uppercase tracking-[0.3em]">Ilovadan chiqmang</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen grid grid-cols-2 grid-rows-2 gap-4 p-4 bg-slate-950">
            <button
                onClick={() => sendAnswer(0)}
                className="glass-blue border-transparent rounded-[2.5rem] flex flex-col items-center justify-center group active:scale-95 transition-all shadow-2xl relative overflow-hidden"
            >
                <div className="absolute inset-0 bg-blue-500/5 group-hover:bg-blue-500/10 transition-colors"></div>
                <div className="w-20 h-20 bg-blue-600 rounded-2xl flex items-center justify-center text-4xl shadow-lg shadow-blue-500/20 mb-4 group-hover:scale-110 transition-transform">
                    <span className="text-white drop-shadow-md">▲</span>
                </div>
                <span className="text-xs font-black text-blue-400 uppercase tracking-widest opacity-40 group-hover:opacity-100 transition-opacity">A variant</span>
            </button>

            <button
                onClick={() => sendAnswer(1)}
                className="glass-emerald border-transparent rounded-[2.5rem] flex flex-col items-center justify-center group active:scale-95 transition-all shadow-2xl relative overflow-hidden"
            >
                <div className="absolute inset-0 bg-emerald-500/5 group-hover:bg-emerald-500/10 transition-colors"></div>
                <div className="w-20 h-20 bg-emerald-600 rounded-2xl flex items-center justify-center text-4xl shadow-lg shadow-emerald-500/20 mb-4 group-hover:scale-110 transition-transform">
                    <span className="text-white drop-shadow-md">◆</span>
                </div>
                <span className="text-xs font-black text-emerald-400 uppercase tracking-widest opacity-40 group-hover:opacity-100 transition-opacity">B variant</span>
            </button>

            <button
                onClick={() => sendAnswer(2)}
                className="glass-orange border-transparent rounded-[2.5rem] flex flex-col items-center justify-center group active:scale-95 transition-all shadow-2xl relative overflow-hidden"
            >
                <div className="absolute inset-0 bg-orange-500/5 group-hover:bg-orange-500/10 transition-colors"></div>
                <div className="w-20 h-20 bg-orange-600 rounded-2xl flex items-center justify-center text-4xl shadow-lg shadow-orange-500/20 mb-4 group-hover:scale-110 transition-transform">
                    <span className="text-white drop-shadow-md">●</span>
                </div>
                <span className="text-xs font-black text-orange-400 uppercase tracking-widest opacity-40 group-hover:opacity-100 transition-opacity">C variant</span>
            </button>

            <button
                onClick={() => sendAnswer(3)}
                className="glass-indigo border-transparent rounded-[2.5rem] flex flex-col items-center justify-center group active:scale-95 transition-all shadow-2xl relative overflow-hidden"
            >
                <div className="absolute inset-0 bg-indigo-500/5 group-hover:bg-indigo-500/10 transition-colors"></div>
                <div className="w-20 h-20 bg-indigo-600 rounded-2xl flex items-center justify-center text-4xl shadow-lg shadow-indigo-500/20 mb-4 group-hover:scale-110 transition-transform">
                    <span className="text-white drop-shadow-md">■</span>
                </div>
                <span className="text-xs font-black text-indigo-400 uppercase tracking-widest opacity-40 group-hover:opacity-100 transition-opacity">D variant</span>
            </button>
        </div>
    );
}
