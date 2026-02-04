import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../api';
import { PlusCircle, Save, ArrowLeft, Trash2, HelpCircle, Clock, CheckCircle2 } from 'lucide-react';

interface QuestionDraft {
    text: string;
    options: [string, string, string, string];
    correctIndex: number;
    timeLimit: number;
}

export default function CreateQuiz() {
    const navigate = useNavigate();
    const [title, setTitle] = useState('');
    const [questions, setQuestions] = useState<QuestionDraft[]>([]);

    const [qText, setQText] = useState('');
    const [opts, setOpts] = useState(['', '', '', '']);
    const [correctIdx, setCorrectIdx] = useState(0);
    const [time, setTime] = useState(20);

    const addQuestion = () => {
        if (!qText || opts.some(o => !o)) return alert("Barcha maydonlarni to'ldiring");
        setQuestions([...questions, {
            text: qText,
            options: [opts[0], opts[1], opts[2], opts[3]] as [string, string, string, string],
            correctIndex: correctIdx,
            timeLimit: time
        }]);
        setQText('');
        setOpts(['', '', '', '']);
        setCorrectIdx(0);
        setTime(20);
    };

    const removeQuestion = (index: number) => {
        setQuestions(questions.filter((_, i) => i !== index));
    };

    const saveQuiz = async () => {
        if (!title || questions.length === 0) return alert("Sarlavha va kamida bitta savol qo'shing");
        try {
            const res = await apiFetch('/api/quizzes', {
                method: 'POST',
                body: JSON.stringify({ title, questions })
            });
            const data = await res.json();
            navigate(`/host/${data.id}`);
        } catch (err) {
            console.error(err);
            alert("Saqlashda xatolik yuz berdi");
        }
    };

    return (
        <div className="min-h-screen p-8 relative overflow-hidden">
            <div className="max-w-5xl mx-auto">
                <header className="flex justify-between items-center mb-12">
                    <button
                        onClick={() => navigate('/')}
                        className="flex items-center gap-2 text-slate-400 hover:text-white transition-all hover:translate-x-[-4px]"
                    >
                        <ArrowLeft size={20} /> Orqaga
                    </button>

                    <div className="glass px-6 py-2 rounded-2xl border-slate-700/30">
                        <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Yangi Quiz Yaratish</span>
                    </div>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Left: Editor */}
                    <div className="lg:col-span-7 space-y-8">
                        <section className="glass rounded-[2.5rem] p-8 border-slate-700/30">
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4">Quiz Sarlavhasi</label>
                                    <input
                                        className="w-full bg-slate-950/40 border border-slate-700/50 rounded-2xl px-6 py-4 text-white font-bold text-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-slate-700"
                                        placeholder="Masalan: General English Unit 1"
                                        value={title}
                                        onChange={e => setTitle(e.target.value)}
                                    />
                                </div>

                                <div className="glass-blue border-transparent p-6 rounded-[2rem] space-y-6">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-blue-500/10 p-2 rounded-xl">
                                            <PlusCircle className="text-blue-400" size={24} />
                                        </div>
                                        <h3 className="text-xl font-black text-white tracking-tight">Savol Qo'shish</h3>
                                    </div>

                                    <div className="space-y-4">
                                        <textarea
                                            className="w-full bg-slate-950/40 border border-slate-700/50 rounded-2xl px-6 py-4 text-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-slate-700 min-h-[100px] resize-none"
                                            placeholder="Savol matnini kiriting..."
                                            value={qText}
                                            onChange={e => setQText(e.target.value)}
                                        />

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {opts.map((opt, i) => (
                                                <div key={i} className={`relative flex items-center group transition-all`}>
                                                    <input
                                                        className={`w-full bg-slate-950/40 border-2 rounded-2xl px-6 py-4 text-white font-medium focus:outline-none transition-all placeholder:text-slate-700 pr-14
                                                            ${correctIdx === i ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-slate-800 hover:border-slate-600'}
                                                        `}
                                                        placeholder={`Variant ${i + 1}`}
                                                        value={opt}
                                                        onChange={e => {
                                                            const newOpts = [...opts];
                                                            newOpts[i] = e.target.value;
                                                            setOpts(newOpts);
                                                        }}
                                                    />
                                                    <button
                                                        onClick={() => setCorrectIdx(i)}
                                                        className={`absolute right-4 p-2 rounded-lg transition-all ${correctIdx === i ? 'text-emerald-500 bg-emerald-500/10' : 'text-slate-700 hover:text-slate-400'}`}
                                                    >
                                                        <CheckCircle2 size={24} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="flex items-center justify-between gap-4 pt-4">
                                            <div className="flex items-center gap-4">
                                                <div className="flex items-center gap-2 bg-slate-950/40 border border-slate-700/50 rounded-xl px-4 py-2">
                                                    <Clock className="text-slate-500" size={18} />
                                                    <input
                                                        type="number"
                                                        value={time}
                                                        onChange={e => setTime(parseInt(e.target.value))}
                                                        className="w-12 bg-transparent text-white font-bold outline-none"
                                                    />
                                                    <span className="text-[10px] font-black text-slate-600 uppercase">sek</span>
                                                </div>
                                            </div>

                                            <button
                                                onClick={addQuestion}
                                                className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-xl font-black transition-all btn-premium shadow-lg shadow-blue-500/20"
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
                        <section className="glass rounded-[2.5rem] p-8 border-slate-700/30 flex flex-col h-full max-h-[700px]">
                            <div className="flex items-center justify-between mb-8">
                                <div className="flex items-center gap-3">
                                    <div className="bg-emerald-500/10 p-2 rounded-xl">
                                        <HelpCircle className="text-emerald-400" size={24} />
                                    </div>
                                    <h3 className="text-xl font-black text-white tracking-tight">Savollar Ro'yxati</h3>
                                </div>
                                <div className="bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-xl text-xs font-black">
                                    {questions.length}
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar mb-8">
                                {questions.map((q, i) => (
                                    <div key={i} className="glass-blue border-transparent p-4 rounded-2xl flex items-center justify-between group">
                                        <div className="flex items-center gap-4 truncate">
                                            <span className="text-blue-500 font-black text-xs">#{i + 1}</span>
                                            <p className="text-white font-bold text-sm truncate">{q.text}</p>
                                        </div>
                                        <button
                                            onClick={() => removeQuestion(i)}
                                            className="text-slate-700 hover:text-red-500 transition-colors p-2"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                ))}

                                {questions.length === 0 && (
                                    <div className="h-40 flex flex-col items-center justify-center text-slate-700 text-center gap-4">
                                        <PlusCircle size={32} className="opacity-10" />
                                        <p className="text-xs font-bold uppercase tracking-widest">Hali savollar yo'q</p>
                                    </div>
                                )}
                            </div>

                            <button
                                onClick={saveQuiz}
                                disabled={!title || questions.length === 0}
                                className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-600 text-white text-xl font-black py-5 rounded-2xl transition-all shadow-xl shadow-emerald-500/10 btn-premium flex items-center justify-center gap-3"
                            >
                                <Save size={24} />
                                SAQLASH VA LOBBYGA O'TISH
                            </button>
                        </section>
                    </div>
                </div>
            </div>
        </div>
    );
}
