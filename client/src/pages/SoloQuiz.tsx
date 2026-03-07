import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { apiFetch } from '../api';
import { BookOpen, ChevronLeft, Zap, Clock, ChevronRight, CheckCircle, XCircle, Swords, Trophy, Coins, History } from 'lucide-react';

export default function SoloQuiz() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [quizzes, setQuizzes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Quiz & Battle State
    const [selectedQuiz, setSelectedQuiz] = useState<any | null>(null);
    const [results, setResults] = useState<any | null>(null);
    const [isBattleMode, setIsBattleMode] = useState(false);

    // Vocab Battle Game State
    const [battleQuestions, setBattleQuestions] = useState<any[]>([]);
    const [currentIdx, setCurrentIdx] = useState(0);
    const [totalXp, setTotalXp] = useState(0);
    const [timeLeft, setTimeLeft] = useState(15);
    const [streak, setStreak] = useState(0);
    const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
    const [isCorrectFeedback, setIsCorrectFeedback] = useState<boolean | null>(null);
    const timerRef = useRef<any>(null);

    useEffect(() => {
        if (!isBattleMode && !selectedQuiz && !results) {
            fetchQuizzes();
        }
    }, [isBattleMode, selectedQuiz, results]);

    const fetchQuizzes = async () => {
        try {
            const res = await apiFetch(`/api/student/quizzes?studentId=${user?.id}`);
            if (res.ok) setQuizzes(await res.json());
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleStartNormal = (quiz: any) => {
        setSelectedQuiz(quiz);
        setResults(null);
    };

    const handleStartBattle = async () => {
        try {
            setLoading(true);
            const res = await apiFetch(`/api/student/vocab-battle/generate?studentId=${user?.id}&count=15`);
            if (res.ok) {
                const data = await res.json();
                setBattleQuestions(data.questions);
                setIsBattleMode(true);
                setCurrentIdx(0);
                setTotalXp(0);
                setStreak(0);
                setTimeLeft(15);
                setSelectedAnswer(null);
                setIsCorrectFeedback(null);
                startTimer();
            } else {
                alert("Lug'at savollarini yuklashda xatolik yoki hozircha yetarli so'zlar kiritilmagan.");
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const startTimer = () => {
        if (timerRef.current) clearInterval(timerRef.current);
        setTimeLeft(15);
        timerRef.current = setInterval(() => {
            setTimeLeft(prev => {
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
        setStreak(0);
        setIsCorrectFeedback(false);
        setTimeout(() => nextQuestion(), 1500);
    };

    const handleAnswer = (option: string, answerLabel: string) => {
        if (selectedAnswer || isCorrectFeedback !== null) return; // Prevent double clicks
        if (timerRef.current) clearInterval(timerRef.current);
        setSelectedAnswer(answerLabel);

        const currentQ = battleQuestions[currentIdx];
        const isCorrect = currentQ.options.indexOf(option) === currentQ.correctIndex;

        setIsCorrectFeedback(isCorrect);

        if (isCorrect) {
            // XP Calculation
            const baseXP = 100;
            const speedBonus = timeLeft * 10;
            const comboBonus = streak * 50;
            const earnedXp = baseXP + speedBonus + comboBonus;

            setTotalXp(prev => prev + earnedXp);
            setStreak(prev => prev + 1);
        } else {
            setStreak(0);
        }

        setTimeout(() => nextQuestion(), 1500);
    };

    const nextQuestion = () => {
        setSelectedAnswer(null);
        setIsCorrectFeedback(null);
        if (currentIdx + 1 < battleQuestions.length) {
            setCurrentIdx(prev => prev + 1);
            startTimer();
        } else {
            finishBattle();
        }
    };

    const finishBattle = async () => {
        if (timerRef.current) clearInterval(timerRef.current);
        try {
            setLoading(true);
            const res = await apiFetch(`/api/student/vocab-battle/submit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ studentId: user?.id, totalXp })
            });

            if (res.ok) {
                const data = await res.json();
                setResults({
                    type: 'battle',
                    hidden: data.hidden,
                    score: data.xpEarned || 0,
                    coins: data.coinsEarned || 0,
                    percentage: (totalXp / (battleQuestions.length * 250)) * 100 // Estimate max nominal XP
                });
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
            setIsBattleMode(false);
        }
    };

    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, []);

    // -------- Renders --------

    if (results) {
        if (results.hidden) {
            return (
                <div className="min-h-screen bg-slate-50 font-sans p-6 flex items-center justify-center">
                    <div className="max-w-md w-full bg-white rounded-[3rem] p-10 text-center shadow-xl border border-slate-100 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 to-purple-600"></div>
                        <div className="w-24 h-24 bg-indigo-50 text-indigo-600 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-lg shadow-indigo-100 animate-float">
                            <CheckCircle size={48} />
                        </div>

                        <h2 className="text-3xl font-black text-slate-800 mb-2">Muvaffaqiyatli!</h2>
                        <p className="text-slate-500 font-bold text-xs uppercase tracking-widest mb-10">Sizning natijangiz</p>

                        <div className="bg-sky-50 border border-sky-100 rounded-[2rem] p-8 mb-10">
                            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                                <History className="text-sky-600" size={24} />
                            </div>
                            <p className="text-sky-800 font-bold leading-relaxed">
                                Natijalar va to'g'ri javoblar <span className="text-indigo-600">Telegram bot</span> orqali o'qituvchingizga yuborildi.
                            </p>
                        </div>

                        <button
                            onClick={() => { setResults(null); setSelectedQuiz(null); }}
                            className="w-full bg-slate-800 hover:bg-slate-700 text-white font-black py-4 rounded-2xl transition-all shadow-lg active:scale-95"
                        >
                            ASOSIY MENYUGA QAYTISH
                        </button>
                    </div>
                </div>
            );
        }

        return (
            <div className="min-h-screen bg-slate-50 font-sans p-6">
                <div className="max-w-md mx-auto space-y-6">
                    <div className="bg-white rounded-3xl p-8 text-center shadow-xl border border-slate-100 relative overflow-hidden">
                        {results.type === 'battle' ? (
                            <>
                                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500"></div>
                                <div className="w-20 h-20 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                                    <Trophy size={40} className="fill-orange-600" />
                                </div>
                                <h2 className="text-2xl font-black text-slate-800 mb-1">Battle Natijasi!</h2>
                                <div className="text-5xl font-black text-orange-600 mb-2">{results.score} <span className="text-2xl">XP</span></div>
                                <div className="flex justify-center items-center gap-2 mb-6 text-yellow-600 font-bold bg-yellow-50 py-2 rounded-2xl">
                                    <Coins size={20} />
                                    +{results.coins} Coin Yutdingiz!
                                </div>

                                <button
                                    onClick={() => { setResults(null); handleStartBattle(); }}
                                    className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold py-4 rounded-2xl shadow-lg shadow-orange-200 mb-3 active:scale-95 transition-transform"
                                >
                                    Qayta Jang Qilish ⚔️
                                </button>
                                <button
                                    onClick={() => { setResults(null); }}
                                    className="w-full bg-slate-100 text-slate-700 font-bold py-4 rounded-2xl shadow-sm active:scale-95 transition-transform"
                                >
                                    Menyuga qaytish
                                </button>
                            </>
                        ) : (
                            // General quiz result
                            <>
                                <div className="w-20 h-20 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Zap size={40} className="fill-indigo-600" />
                                </div>
                                <h2 className="text-2xl font-black text-slate-800 mb-1">Natija</h2>
                                <div className="text-5xl font-black text-indigo-600 mb-2">{results.score} XP</div>
                                <div className={`inline-block px-4 py-2 rounded-2xl text-sm font-black uppercase tracking-widest mb-6 ${results.percentage > 59
                                    ? 'bg-emerald-100 text-emerald-600'
                                    : 'bg-red-100 text-red-600'}`}>
                                    {results.percentage > 59 ? (
                                        <span className="flex items-center gap-2"><CheckCircle size={18} /> O'tdi (Passed)</span>
                                    ) : (
                                        <span className="flex items-center gap-2"><XCircle size={18} /> O'tmadi (Failed)</span>
                                    )}
                                </div>

                                <button
                                    onClick={() => { setResults(null); setSelectedQuiz(null); }}
                                    className="w-full bg-indigo-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-indigo-200"
                                >
                                    Dahshat! Yana o'ynash
                                </button>
                            </>
                        )}

                    </div>

                    {results.type !== 'battle' && results.results && (
                        <div className="space-y-3">
                            <h3 className="font-bold text-slate-400 uppercase text-xs tracking-widest pl-2">Savollar tahlili</h3>
                            {results.results.map((r: any, i: number) => (
                                <div key={i} className="bg-white p-4 rounded-2xl border border-slate-100 flex gap-3">
                                    {r.isCorrect ? <CheckCircle className="text-emerald-500 shrink-0" /> : <XCircle className="text-red-500 shrink-0" />}
                                    <div>
                                        <p className="text-sm font-bold text-slate-800 mb-1">{r.question}</p>
                                        <p className="text-xs text-slate-500 line-clamp-2">{r.feedback}</p>
                                        {!r.isCorrect && (
                                            <p className="text-[10px] font-bold text-emerald-600 mt-1">To'g'ri javob: {r.correctAnswer}</p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    if (isBattleMode && battleQuestions.length > 0) {
        const q = battleQuestions[currentIdx];
        const letters = ['A', 'B', 'C', 'D'];

        return (
            <div className="min-h-screen bg-slate-900 font-sans p-6 flex flex-col items-center justify-center text-white relative overflow-hidden">
                {/* Background animations */}
                <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-red-600 rounded-full blur-[100px] opacity-20 animate-pulse"></div>
                <div className="absolute bottom-[-10%] left-[-10%] w-96 h-96 bg-orange-600 rounded-full blur-[100px] opacity-20 animate-pulse" style={{ animationDelay: '1s' }}></div>

                <div className="w-full max-w-md relative z-10 flex flex-col h-full justify-between">

                    {/* Header */}
                    <div className="flex justify-between items-center mb-8 bg-white/10 p-4 rounded-2xl backdrop-blur-md">
                        <div className="flex flex-col">
                            <span className="text-xs font-bold text-orange-200 uppercase tracking-widest">XP Kiritildi</span>
                            <span className="text-xl font-black text-white">{totalXp}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <FlameIcon />
                            <span className="text-xl font-black text-orange-400">x{streak}</span>
                        </div>
                        <div className="flex flex-col text-right">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Savol</span>
                            <span className="text-xl font-black text-white">{currentIdx + 1}/{battleQuestions.length}</span>
                        </div>
                    </div>

                    {/* Timer Bar */}
                    <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden mb-8 relative">
                        <div
                            className={`h-full rounded-full transition-all duration-1000 ease-linear ${timeLeft > 5 ? 'bg-emerald-400' : 'bg-red-500'}`}
                            style={{ width: `${(timeLeft / 15) * 100}%` }}
                        />
                    </div>

                    {/* Question Card */}
                    <div className={`bg-white text-slate-900 rounded-[2.5rem] p-8 text-center shadow-2xl mb-8 transform transition-all duration-300 ${isCorrectFeedback === true ? 'scale-105 shadow-emerald-500/50' : isCorrectFeedback === false ? 'scale-95 shadow-red-500/50 shake-animation' : ''}`}>
                        <h3 className="text-3xl font-black tracking-tight mb-2">{q.text}</h3>
                        <p className="text-slate-400 font-bold uppercase text-xs tracking-widest">To'g'ri tarjimani toping</p>
                    </div>

                    {/* Options Grid */}
                    <div className="grid grid-cols-1 gap-4 mb-10 mt-auto">
                        {q.options.map((opt: string, i: number) => {
                            const ltr = letters[i];
                            const isSelected = selectedAnswer === ltr;
                            const isActualCorrect = i === q.correctIndex;

                            let btnClass = "bg-white/10 hover:bg-white/20 border border-white/20";
                            if (isCorrectFeedback !== null) {
                                if (isActualCorrect) btnClass = "bg-emerald-500 border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.5)]";
                                else if (isSelected && !isActualCorrect) btnClass = "bg-red-500 border-red-400";
                                else btnClass = "bg-white/5 border-white/5 opacity-50";
                            }

                            return (
                                <button
                                    key={i}
                                    onClick={() => handleAnswer(opt, ltr)}
                                    disabled={isCorrectFeedback !== null}
                                    className={`w-full flex items-center p-4 rounded-2xl transition-all duration-200 active:scale-95 ${btnClass}`}
                                >
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg mr-4 ${isCorrectFeedback !== null && isActualCorrect ? 'bg-white/30 text-white' : 'bg-white/10 text-white'}`}>
                                        {ltr}
                                    </div>
                                    <span className="text-lg font-bold text-white text-left flex-1 break-words">{opt}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    }

    if (selectedQuiz) {
        // Simple Quiz UI for Solo Mode
        return (
            <div className="min-h-screen bg-slate-50 font-sans p-6">
                <div className="max-w-md mx-auto space-y-6">
                    <header className="flex justify-between items-center mb-8">
                        <button onClick={() => setSelectedQuiz(null)} className="p-2 bg-white rounded-xl shadow-sm border border-slate-100">
                            <ChevronLeft size={24} />
                        </button>
                        <h2 className="font-black text-slate-800 text-lg">{selectedQuiz.title}</h2>
                        <div className="w-10"></div>
                    </header>

                    <div className="text-center py-20 px-10 bg-white rounded-3xl border-2 border-dashed border-slate-200">
                        <Zap size={48} className="mx-auto text-indigo-200 mb-4" />
                        <p className="text-slate-500 font-medium mb-8 text-sm">Mustaqil o'rganish rejimi hozirda faqat to'liq topshirishni qo'llab-quvvatlaydi. Savollarni diqqat bilan yeching.</p>
                        <p className="text-red-500 font-bold">To'liq mustaqil savollar oqimi tez orada qo'shiladi!</p>
                        <button onClick={() => setSelectedQuiz(null)} className="mt-4 text-indigo-600 font-bold">Orqaga qaytish</button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 font-sans pb-10">
            <div className="bg-gradient-to-br from-indigo-900 to-blue-900 pt-8 pb-16 px-6 text-white relative overflow-hidden">
                <button
                    onClick={() => navigate(-1)}
                    className="mb-6 p-2 bg-white/10 rounded-xl hover:bg-white/20 transition-colors"
                >
                    <ChevronLeft size={24} />
                </button>
                <h1 className="text-3xl font-black mb-2 flex items-center gap-3">
                    <BookOpen className="text-indigo-300" size={32} />
                    Mashqlar
                </h1>
                <p className="text-indigo-200 font-medium font-sm">Bilimingizni mustahkamlang</p>
            </div>

            <div className="px-4 -mt-10 relative z-10 space-y-4">

                {/* ⚡ Lug'at Battle Banner */}
                <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-3xl p-1 shadow-lg shadow-orange-500/20 transform transition-transform hover:scale-[1.02]">
                    <div className="bg-gradient-to-r from-orange-400 to-red-500 rounded-[22px] p-6 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="absolute top-[-50px] right-[-50px] w-32 h-32 bg-white/20 blur-2xl rounded-full"></div>
                        <div className="relative z-10 text-white flex-1 text-center md:text-left">
                            <span className="flex items-center justify-center md:justify-start gap-2 text-xs font-black uppercase tracking-widest text-orange-100 mb-2">
                                <FlameIcon /> Qaynoq rejim
                            </span>
                            <h2 className="text-2xl font-black mb-1">Lug'at Battle</h2>
                            <p className="text-orange-100 text-sm font-medium">Tezlik va xotirani sinash! 15 ta so'z, har biri uchun 15 soniya. Tezroq topsangiz ko'proq XP va Tanga!</p>
                        </div>
                        <button
                            onClick={handleStartBattle}
                            disabled={loading}
                            className="relative z-10 w-full md:w-auto bg-white text-orange-600 font-black px-8 py-4 rounded-xl shadow-xl hover:bg-orange-50 transition-colors active:scale-95 flex items-center justify-center gap-2"
                        >
                            {loading && !isBattleMode ? (
                                <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                                <>Jangni Boshlash <Swords size={20} /></>
                            )}
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-4 py-2">
                    <div className="h-px bg-slate-200 flex-1"></div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Oddiy Mashqlar</span>
                    <div className="h-px bg-slate-200 flex-1"></div>
                </div>

                {loading && !isBattleMode ? (
                    <div className="py-20 text-center bg-white rounded-3xl shadow-sm">
                        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-slate-400 font-medium">Testlar yuklanmoqda...</p>
                    </div>
                ) : (
                    quizzes.map((quiz) => (
                        <div key={quiz.id} className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 flex items-center justify-between group hover:border-indigo-200 transition-colors">
                            <div className="flex-1">
                                <span className="text-[10px] font-black bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full uppercase mb-2 inline-block">Unit {quiz.unit}</span>
                                <h3 className="font-bold text-slate-800 mb-1">{quiz.title}</h3>
                                <div className="flex items-center gap-3 text-slate-400 text-xs font-semibold">
                                    <span className="flex items-center gap-1"><Zap size={12} /> XP: 1000+</span>
                                    <span className="flex items-center gap-1"><Clock size={12} /> {quiz.time_limit} daqiqa</span>
                                </div>
                            </div>
                            <button
                                onClick={() => handleStartNormal(quiz)}
                                className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm"
                            >
                                <ChevronRight size={24} />
                            </button>
                        </div>
                    ))
                )}

                {!loading && quizzes.length === 0 && !isBattleMode && (
                    <div className="py-20 text-center bg-white rounded-3xl shadow-sm px-10">
                        <BookOpen size={48} className="mx-auto mb-4 text-slate-200" />
                        <p className="text-slate-400 font-medium">Hozircha darajangizga mos testlar yo'q</p>
                    </div>
                )}
            </div>

            {/* Global shake animation style definition */}
            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes shake {
                  0%, 100% { transform: translateX(0); }
                  25% { transform: translateX(-5px); }
                  50% { transform: translateX(5px); }
                  75% { transform: translateX(-5px); }
                }
                .shake-animation {
                  animation: shake 0.4s ease-in-out;
                }
            `}} />
        </div>
    );
}

function FlameIcon() {
    return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-orange-400">
            <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"></path>
        </svg>
    )
}
