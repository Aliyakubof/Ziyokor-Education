import { useEffect, useState } from 'react';
import { socket } from '../socket';
import { Trophy, Clock, CheckCircle2, Send, XCircle, Info } from 'lucide-react';

interface QuestionData {
    info?: string;
    text: string;
    options: string[];
    timeLimit: number;
    questionIndex: number;
    totalQuestions: number;
    correctIndex: number;
    type?: 'multiple-choice' | 'text-input' | 'true-false' | 'fill-blank' | 'find-mistake' | 'rewrite' | 'word-box' | 'info-slide';
}

export default function PlayerGame() {
    const [view, setView] = useState<'WAITING' | 'PLAYING' | 'ANSWERED' | 'FINISHED' | 'UNIT_SUMMARY' | 'UNIT_REVIEW'>('WAITING');
    const [rank, setRank] = useState<{ rank: number; score: number } | null>(null);
    const [question, setQuestion] = useState<QuestionData | null>(null);
    const [textAnswer, setTextAnswer] = useState('');

    const [isConnected, setIsConnected] = useState(socket.connected);

    // Unit Quiz Specific States
    const [isUnitMode, setIsUnitMode] = useState(false);
    const [unitQuestions, setUnitQuestions] = useState<QuestionData[]>([]);
    const [currentUnitIndex, setCurrentUnitIndex] = useState(0);
    const [unitAnswers, setUnitAnswers] = useState<Record<number, any>>({});
    const [unitCorrectAnswers, setUnitCorrectAnswers] = useState<any[]>([]);
    const [globalEndTime, setGlobalEndTime] = useState<number | null>(null);
    const [quizTitle, setQuizTitle] = useState('');

    useEffect(() => {
        const onConnect = () => setIsConnected(true);
        const onDisconnect = () => setIsConnected(false);

        socket.on('connect', onConnect);
        socket.on('disconnect', onDisconnect);

        socket.on('game-started', (data: any) => {
            setView('WAITING');
            if (data?.endTime) setGlobalEndTime(data.endTime);
            if (data?.title) setQuizTitle(data.title);
        });

        // Request status immediately (for re-sync after navigation or refresh)
        const pinFromStore = localStorage.getItem('kahoot-pin');
        const idFromStore = localStorage.getItem('student-id');
        if (pinFromStore) {
            socket.emit('player-get-status', { pin: pinFromStore, studentId: idFromStore || undefined });
        }

        socket.on('unit-game-started', (data: { questions: QuestionData[], endTime?: number, title?: string }) => {
            setIsUnitMode(true);
            setUnitQuestions(data.questions);
            setGlobalEndTime(data.endTime || null);
            setQuizTitle(data.title || '');
            setCurrentUnitIndex(0);
            setQuestion(data.questions[0]);
            setView('PLAYING');
        });

        socket.on('question-start', (q) => {
            if (isUnitMode) return; // Ignore global question-start in unit mode
            setQuestion(q);
            setView('PLAYING');
            setTextAnswer('');
        });

        socket.on('unit-finished', (data: { score: number, correctAnswers: any[] }) => {
            setView('FINISHED');
            setRank({ rank: 0, score: data.score });
            setUnitCorrectAnswers(data.correctAnswers || []);
        });

        socket.on('game-over', (leaderboard) => {
            setView('FINISHED');
            const myId = socket.id;
            const myIdAlt = (socket as any).studentId;
            const myRank = leaderboard.findIndex((p: any) => p.id === myId || p.id === myIdAlt) + 1;
            const myScore = leaderboard.find((p: any) => p.id === myId || p.id === myIdAlt)?.score || 0;
            setRank({ rank: myRank, score: myScore });
        });

        // Anti-Cheat: Visibility Change
        const handleVisibilityChange = () => {
            const pin = localStorage.getItem('kahoot-pin');
            const studentId = localStorage.getItem('student-id') || socket.id;

            if (document.hidden) {
                if (socket.connected && pin) {
                    socket.emit('student-status-update', { pin, studentId, status: 'Cheating' });
                }
            } else {
                if (socket.connected && pin) {
                    socket.emit('student-status-update', { pin, studentId, status: 'Online' });
                }
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            socket.off('connect', onConnect);
            socket.off('disconnect', onDisconnect);
            socket.off('game-started');
            socket.off('unit-game-started');
            socket.off('question-start');
            socket.off('unit-finished');
            socket.off('game-over');
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [isUnitMode]);

    const saveUnitAnswer = (val: number | string) => {
        const newAnswers = { ...unitAnswers, [currentUnitIndex]: val };
        setUnitAnswers(newAnswers);

        // Sync with server immediately for real-time progress for host
        const pin = localStorage.getItem('kahoot-pin');
        if (pin) {
            socket.emit('player-answer', { pin, answer: val, questionIndex: currentUnitIndex });
        }

        // Auto move to next if not the last
        if (currentUnitIndex < unitQuestions.length - 1) {
            goToQuestion(currentUnitIndex + 1);
        } else {
            setView('UNIT_SUMMARY');
        }
    };

    const goToQuestion = (index: number) => {
        setCurrentUnitIndex(index);
        const nextQ = unitQuestions[index];
        setQuestion(nextQ);
        setTextAnswer(unitAnswers[index] || '');
        setView('PLAYING');
    };

    const getCurrentTopic = () => {
        if (!isUnitMode || !unitQuestions.length) return null;
        for (let i = currentUnitIndex; i >= 0; i--) {
            if (unitQuestions[i].type === 'info-slide') {
                return unitQuestions[i].text;
            }
        }
        return null;
    };

    const finalizeSubmission = () => {
        const pin = localStorage.getItem('kahoot-pin');
        if (pin) {
            socket.emit('unit-player-finish', { pin });
        }
    };

    const sendAnswer = (val: number | string) => {
        if (isUnitMode) {
            saveUnitAnswer(val);
            return;
        }
        const pin = localStorage.getItem('kahoot-pin');
        if (!pin) return;
        socket.emit('player-answer', { pin, answer: val });
        setView('ANSWERED');
    };

    if (view === 'FINISHED') {
        const isUnitReviewAvailable = isUnitMode && unitCorrectAnswers.length > 0;

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
                            {rank?.score}
                        </div>
                        <div className="text-2xl font-black text-blue-500 absolute bottom-4 right-1/4 translate-x-12 uppercase">
                            Ball
                        </div>
                    </div>

                    <div className="space-y-3">
                        {isUnitReviewAvailable && (
                            <button
                                onClick={() => {
                                    setCurrentUnitIndex(0);
                                    setQuestion(unitQuestions[0]);
                                    setView('UNIT_REVIEW');
                                }}
                                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black py-5 rounded-2xl transition-all shadow-xl shadow-indigo-500/20 active:scale-95 flex items-center justify-center gap-2"
                            >
                                JAVOBLARNI TEKSHIRISH
                            </button>
                        )}
                        <button
                            onClick={() => window.location.href = '/'}
                            className="w-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 font-black py-4 rounded-2xl transition-all border border-slate-200"
                        >
                            CHIQISH
                        </button>
                    </div>
                </div>
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

    if (view === 'WAITING' || (view === 'ANSWERED' && !isUnitMode)) {
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
                </div>
            </div>
        );
    }

    if (view === 'UNIT_SUMMARY') {
        return (
            <div className="min-h-screen flex flex-col p-6 bg-transparent">
                <div className="w-full max-w-2xl mx-auto bg-white rounded-[3rem] p-8 shadow-xl border border-slate-200 flex-1 flex flex-col">
                    <h2 className="text-3xl font-black text-slate-800 mb-2 text-center">Xulosa</h2>
                    <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mb-8 text-center italic">Javoblaringizni tekshiring</p>

                    <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                        {unitQuestions.map((q, idx) => (
                            <button
                                key={idx}
                                onClick={() => goToQuestion(idx)}
                                className="w-full flex items-center justify-between p-5 rounded-2xl border border-slate-100 bg-slate-50 hover:border-indigo-300 transition-all group"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center font-black text-slate-400 border border-slate-200 group-hover:text-indigo-500 group-hover:border-indigo-200 transition-colors">
                                        {idx + 1}
                                    </div>
                                    <div className="text-left">
                                        <p className="text-sm font-bold text-slate-700 line-clamp-1">{q.text}</p>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">
                                            {unitAnswers[idx] !== undefined ? (
                                                <span className="text-emerald-500">Javob berilgan</span>
                                            ) : (
                                                <span className="text-orange-400">Javobsiz</span>
                                            )}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-slate-300 group-hover:text-indigo-400 transition-colors">→</div>
                            </button>
                        ))}
                    </div>

                    <div className="mt-8 space-y-3">
                        <button
                            onClick={finalizeSubmission}
                            className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-black py-5 rounded-[2rem] text-xl transition-all shadow-xl shadow-emerald-500/20 active:scale-95 flex items-center justify-center gap-2"
                        >
                            <CheckCircle2 size={24} /> TESTNI TUGATISH
                        </button>
                        <button
                            onClick={() => goToQuestion(0)}
                            className="w-full text-slate-400 font-bold text-xs uppercase tracking-widest py-2 hover:text-slate-600 transition-colors"
                        >
                            Savollarga qaytish
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const renderQuestionContent = () => {
        if (!question) return null;
        const isReview = view === 'UNIT_REVIEW';
        const correctInfo = isReview ? unitCorrectAnswers[currentUnitIndex] : null;
        const playerAns = unitAnswers[currentUnitIndex];

        if (['text-input', 'fill-blank', 'find-mistake', 'rewrite'].includes(question.type || '')) {
            const isCorrect = isReview && correctInfo?.acceptedAnswers?.some((a: string) => a.toLowerCase().trim() === String(playerAns || '').toLowerCase().trim());

            return (
                <div className="w-full max-w-2xl mx-auto bg-white rounded-[2.5rem] p-8 shadow-xl border border-slate-200">
                    {isReview && (
                        <div className={`mb-6 p-4 rounded-2xl border text-center font-black uppercase tracking-widest text-xs
                            ${isCorrect ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-red-50 border-red-200 text-red-600'}`}>
                            {isCorrect ? 'TO\'G\'RI!' : 'XATO!'}
                        </div>
                    )}
                    <h2 className="text-center text-xl font-bold text-slate-800 mb-8 lowercase opacity-60 italic">
                        {question.type === 'fill-blank' ? "Fill in the Blank" :
                            question.type === 'find-mistake' ? "Find and fix the mistake" :
                                question.type === 'rewrite' ? "Rewrite the sentence" :
                                    "Enter your answer"}
                    </h2>
                    <input
                        type="text"
                        value={isReview ? (playerAns || '') : textAnswer}
                        readOnly={isReview}
                        onChange={(e) => setTextAnswer(e.target.value)}
                        onBlur={() => isUnitMode && !isReview && saveUnitAnswer(textAnswer.trim())}
                        className={`w-full border-2 rounded-2xl px-6 py-4 text-center text-xl font-bold transition-all mb-6
                            ${isReview
                                ? (isCorrect ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'bg-red-50 border-red-500 text-red-700')
                                : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-indigo-500'}`}
                        placeholder="Answer..."
                    />

                    {isReview && !isCorrect && (
                        <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-2xl">
                            <p className="text-[10px] font-black text-indigo-300 uppercase tracking-widest mb-1">To'g'ri javoblar:</p>
                            <p className="text-indigo-600 font-bold">{correctInfo?.acceptedAnswers?.join(' / ')}</p>
                        </div>
                    )}

                    {!isUnitMode && !isReview && (
                        <button
                            onClick={() => textAnswer.trim() && sendAnswer(textAnswer.trim())}
                            disabled={!textAnswer.trim()}
                            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-200 disabled:text-slate-400 text-white font-black py-4 rounded-2xl transition-all shadow-lg shadow-indigo-500/20 active:scale-95 flex items-center justify-center gap-2"
                        >
                            <Send size={20} /> SUBMIT
                        </button>
                    )}
                </div>
            );
        }

        if (question.type === 'word-box') {
            return <WordBoxView
                question={question}
                unitAnswers={unitAnswers}
                currentUnitIndex={currentUnitIndex}
                onAnswer={sendAnswer}
                isUnitMode={isUnitMode}
                isReview={isReview}
                correctInfo={correctInfo}
            />;
        }

        if (question.type === 'true-false') {
            const currentAns = unitAnswers[currentUnitIndex];
            const isTrueCorrect = isReview && correctInfo?.correctIndex === 0;
            const isFalseCorrect = isReview && correctInfo?.correctIndex === 1;

            return (
                <div className="h-full grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button
                        onClick={() => !isReview && sendAnswer(0)} // True
                        disabled={isReview}
                        className={`rounded-[2rem] flex flex-col items-center justify-center group transition-all shadow-xl relative overflow-hidden border-4
                            ${isReview
                                ? (isTrueCorrect ? 'bg-emerald-500 border-yellow-400 scale-105' : currentAns === 0 ? 'bg-red-500 border-transparent opacity-50' : 'bg-slate-200 border-transparent opacity-30')
                                : (isUnitMode && currentAns === 0 ? 'bg-blue-600 border-yellow-400 scale-105 shadow-blue-500/40' : 'bg-blue-500 border-transparent shadow-blue-500/20 active:scale-95')}`}
                    >
                        <div className="w-16 h-16 md:w-24 md:h-24 bg-white/20 rounded-full flex items-center justify-center text-3xl md:text-5xl mb-2 md:mb-4 text-white">
                            <CheckCircle2 size={32} className="md:w-12 md:h-12" />
                        </div>
                        <span className="text-xl md:text-2xl font-black text-white uppercase tracking-widest">TRUE</span>
                    </button>

                    <button
                        onClick={() => !isReview && sendAnswer(1)} // False
                        disabled={isReview}
                        className={`rounded-[2rem] flex flex-col items-center justify-center group transition-all shadow-xl relative overflow-hidden border-4
                            ${isReview
                                ? (isFalseCorrect ? 'bg-emerald-500 border-yellow-400 scale-105' : currentAns === 1 ? 'bg-red-500 border-transparent opacity-50' : 'bg-slate-200 border-transparent opacity-30')
                                : (isUnitMode && currentAns === 1 ? 'bg-red-600 border-yellow-400 scale-105 shadow-red-500/40' : 'bg-red-500 border-transparent shadow-red-500/20 active:scale-95')}`}
                    >
                        <div className="w-16 h-16 md:w-24 md:h-24 bg-white/20 rounded-full flex items-center justify-center text-3xl md:text-5xl mb-2 md:mb-4 text-white">
                            <XCircle size={32} className="md:w-12 md:h-12" />
                        </div>
                        <span className="text-xl md:text-2xl font-black text-white uppercase tracking-widest">FALSE</span>
                    </button>
                </div>
            );
        }

        if (question.type === 'info-slide') {
            return (
                <div className="flex items-center justify-center h-full">
                    <div className="w-full max-w-2xl bg-white rounded-[2.5rem] p-8 shadow-2xl border border-blue-100 text-center animate-float overflow-hidden relative">
                        <div className="absolute top-0 left-0 w-full h-2 bg-blue-500"></div>
                        <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                            <Info className="text-blue-500" size={32} />
                        </div>
                        <h2 className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em] mb-4 text-center">Mavzu / Information</h2>
                        <p className="text-2xl md:text-3xl font-black text-slate-800 leading-tight">
                            {question.text}
                        </p>
                        {isUnitMode && !isReview && (
                            <button
                                onClick={() => goToQuestion(currentUnitIndex + 1)}
                                className="mt-8 w-full bg-blue-600 text-white py-4 rounded-2xl font-black shadow-lg shadow-blue-500/20 transition-all hover:bg-blue-500 active:scale-95"
                            >
                                DAVOM ETISH
                            </button>
                        )}
                    </div>
                </div>
            );
        }

        // Multiple Choice
        const currentAnsMCQ = unitAnswers[currentUnitIndex];
        return (
            <div className="h-full grid grid-cols-2 grid-rows-2 gap-3 md:gap-4">
                {[0, 1, 2, 3].map(i => {
                    const isCorrect = isReview && correctInfo?.correctIndex === i;
                    const isWrongSelection = isReview && currentAnsMCQ === i && !isCorrect;

                    return (
                        <button
                            key={i}
                            onClick={() => !isReview && sendAnswer(i)}
                            disabled={isReview}
                            className={`border-4 rounded-3xl md:rounded-[2.5rem] flex flex-col items-center justify-center group transition-all shadow-xl relative overflow-hidden
                                ${isReview
                                    ? (isCorrect ? 'bg-emerald-500 border-yellow-400 scale-105 z-10 shadow-emerald-500/20' : isWrongSelection ? 'bg-red-500 border-transparent opacity-60' : 'bg-slate-50 border-transparent opacity-30')
                                    : (isUnitMode && currentAnsMCQ === i ? 'border-yellow-400 bg-slate-50 active:scale-95' : 'border-slate-100 bg-white hover:border-blue-300 active:scale-95')}`}
                        >
                            <div className={`w-14 h-14 md:w-20 md:h-20 rounded-xl md:rounded-2xl flex items-center justify-center text-2xl md:text-4xl shadow-lg mb-2 md:mb-4 group-hover:scale-110 transition-transform relative z-10 text-white
                                ${i === 0 ? 'bg-blue-500' : i === 1 ? 'bg-emerald-500' : i === 2 ? 'bg-orange-500' : 'bg-indigo-500'}`}>
                                <span>{i === 0 ? '▲' : i === 1 ? '◆' : i === 2 ? '●' : '■'}</span>
                            </div>
                            <span className={`text-[10px] md:text-xs font-black uppercase tracking-widest relative z-10 italic
                                ${isReview && (isCorrect || isWrongSelection) ? 'text-white' : 'text-slate-400'}`}>
                                {i === 0 ? 'A' : i === 1 ? 'B' : i === 2 ? 'C' : 'D'} varyanti
                            </span>
                        </button>
                    );
                })}
            </div>
        );
    };

    return (
        <div className="flex flex-col h-[100dvh] bg-transparent">
            <header className="bg-white/80 backdrop-blur-md p-4 flex justify-between items-center border-b border-slate-200 z-10 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="bg-indigo-50 border border-indigo-100 px-4 py-1.5 rounded-xl">
                        <span className="text-[10px] font-black text-indigo-300 uppercase tracking-widest block">
                            {question?.info || 'Savol'}
                        </span>
                        <div className="text-lg font-black text-indigo-600">
                            {isUnitMode ? (currentUnitIndex + 1) : question?.questionIndex} / {isUnitMode ? unitQuestions.length : question?.totalQuestions}
                        </div>
                    </div>
                </div>

                <div className="flex-1 px-6 text-center">
                    {isUnitMode && (
                        <h2 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-1 truncate max-w-[240px] mx-auto">
                            {question?.info || getCurrentTopic() || quizTitle || 'Unit Quiz'}
                        </h2>
                    )}
                    <h1 className="text-lg md:text-xl font-black text-slate-800 leading-tight">
                        {question?.type === 'info-slide' ? 'Information' : question?.text}
                    </h1>
                </div>

                <div className="w-20 flex justify-end">
                    {globalEndTime && !isUnitMode && (
                        <div className="text-sm font-black text-blue-500 bg-blue-50 px-3 py-1 rounded-lg border border-blue-100 shadow-sm animate-pulse-slow">
                            <Clock size={14} className="inline mr-1 mb-0.5" />
                            {Math.max(0, Math.floor((globalEndTime - Date.now()) / 60000))}:
                            {Math.max(0, Math.floor((globalEndTime - Date.now()) / 1000) % 60).toString().padStart(2, '0')}
                        </div>
                    )}
                </div>
            </header>

            <main className="flex-1 p-4 overflow-hidden flex flex-col">
                <div className="flex-1 relative">
                    {renderQuestionContent()}
                </div>
            </main>

            {isUnitMode && (
                <footer className="p-4 bg-white/80 backdrop-blur-md border-t border-slate-200 flex items-center justify-between shrink-0">
                    <button
                        onClick={() => {
                            if (currentUnitIndex > 0) {
                                const newIdx = currentUnitIndex - 1;
                                setCurrentUnitIndex(newIdx);
                                setQuestion(unitQuestions[newIdx]);
                                if (view !== 'UNIT_REVIEW') setTextAnswer(unitAnswers[newIdx] || '');
                            }
                        }}
                        disabled={currentUnitIndex === 0}
                        className="px-6 py-3 bg-slate-100 text-slate-600 rounded-2xl font-bold disabled:opacity-30 transition-all flex items-center gap-2 hover:bg-slate-200 active:scale-95"
                    >
                        ← Orqaga
                    </button>

                    <div className="flex gap-1.5 overflow-x-auto max-w-[40%] px-2 py-1 scroll-hide bg-slate-50/50 rounded-full">
                        {unitQuestions.map((_, i) => {
                            let dotColor = 'bg-slate-200';
                            if (view === 'UNIT_REVIEW') {
                                const correctAns = unitCorrectAnswers[i];
                                const playerAns = unitAnswers[i];
                                if (playerAns === undefined) dotColor = 'bg-slate-300';
                                else {
                                    const isCorrect = correctAns?.type === 'multiple-choice' || correctAns?.type === 'true-false'
                                        ? playerAns === correctAns?.correctIndex
                                        : correctAns?.acceptedAnswers?.some((a: string) => a.toLowerCase().trim() === String(playerAns).toLowerCase().trim());
                                    dotColor = isCorrect ? 'bg-emerald-400 shadow-sm shadow-emerald-500/20' : 'bg-red-400 shadow-sm shadow-red-500/20';
                                }
                            } else {
                                if (i === currentUnitIndex) dotColor = 'bg-indigo-500 w-10';
                                else if (unitAnswers[i] !== undefined) dotColor = 'bg-emerald-400';
                            }

                            return (
                                <div
                                    key={i}
                                    className={`h-1.5 w-6 rounded-full shrink-0 transition-all ${dotColor} ${i === currentUnitIndex && view !== 'UNIT_REVIEW' ? 'w-10' : ''}`}
                                />
                            );
                        })}
                    </div>

                    {currentUnitIndex === unitQuestions.length - 1 ? (
                        <button
                            onClick={() => setView(view === 'UNIT_REVIEW' ? 'FINISHED' : 'UNIT_SUMMARY')}
                            className={`px-6 py-3 rounded-2xl font-black shadow-lg transition-all flex items-center gap-2 active:scale-95
                                ${view === 'UNIT_REVIEW' ? 'bg-slate-800 text-white' : 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-indigo-500/20 hover:scale-105'}`}
                        >
                            {view === 'UNIT_REVIEW' ? 'Yopish' : 'REVIEW & SUBMIT'}
                        </button>
                    ) : (
                        <button
                            onClick={() => {
                                const newIdx = currentUnitIndex + 1;
                                setCurrentUnitIndex(newIdx);
                                setQuestion(unitQuestions[newIdx]);
                                if (view !== 'UNIT_REVIEW') setTextAnswer(unitAnswers[newIdx] || '');
                            }}
                            className="px-6 py-3 bg-slate-800 text-white rounded-2xl font-bold hover:bg-slate-700 transition-all active:scale-95 flex items-center gap-2"
                        >
                            Keyingisi →
                        </button>
                    )}
                </footer>
            )}
        </div>
    );
}

// WordBoxView
function WordBoxView({ question, unitAnswers, currentUnitIndex, onAnswer, isUnitMode, isReview, correctInfo }: any) {
    const [selectedWord, setSelectedWord] = useState<string | null>(null);
    const [blanks, setBlanks] = useState<Record<number, string>>({});

    useEffect(() => {
        const initialBlanks = typeof unitAnswers[currentUnitIndex] === 'string'
            ? unitAnswers[currentUnitIndex].split(', ').reduce((acc: any, val: string, i: number) => {
                if (val) acc[i + 1] = val;
                return acc;
            }, {})
            : {};
        setBlanks(initialBlanks);
        setSelectedWord(null);
    }, [currentUnitIndex, unitAnswers]);


    const toggleBlank = (index: number) => {
        if (isReview) return;
        const newBlanks = { ...blanks };
        if (newBlanks[index]) {
            delete newBlanks[index];
        } else if (selectedWord) {
            newBlanks[index] = selectedWord;
            setSelectedWord(null);
        } else {
            return;
        }

        setBlanks(newBlanks);
        if (isUnitMode) {
            const sortedBlanks = Object.keys(newBlanks).map(Number).sort((a, b) => a - b);
            const answerString = sortedBlanks.map(k => newBlanks[k]).join(', ');
            onAnswer(answerString);
        }
    };

    const renderTextFromProps = () => {
        const parts = question.text.split(/(\[\d+\])/g);
        const correctAccepted = correctInfo?.acceptedAnswers?.[0]?.split(', ') || [];

        return parts.map((part: string, i: number) => {
            const match = part.match(/\[(\d+)\]/);
            if (match) {
                const blankIdx = parseInt(match[1]);
                const val = blanks[blankIdx];
                // Note: Indexing might be tricky. If acceptedAnswers is "word1, word2", 
                // index 1 corresponds to word1.
                const correctWord = correctAccepted[blankIdx - 1];
                const isCorrect = isReview && val && correctWord && val.toLowerCase().trim() === correctWord.toLowerCase().trim();

                return (
                    <button
                        key={i}
                        onClick={() => toggleBlank(blankIdx)}
                        disabled={isReview}
                        className={`mx-1 px-3 py-1 rounded-lg border-2 font-bold transition-all
                            ${isReview
                                ? (isCorrect ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : val ? 'bg-red-50 border-red-500 text-red-700' : 'bg-slate-100 border-slate-300 opacity-50')
                                : (blanks[blankIdx]
                                    ? 'bg-indigo-100 border-indigo-400 text-indigo-700 shadow-sm'
                                    : 'bg-slate-100 border-slate-300 text-slate-400 border-dashed hover:border-slate-400')
                            }`}
                    >
                        {val || (isReview ? `(${correctWord || blankIdx})` : `(${blankIdx})`)}
                    </button>
                );
            }
            return <span key={i} className="text-slate-700 leading-relaxed">{part}</span>;
        });
    };

    return (
        <div className="flex flex-col h-full space-y-4">
            {!isReview && (
                <div className="bg-white/90 backdrop-blur-sm p-4 rounded-[2rem] border border-slate-200 shadow-sm">
                    <div className="flex flex-wrap justify-center gap-2">
                        {question.options.map((word: string, i: number) => {
                            const isUsed = Object.values(blanks).includes(word);
                            return (
                                <button
                                    key={i}
                                    onClick={() => !isUsed && setSelectedWord(word === selectedWord ? null : word)}
                                    className={`px-4 py-2 rounded-xl font-bold text-sm transition-all shadow-sm
                                        ${word === selectedWord ? 'bg-indigo-600 text-white shadow-indigo-500/20 scale-105' :
                                            isUsed ? 'bg-slate-100 text-slate-300 opacity-50 cursor-not-allowed' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
                                        }`}
                                >
                                    {word}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
            <div className={`flex-1 bg-white p-6 rounded-[2.5rem] border flex flex-col items-center justify-center overflow-y-auto shadow-inner
                ${isReview ? 'border-slate-100' : 'border-slate-200'}`}>
                <div className="text-lg md:text-xl font-medium text-center leading-loose">
                    {renderTextFromProps()}
                </div>
                {!isUnitMode && !isReview && (
                    <button
                        onClick={() => {
                            const sortedBlanks = Object.keys(blanks).map(Number).sort((a, b) => a - b);
                            const answerString = sortedBlanks.map(k => blanks[k]).join(', ');
                            onAnswer(answerString);
                        }}
                        disabled={Object.keys(blanks).length === 0}
                        className="mt-6 bg-indigo-600 text-white px-10 py-4 rounded-2xl font-black shadow-lg shadow-indigo-500/20 transition-all hover:bg-indigo-500 active:scale-95"
                    >
                        <Send size={20} className="inline mr-2" /> SUBMIT
                    </button>
                )}
                {isReview && (
                    <div className="mt-8 flex items-center gap-2 text-slate-400 font-black uppercase tracking-widest text-[10px]">
                        <Info size={14} /> REVIEW MODE
                    </div>
                )}
            </div>
        </div>
    );
}
