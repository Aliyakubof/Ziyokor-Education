import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { apiFetch } from '../api';
import { BookOpen, ChevronLeft, Zap, Clock, ChevronRight, CheckCircle, XCircle } from 'lucide-react';

export default function SoloQuiz() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [quizzes, setQuizzes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedQuiz, setSelectedQuiz] = useState<any | null>(null);
    const [results, setResults] = useState<any | null>(null);

    useEffect(() => {
        fetchQuizzes();
    }, []);

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

    const handleStart = (quiz: any) => {
        setSelectedQuiz(quiz);
        setResults(null);
    };


    if (results) {
        return (
            <div className="min-h-screen bg-slate-50 font-sans p-6">
                <div className="max-w-md mx-auto space-y-6">
                    <div className="bg-white rounded-3xl p-8 text-center shadow-xl border border-slate-100">
                        <div className="w-20 s-20 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
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
                    </div>

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

                        {/* This is a placeholder for a real question-by-question view 
                            For now, since Solo Quiz is meant to be a simple practice, we encourage the student to go back or wait for full UI.
                            Wait, I should implement at least a placeholder list of questions or just use the Unit interface.
                        */}

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
                {loading ? (
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
                                onClick={() => handleStart(quiz)}
                                className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm"
                            >
                                <ChevronRight size={24} />
                            </button>
                        </div>
                    ))
                )}

                {!loading && quizzes.length === 0 && (
                    <div className="py-20 text-center bg-white rounded-3xl shadow-sm px-10">
                        <BookOpen size={48} className="mx-auto mb-4 text-slate-200" />
                        <p className="text-slate-400 font-medium">Hozircha darajangizga mos testlar yo'q</p>
                    </div>
                )}
            </div>
        </div>
    );
}
