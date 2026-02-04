import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, BookOpen, Plus, Trash2, Save, ArrowLeft } from 'lucide-react';
import { apiFetch } from '../api';

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
        const res = await apiFetch('/api/admin/teachers');
        const data = await res.json();
        setTeachers(data);
    };

    const fetchUnitQuizzes = async () => {
        const res = await apiFetch('/api/unit-quizzes');
        const data = await res.json();
        setUnitQuizzes(data);
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

    return (
        <div className="p-8 max-w-6xl mx-auto">
            <button
                onClick={() => navigate('/')}
                className="flex items-center gap-2 text-slate-400 hover:text-white mb-8 transition-colors"
            >
                <ArrowLeft size={20} /> Orqaga
            </button>

            <header className="mb-12">
                <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">
                    Admin Panel
                </h1>
                <p className="text-slate-400 mt-2">O'qituvchilar va Unit Quizlarni boshqarish</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                {/* Teacher Management */}
                <section className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <UserPlus className="text-blue-400" />
                        <h2 className="text-2xl font-semibold text-white">O'qituvchilar</h2>
                    </div>

                    <form onSubmit={handleCreateTeacher} className="space-y-4 mb-8">
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1">Ism Familiya</label>
                            <input
                                type="text"
                                value={teacherName}
                                onChange={(e) => setTeacherName(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                placeholder="Masalan: Ali Valiyev"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1">Telefon raqam</label>
                            <input
                                type="text"
                                value={teacherPhone}
                                onChange={(e) => setTeacherPhone(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                placeholder="Masalan: +998901234567"
                                required
                            />
                        </div>
                        <button
                            type="submit"
                            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2 rounded-lg transition-all flex items-center justify-center gap-2"
                        >
                            <Plus size={20} /> O'qituvchi qo'shish
                        </button>
                    </form>

                    <div className="space-y-3">
                        {teachers.map(teacher => (
                            <div key={teacher.id} className="bg-slate-900/50 border border-slate-700/30 rounded-xl p-4 flex justify-between items-center group">
                                <div>
                                    <p className="font-semibold text-white">{teacher.name}</p>
                                    <p className="text-sm text-slate-500">{teacher.phone} | Parol: ****{teacher.password}</p>
                                </div>
                                <button className="text-slate-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100">
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Unit Quiz Management */}
                <section className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <BookOpen className="text-indigo-400" />
                        <h2 className="text-2xl font-semibold text-white">Unit Quizlar</h2>
                    </div>

                    <form onSubmit={handleCreateUnitQuiz} className="space-y-4 mb-8">
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1">Quiz nomi</label>
                            <input
                                type="text"
                                value={quizTitle}
                                onChange={(e) => setQuizTitle(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                                placeholder="Masalan: Unit 1 - Basics"
                                required
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Level</label>
                                <select
                                    value={quizLevel}
                                    onChange={(e) => setQuizLevel(e.target.value)}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                                    required
                                >
                                    <option value="">Tanlang</option>
                                    <option value="Beginner">Beginner</option>
                                    <option value="Elementary">Elementary</option>
                                    <option value="Intermediate">Intermediate</option>
                                    <option value="Advanced">Advanced</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Unit</label>
                                <input
                                    type="text"
                                    value={quizUnit}
                                    onChange={(e) => setQuizUnit(e.target.value)}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                                    placeholder="Masalan: 1"
                                    required
                                />
                            </div>
                        </div>
                        <button
                            type="submit"
                            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2 rounded-lg transition-all flex items-center justify-center gap-2"
                        >
                            <Plus size={20} /> Quiz qo'shish
                        </button>
                    </form>

                    <div className="space-y-3">
                        {unitQuizzes.map(quiz => (
                            <div key={quiz.id} className="bg-slate-900/50 border border-slate-700/30 rounded-xl p-4 flex justify-between items-center group">
                                <div>
                                    <p className="font-semibold text-white">{quiz.title}</p>
                                    <p className="text-sm text-slate-500">{quiz.level} - Unit {quiz.unit}</p>
                                </div>
                                <button className="text-slate-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100">
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
