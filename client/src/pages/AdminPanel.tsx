import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, BookOpen, Plus, Trash2, ArrowLeft, LogOut, FileQuestion } from 'lucide-react';
import { apiFetch } from '../api';
import { useAuth } from '../AuthContext';
import logo from '../assets/logo.jpeg';

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
    const [teacherPassword, setTeacherPassword] = useState('');

    // Edit Teacher State
    const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
    const [editName, setEditName] = useState('');
    const [editPhone, setEditPhone] = useState('');
    const [editPassword, setEditPassword] = useState('');

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
        try {
            const res = await apiFetch('/api/admin/teachers', {
                method: 'POST',
                body: JSON.stringify({ name: teacherName, phone: teacherPhone, password: teacherPassword })
            });
            if (res.ok) {
                setTeacherName('');
                setTeacherPhone('');
                setTeacherPassword('');
                fetchTeachers();
                alert("O'qituvchi muvaffaqiyatli qo'shildi!");
            } else {
                const err = await res.json();
                console.error('Error creating teacher:', err);
                alert(`Xatolik: ${err.error || 'Server xatosi'}`);
            }
        } catch (error) {
            console.error('Fetch error:', error);
            alert('Server bilan bog\'lanishda xatolik!');
        }
    };

    const handleUpdateTeacher = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingTeacher) return;

        try {
            const res = await apiFetch(`/api/admin/teachers/${editingTeacher.id}`, {
                method: 'PUT',
                body: JSON.stringify({ name: editName, phone: editPhone, password: editPassword })
            });
            if (res.ok) {
                setEditingTeacher(null);
                fetchTeachers();
                alert("O'qituvchi ma'lumotlari yangilandi!");
            } else {
                const err = await res.json();
                alert(`Xatolik: ${err.error || 'Server xatosi'}`);
            }
        } catch (error) {
            console.error('Fetch error:', error);
            alert('Server bilan bog\'lanishda xatolik!');
        }
    };

    const startEditing = (teacher: Teacher) => {
        setEditingTeacher(teacher);
        setEditName(teacher.name);
        setEditPhone(teacher.phone);
        setEditPassword(teacher.password);
    };

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto min-h-screen bg-transparent font-sans text-slate-900">
            {/* Header Area */}
            <div className="flex flex-col gap-4 mb-6 md:mb-10 border-b border-white/20 pb-6">
                <div className="flex justify-between items-center">
                    <button
                        onClick={() => navigate('/')}
                        className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 transition-colors"
                    >
                        <ArrowLeft size={20} /> <span className="hidden md:inline">Orqaga</span>
                    </button>

                    <div className="flex items-center gap-2 md:gap-4">
                        <button
                            onClick={() => navigate('/create')}
                            className="flex items-center gap-2 px-3 py-2 md:px-5 md:py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors font-medium shadow-sm text-sm md:text-base"
                        >
                            <FileQuestion size={18} /> <span className="hidden md:inline">Unit Quiz Yaratish</span><span className="md:hidden">Quiz</span>
                        </button>

                        <button
                            onClick={() => {
                                logout();
                                navigate('/login');
                            }}
                            className="flex items-center gap-2 px-3 py-2 md:px-5 md:py-2.5 bg-white text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-red-200 font-medium text-sm md:text-base"
                        >
                            <LogOut size={18} /> <span className="hidden md:inline">Chiqish</span>
                        </button>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row md:items-center gap-4">
                    <div className="flex items-center gap-4">
                        <img src={logo} alt="Ziyokor Logo" className="h-12 w-auto md:h-16 object-contain rounded-2xl shadow-sm" />
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-0">
                                Ziyokor Admin Panel
                            </h1>
                            <p className="text-slate-500 text-sm md:text-base">O'qituvchilar va Unit testlar boshqaruvi</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12">
                {/* Teacher Management */}
                <section>
                    <div className="flex items-center gap-3 mb-6">
                        <div className="bg-indigo-100 p-2 rounded-lg">
                            <UserPlus className="text-indigo-600 w-6 h-6" />
                        </div>
                        <h2 className="text-xl font-bold text-slate-900">O'qituvchilar</h2>
                    </div>

                    <form onSubmit={handleCreateTeacher} className="space-y-4 mb-8 bg-slate-50 p-4 md:p-6 rounded-xl border border-slate-200">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-slate-700">Ism Familiya</label>
                                <input
                                    type="text"
                                    value={teacherName}
                                    onChange={(e) => setTeacherName(e.target.value)}
                                    className="w-full bg-white border border-slate-300 rounded-lg px-4 py-3 md:py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow"
                                    required
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-slate-700">Telefon raqam</label>
                                <input
                                    type="text"
                                    value={teacherPhone}
                                    onChange={(e) => setTeacherPhone(e.target.value)}
                                    className="w-full bg-white border border-slate-300 rounded-lg px-4 py-3 md:py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow"
                                    required
                                />
                            </div>
                            <div className="space-y-1 col-span-1 md:col-span-2">
                                <label className="text-sm font-medium text-slate-700">Parol <span className="text-xs text-slate-400 font-normal">(ixtiyoriy)</span></label>
                                <input
                                    type="text"
                                    value={teacherPassword}
                                    onChange={(e) => setTeacherPassword(e.target.value)}
                                    className="w-full bg-white border border-slate-300 rounded-lg px-4 py-3 md:py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow"
                                />
                            </div>
                        </div>
                        <button
                            type="submit"
                            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium py-3 md:py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
                        >
                            <Plus size={18} /> O'qituvchi qo'shish
                        </button>
                    </form>


                    <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                        {teachers.map(teacher => {
                            return (
                                <div key={teacher.id} className="bg-white border border-slate-200 rounded-xl p-5 hover:border-indigo-300 transition-all shadow-sm">
                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                                        <div>
                                            <p className="text-lg font-bold text-slate-800">{teacher.name}</p>
                                            <div className="flex flex-wrap items-center gap-3 mt-1 text-sm">
                                                <span className="flex items-center gap-1 text-slate-500 font-medium bg-slate-100 px-2 py-0.5 rounded">
                                                    📞 {teacher.phone}
                                                </span>
                                                <span className="flex items-center gap-1 text-indigo-600 font-medium bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                                                    🔑 {teacher.password}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex gap-2 self-end sm:self-auto">
                                            <button
                                                onClick={() => startEditing(teacher)}
                                                className="p-2 text-slate-400 hover:text-indigo-600 transition-colors bg-slate-50 rounded-lg sm:bg-transparent hover:bg-indigo-50"
                                                title="Tahrirlash"
                                            >
                                                <div className="w-5 h-5 flex items-center justify-center border-2 border-current rounded-md">
                                                    <span className="text-xs font-bold">✎</span>
                                                </div>
                                            </button>
                                            <button className="p-2 text-slate-400 hover:text-red-600 transition-colors bg-slate-50 rounded-lg sm:bg-transparent hover:bg-red-50" title="O'chirish">
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>


                                </div>
                            );
                        })}
                    </div>
                </section>

                {/* Right Column: Groups & Unit Quizzes */}
                <div className="space-y-12">


                    {/* Unit Quiz List */}
                    <section>
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="bg-teal-100 p-2 rounded-lg">
                                    <BookOpen className="text-teal-700 w-6 h-6" />
                                </div>
                                <h2 className="text-xl font-bold text-slate-900">Mavjud Quizlar</h2>
                            </div>
                            <span className="px-3 py-1 bg-slate-100 text-slate-600 font-medium rounded-full text-sm">{unitQuizzes.length}</span>
                        </div>

                        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                            {unitQuizzes.length === 0 ? (
                                <div className="text-center py-12 bg-slate-50 rounded-xl border border-slate-100 border-dashed text-slate-500">
                                    Hozircha quizlar yo'q.
                                </div>
                            ) : (
                                unitQuizzes.map(quiz => (
                                    <div key={quiz.id} className="bg-white border border-slate-200 rounded-lg p-4 flex justify-between items-center hover:border-teal-300 transition-colors">
                                        <div>
                                            <p className="font-semibold text-slate-800">{quiz.title}</p>
                                            <div className="flex items-center gap-3 mt-1 text-sm">
                                                <span className="px-2 py-0.5 bg-teal-50 text-teal-700 rounded border border-teal-100 font-medium">{quiz.level}</span>
                                                <span className="text-slate-500">Unit {quiz.unit}</span>
                                            </div>
                                        </div>
                                        <button className="p-2 text-slate-400 hover:text-red-600 transition-colors">
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </section>
                </div>
            </div>

            {/* Edit Teacher Modal */}
            {editingTeacher && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
                        <h3 className="text-xl font-bold text-slate-900 mb-6">O'qituvchini Tahrirlash</h3>
                        <form onSubmit={handleUpdateTeacher} className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-slate-700">Ism Familiya</label>
                                <input
                                    type="text"
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 md:py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    required
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-slate-700">Telefon raqam</label>
                                <input
                                    type="text"
                                    value={editPhone}
                                    onChange={(e) => setEditPhone(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    required
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-slate-700">Parol</label>
                                <input
                                    type="text"
                                    value={editPassword}
                                    onChange={(e) => setEditPassword(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    required
                                />
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setEditingTeacher(null)}
                                    className="flex-1 px-4 py-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 font-medium"
                                >
                                    Bekor qilish
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
                                >
                                    Saqlash
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminPanel;
