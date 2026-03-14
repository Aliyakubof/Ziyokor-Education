import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiFetch } from '../api';
import { useAuth } from '../AuthContext';
import { ArrowLeft, Clock, TimerOff, CheckCircle2, XCircle, Trophy, ShieldAlert } from 'lucide-react';
import confetti from 'canvas-confetti';
import { motion } from 'framer-motion';

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
        const updatedResults = [...results, newRes];
        setResults(updatedResults);
        moveToNext(updatedResults);
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

        const updatedResults = [...results, newRes];
        setResults(updatedResults);

        setTimeout(() => {
            moveToNext(updatedResults);
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

        const updatedResults = [...results, newRes];
        setResults(updatedResults);

        setTimeout(() => {
            moveToNext(updatedResults);
        }, 1500);
    };

    const moveToNext = (updatedResults: any[]) => {
        setSelectedOption(null);
        setTextAnswer('');
        if (qIndex < questions.length - 1) {
            setQIndex(qIndex + 1);
        } else {
            finishGame(updatedResults);
        }
    };

    const finishGame = (updatedResults: any[]) => {
        setIsFinished(true);
        submitScore(updatedResults);
    };

    const submitScore = async (finalResults: any[]) => {
        if (submitting) return;
        setSubmitting(true);
        try {
            const verifiedScore = finalResults.filter(r => r.correct).length;

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

    if (loading) return <div className="min-h-screen flex items-center justify-center font-black transition-colors" style={{ backgroundColor: 'var(--bg-color)', color: 'var(--text-color)' }}>Yuklanmoqda...</div>;

    if (!questions || questions.length === 0) {
        return <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center space-y-4 transition-colors" style={{ backgroundColor: 'var(--bg-color)' }}>
            <ShieldAlert size={64} className="text-rose-400" />
            <h2 className="text-2xl font-black" style={{ color: 'var(--text-color)' }}>Ushbu bosqichda savollar yo'q</h2>
            <button onClick={() => navigate(-1)} className="px-6 py-3 text-white font-bold rounded-2xl shadow-xl hover:-translate-y-1 transition-all" style={{ backgroundColor: 'var(--primary-color)' }}>Orqaga</button>
        </div>;
    }

    if (isFinished) {
        const correctCount = results.filter(r => r.correct).length;
        const total = questions.length;
        const perc = total > 0 ? Math.round((correctCount / total) * 100) : 0;
        const successColor = perc > 70 ? 'text-emerald-500' : perc > 40 ? 'text-amber-500' : 'text-rose-500';
        const successBg = perc > 70 ? 'bg-emerald-500/10' : perc > 40 ? 'bg-amber-500/10' : 'bg-rose-500/10';

        return (
            <div className="min-h-[100dvh] font-sans pb-32 flex flex-col items-center overflow-x-hidden transition-colors" style={{ backgroundColor: 'var(--bg-color)' }}>
                {/* Hero Result Section */}
                <div className="w-full border-b pt-12 pb-10 px-6 shadow-sm flex flex-col items-center relative overflow-hidden transition-colors" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
                    <div className="absolute top-0 left-0 w-full h-1" style={{ backgroundColor: 'var(--primary-color)' }}></div>
                    
                    <motion.div 
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className={`mb-6 p-6 rounded-full ${successBg} relative`}
                    >
                        <Trophy size={80} className={`${successColor} drop-shadow-2xl relative z-10`} />
                        <motion.div 
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ repeat: Infinity, duration: 2 }}
                            className="absolute inset-0 bg-white/50 rounded-full blur-2xl"
                        />
                    </motion.div>

                    <h2 className={`text-6xl font-black ${successColor} tracking-tighter mb-2`}>{perc}%</h2>
                    <p className="font-black text-sm uppercase tracking-[0.3em] mb-4 opacity-50" style={{ color: 'var(--text-color)' }}>Muvaffaqiyat</p>
                    
                    <div className="flex gap-3">
                        <div className="px-5 py-2 rounded-2xl text-white font-black text-lg shadow-xl" style={{ backgroundColor: 'var(--primary-color)' }}>
                            {correctCount} / {total}
                        </div>
                        <div className="px-5 py-2 rounded-2xl font-black text-lg shadow-sm border" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)', color: 'var(--text-color)' }}>
                            TO'G'RI
                        </div>
                    </div>
                </div>

                {/* Results List */}
                <div className="w-full max-w-2xl px-4 py-8 space-y-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-black text-xl tracking-tight" style={{ color: 'var(--text-color)' }}>Xatolar tahlili</h3>
                        <span className="text-xs font-bold uppercase tracking-widest opacity-40" style={{ color: 'var(--text-color)' }}>{results.length} SAVOL</span>
                    </div>

                    <div className="space-y-4">
                        {results.map((r, i) => (
                            <motion.div 
                                key={i}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.05 }}
                                className={`group p-6 rounded-[2.5rem] border transition-all flex flex-col gap-4 shadow-sm
                                    ${r.correct ? 'border-emerald-100/50' : 'border-rose-100'}
                                `}
                                style={{ backgroundColor: 'var(--card-bg)', borderColor: r.correct ? '' : 'var(--border-color)' }}
                            >
                                <div className="flex justify-between items-start gap-4">
                                    <div className="font-black text-slate-900 text-xl sm:text-2xl leading-tight flex-1">
                                        {r.qText}
                                    </div>
                                    <div className={`p-2 rounded-xl flex-shrink-0 ${r.correct ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
                                        {r.correct ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 gap-3">
                                    {!r.correct && (
                                        <div className="flex flex-col bg-rose-50/50 p-4 rounded-3xl border border-rose-100/50">
                                            <span className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-1">Sizning javobingiz:</span>
                                            <span className="text-rose-600 font-bold text-lg">{r.given}</span>
                                        </div>
                                    )}
                                    <div className={`flex flex-col p-4 rounded-3xl border ${r.correct ? 'bg-emerald-50/50 border-emerald-100/50' : 'bg-emerald-50 border-emerald-100'}`}>
                                        <span className={`text-[10px] font-black uppercase tracking-widest mb-1 ${r.correct ? 'text-emerald-400' : 'text-emerald-500'}`}>To'g'ri javob:</span>
                                        <span className="text-emerald-600 font-bold text-lg">{r.expected}</span>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-white via-white/95 to-transparent z-50">
                    <div className="max-w-2xl mx-auto">
                        <button
                            onClick={() => navigate('/student/vocab-battles')}
                            className="w-full py-5 text-white font-black rounded-[2rem] text-xl shadow-2xl transition-all flex items-center justify-center gap-3 active:scale-95"
                            style={{ backgroundColor: 'var(--primary-color)' }}
                        >
                            <ArrowLeft size={24} /> BOSH SAHIFA
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const currentQ = questions[qIndex];
    if (!currentQ) return null;
    const timePercentage = (timeLeft / (currentQ.timeLimit || 1)) * 100;

    return (
        <div className="min-h-[100dvh] flex flex-col font-sans max-w-xl mx-auto w-full relative overflow-hidden transition-colors duration-500" style={{ backgroundColor: 'var(--bg-color)', color: 'var(--text-color)' }}>
            {/* Animated Background Elements */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[100px] animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-cyan-600/10 rounded-full blur-[100px] animate-pulse delay-1000" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.05)_0%,transparent_70%)]" />
            </div>
            {/* Combo Streak Notification */}
            {consecutiveCorrects >= 3 && !isFinished && (
                <motion.div 
                    initial={{ scale: 0, rotate: -20 }}
                    animate={{ scale: 1, rotate: 12 }}
                    className="absolute top-24 right-4 sm:top-28 sm:right-10 bg-gradient-to-tr from-cyan-500 to-blue-600 text-white px-5 py-2.5 rounded-2xl font-black text-xl shadow-[0_0_30px_rgba(6,182,212,0.4)] animate-bounce flex items-center gap-2 z-50 border-2 border-white/20"
                >
                    🔥 Combo x{consecutiveCorrects}
                </motion.div>
            )}

            {/* Header / Top Bar */}
            <div className="flex items-center justify-between p-6 pb-2 relative z-20">
                <div className="backdrop-blur-xl border px-4 py-2 rounded-2xl font-black tracking-widest text-sm shadow-xl transition-colors" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)', color: 'var(--primary-color)' }}>
                    <span style={{ color: 'var(--text-color)', opacity: 0.5 }}>{qIndex + 1}</span> / {questions.length}
                </div>

                {currentQ.timeLimit > 0 ? (
                    <div className="flex items-center gap-2 px-4 py-2 rounded-2xl font-bold border shadow-xl backdrop-blur-xl transition-colors" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)', color: 'var(--text-color)' }}>
                        <Clock size={16} className="animate-pulse" style={{ color: 'var(--primary-color)' }} />
                        <span className="tabular-nums">{timeLeft}s</span>
                    </div>
                ) : (
                    <div className="flex items-center gap-2 px-4 py-2 rounded-2xl font-bold border shadow-xl backdrop-blur-xl opacity-30 transition-colors" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)', color: 'var(--text-color)' }}>
                        <TimerOff size={16} />
                        ∞
                    </div>
                )}
            </div>

            {/* Timer Bar */}
            {currentQ.timeLimit > 0 && (
                <div className="px-6 mb-8 mt-2 relative z-20">
                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden flex relative">
                        <motion.div
                            initial={{ width: '100%' }}
                            animate={{ width: `${timePercentage}%` }}
                            transition={{ duration: 1, ease: "linear" }}
                            className={`h-full rounded-full ${timeLeft <= 3 ? 'bg-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.6)]' : timeLeft <= 7 ? 'bg-amber-400' : 'bg-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.6)]'}`}
                        />
                    </div>
                </div>
            )}

            {/* Main Question Area */}
            <div className="flex-1 flex flex-col justify-center px-6 pb-12 relative z-20">
                <motion.div 
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="backdrop-blur-2xl border shadow-[0_20px_50px_rgba(0,0,0,0.1)] p-10 rounded-[3rem] text-center mb-12 relative overflow-hidden transition-colors"
                    style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}
                >
                    <div className="absolute top-0 left-0 w-full h-[1px]" style={{ backgroundColor: 'var(--primary-color)', opacity: 0.3 }}></div>
                    <div className="text-[10px] font-black tracking-[0.2em] uppercase mb-6 opacity-40" style={{ color: 'var(--text-color)' }}>
                        TARJIMA QILING
                    </div>
                    <h2 className="text-4xl sm:text-5xl font-black tracking-tight leading-tight" style={{ color: 'var(--text-color)' }}>
                        {currentQ.text}
                    </h2>
                </motion.div>

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
                            <motion.div 
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="w-full space-y-8"
                            >
                                <div className="mt-4 flex flex-wrap justify-center gap-2 w-full pb-4 items-center">
                                    {displayChars.map((char: string, i: number) => {
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
                                            <motion.input 
                                                key={i} 
                                                id={`voc-box-${i}`} type="text" maxLength={1} value={currentVal[i] === ' ' ? '' : (currentVal[i] || '')}
                                                initial={{ scale: 0.8 }}
                                                animate={{ scale: 1 }}
                                                whileFocus={{ scale: 1.05, borderColor: '#6366f1' }}
                                                readOnly={selectedOption !== null}
                                                autoFocus={selectedOption === null && !displayChars.slice(0, i).some(c => /[a-zA-Z0-9]/.test(c))}
                                                autoComplete="off"
                                                onKeyDown={(e: any) => {
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
                                                onChange={(e: any) => {
                                                    let val = e.target.value.slice(-1).toLowerCase();
                                                    if (!val) val = ' ';
                                                    if (val !== ' ' && !/[a-z0-9]/i.test(val)) return;

                                                    const newChars = currentVal.split('');
                                                    while (newChars.length < targetWord.length) newChars.push(' ');
                                                    displayChars.forEach((c: string, idx: number) => {
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
                                                className={`flex-shrink-0 ${boxWidth} ${boxHeight} ${fontSize} font-black text-center rounded-lg sm:rounded-2xl border-2 transition-all outline-none uppercase shadow-lg
                                                    ${selectedOption !== null 
                                                        ? (isCorrect ? 'bg-emerald-500 border-emerald-400 text-white shadow-[0_0_20px_rgba(16,185,129,0.4)] z-10 scale-105' : 'bg-rose-500 border-rose-400 text-white shadow-none opacity-50') 
                                                        : (currentVal[i] ? 'border-indigo-500 shadow-[0_0_15px_rgba(59,130,246,0.2)]' : 'border-white/10 focus:border-indigo-500')}
                                                `}
                                                style={{ 
                                                    backgroundColor: selectedOption !== null ? '' : 'var(--card-bg)',
                                                    borderColor: selectedOption === null && currentVal[i] ? 'var(--primary-color)' : '',
                                                    color: selectedOption !== null ? 'white' : 'var(--text-color)'
                                                }}
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
                                        disabled={selectedOption !== null || !textAnswer.trim()}
                                        className="px-8 py-5 text-white disabled:opacity-30 font-black rounded-3xl text-xl shadow-xl transition-all hover:-translate-y-1 active:scale-95 w-full uppercase tracking-widest"
                                        style={{ backgroundColor: 'var(--primary-color)' }}
                                    >
                                        TASDIQLASH
                                    </button>
                                </div>
                            </motion.div>
                        );
                    })()
                ) : (
                    <div className="grid grid-cols-1 gap-4">
                        {currentQ.options.map((opt: string, i: number) => {
                            let btnClass = "bg-slate-900/40 backdrop-blur-xl border border-white/10 text-slate-300 hover:bg-slate-800/60 hover:border-cyan-500/50 hover:text-white shadow-xl";
                            let icon = null;

                            if (selectedOption !== null) {
                                if (i === currentQ.correctIndex) {
                                    btnClass = "bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.2)] z-10 scale-105";
                                    icon = <CheckCircle2 size={24} className="text-emerald-400" />;
                                } else if (i === selectedOption) {
                                    btnClass = "bg-rose-500/20 border-rose-500 text-rose-400 opacity-90 scale-95";
                                    icon = <XCircle size={24} className="text-rose-400" />;
                                } else {
                                    btnClass = "bg-slate-950/40 border-white/5 text-slate-600 opacity-40";
                                }
                            }

                            return (
                                <motion.button
                                    key={i}
                                    initial={{ opacity: 0, x: i % 2 === 0 ? -20 : 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.1 }}
                                    disabled={selectedOption !== null}
                                    onClick={() => handleOptionSelect(i)}
                                    className={`
                                        relative p-6 rounded-[2rem] text-xl font-bold transition-all duration-300 flex items-center justify-center text-center leading-tight min-h-[90px] border-2 shadow-2xl hover:-translate-y-1 active:scale-95
                                    `}
                                    style={{ 
                                        backgroundColor: selectedOption !== null 
                                            ? (i === currentQ.correctIndex ? 'rgba(16,185,129,0.2)' : i === selectedOption ? 'rgba(244,63,94,0.2)' : 'var(--card-bg)') 
                                            : 'var(--card-bg)',
                                        borderColor: selectedOption !== null 
                                            ? (i === currentQ.correctIndex ? '#10b981' : i === selectedOption ? '#f43f5e' : 'var(--border-color)') 
                                            : 'var(--border-color)',
                                        color: selectedOption !== null 
                                            ? (i === currentQ.correctIndex ? '#10b981' : i === selectedOption ? '#f43f5e' : 'var(--text-color)') 
                                            : 'var(--text-color)',
                                        opacity: selectedOption !== null && i !== currentQ.correctIndex && i !== selectedOption ? 0.4 : 1
                                    }}
                                >
                                    <span className="relative z-10">{opt}</span>
                                    {icon && <div className="absolute right-6 z-20">{icon}</div>}
                                </motion.button>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
