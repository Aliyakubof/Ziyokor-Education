import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Play } from 'lucide-react';
import { socket } from '../socket';

interface QuestionData {
    text: string;
    options: string[];
    timeLimit: number;
    questionIndex: number;
    totalQuestions: number;
    correctIndex: number;
}

export default function HostGame() {
    const { pin } = useParams();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [question, setQuestion] = useState<QuestionData | null>(null);
    const [answersCount, setAnswersCount] = useState(0);
    const [timeLeft, setTimeLeft] = useState(0);
    const [showResult, setShowResult] = useState(false);
    const [leaderboard, setLeaderboard] = useState<{ name: string; score: number }[] | null>(null);

    useEffect(() => {
        if (searchParams.get('start') === 'true') {
            socket.emit('host-start-game', pin);
        }

        socket.on('question-new', (q) => {
            setQuestion(q);
            setTimeLeft(q.timeLimit);
            setAnswersCount(0);
            setShowResult(false);
        });

        socket.on('answers-count', (count) => {
            setAnswersCount(count);
        });

        socket.on('game-over', (finalLeaderboard) => {
            setLeaderboard(finalLeaderboard);
        });

        return () => {
            socket.off('question-new');
            socket.off('answers-count');
            socket.off('game-over');
        };
    }, [pin, searchParams]);

    useEffect(() => {
        if (timeLeft > 0 && !showResult && !leaderboard) {
            const timer = setInterval(() => setTimeLeft(t => t - 1), 1000);
            return () => clearInterval(timer);
        } else if (timeLeft === 0 && !showResult && question && !leaderboard) {
            setShowResult(true);
        }
    }, [timeLeft, showResult, question, leaderboard]);

    const nextQuestion = () => {
        socket.emit('host-next-question', pin);
    };

    if (leaderboard) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen p-8 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full bg-slate-950 -z-10"></div>
                <div className="absolute top-1/4 -left-20 w-96 h-96 bg-blue-600/10 rounded-full blur-[100px] animate-pulse"></div>
                <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-indigo-600/10 rounded-full blur-[100px] animate-pulse"></div>

                <div className="relative z-10 flex flex-col items-center w-full max-w-5xl">
                    <div className="text-center mb-16">
                        <div className="inline-flex items-center gap-2 px-6 py-2 glass rounded-full mb-6 border-slate-700/30">
                            <span className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></span>
                            <span className="text-xs font-black text-slate-300 uppercase tracking-[0.3em]">Final Results</span>
                        </div>
                        <h1 className="text-7xl font-black text-white text-glow mb-4">G'oliblar</h1>
                    </div>

                    <div className="flex items-end justify-center gap-4 w-full h-[500px]">
                        {leaderboard[1] && (
                            <div className="flex flex-col items-center w-full max-w-[200px]">
                                <div className="text-xl font-black mb-4 text-slate-400 text-center truncate w-full px-2">{leaderboard[1]?.name}</div>
                                <div className="glass-blue w-full h-48 rounded-t-[2.5rem] flex flex-col items-center justify-center border-b-0 shadow-2xl relative group overflow-hidden">
                                    <div className="absolute inset-0 bg-blue-500/5 group-hover:bg-blue-500/10 transition-colors"></div>
                                    <span className="text-6xl font-black text-blue-400/30 relative z-10">2</span>
                                </div>
                                <div className="w-full glass p-4 rounded-b-2xl border-t-0 text-center">
                                    <div className="text-lg font-black text-white">{leaderboard[1]?.score}</div>
                                    <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">ball</div>
                                </div>
                            </div>
                        )}

                        {leaderboard[0] && (
                            <div className="flex flex-col items-center w-full max-w-[240px] z-10 -translate-y-8 animate-float">
                                <div className="relative mb-6">
                                    <div className="absolute -inset-4 bg-yellow-400/20 blur-xl rounded-full"></div>
                                    <div className="text-3xl font-black text-white text-center truncate w-full px-2 relative">{leaderboard[0]?.name}</div>
                                </div>
                                <div className="bg-gradient-to-b from-yellow-400 via-yellow-500 to-yellow-600 w-full h-64 rounded-t-[3rem] flex flex-col items-center justify-center shadow-[0_0_50px_rgba(234,179,8,0.3)] relative overflow-hidden group">
                                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.4),transparent)] animate-pulse"></div>
                                    <span className="text-8xl font-black text-white/40 relative z-10">1</span>
                                    <div className="absolute bottom-4 animate-bounce">👑</div>
                                </div>
                                <div className="w-full glass p-6 rounded-b-3xl border-t-0 text-center border-yellow-500/20 bg-yellow-500/5">
                                    <div className="text-2xl font-black text-yellow-500 tracking-tight">{leaderboard[0]?.score}</div>
                                    <div className="text-xs font-black text-yellow-500/50 uppercase tracking-[0.2em]">ball</div>
                                </div>
                            </div>
                        )}

                        {leaderboard[2] && (
                            <div className="flex flex-col items-center w-full max-w-[200px]">
                                <div className="text-lg font-black mb-4 text-slate-500 text-center truncate w-full px-2">{leaderboard[2]?.name}</div>
                                <div className="glass-indigo w-full h-32 rounded-t-[2.5rem] flex flex-col items-center justify-center border-b-0 shadow-2xl relative group overflow-hidden">
                                    <div className="absolute inset-0 bg-indigo-500/5 group-hover:bg-indigo-500/10 transition-colors"></div>
                                    <span className="text-5xl font-black text-indigo-400/30 relative z-10">3</span>
                                </div>
                                <div className="w-full glass p-4 rounded-b-2xl border-t-0 text-center">
                                    <div className="text-lg font-black text-white">{leaderboard[2]?.score}</div>
                                    <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">ball</div>
                                </div>
                            </div>
                        )}
                    </div>

                    <button
                        onClick={() => navigate('/')}
                        className="mt-20 px-10 py-4 glass hover:bg-slate-800 text-white font-black rounded-2xl transition-all btn-premium border-slate-700/50 shadow-xl"
                    >
                        TUGATISH
                    </button>
                </div>
            </div>
        );
    }

    if (!question) return (
        <div className="flex flex-col items-center justify-center min-h-screen p-8 text-white relative">
            <div className="absolute top-0 left-0 w-full h-full bg-slate-950 -z-10"></div>
            <div className="w-16 h-16 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mb-4"></div>
            <p className="text-slate-500 font-black uppercase tracking-widest text-xs animate-pulse">Yuklanmoqda...</p>
        </div>
    );

    return (
        <div className="flex flex-col h-screen relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full bg-slate-950 -z-10"></div>

            <header className="glass p-6 md:p-8 flex justify-between items-center border-b border-slate-700/30">
                <div className="flex items-center gap-4">
                    <div className="bg-slate-900 border border-slate-700 px-4 py-2 rounded-xl">
                        <span className="text-sm font-black text-slate-500 uppercase tracking-widest">Savol</span>
                        <div className="text-xl font-black text-white">{question.questionIndex} / {question.totalQuestions}</div>
                    </div>
                </div>

                <h2 className="text-2xl md:text-4xl font-black text-center text-white text-glow px-4 line-clamp-2 leading-tight">
                    {question.text}
                </h2>

                <div className="relative">
                    <svg className="w-20 h-20 -rotate-90 md:w-24 md:h-24">
                        <circle cx="50%" cy="50%" r="45%" className="fill-none stroke-slate-800 stroke-[4px]" />
                        <circle
                            cx="50%" cy="50%" r="45%"
                            className="fill-none stroke-blue-500 stroke-[6px] transition-all duration-1000"
                            style={{
                                strokeDasharray: '283',
                                strokeDashoffset: `${283 - (timeLeft / question.timeLimit) * 283}`
                            }}
                        />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center text-2xl md:text-3xl font-black text-white text-glow">
                        {timeLeft}
                    </div>
                </div>
            </header>

            <main className="flex-1 flex items-center justify-center p-8 relative">
                <div className="absolute left-10 top-1/2 -translate-y-1/2 glass-blue border-transparent px-8 py-6 rounded-[2.5rem] text-center shadow-2xl animate-float">
                    <div className="text-6xl font-black text-white text-glow mb-1">{answersCount}</div>
                    <div className="text-xs font-black text-blue-400 tracking-[0.2em]">JAVOBLAR</div>
                </div>

                {showResult && (
                    <div className="relative z-20 flex flex-col items-center gap-6">
                        <div className="glass p-8 rounded-[3rem] border-slate-700/30 text-center animate-bounce shadow-2xl">
                            <span className="text-sm font-bold text-slate-500 uppercase tracking-widest">Tayyormisiz?</span>
                        </div>
                        <button
                            onClick={nextQuestion}
                            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-12 py-5 rounded-[2rem] text-2xl font-black shadow-[0_0_30px_rgba(59,130,246,0.5)] transition-all btn-premium flex items-center gap-3"
                        >
                            <span>Keyingi savol</span>
                            <Play className="fill-current" />
                        </button>
                    </div>
                )}
            </main>

            <div className="grid grid-cols-2 gap-4 h-1/3 p-4 md:p-8 bg-slate-900 shadow-[0_-20px_50px_rgba(0,0,0,0.5)]">
                {question.options.map((opt, i) => (
                    <div
                        key={i}
                        className={`
                            relative glass rounded-[2rem] p-6 md:p-8 flex items-center gap-6 transition-all duration-500 border-2 btn-premium
                            ${showResult
                                ? (i === question.correctIndex ? 'border-emerald-500/50 bg-emerald-500/10' : 'border-slate-800 opacity-20 scale-[0.98]')
                                : 'border-slate-700/30 hover:border-slate-500'
                            }
                        `}
                    >
                        <div className={`
                            w-12 h-12 md:w-16 md:h-16 rounded-2xl flex items-center justify-center text-xl md:text-2xl 
                            ${i === 0 ? 'bg-blue-600' : i === 1 ? 'bg-emerald-600' : i === 2 ? 'bg-orange-600' : i === 3 ? 'bg-indigo-600' : 'bg-slate-600'}
                            shadow-lg shadow-black/40
                        `}>
                            {i === 0 && '▲'} {i === 1 && '◆'} {i === 2 && '●'} {i === 3 && '■'}
                        </div>
                        <span className="text-lg md:text-2xl font-bold text-white tracking-tight leading-snug">{opt}</span>

                        {showResult && i === question.correctIndex && (
                            <div className="absolute top-4 right-6 text-emerald-500 font-black animate-pulse text-xs tracking-widest">
                                TO'G'RI JAVOB
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
