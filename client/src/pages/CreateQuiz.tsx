import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../api';
import { PlusCircle, Save, ArrowLeft, Trash2, HelpCircle, CheckCircle2, FileQuestion, Type, List, AlertCircle, PenTool, XCircle } from 'lucide-react';

interface QuestionDraft {
    text: string;
    options: string[];
    correctIndex: number;
    timeLimit: number;
    type: 'multiple-choice' | 'text-input' | 'true-false' | 'fill-blank' | 'find-mistake' | 'rewrite';
    acceptedAnswers: string[];
}

export default function CreateQuiz() {
    const navigate = useNavigate();
    const [title, setTitle] = useState('');
    const [level, setLevel] = useState('Beginner');
    const [unit, setUnit] = useState('1');
    const [timeLimit] = useState(30); // Default 30 minutes

    const [questions, setQuestions] = useState<QuestionDraft[]>([]);

    const [qText, setQText] = useState('');
    const [qType, setQType] = useState<'multiple-choice' | 'text-input' | 'true-false' | 'fill-blank' | 'find-mistake' | 'rewrite'>('multiple-choice');
    const [opts, setOpts] = useState(['', '', '', '']);
    const [correctIdx, setCorrectIdx] = useState(0);
    const [acceptedAnswers, setAcceptedAnswers] = useState('');

    const addQuestion = () => {
        if (!qText) return alert("Savol matnini kiriting");

        if (qType === 'multiple-choice') {
            if (opts.some(o => !o)) return alert("Barcha variantlarni to'ldiring");
            setQuestions([...questions, {
                text: qText,
                options: opts,
                correctIndex: correctIdx,
                timeLimit: 0, // No time limit for unit quizzes
                type: 'multiple-choice',
                acceptedAnswers: []
            }]);
        } else if (qType === 'true-false') {
            setQuestions([...questions, {
                text: qText,
                options: ["To'g'ri", "Noto'g'ri"],
                correctIndex: correctIdx, // 0 for True, 1 for False
                timeLimit: 0,
                type: 'true-false',
                acceptedAnswers: []
            }]);
        } else {
            // text-input, fill-blank, find-mistake, rewrite
            if (!acceptedAnswers.trim()) return alert("To'g'ri javoblarni kiriting");
            const answersList = acceptedAnswers.split(',').map(a => a.trim()).filter(a => a);
            setQuestions([...questions, {
                text: qText,
                options: [],
                correctIndex: -1,
                timeLimit: 0,
                type: qType,
                acceptedAnswers: answersList
            }]);
        }

        // Reset form
        setQText('');
        setOpts(['', '', '', '']);
        setCorrectIdx(0);
        setAcceptedAnswers('');
        setQType('multiple-choice');
    };

    const removeQuestion = (index: number) => {
        setQuestions(questions.filter((_, i) => i !== index));
    };

    const saveQuiz = async () => {
        if (!title || questions.length === 0) return alert("Sarlavha va kamida bitta savol qo'shing");
        try {
            const res = await apiFetch('/api/unit-quizzes', {
                method: 'POST',
                body: JSON.stringify({
                    title,
                    level,
                    unit,
                    time_limit: timeLimit,
                    questions
                })
            });
            const data = await res.json();
            if (res.ok) {
                navigate(`/admin`); // Go back to admin panel
            } else {
                throw new Error(data.error || 'Xatolik');
            }
        } catch (err) {
            console.error(err);
            alert("Saqlashda xatolik yuz berdi");
        }
    };

    return (
        <div className="min-h-screen p-8 relative overflow-hidden bg-transparent">
            <div className="max-w-6xl mx-auto">
                <header className="flex justify-between items-center mb-12">
                    <button
                        onClick={() => navigate('/admin')}
                        className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 transition-all hover:translate-x-[-4px]"
                    >
                        <ArrowLeft size={20} /> Admin Panelga Qaytish
                    </button>

                    <div className="bg-white px-6 py-2 rounded-2xl border border-slate-200 shadow-sm">
                        <span className="text-xs font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2">
                            <FileQuestion size={16} /> Unit Quiz Yaratish
                        </span>
                    </div>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Left: Editor */}
                    <div className="lg:col-span-7 space-y-8">
                        <section className="bg-white rounded-[2.5rem] p-8 border border-slate-200 shadow-xl shadow-slate-200/50">
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Quiz Sarlavhasi</label>
                                    <input
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-slate-900 font-bold text-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all placeholder:text-slate-400"
                                        placeholder="Masalan: General English Unit 1"
                                        value={title}
                                        onChange={e => setTitle(e.target.value)}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Level</label>
                                        <select
                                            value={level}
                                            onChange={(e) => setLevel(e.target.value)}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-slate-900 font-bold outline-none cursor-pointer"
                                        >
                                            <option value="Beginner">Beginner</option>
                                            <option value="Elementary">Elementary</option>
                                            <option value="Intermediate">Intermediate</option>
                                            <option value="Advanced">Advanced</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Unit</label>
                                        <input
                                            value={unit}
                                            onChange={(e) => setUnit(e.target.value)}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-slate-900 font-bold outline-none"
                                            placeholder="1"
                                        />
                                    </div>
                                </div>

                                <div className="bg-indigo-50/50 border border-indigo-100 p-6 rounded-[2rem] space-y-6">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="bg-indigo-100 p-2 rounded-xl">
                                                <PlusCircle className="text-indigo-600" size={24} />
                                            </div>
                                            <h3 className="text-xl font-black text-slate-900 tracking-tight">Add Question</h3>
                                        </div>

                                        <div className="flex bg-white rounded-xl p-1 border border-slate-200">
                                            <button
                                                onClick={() => setQType('multiple-choice')}
                                                className={`p-2 rounded-lg transition-all ${qType === 'multiple-choice' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                                                title="Multiple Choice"
                                            >
                                                <List size={20} />
                                            </button>
                                            <button
                                                onClick={() => setQType('true-false')}
                                                className={`p-2 rounded-lg transition-all ${qType === 'true-false' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                                                title="True/False"
                                            >
                                                <CheckCircle2 size={20} />
                                            </button>
                                            <button
                                                onClick={() => setQType('text-input')}
                                                className={`p-2 rounded-lg transition-all ${qType === 'text-input' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                                                title="Type Answer"
                                            >
                                                <Type size={20} />
                                            </button>
                                            <button
                                                onClick={() => setQType('fill-blank')}
                                                className={`p-2 rounded-lg transition-all ${qType === 'fill-blank' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                                                title="Fill in the Blank"
                                            >
                                                <span className="font-bold text-xs">...</span>
                                            </button>
                                            <button
                                                onClick={() => setQType('find-mistake')}
                                                className={`p-2 rounded-lg transition-all ${qType === 'find-mistake' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                                                title="Find Mistake"
                                            >
                                                <AlertCircle size={20} />
                                            </button>
                                            <button
                                                onClick={() => setQType('rewrite')}
                                                className={`p-2 rounded-lg transition-all ${qType === 'rewrite' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                                                title="Rewrite Sentence"
                                            >
                                                <PenTool size={20} />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <textarea
                                            className="w-full bg-white border border-slate-200 rounded-2xl px-6 py-4 text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all placeholder:text-slate-400 min-h-[100px] resize-none"
                                            placeholder="Enter question text..."
                                            value={qText}
                                            onChange={e => setQText(e.target.value)}
                                        />

                                        {qType === 'multiple-choice' && (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {opts.map((opt, i) => (
                                                    <div key={i} className={`relative flex items-center group transition-all`}>
                                                        <input
                                                            className={`w-full bg-white border-2 rounded-2xl px-6 py-4 text-slate-900 font-medium focus:outline-none transition-all placeholder:text-slate-400 pr-14
                                                                ${correctIdx === i ? 'border-emerald-500/50 bg-emerald-50' : 'border-slate-200 hover:border-slate-300'}
                                                            `}
                                                            placeholder={`Option ${i + 1}`}
                                                            value={opt}
                                                            onChange={e => {
                                                                const newOpts = [...opts];
                                                                newOpts[i] = e.target.value;
                                                                setOpts(newOpts);
                                                            }}
                                                        />
                                                        <button
                                                            onClick={() => setCorrectIdx(i)}
                                                            className={`absolute right-4 p-2 rounded-lg transition-all ${correctIdx === i ? 'text-emerald-500 bg-emerald-100' : 'text-slate-400 hover:text-slate-600'}`}
                                                        >
                                                            <CheckCircle2 size={24} />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {qType === 'true-false' && (
                                            <div className="grid grid-cols-2 gap-4">
                                                {["True", "False"].map((opt, i) => (
                                                    <div
                                                        key={i}
                                                        onClick={() => setCorrectIdx(i)}
                                                        className={`
                                                            cursor-pointer rounded-2xl px-6 py-6 text-center font-bold text-lg border-2 transition-all flex items-center justify-center gap-3
                                                            ${correctIdx === i
                                                                ? (i === 0 ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-red-500 bg-red-50 text-red-600')
                                                                : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'}
                                                        `}
                                                    >
                                                        {i === 0 ? <CheckCircle2 /> : <XCircle />}
                                                        {opt}
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {['text-input', 'fill-blank', 'find-mistake', 'rewrite'].includes(qType) && (
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">
                                                    {qType === 'fill-blank' ? "Correct Answer (missing word)" :
                                                        qType === 'find-mistake' ? "Mistake Word (or corrected version)" :
                                                            qType === 'rewrite' ? "Full Correct Sentence" :
                                                                "Correct Answers (comma separated)"}
                                                </label>
                                                <textarea
                                                    className="w-full bg-white border border-slate-200 rounded-2xl px-6 py-4 text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all placeholder:text-slate-400 min-h-[80px]"
                                                    placeholder="Masalan: apple, an apple, the apple"
                                                    value={acceptedAnswers}
                                                    onChange={e => setAcceptedAnswers(e.target.value)}
                                                />
                                                <p className="text-xs text-slate-400 ml-4">Student answer matching any of these will be correct.</p>
                                            </div>
                                        )}

                                        <div className="flex items-center justify-between gap-4 pt-4">
                                            <div className="flex items-center gap-4">
                                                {/* Time input removed */}
                                            </div>

                                            <button
                                                onClick={addQuestion}
                                                className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3 rounded-xl font-black transition-all btn-premium shadow-lg shadow-indigo-500/20"
                                            >
                                                SAVOLNI QO'SHISH
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>
                    </div>

                    {/* Right: Summary & Save */}
                    <div className="lg:col-span-5 space-y-8">
                        <section className="bg-white rounded-[2.5rem] p-8 border border-slate-200 shadow-xl shadow-slate-200/50 flex flex-col h-full max-h-[700px]">
                            <div className="flex items-center justify-between mb-8">
                                <div className="flex items-center gap-3">
                                    <div className="bg-emerald-50 p-2 rounded-xl">
                                        <HelpCircle className="text-emerald-500" size={24} />
                                    </div>
                                    <h3 className="text-xl font-black text-slate-900 tracking-tight">Savollar Ro'yxati</h3>
                                </div>
                                <div className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-xl text-xs font-black">
                                    {questions.length}
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar mb-8">
                                {questions.map((q, i) => (
                                    <div key={i} className="bg-slate-50 border border-slate-100 p-4 rounded-2xl flex items-center justify-between group hover:border-slate-200 transition-all">
                                        <div className="flex items-center gap-4 truncate">
                                            <span className="text-indigo-500 font-black text-xs">#{i + 1}</span>
                                            <div className="truncate">
                                                <p className="text-slate-700 font-bold text-sm truncate">{q.text}</p>
                                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                                    {q.type}
                                                </span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => removeQuestion(i)}
                                            className="text-slate-400 hover:text-red-500 transition-colors p-2"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                ))}

                                {questions.length === 0 && (
                                    <div className="h-40 flex flex-col items-center justify-center text-slate-400 text-center gap-4">
                                        <PlusCircle size={32} className="opacity-20" />
                                        <p className="text-xs font-bold uppercase tracking-widest">Hali savollar yo'q</p>
                                    </div>
                                )}
                            </div>

                            <button
                                onClick={saveQuiz}
                                disabled={!title || questions.length === 0}
                                className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-200 disabled:text-slate-400 text-white text-xl font-black py-5 rounded-2xl transition-all shadow-xl shadow-emerald-500/10 btn-premium flex items-center justify-center gap-3"
                            >
                                <Save size={24} />
                                SAQLASH
                            </button>
                        </section>
                    </div>
                </div>
            </div >
        </div >
    );
}
