import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Play, CheckCircle2, XCircle, Info, AlertTriangle } from 'lucide-react';
import { socket } from '../socket';

interface QuestionData {
    info?: string;
    text: string;
    options: string[];
    timeLimit: number;
    questionIndex: number;
    totalQuestions: number;
    correctIndex: number;
    type?: 'multiple-choice' | 'text-input' | 'true-false' | 'fill-blank' | 'find-mistake' | 'rewrite' | 'word-box' | 'info-slide';
    acceptedAnswers?: string[];
}

export default function HostGame() {
    const { pin } = useParams();
    const navigate = useNavigate();
    // const [searchParams] = useSearchParams();
    const [question, setQuestion] = useState<QuestionData | null>(null);
    const [answersCount, setAnswersCount] = useState(0);
    const [timeLeft, setTimeLeft] = useState(0);
    const [showResult, setShowResult] = useState(false);
    const [leaderboard, setLeaderboard] = useState<{ name: string; score: number }[] | null>(null);
    const [totalTimeMinutes, setTotalTimeMinutes] = useState(10);
    const [gameStarted, setGameStarted] = useState(false);
    const [globalEndTime, setGlobalEndTime] = useState<number | null>(null);
    const [globalTimeLeft, setGlobalTimeLeft] = useState<number | null>(null);
    const [isUnitMode, setIsUnitMode] = useState(false);
    const [unitPlayers, setUnitPlayers] = useState<any[]>([]);
    const [totalQuestionsCount, setTotalQuestionsCount] = useState(0);
    const [quizTitle, setQuizTitle] = useState('');
    const [currentTopic, setCurrentTopic] = useState('');

    useEffect(() => {
        if (!pin) return;

        // Ensure socket is connected when joining the game host view
        if (!socket.connected) {
            socket.connect();
        }

        // Request status immediately
        socket.emit('host-get-status', pin);

        socket.on('game-started', (data: any) => {
            if (data?.endTime) setGlobalEndTime(data.endTime);
            if (data?.title) setQuizTitle(data.title);
            setGameStarted(true);
        });
        // ... (rest of the useEffect is similar, but I'll update the whole block for safety)

        socket.on('unit-game-started', (data: { questions: any[], endTime?: number, title?: string }) => {
            setIsUnitMode(true);
            setTotalQuestionsCount(data.questions.length);
            setGlobalEndTime(data.endTime || null);
            setQuizTitle(data.title || '');
            setGameStarted(true);
        });

        socket.on('player-update', (players: any[]) => {
            setUnitPlayers(players);
        });

        socket.on('question-new', (q) => {
            if (q.type === 'info-slide') setCurrentTopic(q.text);
            setQuestion(q);
            setTimeLeft(q.timeLimit);
            setAnswersCount(0);
            setShowResult(false);
            setGameStarted(true);
        });

        socket.on('answers-count', (count) => {
            setAnswersCount(count);
        });

        socket.on('game-over', (finalLeaderboard) => {
            setLeaderboard(finalLeaderboard);
        });

        return () => {
            socket.off('game-started');
            socket.off('unit-game-started');
            socket.off('player-update');
            socket.off('question-new');
            socket.off('answers-count');
            socket.off('game-over');
        };
    }, [pin]);

    useEffect(() => {
        // Per-question timer (only runs if NO global timer or if we want both. For now, let's keep it for visual)
        if (timeLeft > 0 && !showResult && !leaderboard) {
            const timer = setInterval(() => setTimeLeft(t => t - 1), 1000);
            return () => clearInterval(timer);
        } else if (timeLeft === 0 && !showResult && question && !leaderboard) {
            // If Global Timer exists, we DO NOT auto-show result?
            // User said: "vaqt tugasa ham to'xtamasin". This controls the question time.
            // If Unit Quiz has global time, maybe per-question time is irrelevant or just a guide?
            // I'll keep it for now as it triggers 'showResult' (Correct Answer reveal).
            // The User likely meant the GLOBAL timer shouldn't stop the GAME.
            setShowResult(true);
        }
    }, [timeLeft, showResult, question, leaderboard]);

    useEffect(() => {
        if (globalEndTime) {
            const timer = setInterval(() => {
                const left = Math.floor((globalEndTime - Date.now()) / 1000);
                setGlobalTimeLeft(left);
                // We do NOT stop the game if left <= 0. Just show 0 or negative.
            }, 1000);
            return () => clearInterval(timer);
        }
    }, [globalEndTime]);

    const startGame = () => {
        if (totalTimeMinutes < 1) return alert("Vaqtni kiriting");
        socket.emit('host-start-game', { pin, totalTimeMinutes });
    };

    const nextQuestion = () => {
        socket.emit('host-next-question', pin);
    };

    if (leaderboard) {
        return (
            // ... (keep existing leaderboard return logic)
            <div className="flex flex-col items-center justify-center min-h-screen p-8 relative overflow-hidden bg-transparent">
                <div className="relative z-10 flex flex-col items-center w-full max-w-5xl">
                    <div className="text-center mb-16">
                        <div className="inline-flex items-center gap-2 px-6 py-2 bg-white rounded-full mb-6 border border-slate-200 shadow-sm">
                            <span className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></span>
                            <span className="text-xs font-black text-slate-500 uppercase tracking-[0.3em]">Final Results</span>
                        </div>
                        <h1 className="text-7xl font-black text-slate-900 mb-4">G'oliblar</h1>
                    </div>

                    <div className="flex items-end justify-center gap-4 w-full h-[500px]">
                        {leaderboard[1] && (
                            <div className="flex flex-col items-center w-full max-w-[200px]">
                                <div className="text-xl font-black mb-4 text-slate-500 text-center truncate w-full px-2">{leaderboard[1]?.name}</div>
                                <div className="bg-blue-50 w-full h-48 rounded-t-[2.5rem] flex flex-col items-center justify-center border-b-0 shadow-xl relative group overflow-hidden border border-blue-100">
                                    <div className="absolute inset-0 bg-blue-100/50 group-hover:bg-blue-200/50 transition-colors"></div>
                                    <span className="text-6xl font-black text-blue-300 relative z-10">2</span>
                                </div>
                                <div className="w-full bg-white p-4 rounded-b-2xl border border-t-0 border-slate-200 text-center shadow-md">
                                    <div className="text-lg font-black text-slate-800">{leaderboard[1]?.score}</div>
                                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ball</div>
                                </div>
                            </div>
                        )}

                        {leaderboard[0] && (
                            <div className="flex flex-col items-center w-full max-w-[240px] z-10 -translate-y-8 animate-float">
                                <div className="relative mb-6">
                                    <div className="absolute -inset-4 bg-yellow-200/50 blur-xl rounded-full"></div>
                                    <div className="text-3xl font-black text-slate-800 text-center truncate w-full px-2 relative">{leaderboard[0]?.name}</div>
                                </div>
                                <div className="bg-gradient-to-b from-yellow-300 via-yellow-400 to-yellow-500 w-full h-64 rounded-t-[3rem] flex flex-col items-center justify-center shadow-[0_10px_40px_rgba(250,204,21,0.3)] relative overflow-hidden group">
                                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.4),transparent)] animate-pulse"></div>
                                    <span className="text-8xl font-black text-white/60 relative z-10">1</span>
                                    <div className="absolute bottom-4 animate-bounce text-4xl">👑</div>
                                </div>
                                <div className="w-full bg-white p-6 rounded-b-3xl border-t-0 text-center border border-yellow-100 shadow-xl">
                                    <div className="text-2xl font-black text-yellow-500 tracking-tight">{leaderboard[0]?.score}</div>
                                    <div className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">ball</div>
                                </div>
                            </div>
                        )}

                        {leaderboard[2] && (
                            <div className="flex flex-col items-center w-full max-w-[200px]">
                                <div className="text-lg font-black mb-4 text-slate-500 text-center truncate w-full px-2">{leaderboard[2]?.name}</div>
                                <div className="bg-indigo-50 w-full h-32 rounded-t-[2.5rem] flex flex-col items-center justify-center border-b-0 shadow-xl relative group overflow-hidden border border-indigo-100">
                                    <div className="absolute inset-0 bg-indigo-100/50 group-hover:bg-indigo-200/50 transition-colors"></div>
                                    <span className="text-5xl font-black text-indigo-300 relative z-10">3</span>
                                </div>
                                <div className="w-full bg-white p-4 rounded-b-2xl border border-t-0 border-slate-200 text-center shadow-md">
                                    <div className="text-lg font-black text-slate-800">{leaderboard[2]?.score}</div>
                                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ball</div>
                                </div>
                            </div>
                        )}
                    </div>

                    <button
                        onClick={() => navigate('/')}
                        className="mt-20 px-10 py-4 bg-white hover:bg-slate-50 text-slate-800 font-black rounded-2xl transition-all btn-premium border border-slate-200 shadow-lg hover:shadow-xl"
                    >
                        TUGATISH
                    </button>
                </div>
            </div>
        );
    }

    if (isUnitMode) {
        return (
            // ... (Unit Mode UI return moved up)
            <div className="flex flex-col h-screen bg-slate-50 relative overflow-hidden">
                <header className="bg-white p-6 flex justify-between items-center border-b border-slate-200 shadow-sm z-10 shrink-0">
                    <div>
                        <h1 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                            <span className="w-3 h-3 bg-indigo-500 rounded-full animate-pulse"></span>
                            {quizTitle || 'Unit Quiz Monitoring'}
                        </h1>
                        <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-1">Live Results Panel</p>
                    </div>

                    <div className="flex items-center gap-8">
                        {globalTimeLeft !== null && (
                            <div className="text-center">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Qolgan vaqt</p>
                                <div className={`text-3xl font-black px-6 py-2 rounded-2xl border-2 transition-all shadow-sm
                                    ${globalTimeLeft < 60 ? 'bg-red-50 border-red-200 text-red-600 animate-pulse' : 'bg-slate-50 border-slate-100 text-slate-700'}`}>
                                    {Math.floor(globalTimeLeft / 60)}:{(globalTimeLeft % 60).toString().padStart(2, '0').replace('-', '')}
                                </div>
                            </div>
                        )}
                        <button
                            onClick={() => window.confirm('O\'yinni haqiqatdan ham tugatmoqchimisiz?') && socket.emit('host-end-game', pin)}
                            className="bg-red-50 hover:bg-red-100 text-red-600 px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all border border-red-200 active:scale-95"
                        >
                            End Game Early
                        </button>
                    </div>
                </header>

                <main className="flex-1 p-8 overflow-y-auto custom-scrollbar">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {unitPlayers.map((player, idx) => {
                            const answeredCount = Object.keys(player.answers || {}).length;
                            const isFinished = player.isFinished || false;
                            const percentage = (answeredCount / totalQuestionsCount) * 100;

                            const isCheating = player.status === 'Cheating';

                            return (
                                <div key={idx} className={`bg-white rounded-[2rem] p-6 shadow-sm border transition-all hover:shadow-md relative
                                    ${isFinished ? 'border-emerald-200 bg-emerald-50/30' :
                                        isCheating ? 'border-red-200 bg-red-50/30 ring-2 ring-red-500/20' : 'border-slate-100'}`}>

                                    {isCheating && (
                                        <div className="absolute -top-3 -right-3 bg-red-500 text-white p-2 rounded-xl shadow-lg animate-bounce z-20">
                                            <AlertTriangle size={20} />
                                        </div>
                                    )}
                                    <div className="flex justify-between items-start mb-6">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-white text-xl shadow-lg
                                                ${isFinished ? 'bg-emerald-500 shadow-emerald-500/20' : 'bg-indigo-500 shadow-indigo-500/20'}`}>
                                                {player.name?.[0]?.toUpperCase() || 'S'}
                                            </div>
                                            <div>
                                                <h3 className="font-black text-slate-800 text-lg leading-tight truncate max-w-[120px]">{player.name}</h3>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-2xl font-black text-slate-800">{player.score}</div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">BALL</p>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <div className="flex justify-between text-xs font-black uppercase tracking-widest text-slate-400">
                                            <span>Progress</span>
                                            <span className={isFinished ? 'text-emerald-500' : 'text-indigo-500'}>
                                                {answeredCount} / {totalQuestionsCount}
                                            </span>
                                        </div>
                                        <div className="h-4 bg-slate-100 rounded-full overflow-hidden shadow-inner p-0.5">
                                            <div
                                                className={`h-full rounded-full transition-all duration-1000 ${isFinished ? 'bg-gradient-to-r from-emerald-400 to-teal-500' : 'bg-gradient-to-r from-indigo-500 to-blue-500'}`}
                                                style={{ width: `${percentage}%` }}
                                            />
                                        </div>
                                    </div>

                                    {isFinished && (
                                        <div className="mt-6 pt-4 border-t border-emerald-100/50 flex items-center justify-center gap-2 text-emerald-600 font-bold text-xs uppercase tracking-widest">
                                            <CheckCircle2 size={16} /> Barchasi tayyor
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {unitPlayers.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center text-slate-300">
                            <div className="w-20 h-20 border-4 border-slate-100 border-t-indigo-200 rounded-full animate-spin mb-6"></div>
                            <p className="font-black uppercase tracking-widest text-sm">O'quvchilar javoblarini kutmoqdamiz...</p>
                        </div>
                    )}
                </main>

                <footer className="bg-white p-6 border-t border-slate-200 flex justify-between items-center shrink-0">
                    <div className="flex gap-10">
                        <div className="flex items-center gap-3">
                            <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                            <span className="text-xs font-black text-slate-500 uppercase tracking-widest">
                                {unitPlayers.filter(p => p.isFinished).length} Tugatdi
                            </span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-3 h-3 bg-indigo-500 rounded-full animate-pulse"></div>
                            <span className="text-xs font-black text-slate-500 uppercase tracking-widest">
                                {unitPlayers.filter(p => !p.isFinished).length} Davom etmoqda
                            </span>
                        </div>
                    </div>

                    <div className="text-slate-400 font-bold text-xs">
                        Ziyokor Education Live Quiz System
                    </div>
                </footer>
            </div>
        );
    }

    if (!question && !gameStarted) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen p-8 bg-transparent relative">
                <div className="bg-white p-10 rounded-[2.5rem] shadow-xl border border-slate-200 text-center max-w-md w-full">
                    <h1 className="text-3xl font-black text-slate-800 mb-2">O'yinni Boshlash</h1>
                    <p className="text-slate-500 mb-8 font-medium">O'quvchilar qo'shilishini kuting...</p>

                    <div className="mb-8 text-left">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 block mb-2">Umumiy Vaqt (Daqiqa)</label>
                        <input
                            type="number"
                            value={totalTimeMinutes}
                            onChange={(e) => setTotalTimeMinutes(Number(e.target.value))}
                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-slate-900 font-bold text-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all text-center"
                            min="1"
                        />
                        <p className="text-xs text-slate-400 mt-2 text-center">Har bir savolga {(totalTimeMinutes * 60 / (10)).toFixed(0)}~ soniya ajratiladi (taxminan)</p>
                    </div>

                    <button
                        onClick={startGame}
                        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black py-4 rounded-2xl transition-all shadow-xl shadow-indigo-500/20 btn-premium flex items-center justify-center gap-3 active:scale-95"
                    >
                        <Play size={24} />
                        BOSHLASH
                    </button>
                </div>
            </div>
        );
    }

    if (!question) return (
        <div className="flex flex-col items-center justify-center min-h-screen p-8 bg-transparent relative">
            <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin mb-4"></div>
            <p className="text-slate-400 font-black uppercase tracking-widest text-xs animate-pulse">Yuklanmoqda...</p>
        </div>
    );

    return (
        <div className="flex flex-col h-screen relative overflow-hidden bg-transparent">

            <header className="bg-white/80 backdrop-blur-md p-6 md:p-8 flex justify-between items-center border-b border-slate-200 z-10">
                <div className="flex items-center gap-4">
                    <div className="bg-slate-100 border border-slate-200 px-4 py-2 rounded-xl">
                        <span className="text-sm font-black text-slate-400 uppercase tracking-widest">{question.info || 'Savol'}</span>
                        <div className="text-xl font-black text-slate-800">{question.questionIndex} / {question.totalQuestions}</div>
                    </div>
                </div>

                <div className="flex-1 px-8 text-center">
                    {(currentTopic || quizTitle) && (
                        <h2 className="text-xs font-black text-indigo-400 uppercase tracking-[0.2em] mb-1">
                            {question.info || currentTopic || quizTitle}
                        </h2>
                    )}
                    <h2 className="text-2xl md:text-3xl font-black text-slate-800 px-4 line-clamp-2 leading-tight">
                        {question.type === 'info-slide' ? 'Information' : question.text}
                    </h2>
                </div>

                <button
                    onClick={() => socket.emit('host-end-game', pin)}
                    className="mr-4 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-600 rounded-xl font-bold text-xs uppercase tracking-widest transition-colors border border-red-200"
                >
                    TUGATISH
                </button>

                <div className="relative">
                    {/* Global Timer Display if active */}
                    {globalTimeLeft !== null ? (
                        <div className={`text - 4xl font - black ${globalTimeLeft < 0 ? 'text-red-500 animate-pulse' : 'text-slate-700'} `}>
                            {Math.floor(globalTimeLeft / 60)}:{(globalTimeLeft % 60).toString().padStart(2, '0').replace('-', '')}
                        </div>
                    ) : (
                        <>
                            <svg className="w-20 h-20 -rotate-90 md:w-24 md:h-24">
                                <circle cx="50%" cy="50%" r="45%" className="fill-none stroke-slate-200 stroke-[4px]" />
                                <circle
                                    cx="50%" cy="50%" r="45%"
                                    className="fill-none stroke-blue-500 stroke-[6px] transition-all duration-1000"
                                    style={{
                                        strokeDasharray: '283',
                                        strokeDashoffset: `${283 - (timeLeft / (question.timeLimit || 20)) * 283} `
                                    }}
                                />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center text-2xl md:text-3xl font-black text-slate-700">
                                {timeLeft}
                            </div>
                        </>
                    )}
                </div>
            </header>

            <main className="flex-1 flex items-center justify-center p-8 relative z-10">
                <div className="absolute left-10 top-1/2 -translate-y-1/2 bg-white border border-blue-100 px-8 py-6 rounded-[2.5rem] text-center shadow-xl animate-float">
                    <div className="text-6xl font-black text-blue-600 mb-1">{answersCount}</div>
                    <div className="text-xs font-black text-blue-400 tracking-[0.2em]">JAVOBLAR</div>
                </div>

                {question.type === 'info-slide' && (
                    <div className="bg-blue-600 text-white p-12 rounded-[3.5rem] border-4 border-blue-400 shadow-[0_20px_60px_rgba(37,99,235,0.4)] max-w-2xl w-full text-center animate-float">
                        <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                            <Info size={32} />
                        </div>
                        <h3 className="text-sm font-black text-blue-100 uppercase tracking-[0.3em] mb-4">Topic / Information</h3>
                        <p className="text-4xl md:text-5xl font-black leading-tight">{question.text}</p>

                        <button
                            onClick={nextQuestion}
                            className="mt-12 bg-white text-blue-600 px-12 py-4 rounded-2xl text-xl font-black shadow-xl hover:scale-105 transition-transform flex items-center gap-3 mx-auto"
                        >
                            <span>Next Question</span>
                            <Play size={20} fill="currentColor" />
                        </button>
                    </div>
                )}

                {showResult && question.type !== 'info-slide' && (
                    <div className="relative z-20 flex flex-col items-center gap-6">
                        <div className="bg-white p-8 rounded-[3rem] border border-slate-200 text-center animate-bounce shadow-2xl">
                            <span className="text-sm font-bold text-slate-500 uppercase tracking-widest">Tayyormisiz?</span>
                        </div>
                        <button
                            onClick={nextQuestion}
                            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-12 py-5 rounded-[2rem] text-2xl font-black shadow-[0_10px_30px_rgba(59,130,246,0.4)] transition-all btn-premium flex items-center gap-3 active:scale-95"
                        >
                            <span>Next Question</span>
                            <Play className="fill-current" />
                        </button>
                    </div>
                )}
            </main>

            {question.type !== 'info-slide' && (
                <div className="grid grid-cols-2 gap-4 h-1/3 p-4 md:p-8 bg-white border-t border-slate-200 shadow-[0_-20px_50px_rgba(0,0,0,0.05)] z-20">
                    {['text-input', 'fill-blank', 'find-mistake', 'rewrite'].includes(question.type || '') ? (
                        <div className="col-span-2 flex flex-col items-center justify-center h-full">
                            <div className="bg-indigo-50 border border-indigo-200 px-12 py-6 rounded-[2rem] text-center shadow-lg">
                                <h3 className="text-slate-500 font-bold uppercase tracking-widest text-sm mb-2">
                                    {question.type === 'fill-blank' ? "Fill in the Blank" :
                                        question.type === 'find-mistake' ? "Find Mistake" :
                                            question.type === 'rewrite' ? "Rewrite Sentence" :
                                                "Type Answer"}
                                </h3>
                                {showResult ? (
                                    <div>
                                        <p className="text-3xl font-black text-emerald-600 mb-2">Correct answers:</p>
                                        <div className="flex flex-wrap justify-center gap-2">
                                            {question.acceptedAnswers?.map((ans, i) => (
                                                <span key={i} className="bg-emerald-100 text-emerald-700 px-4 py-2 rounded-xl font-bold border border-emerald-200">
                                                    {ans}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-2xl font-black text-indigo-800 animate-pulse">O'quvchilar javob yozmoqda...</p>
                                )}
                            </div>
                        </div>
                    ) : (
                        question.options.map((opt, i) => (
                            <div
                                key={i}
                                className={`
                                    relative bg-white rounded-[2rem] p-6 md:p-8 flex items-center gap-6 transition-all duration-500 border-2 btn-premium shadow-md
                                    ${showResult
                                        ? (i === question.correctIndex ? 'border-emerald-500 bg-emerald-50' : 'border-slate-100 opacity-40 scale-[0.98]')
                                        : 'border-slate-100 hover:border-blue-300 hover:shadow-xl'
                                    }
                                `}
                            >
                                <div className={`
                                    w-12 h-12 md:w-16 md:h-16 rounded-2xl flex items-center justify-center text-xl md:text-2xl text-white
                                    ${i === 0 ? 'bg-blue-500' :
                                        i === 1 ? (question.type === 'true-false' ? 'bg-red-500' : 'bg-emerald-500') :
                                            i === 2 ? 'bg-orange-500' :
                                                i === 3 ? 'bg-indigo-500' : 'bg-slate-500'
                                    }
                                    shadow-lg
                                `}>
                                    {question.type === 'true-false' ? (
                                        i === 0 ? <CheckCircle2 /> : <XCircle />
                                    ) : (
                                        i === 0 ? '▲' : i === 1 ? '◆' : i === 2 ? '●' : '■'
                                    )}
                                </div>
                                <span className="text-lg md:text-2xl font-bold text-slate-700 tracking-tight leading-snug">{opt}</span>

                                {showResult && i === question.correctIndex && (
                                    <div className="absolute top-4 right-6 text-emerald-600 font-black animate-pulse text-xs tracking-widest">
                                        TO'G'RI JAVOB
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}
