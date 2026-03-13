import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, ArrowLeft, Save, Edit2, CheckCircle2 } from 'lucide-react';
import { apiFetch } from '../api';
import { useAuth } from '../AuthContext';

interface TelegramQuestion {
    id: string;
    text: string;
    options: string[];
    correct_index: number;
    level: string;
}

const ManageTelegramQuestions = () => {
    const navigate = useNavigate();
    const { role: _role } = useAuth();
    const [questions, setQuestions] = useState<TelegramQuestion[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Form State
    const [_isEditing, setIsEditing] = useState(false);
    const [currentId, setCurrentId] = useState<string | null>(null);
    const [text, setText] = useState('');
    const [options, setOptions] = useState(['', '', '', '']);
    const [correctIndex, setCorrectIndex] = useState(0);
    const [level, setLevel] = useState('General');

    useEffect(() => {
        fetchQuestions();
    }, []);

    const fetchQuestions = async () => {
        try {
            const res = await apiFetch('/api/telegram-questions');
            const data = await res.json();
            setQuestions(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Error fetching questions:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        const payload = { text, options: options.filter(o => o.trim() !== ''), correct_index: correctIndex, level };

        try {
            const method = currentId ? 'PUT' : 'POST';
            const url = currentId ? `/api/telegram-questions/${currentId}` : '/api/telegram-questions';
            const res = await apiFetch(url, {
                method,
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                resetForm();
                fetchQuestions();
                alert("Savol saqlandi!");
            }
        } catch (err) {
            console.error('Error saving question:', err);
            alert("Xatolik yuz berdi");
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm("Rostdan ham o'chirmoqchimisiz?")) return;
        try {
            const res = await apiFetch(`/api/telegram-questions/${id}`, { method: 'DELETE' });
            if (res.ok) fetchQuestions();
        } catch (err) {
            console.error('Error deleting:', err);
        }
    };

    const startEdit = (q: TelegramQuestion) => {
        setCurrentId(q.id);
        setText(q.text);
        const newOptions = [...q.options];
        while (newOptions.length < 4) newOptions.push('');
        setOptions(newOptions);
        setCorrectIndex(q.correct_index);
        setLevel(q.level);
        setIsEditing(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const resetForm = () => {
        setCurrentId(null);
        setText('');
        setOptions(['', '', '', '']);
        setCorrectIndex(0);
        setLevel('General');
        setIsEditing(false);
    };

    return (
        <div className="min-h-screen bg-transparent p-4 md:p-8 font-sans">
            <div className="max-w-4xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-indigo-600 font-bold">
                        <ArrowLeft size={20} /> Orqaga
                    </button>
                    <h1 className="text-2xl font-black text-slate-800">Telegram Bot Savollari</h1>
                </div>

                {/* Form Section */}
                <div className="bg-white border-2 border-slate-100 rounded-[2rem] p-6 mb-8 shadow-sm">
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                        {currentId ? <Edit2 size={20} className="text-orange-500" /> : <Plus size={20} className="text-indigo-600" />}
                        {currentId ? "Savolni tahrirlash" : "Yangi savol qo'shish"}
                    </h2>
                    <form onSubmit={handleSave} className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-600 mb-1">Savol matni</label>
                            <textarea
                                value={text}
                                onChange={(e) => setText(e.target.value)}
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none min-h-[100px]"
                                placeholder="Savolni kiriting..."
                                required
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {options.map((opt, idx) => (
                                <div key={idx} className="flex flex-col gap-1">
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Variant {idx + 1}</label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={opt}
                                            onChange={(e) => {
                                                const newOpts = [...options];
                                                newOpts[idx] = e.target.value;
                                                setOptions(newOpts);
                                            }}
                                            className={`w-full p-3 pr-10 bg-slate-50 border ${correctIndex === idx ? 'border-green-500 ring-1 ring-green-100' : 'border-slate-200'} rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none`}
                                            placeholder={`Variant ${idx + 1}`}
                                            required={idx < 2}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setCorrectIndex(idx)}
                                            className={`absolute right-3 top-1/2 -translate-y-1/2 ${correctIndex === idx ? 'text-green-500' : 'text-slate-300 hover:text-slate-400'}`}
                                        >
                                            <CheckCircle2 size={20} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="flex flex-wrap gap-4 items-end">
                            <div className="flex-1 min-w-[200px]">
                                <label className="block text-sm font-bold text-slate-600 mb-1">Daraja (Level)</label>
                                <input
                                    type="text"
                                    value={level}
                                    onChange={(e) => setLevel(e.target.value)}
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                                />
                            </div>
                            <div className="flex gap-2">
                                {currentId && (
                                    <button
                                        type="button"
                                        onClick={resetForm}
                                        className="px-6 py-3 border border-slate-200 rounded-xl font-bold text-slate-500 hover:bg-slate-50"
                                    >
                                        Bekor qilish
                                    </button>
                                )}
                                <button
                                    type="submit"
                                    className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-500/20 flex items-center gap-2"
                                >
                                    <Save size={20} /> Saqlash
                                </button>
                            </div>
                        </div>
                    </form>
                </div>

                {/* List Section */}
                <div className="space-y-4">
                    <h3 className="text-xl font-bold text-slate-800">Barcha savollar ({questions.length})</h3>
                    {isLoading ? (
                        <div className="text-center py-12 text-slate-400 font-bold italic">Yuklanmoqda...</div>
                    ) : questions.length === 0 ? (
                        <div className="text-center py-12 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 text-slate-400 font-medium">
                            Hali savollar qo'shilmagan.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4">
                            {questions.map(q => (
                                <div key={q.id} className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow group relative">
                                    <div className="flex justify-between items-start mb-3 pr-20">
                                        <p className="font-bold text-slate-800 leading-snug">{q.text}</p>
                                        <span className="shrink-0 px-2 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase tracking-tighter rounded border border-indigo-100">
                                            {q.level}
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        {q.options.map((opt, i) => (
                                            <div key={i} className={`px-3 py-2 rounded-lg text-sm font-medium ${q.correct_index === i ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-slate-50 text-slate-600 border border-slate-100'}`}>
                                                {q.correct_index === i && '✅ '}{opt}
                                            </div>
                                        ))}
                                    </div>
                                    <div className="absolute top-4 right-4 flex gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => startEdit(q)}
                                            className="p-2 text-orange-500 hover:bg-orange-50 rounded-lg"
                                        >
                                            <Edit2 size={18} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(q.id)}
                                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ManageTelegramQuestions;
