import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../../api';
import { BookOpen, Plus, Edit2, Trash2, Search, Filter, Clock, Book } from 'lucide-react';

interface Quiz {
    id: string;
    title: string;
    level: string;
    unit: string;
    time_limit: number;
    questions: any[];
}

export default function ManagerVocabulary() {
    const navigate = useNavigate();
    const [quizzes, setQuizzes] = useState<Quiz[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedLevel, setSelectedLevel] = useState<string>('All');

    useEffect(() => {
        fetchQuizzes();
    }, []);

    const fetchQuizzes = async () => {
        try {
            const res = await apiFetch('/api/unit-quizzes');
            if (res.ok) setQuizzes(await res.json());
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string, title: string) => {
        if (!window.confirm(`"${title}" lug'atini o'chirishga aminmisiz?`)) return;
        try {
            const res = await apiFetch(`/api/unit-quizzes/${id}`, { method: 'DELETE' });
            if (res.ok) {
                setQuizzes(quizzes.filter(q => q.id !== id));
            } else {
                alert("O'chirishda xatolik yuz berdi");
            }
        } catch (err) {
            console.error(err);
            alert("O'chirishda xatolik yuz berdi");
        }
    };

    const levels = ['All', 'Beginner', 'Elementary', 'Pre-Intermediate', 'Intermediate', 'A1', 'A2', 'B1', 'B2'];

    const filteredQuizzes = quizzes.filter(q => {
        const matchesSearch = q.title.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesLevel = selectedLevel === 'All' || q.level === selectedLevel;
        return matchesSearch && matchesLevel;
    });

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3">
                        <BookOpen className="text-indigo-600" /> Lug'atlar Boshqaruvi
                    </h2>
                    <p className="text-slate-500 font-medium text-sm mt-1 uppercase tracking-widest">Levelga mos lug'at va testlarni boshqarish</p>
                </div>
                <button
                    onClick={() => navigate('/create')}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl font-bold text-sm transition-all shadow-lg shadow-indigo-500/20 active:scale-95"
                >
                    <Plus size={18} /> Yangi Test Qo'shish
                </button>
            </div>

            <div className="flex flex-col md:flex-row gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Lug'at nomini yozing..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 font-medium text-sm transition-colors"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <Filter className="text-slate-400" size={18} />
                    <select
                        value={selectedLevel}
                        onChange={e => setSelectedLevel(e.target.value)}
                        className="border border-slate-200 rounded-xl px-4 py-2 focus:outline-none focus:border-indigo-500 font-bold text-sm transition-colors"
                    >
                        {levels.map(level => <option key={level} value={level}>{level}</option>)}
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    <div className="col-span-full py-12 text-center text-slate-400 font-medium tracking-widest uppercase text-xs">Yuklanmoqda...</div>
                ) : filteredQuizzes.length === 0 ? (
                    <div className="col-span-full py-12 text-center text-slate-400 font-medium tracking-widest uppercase text-xs bg-white rounded-3xl border border-dashed border-slate-200">Lug'atlar topilmadi</div>
                ) : (
                    filteredQuizzes.map(quiz => (
                        <div key={quiz.id} className="bg-white rounded-2xl p-6 border border-slate-200 hover:border-indigo-400 hover:shadow-md transition-all group">
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-[10px] font-black uppercase px-2 py-1 bg-indigo-50 text-indigo-600 rounded-md tracking-wider">{quiz.level}</span>
                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => navigate(`/edit-quiz/${quiz.id}`)}
                                        className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-md transition-all"
                                    >
                                        <Edit2 size={14} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(quiz.id, quiz.title)}
                                        className="p-1.5 text-slate-400 hover:text-red-500 rounded-md transition-all"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                            <h3 className="font-bold text-slate-800 mb-4 line-clamp-2">{quiz.title}</h3>
                            <div className="flex items-center justify-between mt-auto">
                                <div className="flex items-center gap-4 text-slate-400">
                                    <span className="flex items-center gap-1.5 text-[10px] font-black uppercase">
                                        <Book size={12} /> {quiz.questions.length} savol
                                    </span>
                                    <span className="flex items-center gap-1.5 text-[10px] font-black uppercase">
                                        <Clock size={12} /> {quiz.time_limit}m
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
