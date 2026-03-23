import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { apiFetch } from '../api';
import { 
    BookOpen, ChevronLeft, Zap, Clock, ChevronRight, CheckCircle, 
    Coins, Info, CheckCircle2, AlertCircle 
} from 'lucide-react';
import { motion } from 'framer-motion';

interface QuestionData {
    info?: string;
    text: string;
    options: string[];
    timeLimit: number;
    type: 'multiple-choice' | 'text-input' | 'true-false' | 'fill-blank' | 'find-mistake' | 'rewrite' | 'word-box' | 'info-slide' | 'matching' | 'vocabulary';
    acceptedAnswers?: string[];
}

const normalizeAnswer = (val: string | number): string => {
    if (val === null || val === undefined) return "";
    let s = String(val).toLowerCase();

    // Normalize various Uzbek/English apostrophes to '
    s = s.replace(/[ʻ’‘`]/g, "'");
    
    // Replace anything that is NOT a letter or a number or an apostrophe with a space
    // We use \p{L} for any Unicode letter and \p{N} for any number
    s = s.replace(/[^\p{L}\p{N}']/gu, " ");
    
    // Normalize multiple spaces and ensure trimmed
    s = s.replace(/\s+/g, " ");
    return s.trim();
};

const countCorrectParts = (studentAns: string | number, acceptedAnswers: string[]): number => {
    if (!studentAns) return 0;
    const sParts = String(studentAns).split('+').map(p => normalizeAnswer(p));
    const aParts = acceptedAnswers.map(p => normalizeAnswer(p));
    let count = 0;
    for (let i = 0; i < aParts.length; i++) {
        if (sParts[i] === aParts[i]) {
            count++;
        }
    }
    return count;
};

export default function SoloQuiz() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [quizzes, setQuizzes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Quiz & Results State
    const [selectedQuiz, setSelectedQuiz] = useState<any | null>(null);
    const [view, setView] = useState<'LIST' | 'PLAYING' | 'SUMMARY' | 'FINISHED' | 'OFF'>('LIST');
    
    const [currentQuestions, setCurrentQuestions] = useState<QuestionData[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<number, any>>({});
    const [results, setResults] = useState<any | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [timeLeft, setTimeLeft] = useState<number | null>(null);

    useEffect(() => {
        checkStatus();
    }, []);

    const checkStatus = async () => {
        try {
            const res = await apiFetch('/api/settings/solo_quiz_status');
            if (res.ok) {
                const data = await res.json();
                if (data.value === 'off') {
                    setView('OFF');
                } else {
                    fetchQuizzes();
                }
            } else {
                fetchQuizzes();
            }
        } catch (err) {
            fetchQuizzes();
        }
    };

    useEffect(() => {
        if (view === 'LIST') {
            fetchQuizzes();
        }
    }, [view]);

    // Timer Logic
    useEffect(() => {
        if (view === 'PLAYING' && timeLeft !== null && timeLeft > 0) {
            const timer = setInterval(() => {
                setTimeLeft(prev => (prev !== null && prev > 0) ? prev - 1 : 0);
            }, 1000);
            return () => clearInterval(timer);
        } else if (view === 'PLAYING' && timeLeft === 0) {
            finalizeSubmission();
        }
    }, [view, timeLeft]);

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    const fetchQuizzes = async () => {
        setLoading(true);
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
        const parsedQuestions = typeof quiz.questions === 'string' 
            ? JSON.parse(quiz.questions) 
            : quiz.questions;
        
        setSelectedQuiz(quiz);
        setCurrentQuestions(parsedQuestions || []);
        setCurrentIndex(0);
        setAnswers({});
        setTimeLeft((quiz.time_limit || 20) * 60); // In seconds
        setView('PLAYING');
    };

    const saveAnswer = (val: any) => {
        setAnswers(prev => ({ ...prev, [currentIndex]: val }));
    };

    const finalizeSubmission = async () => {
        if (isSubmitting) return;
        setIsSubmitting(true);
        
        let totalScore = 0;
        let maxScore = 0;

        currentQuestions.forEach((q, idx) => {
            if (q.type === 'info-slide') return;
            
            const studentAns = answers[idx];
            const accepted = q.acceptedAnswers || [];
            
            if (q.type === 'multiple-choice' || q.type === 'true-false') {
                maxScore += 1;
                if (studentAns !== undefined && Number(studentAns) === (q as any).correctIndex) {
                    totalScore += 1;
                }
            } else if (['text-input', 'fill-blank', 'find-mistake', 'rewrite', 'word-box', 'matching'].includes(q.type)) {
                const earned = countCorrectParts(studentAns, accepted);
                totalScore += earned;
                maxScore += accepted.length;
            }
        });

        const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 100;

        try {
            // Send to backend for PDF and notification
            const res = await apiFetch('/api/solo-quizzes/submit', {
                method: 'POST',
                body: JSON.stringify({
                    quizId: selectedQuiz.id,
                    quizTitle: selectedQuiz.title,
                    studentId: user?.id,
                    studentName: user?.name,
                    answers,
                    score: totalScore,
                    maxScore,
                    percentage,
                    questions: currentQuestions
                })
            });
            
            if (!res.ok) console.error('Failed to send PDF notification');
        } catch (err) {
            console.error('Submission error:', err);
        }

        setResults({
            immediateScore: totalScore,
            maxScore,
            percentage
        });

        setView('FINISHED');
        setIsSubmitting(false);
    };

    const goToQuestion = (index: number) => {
        if (index >= 0 && index < currentQuestions.length) {
            setCurrentIndex(index);
            setView('PLAYING');
        }
    };

    // -------- Renders --------

    if (view === 'OFF') {
        return (
            <div className="min-h-screen font-sans p-6 flex flex-col items-center justify-center transition-colors duration-500" style={{ backgroundColor: 'var(--bg-color)' }}>
                <div className="max-w-md w-full text-center space-y-8 animate-in fade-in zoom-in duration-700">
                    <div className="relative inline-block">
                        <div className="w-32 h-32 bg-indigo-50 rounded-[3rem] flex items-center justify-center text-indigo-600 shadow-inner">
                            <Clock size={64} className="animate-pulse" />
                        </div>
                        <div className="absolute -right-2 -top-2 w-12 h-12 bg-amber-400 rounded-2xl flex items-center justify-center text-white shadow-lg rotate-12">
                            <Zap size={24} fill="white" />
                        </div>
                    </div>
                    
                    <div>
                        <h2 className="text-4xl font-black mb-4 tracking-tight" style={{ color: 'var(--text-color)' }}>Yaqinda...</h2>
                        <p className="text-lg font-medium opacity-60 leading-relaxed" style={{ color: 'var(--text-color)' }}>
                            Hozirda mashqlar bo'limi texnik ishlar sababli vaqtincha yopiq. <br/> 
                            Tez orada eng sara testlar bilan qaytamiz! 🚀
                        </p>
                    </div>

                    <div className="p-6 bg-white/50 backdrop-blur-sm rounded-3xl border border-white shadow-sm flex items-center gap-4 text-left">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shrink-0">
                            <Info size={24} />
                        </div>
                        <p className="text-sm font-bold opacity-80" style={{ color: 'var(--text-color)' }}>
                            Adminlar yangi savollar va qiziqarli mashqlar ustida ishlamoqda.
                        </p>
                    </div>

                    <button 
                        onClick={() => window.history.back()}
                        className="px-8 py-4 bg-slate-900 text-white rounded-[2rem] font-black text-sm uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl"
                    >
                        Orqaga qaytish
                    </button>
                </div>
            </div>
        );
    }

    if (view === 'FINISHED' && results) {
        return (
            <div className="min-h-screen font-sans p-6 flex flex-col items-center justify-center transition-colors duration-500" style={{ backgroundColor: 'var(--bg-color)' }}>
                <div className="max-w-md w-full space-y-6">
                    <div className="rounded-[3rem] p-8 text-center shadow-xl border relative overflow-hidden transition-colors" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
                        <div className={`w-20 h-20 rounded-[1.5rem] flex items-center justify-center mx-auto mb-6 shadow-lg ${results.percentage > 59 ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                            {results.percentage > 59 ? <CheckCircle2 size={40} /> : <AlertCircle size={40} />}
                        </div>
                        
                        <h2 className="text-2xl font-black mb-1" style={{ color: 'var(--text-color)' }}>Natijangiz</h2>
                        <div className="text-6xl font-black mb-4" style={{ color: results.percentage > 59 ? '#10b981' : '#f43f5e' }}>
                            {results.percentage}%
                        </div>
                        
                        <div className="text-xl font-bold mb-8 opacity-60" style={{ color: 'var(--text-color)' }}>
                            {results.immediateScore} / {results.maxScore} ball
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-8">
                            <div className="p-4 rounded-3xl border transition-colors" style={{ backgroundColor: 'var(--bg-color)', borderColor: 'var(--border-color)' }}>
                                <p className="text-[10px] uppercase font-black tracking-widest opacity-40 mb-1" style={{ color: 'var(--text-color)' }}>Status</p>
                                <p className={`font-black ${results.percentage > 59 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                    {results.percentage > 59 ? "O'TDINGIZ" : "O'TMADINGIZ"}
                                </p>
                            </div>
                            <div className="p-4 rounded-3xl border transition-colors" style={{ backgroundColor: 'var(--bg-color)', borderColor: 'var(--border-color)' }}>
                                <p className="text-[10px] uppercase font-black tracking-widest opacity-40 mb-1" style={{ color: 'var(--text-color)' }}>Savollar</p>
                                <p className="font-black" style={{ color: 'var(--text-color)' }}>{currentQuestions.length} ta</p>
                            </div>
                        </div>

                        <div className="flex flex-col gap-3 w-full">
                            <button
                                onClick={() => { setView('LIST'); setSelectedQuiz(null); setResults(null); }}
                                className="w-full bg-indigo-600 text-white font-black py-5 rounded-[2rem] shadow-xl shadow-indigo-100 hover:scale-[1.02] active:scale-95 transition-all"
                            >
                                YANA URINISH
                            </button>
                            <button
                                onClick={() => navigate('/student/dashboard', { replace: true })}
                                className="w-full bg-slate-100 text-slate-600 font-black py-4 rounded-[1.5rem] hover:bg-slate-200 transition-all text-sm uppercase tracking-widest"
                            >
                                BOSH SAHIFA
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (view === 'SUMMARY') {
        return (
            <div className="min-h-screen font-sans p-6 transition-colors duration-500" style={{ backgroundColor: 'var(--bg-color)' }}>
                <div className="max-w-xl mx-auto h-full flex flex-col">
                    <div className="rounded-[3rem] p-8 shadow-xl border flex-1 flex flex-col transition-colors" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
                        <h2 className="text-3xl font-black mb-2 text-center" style={{ color: 'var(--text-color)' }}>Xulosa</h2>
                        <p className="font-bold text-xs uppercase tracking-widest mb-8 text-center italic opacity-40" style={{ color: 'var(--text-color)' }}>Javoblaringizni tekshiring</p>
                        
                        <div className="flex-1 overflow-y-auto space-y-3 pr-2 scroll-hide">
                            {currentQuestions.map((q, idx) => (
                                <button 
                                    key={idx} 
                                    onClick={() => goToQuestion(idx)} 
                                    className="w-full flex items-center justify-between p-5 rounded-2xl border transition-colors group hover:border-indigo-300" 
                                    style={{ backgroundColor: 'var(--bg-color)', borderColor: 'var(--border-color)' }}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black opacity-30 group-hover:opacity-100 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-all" style={{ backgroundColor: 'var(--card-bg)', color: 'var(--text-color)' }}>
                                            {idx + 1}
                                        </div>
                                        <div className="text-left">
                                            <p className="text-sm font-bold line-clamp-1" style={{ color: 'var(--text-color)' }}>{q.text}</p>
                                            <p className="text-[10px] font-black uppercase mt-0.5">
                                                {q.type === 'info-slide' 
                                                    ? <span className="text-blue-400">Mavzu</span> 
                                                    : answers[idx] !== undefined 
                                                        ? <span className="text-emerald-500">Javob berilgan</span> 
                                                        : <span className="text-orange-400">Javobsiz</span>}
                                            </p>
                                        </div>
                                    </div>
                                    <ChevronRight size={18} className="opacity-20 group-hover:opacity-100 transition-all" style={{ color: 'var(--text-color)' }} />
                                </button>
                            ))}
                        </div>

                         <div className="mt-8 space-y-3">
                            <button 
                                onClick={finalizeSubmission} 
                                disabled={isSubmitting} 
                                className="w-full py-6 rounded-[2rem] font-black text-2xl text-white shadow-xl bg-indigo-600 shadow-indigo-100 hover:scale-[1.02] active:scale-95 transition-all"
                            >
                                {isSubmitting ? "YUBORILMOQDA..." : "TESTNI TUGATISH"}
                            </button>
                            <button 
                                onClick={() => goToQuestion(currentIndex)} 
                                className="w-full font-bold text-xs uppercase opacity-40 hover:opacity-100 transition-all" 
                                style={{ color: 'var(--text-color)' }}
                            >
                                Savollarga qaytish
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (view === 'PLAYING' && currentQuestions.length > 0) {
        const question = currentQuestions[currentIndex];
        const playerAns = answers[currentIndex];

        const renderQuestionContent = () => {
            if (question.type === 'multiple-choice' || question.type === 'true-false') {
                return (
                    <div className="grid grid-cols-1 gap-4 w-full">
                        {question.options.map((opt, i) => (
                            <button
                                key={i}
                                onClick={() => saveAnswer(i)}
                                className={`p-6 rounded-[2rem] text-left font-bold text-lg border-2 transition-all active:scale-95
                                    ${Number(playerAns) === i 
                                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-lg shadow-indigo-100' 
                                        : 'border-slate-100 hover:border-indigo-200'}`}
                                style={{ backgroundColor: Number(playerAns) === i ? '' : 'var(--card-bg)', color: Number(playerAns) === i ? '' : 'var(--text-color)' }}
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-black transition-colors ${Number(playerAns) === i ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                                        {String.fromCharCode(65 + i)}
                                    </div>
                                    {opt}
                                </div>
                            </button>
                        ))}
                    </div>
                );
            }

            if (question.type === 'info-slide') {
                return (
                    <div className="text-center py-10 px-6 rounded-[3rem] bg-indigo-50/50 border-2 border-dashed border-indigo-200">
                        <Info size={48} className="text-indigo-600 mx-auto mb-6" />
                        <h3 className="text-2xl font-black text-slate-900 mb-4">{question.text}</h3>
                        <p className="text-slate-600 font-medium">{question.info}</p>
                    </div>
                );
            }

            // Text input based question
            return (
                <div className="w-full space-y-6">
                    <div className="p-8 rounded-[3rem] border-2 transition-colors border-indigo-100" style={{ backgroundColor: 'var(--card-bg)' }}>
                        <p className="text-center text-sm font-black uppercase tracking-widest opacity-40 mb-6" style={{ color: 'var(--text-color)' }}>Javobingizni yozing</p>
                        <input
                            type="text"
                            value={playerAns || ''}
                            onChange={(e) => saveAnswer(e.target.value)}
                            placeholder="Shu yerga yozing..."
                            className="w-full bg-transparent border-b-4 border-indigo-600 text-center text-2xl font-black py-4 focus:outline-none transition-all"
                            style={{ color: 'var(--text-color)' }}
                            autoFocus
                        />
                    </div>
                </div>
            );
        };

        return (
            <div className="min-h-screen font-sans p-6 transition-colors duration-500" style={{ backgroundColor: 'var(--bg-color)' }}>
                <div className="max-w-2xl mx-auto">
                    <header className="flex justify-between items-center mb-10">
                        <button 
                            onClick={() => setView('LIST')} 
                            className="p-3 rounded-2xl shadow-sm border transition-all hover:bg-slate-50" 
                            style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)', color: 'var(--text-color)' }}
                        >
                            <ChevronLeft size={24} />
                        </button>
                        <div className="text-center">
                            <h2 className="font-black text-sm opacity-40 uppercase tracking-widest" style={{ color: 'var(--text-color)' }}>{selectedQuiz.title}</h2>
                            <p className="font-black text-xl" style={{ color: 'var(--text-color)' }}>{currentIndex + 1} / {currentQuestions.length}</p>
                        </div>
                        <div className="flex flex-col items-center">
                            <div className={`flex items-center gap-2 px-4 py-2 rounded-2xl border-2 transition-all ${timeLeft !== null && timeLeft < 60 ? 'border-rose-500 bg-rose-50 text-rose-600 animate-pulse' : 'border-indigo-100 text-indigo-600'}`}>
                                <Clock size={20} />
                                <span className="font-black font-mono text-lg">{timeLeft !== null ? formatTime(timeLeft) : '0:00'}</span>
                            </div>
                        </div>
                        <button 
                            onClick={() => setView('SUMMARY')} 
                            className="p-3 rounded-2xl shadow-sm border transition-all hover:bg-slate-50" 
                            style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)', color: 'var(--text-color)' }}
                        >
                            <CheckCircle size={24} className="text-indigo-600" />
                        </button>
                    </header>

                    {/* Progress Bar */}
                    <div className="w-full h-3 bg-slate-100 rounded-full mb-12 overflow-hidden">
                        <motion.div 
                            className="h-full bg-indigo-600"
                            initial={{ width: 0 }}
                            animate={{ width: `${((currentIndex + 1) / currentQuestions.length) * 100}%` }}
                        />
                    </div>

                    <div className="mb-12">
                        {question.info && (
                            <div className="bg-amber-50 text-amber-800 p-4 rounded-2xl text-sm font-medium mb-6 flex gap-3">
                                <Info size={20} className="shrink-0" />
                                <p>{question.info}</p>
                            </div>
                        )}
                        <h1 className="text-3xl font-black mb-8 leading-tight text-center" style={{ color: 'var(--text-color)' }}>
                            {question.text}
                        </h1>
                        
                        <div className="mt-10">
                            {renderQuestionContent()}
                        </div>
                    </div>

                    <div className="fixed bottom-10 left-0 right-0 px-6 max-w-2xl mx-auto flex gap-4">
                        <button
                            disabled={currentIndex === 0}
                            onClick={() => setCurrentIndex(prev => prev - 1)}
                            className="flex-1 bg-white border-2 border-slate-200 text-slate-400 font-black py-4 rounded-2xl disabled:opacity-30 transition-all hover:bg-slate-50 flex items-center justify-center gap-2 shadow-lg"
                        >
                            <ChevronLeft size={20} /> ORQAGA
                        </button>
                        {currentIndex === currentQuestions.length - 1 ? (
                            <button
                                onClick={() => setView('SUMMARY')}
                                className="flex-[2] bg-indigo-600 text-white font-black py-4 rounded-2xl shadow-lg shadow-indigo-100 hover:scale-[1.02] active:scale-95 transition-all text-xl"
                            >
                                TUGATISH
                            </button>
                        ) : (
                            <button
                                onClick={() => setCurrentIndex(prev => prev + 1)}
                                className="flex-[2] bg-indigo-600 text-white font-black py-4 rounded-2xl shadow-lg shadow-indigo-100 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 text-xl"
                            >
                                KEYINGISI <ChevronRight size={20} />
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen font-sans pb-10 transition-colors duration-500" style={{ backgroundColor: 'var(--bg-color)' }}>
            <div className="max-w-5xl mx-auto px-6 pt-10">
                <header className="flex justify-between items-center mb-12">
                    <div>
                        <h1 className="text-4xl font-black text-slate-900 flex items-center gap-4">
                            <Zap className="text-indigo-600 fill-indigo-600" size={40} /> Mashqlar
                        </h1>
                        <p className="text-slate-500 font-bold mt-2 uppercase tracking-widest text-sm">O'zingizni sinab ko'ring</p>
                    </div>
                    <div className="flex gap-4">
                        <div className="p-4 bg-indigo-50 rounded-3xl flex items-center gap-3">
                            <Coins size={24} className="text-indigo-600" />
                            <span className="font-black text-indigo-700">{(user as any)?.coins || 0}</span>
                        </div>
                    </div>
                </header>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 opacity-30">
                        <div className="w-16 h-16 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin mb-6"></div>
                        <p className="font-black uppercase tracking-widest">Yuklanmoqda...</p>
                    </div>
                ) : quizzes.length === 0 ? (
                    <div className="text-center py-20 px-10 rounded-[3rem] border-4 border-dashed border-slate-100">
                        <BookOpen size={64} className="text-slate-200 mx-auto mb-6" />
                        <h2 className="text-2xl font-black text-slate-400">Hozircha mashqlar mavjud emas</h2>
                        <p className="text-slate-300 font-medium mt-2">O'qituvchingiz yangi mashqlar qo'shishini kuting</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {quizzes.map((quiz) => (
                            <div 
                                key={quiz.id}
                                className="group bg-white rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-indigo-50 transition-all cursor-pointer overflow-hidden flex flex-col"
                                onClick={() => handleStartNormal(quiz)}
                            >
                                <div className="p-8 flex-1">
                                    <div className="flex justify-between items-start mb-6">
                                        <div className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl group-hover:scale-110 transition-transform">
                                            <Zap size={24} className="fill-indigo-600" />
                                        </div>
                                        <span className="px-4 py-1.5 bg-slate-50 text-slate-500 text-[10px] font-black uppercase tracking-widest rounded-full">
                                            Level {quiz.level || quiz.daraja || 'Any'}
                                        </span>
                                    </div>
                                    <h3 className="text-2xl font-black text-slate-900 mb-4 line-clamp-2">{quiz.title}</h3>
                                    <div className="flex items-center gap-6 mt-6 pt-6 border-t border-slate-50 opacity-50">
                                        <div className="flex items-center gap-2">
                                            <BookOpen size={16} />
                                            <span className="text-sm font-bold">{typeof quiz.questions === 'string' ? JSON.parse(quiz.questions).length : (quiz.questions?.length || 0)} savol</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Clock size={16} />
                                            <span className="text-sm font-bold">{quiz.time_limit || 20} min</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="p-4 px-8 bg-slate-50/50 group-hover:bg-indigo-600 transition-colors flex items-center justify-between">
                                    <span className="text-xs font-black uppercase tracking-widest text-slate-400 group-hover:text-white transition-colors">Start Practice</span>
                                    <ChevronRight size={20} className="text-slate-300 group-hover:text-white transition-colors" />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
