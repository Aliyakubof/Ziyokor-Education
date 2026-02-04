import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, BookOpen, Plus, Trash2, ArrowLeft, LogOut } from 'lucide-react';
import { apiFetch } from '../api';
import { useAuth } from '../AuthContext';

interface Teacher {
    id: string;
    name: string;
    phone: string;
    password: string;
}

interface UnitQuiz {
    id: string;
    level: string;
    unit: string;
    title: string;
}

const AdminPanel = () => {
    const navigate = useNavigate();
    const { logout } = useAuth();
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [unitQuizzes, setUnitQuizzes] = useState<UnitQuiz[]>([]);

    // Teacher Form
    const [teacherName, setTeacherName] = useState('');
    const [teacherPhone, setTeacherPhone] = useState('');

    // Unit Quiz Form
    const [quizTitle, setQuizTitle] = useState('');
    const [quizLevel, setQuizLevel] = useState('');
    const [quizUnit, setQuizUnit] = useState('');

    useEffect(() => {
        fetchTeachers();
        fetchUnitQuizzes();
    }, []);

    const fetchTeachers = async () => {
        try {
            const res = await apiFetch('/api/admin/teachers');
            const data = await res.json();
            setTeachers(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Error fetching teachers:', err);
            setTeachers([]);
        }
    };

    const fetchUnitQuizzes = async () => {
        try {
            const res = await apiFetch('/api/unit-quizzes');
            const data = await res.json();
            setUnitQuizzes(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Error fetching unit quizzes:', err);
            setUnitQuizzes([]);
        }
    };

    const handleCreateTeacher = async (e: React.FormEvent) => {
        e.preventDefault();
        const res = await apiFetch('/api/admin/teachers', {
            method: 'POST',
            body: JSON.stringify({ name: teacherName, phone: teacherPhone })
        });
        if (res.ok) {
            setTeacherName('');
            setTeacherPhone('');
            fetchTeachers();
        }
    };

    const handleCreateUnitQuiz = async (e: React.FormEvent) => {
        e.preventDefault();
        const res = await apiFetch('/api/unit-quizzes', {
            method: 'POST',
            body: JSON.stringify({
                title: quizTitle,
                level: quizLevel,
                unit: quizUnit,
                questions: [] // Simplified for now, can be expanded
            })
        });
        if (res.ok) {
            setQuizTitle('');
            setQuizLevel('');
            setQuizUnit('');
            fetchUnitQuizzes();
        }
    };

    // Update the return to include logout button next to Orqaga
    return (
        <div className="p-8 max-w-6xl mx-auto relative min-h-screen">
            <div className="flex justify-between items-center mb-12">
                <button
                    onClick={() => navigate('/')}
                    className="flex items-center gap-2 text-slate-400 hover:text-white transition-all hover:translate-x-[-4px]"
                >
                    <ArrowLeft size={20} /> Orqaga
                </button>

                <button
                    onClick={() => {
                        logout();
                        navigate('/login');
                    }}
                    className="flex items-center gap-2 px-6 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-2xl transition-all border border-red-500/10 font-bold"
                >
                    <LogOut size={18} /> Chiqish
                </button>
            </div>

            <header className="mb-16 relative">
                <div className="absolute -top-10 -left-10 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
                <h1 className="text-5xl font-black bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent mb-4">
                    Admin Panel
                </h1>
                <p className="text-slate-400 font-medium tracking-wide">O'qituvchilar va Unit testlar boshqaruvi</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 relative z-10">
                {/* Teacher Management */}
                <section className="glass rounded-[2.5rem] p-8 border-slate-700/30">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="bg-blue-500/10 p-3 rounded-2xl">
                            <UserPlus className="text-blue-400 w-8 h-8" />
                        </div>
                        <h2 className="text-2xl font-black text-white tracking-tight">O'qituvchilar</h2>
                    </div>

                    <form onSubmit={handleCreateTeacher} className="space-y-6 mb-12">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Ism Familiya</label>
                            <input
                                type="text"
                                value={teacherName}
                                onChange={(e) => setTeacherName(e.target.value)}
                                className="w-full bg-slate-900/40 border border-slate-700/50 rounded-2xl px-5 py-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 font-medium transition-all"
                                placeholder="Masalan: Ali Valiyev"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Telefon raqam</label>
                            <input
                                type="text"
                                value={teacherPhone}
                                onChange={(e) => setTeacherPhone(e.target.value)}
                                className="w-full bg-slate-900/40 border border-slate-700/50 rounded-2xl px-5 py-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 font-medium transition-all"
                                placeholder="Masalan: 998901234567"
                                required
                            />
                        </div>
                        <button
                            type="submit"
                            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-2xl transition-all flex items-center justify-center gap-2 btn-premium shadow-xl shadow-blue-500/10"
                        >
                            <Plus size={20} /> O'qituvchi qo'shish
                        </button>
                    </form>

                    <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                        {teachers.map(teacher => (
                            <div key={teacher.id} className="glass-blue border-transparent rounded-[1.5rem] p-5 flex justify-between items-center group hover:border-blue-500/30 transition-all">
                                <div>
                                    <p className="font-bold text-white text-lg">{teacher.name}</p>
                                    <div className="flex items-center gap-3 mt-1">
                                        <span className="text-xs font-bold text-slate-500 bg-slate-900/50 px-2 py-1 rounded-md">{teacher.phone}</span>
                                        <span className="text-xs font-bold text-blue-500/70 bg-blue-500/5 px-2 py-1 rounded-md">Pass: ****{teacher.password}</span>
                                    </div>
                                </div>
                                <button className="p-3 bg-red-500/10 text-red-500 rounded-xl opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 hover:text-white">
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Unit Quiz Management */}
                <section className="glass rounded-[2.5rem] p-8 border-slate-700/30">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="bg-indigo-500/10 p-3 rounded-2xl">
                            <BookOpen className="text-indigo-400 w-8 h-8" />
                        </div>
                        <h2 className="text-2xl font-black text-white tracking-tight">Unit Quizlar</h2>
                    </div>

                    <form onSubmit={handleCreateUnitQuiz} className="space-y-6 mb-12">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Quiz nomi</label>
                            <input
                                type="text"
                                value={quizTitle}
                                onChange={(e) => setQuizTitle(e.target.value)}
                                className="w-full bg-slate-900/40 border border-slate-700/50 rounded-2xl px-5 py-4 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 font-medium transition-all"
                                placeholder="Masalan: Unit 1 - Basics"
                                required
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Level</label>
                                <select
                                    value={quizLevel}
                                    onChange={(e) => setQuizLevel(e.target.value)}
                                    className="w-full bg-slate-900/40 border border-slate-700/50 rounded-2xl px-4 py-4 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 font-medium transition-all appearance-none cursor-pointer"
                                    required
                                >
                                    <option value="" className="bg-slate-900">Tanlang</option>
                                    <option value="Beginner" className="bg-slate-900">Beginner</option>
                                    <option value="Elementary" className="bg-slate-900">Elementary</option>
                                    <option value="Intermediate" className="bg-slate-900">Intermediate</option>
                                    <option value="Advanced" className="bg-slate-900">Advanced</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Unit</label>
                                <input
                                    type="text"
                                    value={quizUnit}
                                    onChange={(e) => setQuizUnit(e.target.value)}
                                    className="w-full bg-slate-900/40 border border-slate-700/50 rounded-2xl px-5 py-4 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 font-medium transition-all"
                                    placeholder="Unit"
                                    required
                                />
                            </div>
                        </div>
                        <button
                            type="submit"
                            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black py-4 rounded-2xl transition-all flex items-center justify-center gap-2 btn-premium shadow-xl shadow-indigo-500/10"
                        >
                            <Plus size={20} /> Quiz qo'shish
                        </button>
                    </form>

                    <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                        {unitQuizzes.map(quiz => (
                            <div key={quiz.id} className="glass-indigo border-transparent rounded-[1.5rem] p-5 flex justify-between items-center group hover:border-indigo-500/30 transition-all">
                                <div>
                                    <p className="font-bold text-white text-lg">{quiz.title}</p>
                                    <div className="flex items-center gap-3 mt-1">
                                        <span className="text-xs font-bold text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded-md">{quiz.level}</span>
                                        <span className="text-xs font-bold text-slate-500">Unit {quiz.unit}</span>
                                    </div>
                                </div>
                                <button className="p-3 bg-red-500/10 text-red-500 rounded-xl opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 hover:text-white">
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        ))}
                    </div>
                </section>
            </div>
        </div>
    );
};

export default AdminPanel;
