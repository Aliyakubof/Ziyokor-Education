import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiFetch } from '../api';
import { PlusCircle, Edit2, Trash2, ArrowLeft, Save, FileQuestion, Clock } from 'lucide-react';

interface VocabQuestion {
    info?: string;
    text: string;
    options: string[];
    correctIndex: number;
    timeLimit: number;
    type?: 'multiple-choice' | 'vocabulary';
    acceptedAnswers?: string[];
}

export default function CreateVocabBattle() {
    const navigate = useNavigate();
    const { id } = useParams();
    const [title, setTitle] = useState('');
    const [daraja, setDaraja] = useState('Beginner');
    const [level, setLevel] = useState('1');

    const [questions, setQuestions] = useState<VocabQuestion[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    // Form states
    const [qType, setQType] = useState<'multiple-choice' | 'vocabulary'>('multiple-choice');
    const [qText, setQText] = useState('');
    const [opts, setOpts] = useState(['', '', '', '']);
    const [correctIdx, setCorrectIdx] = useState(0);
    const [acceptedAnswers, setAcceptedAnswers] = useState('');
    const [qTimeLimit, setQTimeLimit] = useState(15); // Default 15 sec per word
    const [editingIdx, setEditingIdx] = useState<number | null>(null);

    useEffect(() => {
        if (id) fetchBattle();
    }, [id]);

    const fetchBattle = async () => {
        try {
            const res = await apiFetch(`/api/admin/vocab-battles/${id}`);
            if (res.ok) {
                const data = await res.json();
                setTitle(data.title || '');
                setDaraja(data.daraja);
                setLevel(String(data.level));
                setQuestions(typeof data.questions === 'string' ? JSON.parse(data.questions) : (data.questions || []));
            }
        } catch (error) {
            console.error(error);
        }
    };

    const editQuestion = (index: number) => {
        const q = questions[index];
        setQType(q.type || 'multiple-choice');
        setQText(q.text || '');
        setOpts(q.options && q.options.length ? q.options : ['', '', '', '']);
        setCorrectIdx(q.correctIndex || 0);
        setAcceptedAnswers(q.acceptedAnswers ? q.acceptedAnswers.join('+') : '');
        setQTimeLimit(q.timeLimit ?? 15);
        setEditingIdx(index);
    };

    const addQuestion = () => {
        if (!qText.trim()) return alert("So'zni kiriting");
        
        if (qType === 'multiple-choice') {
            if (opts.some(o => !o.trim())) return alert("Barcha variantlarni to'ldiring");
        } else if (qType === 'vocabulary') {
            if (!acceptedAnswers.trim()) return alert("To'g'ri so'zni kiriting");
        }

        const answersList = acceptedAnswers.split('+').map(a => a.trim()).filter(a => a);

        const newQuestion: VocabQuestion = {
            text: qText,
            options: qType === 'multiple-choice' ? [...opts] : [],
            correctIndex: qType === 'multiple-choice' ? correctIdx : -1,
            timeLimit: isNaN(Number(qTimeLimit)) ? 15 : Number(qTimeLimit),
            type: qType,
            acceptedAnswers: qType === 'vocabulary' ? answersList : []
        };

        if (editingIdx !== null) {
            const newQuestions = [...questions];
            newQuestions[editingIdx] = newQuestion;
            setQuestions(newQuestions);
            setEditingIdx(null);
        } else {
            setQuestions([...questions, newQuestion]);
        }

        // Reset
        setQType('multiple-choice');
        setQText('');
        setOpts(['', '', '', '']);
        setCorrectIdx(0);
        setAcceptedAnswers('');
        setQTimeLimit(15);
    };

    const removeQuestion = (index: number) => {
        setQuestions(questions.filter((_, i) => i !== index));
    };

    const saveBattle = async () => {
        if (questions.length === 0) return alert("Kamida 1 ta savol qo'shing");
        if (isSaving) return;

        setIsSaving(true);
        try {
            const url = id ? `/api/admin/vocab-battles/${id}` : '/api/admin/vocab-battles';
            const method = id ? 'PUT' : 'POST';

            const res = await apiFetch(url, {
                method,
                body: JSON.stringify({
                    title,
                    daraja,
                    level: Number(level),
                    questions
                })
            });

            if (res.ok) {
                alert("Muvaffaqiyatli saqlandi!");
                navigate('/admin/vocab-battles');
            } else {
                const err = await res.json();
                alert(err.error || "Xatolik");
            }
        } catch (err) {
            console.error(err);
            alert("Saqlashda xatolik");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="min-h-screen p-8 bg-slate-50">
            <div className="max-w-6xl mx-auto space-y-8">
                <header className="flex justify-between items-center mb-8">
                    <button
                        onClick={() => navigate('/admin/vocab-battles')}
                        className="flex items-center gap-2 font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
                    >
                        <ArrowLeft size={20} /> Orqaga
                    </button>
                    <div className="bg-white px-6 py-2 rounded-2xl border border-slate-200 shadow-sm font-black text-indigo-600 tracking-widest uppercase flex items-center gap-2">
                        <FileQuestion size={18} /> {id ? 'Tahrirlash' : 'Yangi Level'}
                    </div>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Left: Editor */}
                    <div className="lg:col-span-7 space-y-8">
                        <section className="bg-white rounded-[2.5rem] p-8 border border-slate-200 shadow-sm">
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Sarlavha (Ixtiyoriy)</label>
                                    <input
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                                        placeholder="Masalan: Fruits & Vegetables"
                                        value={title}
                                        onChange={e => setTitle(e.target.value)}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Daraja</label>
                                        <select
                                            value={daraja}
                                            onChange={(e) => setDaraja(e.target.value)}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-slate-900 font-bold outline-none cursor-pointer"
                                        >
                                            <option value="Beginner">Beginner</option>
                                            <option value="Elementary">Elementary</option>
                                            <option value="Pre-Intermediate">Pre-Intermediate</option>
                                            <option value="Intermediate">Intermediate</option>
                                            <option value="Advanced">Advanced</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Level (Raqam)</label>
                                        <input
                                            type="number"
                                            min="1"
                                            value={level}
                                            onChange={(e) => setLevel(e.target.value)}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-slate-900 font-bold outline-none"
                                        />
                                    </div>
                                </div>

                                {/* Add Question Box */}
                                <div className="bg-indigo-50/50 border border-indigo-100 p-6 rounded-[2rem] space-y-6 mt-8">
                                    <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                                        <PlusCircle className="text-indigo-600" />
                                        {editingIdx !== null ? 'Savolni Tahrirlash' : 'So\'z Qo\'shish'}
                                    </h3>

                                    <div className="flex bg-white rounded-xl p-1 border border-slate-200">
                                        <button
                                            onClick={() => setQType('multiple-choice')}
                                            className={`p-2 px-4 rounded-lg transition-all font-bold text-sm ${qType === 'multiple-choice' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                                        >
                                            Test (4 variant)
                                        </button>
                                        <button
                                            onClick={() => setQType('vocabulary')}
                                            className={`p-2 px-4 rounded-lg transition-all font-bold text-sm ${qType === 'vocabulary' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                                        >
                                            Yozish (Kataklar)
                                        </button>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">So'z (Masalan: Apple)</label>
                                            <input
                                                className="w-full bg-white border border-slate-200 rounded-2xl px-6 py-4 text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                                                placeholder="So'zni kiriting"
                                                value={qText}
                                                onChange={e => setQText(e.target.value)}
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 flex items-center gap-1">
                                                <Clock size={12} /> Taymer (Soniyada)
                                            </label>
                                            <input
                                                type="number"
                                                className="w-full bg-white border border-slate-200 rounded-2xl px-6 py-4 text-slate-900 font-bold focus:outline-none"
                                                placeholder="15"
                                                value={qTimeLimit}
                                                onChange={e => setQTimeLimit(Number(e.target.value))}
                                            />
                                            <p className="text-xs text-slate-500 ml-4">Ushbu savol uchun qancha vaqt beriladi?</p>
                                        </div>

                                        {qType === 'multiple-choice' && (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {opts.map((opt, i) => (
                                                    <div key={i} className="relative flex items-center">
                                                        <input
                                                            className={`w-full bg-white border-2 rounded-2xl px-6 py-4 text-slate-900 font-medium focus:outline-none pr-14
                                                                ${correctIdx === i ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200'}
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
                                                            className={`absolute right-4 p-2 rounded-lg font-bold text-xs ${correctIdx === i ? 'text-emerald-600 bg-emerald-200' : 'text-slate-400 hover:bg-slate-100'}`}
                                                        >
                                                            TO'G'RI
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {qType === 'vocabulary' && (
                                            <div className="space-y-2 mt-4">
                                                <label className="text-[10px] font-black text-emerald-500 uppercase tracking-widest ml-4">To'g'ri so'z</label>
                                                <input
                                                    className="w-full bg-emerald-50 border-2 border-emerald-200 rounded-2xl px-6 py-4 text-emerald-900 font-bold focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20"
                                                    placeholder="Masalan: apple (Ingliz tilida, bo'sh joysiz bo'lishi tavsiya qilinadi)"
                                                    value={acceptedAnswers}
                                                    onChange={e => setAcceptedAnswers(e.target.value)}
                                                />
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex justify-end gap-2 mt-4">
                                        {editingIdx !== null && (
                                            <button
                                                onClick={() => {
                                                    setEditingIdx(null); setQType('multiple-choice'); setQText(''); setOpts(['', '', '', '']); setAcceptedAnswers(''); setQTimeLimit(15);
                                                }}
                                                className="px-6 py-3 font-bold text-slate-500 hover:bg-slate-200 rounded-xl"
                                            >
                                                Bekor qilish
                                            </button>
                                        )}
                                        <button
                                            onClick={addQuestion}
                                            className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-xl shadow-lg shadow-indigo-500/20"
                                        >
                                            {editingIdx !== null ? 'Saqlash' : 'Qo\'shish'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </section>
                    </div>

                    {/* Right: List & Save */}
                    <div className="lg:col-span-5 space-y-6">
                        <section className="bg-white rounded-[2.5rem] p-8 border border-slate-200 shadow-sm sticky top-8">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-black text-slate-900 tracking-tight">Savollar ro'yxati</h3>
                                <div className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-lg text-sm font-bold">
                                    {questions.length} / 30
                                </div>
                            </div>

                            <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
                                {questions.map((q, i) => (
                                    <div key={i} className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-2xl hover:border-indigo-200 transition-colors group">
                                        <div className="flex-1 min-w-0 pr-4">
                                            <div className="text-xs font-bold text-slate-400 mb-1">
                                                {i + 1}. ({q.timeLimit}s) - <span className="text-indigo-400">{q.type === 'vocabulary' ? 'Yozish' : 'Test'}</span>
                                            </div>
                                            <div className="font-bold text-slate-800 truncate">{q.text}</div>
                                            {q.type === 'vocabulary' && q.acceptedAnswers && q.acceptedAnswers.length > 0 && (
                                                <div className="text-xs font-bold text-emerald-500 mt-1">Javob: {q.acceptedAnswers[0]}</div>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => editQuestion(i)} className="p-2 text-indigo-600 hover:bg-indigo-100 rounded-lg">
                                                <Edit2 size={16} />
                                            </button>
                                            <button onClick={() => removeQuestion(i)} className="p-2 text-red-500 hover:bg-red-100 rounded-lg">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                {questions.length === 0 && (
                                    <div className="text-center py-8 text-slate-400 font-bold border-2 border-dashed border-slate-200 rounded-2xl">
                                        Hali savollar yo'q
                                    </div>
                                )}
                            </div>

                            <button
                                onClick={saveBattle}
                                disabled={isSaving || questions.length === 0}
                                className="w-full mt-6 py-4 bg-green-500 hover:bg-green-400 disabled:bg-slate-200 disabled:text-slate-400 text-white font-black rounded-2xl text-lg shadow-lg shadow-green-500/20 transition-all flex items-center justify-center gap-2"
                            >
                                <Save size={24} /> {isSaving ? 'Saqlanmoqda...' : 'BARCHASINI SAQLASH'}
                            </button>
                        </section>
                    </div>
                </div>
            </div>
        </div>
    );
}
