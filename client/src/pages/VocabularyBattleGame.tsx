import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiFetch } from '../api';
import { useAuth } from '../AuthContext';
import { ArrowLeft, Clock, TimerOff, CheckCircle2, XCircle, Trophy, ShieldAlert } from 'lucide-react';
import confetti from 'canvas-confetti';

interface VocabQuestion {
    text: string;
    options: string[];
    correctIndex: number;
    timeLimit: number;
    type?: 'multiple-choice' | 'vocabulary';
    acceptedAnswers?: string[];
}

export default function VocabularyBattleGame() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();


    const [questions, setQuestions] = useState<VocabQuestion[]>([]);
    const [qIndex, setQIndex] = useState(0);

    const [loading, setLoading] = useState(true);
    const [isFinished, setIsFinished] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Timer state
    const [timeLeft, setTimeLeft] = useState(15);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Results tracking
    const [selectedOption, setSelectedOption] = useState<number | null>(null);
    const [textAnswer, setTextAnswer] = useState('');
    const [results, setResults] = useState<{ qText: string, correct: boolean, expected: string, given: string }[]>([]);
    const [consecutiveCorrects, setConsecutiveCorrects] = useState(0);

    useEffect(() => {
        fetchBattle();
    }, [id]);

    useEffect(() => {
        const currentLimit = questions[qIndex]?.timeLimit || 0;
        if (!isFinished && questions.length > 0 && currentLimit > 0) {
            setTimeLeft(currentLimit);
            startTimer();
        } else if (timerRef.current) {
            clearInterval(timerRef.current);
        }
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [qIndex, isFinished, questions]);

    const fetchBattle = async () => {
        try {
            const res = await apiFetch(`/api/student/vocab-battles/${id}`);
            if (res.ok) {
                const data = await res.json();
                const rawQs = typeof data.questions === 'string' ? JSON.parse(data.questions) : data.questions;

                // Optionally sort options randomly for the student side, but keeping correctIndex accurate
                const processedQs = rawQs.map((q: any) => {
                    const originalCorrectAns = q.options[q.correctIndex];
                    const shuffledOpts = [...q.options].sort(() => 0.5 - Math.random());
                    return {
                        ...q,
                        options: shuffledOpts,
                        correctIndex: shuffledOpts.indexOf(originalCorrectAns)
                    };
                });
                setQuestions(processedQs);
            } else {
                alert("Topilmadi!");
                navigate('/student/vocab-battles');
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const startTimer = () => {
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(timerRef.current!);
                    handleTimeOut();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    const handleTimeOut = () => {
        // Auto mark as wrong
        setConsecutiveCorrects(0);
        const currentQ = questions[qIndex];
        const newRes = {
            qText: currentQ.text,
            correct: false,
            expected: currentQ.type === 'vocabulary' ? (currentQ.acceptedAnswers?.[0] || '') : currentQ.options[currentQ.correctIndex],
            given: "Vaqt tugadi"
        };
        setResults(prev => [...prev, newRes]);
        moveToNext();
    };

    const handleOptionSelect = (optIndex: number) => {
        if (selectedOption !== null) return; // Prevent double click
        setSelectedOption(optIndex);
        if (timerRef.current) clearInterval(timerRef.current);

        const currentQ = questions[qIndex];
        const isCorrect = optIndex === currentQ.correctIndex;

        if (isCorrect) {
            setConsecutiveCorrects(prev => prev + 1);
            confetti({
                particleCount: 50,
                spread: 40,
                origin: { y: 0.8 },
                colors: ['#22c55e', '#10b981', '#4ade80']
            });
        } else {
            setConsecutiveCorrects(0);
        }

        const newRes = {
            qText: currentQ.text,
            correct: isCorrect,
            expected: currentQ.options[currentQ.correctIndex],
            given: currentQ.options[optIndex]
        };

        setResults(prev => [...prev, newRes]);

        setTimeout(() => {
            moveToNext();
        }, 1500); // Wait to show red/green color
    };

    const handleVocabularySubmit = () => {
        if (selectedOption !== null) return; // Prevent double sub
        setSelectedOption(-1); // To disable further input
        if (timerRef.current) clearInterval(timerRef.current);

        const currentQ = questions[qIndex];
        const correctAns = (currentQ.acceptedAnswers?.[0] || '').toLowerCase().trim();
        const studentAns = textAnswer.toLowerCase().trim();
        const isCorrect = correctAns === studentAns;

        if (isCorrect) {
            setConsecutiveCorrects(prev => prev + 1);
            confetti({
                particleCount: 50,
                spread: 40,
                origin: { y: 0.8 },
                colors: ['#22c55e', '#10b981', '#4ade80']
            });
        } else {
            setConsecutiveCorrects(0);
        }

        const newRes = {
            qText: currentQ.text,
            correct: isCorrect,
            expected: currentQ.acceptedAnswers?.[0] || '',
            given: textAnswer || "Bo'sh"
        };

        setResults(prev => [...prev, newRes]);

        setTimeout(() => {
            moveToNext();
        }, 1500);
    };

    const moveToNext = () => {
        setSelectedOption(null);
        setTextAnswer('');
        if (qIndex < questions.length - 1) {
            setQIndex(qIndex + 1);
        } else {
            finishGame();
        }
    };

    const finishGame = () => {
        setIsFinished(true);
        submitScore();
    };

    const submitScore = async () => {
        if (submitting) return;
        setSubmitting(true);
        try {
            // Recalculate based on state (React batched updates safety)
            const finalScore = results.filter(r => r.correct).length 
                + (selectedOption !== null && questions[qIndex]?.type === 'multiple-choice' && selectedOption === questions[qIndex]?.correctIndex ? 1 : 0)
                + (selectedOption !== null && questions[qIndex]?.type === 'vocabulary' && textAnswer.toLowerCase().trim() === (questions[qIndex]?.acceptedAnswers?.[0] || '').toLowerCase().trim() ? 1 : 0);
            const verifiedScore = Math.min(finalScore, questions.length); // Sanity check

            await apiFetch('/api/student/vocab-battles/submit', {
                method: 'POST',
                body: JSON.stringify({
                    studentId: user?.id,
                    battleId: id,
                    score: verifiedScore,
                    total: questions.length
                })
            });
            // Success silent
        } catch (e) {
            console.error(e);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center font-black text-slate-500 animate-pulse bg-slate-50">Yuklanmoqda...</div>;

    if (!questions || questions.length === 0) {
        return <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-slate-50 text-center space-y-4">
            <ShieldAlert size={64} className="text-rose-400" />
            <h2 className="text-2xl font-black text-slate-800">Ushbu bosqichda savollar yo'q</h2>
            <button onClick={() => navigate(-1)} className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-2xl shadow-xl hover:-translate-y-1 transition-all">Orqaga</button>
        </div>;
    }

    if (isFinished) {
        const correctCount = results.filter(r => r.correct).length;
        const total = questions.length;
        const perc = total > 0 ? Math.round((correctCount / total) * 100) : 0;
        const successColor = perc > 70 ? 'text-emerald-500' : perc > 40 ? 'text-amber-500' : 'text-rose-500';

        return (
            <div className="min-h-[100dvh] bg-slate-50 p-6 font-sans pb-24 max-w-2xl mx-auto flex flex-col">
                <div className="text-center py-8 space-y-4 flex-1">
                    <Trophy size={80} className={`mx-auto ${successColor} drop-shadow-xl mb-4`} />
                    <h2 className={`text-4xl font-black ${successColor} tracking-tighter`}>Natija: {perc}%</h2>
                    <p className="text-slate-500 font-bold text-lg uppercase tracking-widest bg-white inline-block px-4 py-1 rounded-full border border-slate-200 shadow-sm">
                        {correctCount} / {total} to'g'ri
                    </p>

                    <div className="mt-8 bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm text-left space-y-4">
                        <h3 className="font-black text-slate-800 border-b border-slate-100 pb-3">Xatolar ustida ishlash:</h3>
                        <div className="max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar space-y-3">
                            {results.map((r, i) => (
                                <div key={i} className={`p-4 rounded-2xl flex flex-col gap-2 ${r.correct ? 'bg-emerald-50 border border-emerald-100' : 'bg-rose-50 border border-rose-100'}`}>
                                    <div className="font-bold text-slate-800 text-lg border-b border-black/5 pb-2">{r.qText}</div>
                                    <div className="flex flex-col sm:flex-row gap-4 mt-1">
                                        {!r.correct && (
                                            <div className="flex items-center gap-2 text-rose-600 font-medium text-sm">
                                                <XCircle size={16} /> Siz: {r.given}
                                            </div>
                                        )}
                                        <div className="flex items-center gap-2 text-emerald-600 font-bold text-sm">
                                            <CheckCircle2 size={16} /> Javob: {r.expected}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <button
                    onClick={() => navigate('/student/vocab-battles')}
                    className="w-full mt-auto py-5 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-3xl text-lg shadow-xl shadow-indigo-500/30 transition-all flex items-center justify-center gap-2"
                >
                    <ArrowLeft size={24} /> Bosh sahifa
                </button>
            </div>
        );
    }

    const currentQ = questions[qIndex];
    const timePercentage = (timeLeft / currentQ.timeLimit) * 100;

    return (
        <div className="min-h-[100dvh] bg-slate-50 flex flex-col font-sans max-w-xl mx-auto w-full relative overflow-hidden">
            {/* Combo Streak Notification */}
            {consecutiveCorrects >= 3 && !isFinished && (
                <div className="absolute top-24 right-4 sm:top-28 sm:right-10 bg-gradient-to-tr from-orange-500 to-rose-500 text-white px-4 py-2 rounded-2xl font-black text-xl shadow-2xl shadow-orange-500/40 animate-bounce flex items-center gap-2 z-50 transform rotate-12 border-2 border-orange-300">
                    🔥 Combo x{consecutiveCorrects}
                </div>
            )}

            {/* Header / Top Bar */}
            <div className="flex items-center justify-between p-6 pb-2 relative z-10">
                <div className="bg-white/80 backdrop-blur border border-slate-200 px-4 py-2 rounded-2xl font-black text-slate-800 tracking-widest text-sm shadow-sm">
                    {qIndex + 1} / {questions.length}
                </div>

                {currentQ.timeLimit > 0 ? (
                    <div className="flex items-center gap-2 px-4 py-2 rounded-2xl font-bold border shadow-sm bg-white border-slate-200 text-slate-600">
                        <Clock size={18} />
                        Taymer
                    </div>
                ) : (
                    <div className="flex items-center gap-2 px-4 py-2 rounded-2xl font-bold border shadow-sm bg-slate-800 border-slate-700 text-white">
                        <TimerOff size={18} />
                        Taymer: Yo'q
                    </div>
                )}
            </div>

            {/* Timer Bar (Only show if enabled) */}
            {currentQ.timeLimit > 0 && (
                <div className="px-6 mb-8 mt-2">
                    <div className="h-3 w-full bg-slate-200 rounded-full overflow-hidden shadow-inner flex relative">
                        <div
                            className={`h-full rounded-full transition-all duration-1000 ease-linear ${timeLeft <= 3 ? 'bg-rose-500' : timeLeft <= 7 ? 'bg-amber-400' : 'bg-emerald-500'}`}
                            style={{ width: `${timePercentage}%` }}
                        />
                    </div>
                    <div className="text-center mt-2 font-black text-slate-400 text-sm">{timeLeft}s</div>
                </div>
            )}

            {/* Main Question Area */}
            <div className="flex-1 flex flex-col justify-center px-6 pb-12">
                <div className="bg-white border-2 border-slate-100 shadow-xl shadow-indigo-100/50 p-8 rounded-[3rem] text-center transform transition-all mb-12 relative">
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-[10px] font-black tracking-widest uppercase px-4 py-1.5 rounded-full shadow-md">
                        TARJIMA QILING
                    </div>
                    <h2 className="text-4xl sm:text-5xl font-black text-slate-800 tracking-tight leading-tight mt-4">
                        {currentQ.text}
                    </h2>
                </div>

                {/* Vocabulary UI */}
                {currentQ.type === 'vocabulary' ? (
                    (() => {
                        const targetWord = currentQ.acceptedAnswers?.[0] || '';
                        const currentVal = textAnswer || '';
                        const displayChars = targetWord.split('');

                        // Correctness checks for post-submit feedback
                        let isCorrect = false;
                        if (selectedOption !== null) {
                            isCorrect = targetWord.toLowerCase().trim() === textAnswer.toLowerCase().trim();
                        }

                        return (
                            <div className="w-full space-y-8 animate-in fade-in duration-500">
                                <div className="mt-4 flex flex-wrap justify-center gap-1.5 w-full">
                                    {displayChars.map((char, i) => {
                                        if (char === ' ') {
                                            return <div key={i} className="flex-shrink-0" style={{ width: targetWord.length > 10 ? '0.5rem' : '1.5rem' }} />;
                                        }

                                        const isAlphaNum = /[a-zA-Z0-9]/.test(char);
                                        if (!isAlphaNum) {
                                            return <span key={i} className="text-2xl md:text-3xl font-black text-slate-400 px-1">{char}</span>;
                                        }

                                        const boxWidth = targetWord.length > 12 ? 'w-8 sm:w-10' : 'w-10 sm:w-14';
                                        const boxHeight = targetWord.length > 12 ? 'h-10 sm:h-12' : 'h-12 sm:h-16';
                                        const fontSize = targetWord.length > 12 ? 'text-lg sm:text-2xl' : 'text-xl sm:text-3xl';

                                        return (
                                            <input key={i} id={`voc-box-${i}`} type="text" maxLength={1} value={currentVal[i] === ' ' ? '' : (currentVal[i] || '')}
                                                readOnly={selectedOption !== null}
                                                autoFocus={selectedOption === null && !displayChars.slice(0, i).some(c => /[a-zA-Z0-9]/.test(c))}
                                                autoComplete="off"
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Backspace' && (!currentVal[i] || currentVal[i] === ' ') && i > 0) {
                                                        let prevIdx = i - 1;
                                                        while (prevIdx >= 0 && !/[a-zA-Z0-9]/.test(targetWord[prevIdx])) prevIdx--;
                                                        if (prevIdx >= 0) {
                                                            const prevBox = document.getElementById(`voc-box-${prevIdx}`) as HTMLInputElement;
                                                            prevBox?.focus();
                                                        }
                                                    }
                                                    if (e.key === 'Enter') {
                                                        handleVocabularySubmit();
                                                    }
                                                }}
                                                onChange={(e) => {
                                                    let val = e.target.value.slice(-1).toLowerCase();
                                                    if (!val) val = ' ';
                                                    if (val !== ' ' && !/[a-z0-9]/i.test(val)) return;

                                                    const newChars = currentVal.split('');
                                                    while (newChars.length < targetWord.length) newChars.push(' ');
                                                    displayChars.forEach((c, idx) => {
                                                        if (!/[a-zA-Z0-9]/.test(c)) newChars[idx] = c;
                                                    });

                                                    newChars[i] = val;
                                                    const finalVal = newChars.join('');
                                                    setTextAnswer(finalVal);

                                                    if (val && i < targetWord.length - 1) {
                                                        let nextIdx = i + 1;
                                                        while (nextIdx < targetWord.length && !/[a-zA-Z0-9]/.test(targetWord[nextIdx])) nextIdx++;
                                                        if (nextIdx < targetWord.length) {
                                                            const nextBox = document.getElementById(`voc-box-${nextIdx}`) as HTMLInputElement;
                                                            nextBox?.focus();
                                                        }
                                                    }
                                                }}
                                                className={`flex-shrink-0 ${boxWidth} ${boxHeight} ${fontSize} font-black text-center rounded-lg sm:rounded-2xl border-2 transition-all outline-none uppercase shadow-sm
                                                    ${selectedOption !== null 
                                                        ? (isCorrect ? 'bg-emerald-500 border-emerald-600 text-white shadow-emerald-500/40 z-10 scale-105' : 'bg-rose-500 border-rose-600 text-white shadow-rose-500/40 opacity-90') 
                                                        : (currentVal[i] ? 'bg-indigo-50 border-indigo-400 text-indigo-700' : 'bg-white border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20')}
                                                `}
                                            />
                                        );
                                    })}
                                </div>
                                {selectedOption !== null && !isCorrect && (
                                    <div className="mt-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-center font-black animate-bounce">
                                        To'g'ri: {targetWord}
                                    </div>
                                )}
                                <div className="mt-8 flex justify-center">
                                    <button 
                                        onClick={handleVocabularySubmit} 
                                        disabled={selectedOption !== null || !textAnswer.trim() || textAnswer.length < targetWord.length}
                                        className="px-8 py-4 bg-indigo-600 disabled:bg-slate-300 disabled:text-slate-500 text-white font-black rounded-2xl text-lg shadow-xl shadow-indigo-500/40 transition-all hover:-translate-y-1 active:scale-95 w-full sm:w-auto"
                                    >
                                        TASDIQLASH
                                    </button>
                                </div>
                            </div>
                        );
                    })()
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {currentQ.options.map((opt, i) => {
                            let btnClass = "bg-white border-2 border-slate-200 text-slate-700 hover:border-indigo-400 hover:bg-indigo-50 shadow-sm";
                            let icon = null;

                            if (selectedOption !== null) {
                                if (i === currentQ.correctIndex) {
                                    btnClass = "bg-emerald-500 border-emerald-600 text-white shadow-emerald-500/40 z-10 scale-105"; // Highlight correct answer always when revealed
                                    icon = <CheckCircle2 size={24} />;
                                } else if (i === selectedOption) {
                                    btnClass = "bg-rose-500 border-rose-600 text-white shadow-rose-500/40 opacity-90"; // Highlight wrong choice
                                    icon = <XCircle size={24} />;
                                } else {
                                    btnClass = "bg-slate-100 border-slate-200 text-slate-400 opacity-50"; // Fade others
                                }
                            }

                            return (
                                <button
                                    key={i}
                                    disabled={selectedOption !== null}
                                    onClick={() => handleOptionSelect(i)}
                                    className={`
                                        relative p-6 rounded-[2rem] text-xl font-bold transition-all duration-300 flex items-center justify-center text-center leading-tight min-h-[100px] hover:-translate-y-1 active:scale-95 shadow-lg ${btnClass}
                                    `}
                                >
                                    {opt}
                                    {icon && <div className="absolute right-4">{icon}</div>}
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
