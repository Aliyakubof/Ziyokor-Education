import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Swords, Plus, Trash2, ArrowLeft, LogOut } from 'lucide-react';
import { apiFetch } from '../api';
import { useAuth } from '../AuthContext';
import logo from '../assets/logo.jpeg';

interface UnitQuiz {
    id: string;
    level: string;
    unit: string;
    title: string;
    questions?: any;
    is_active?: boolean;
}

const ManageDuels = () => {
    const navigate = useNavigate();
    const { user, logout, role } = useAuth();
    const [duelQuizzes, setDuelQuizzes] = useState<UnitQuiz[]>([]);

    useEffect(() => {
        fetchDuelQuizzes();
    }, []);

    const fetchDuelQuizzes = async () => {
        try {
            const res = await apiFetch('/api/duel-quizzes');
            const data = await res.json();
            setDuelQuizzes(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Error fetching duel quizzes:', err);
            setDuelQuizzes([]);
        }
    };

    const handleStatusToggle = async (quiz: UnitQuiz) => {
        try {
            const newStatus = !quiz.is_active;
            const res = await apiFetch(`/api/duel-quizzes/${quiz.id}`, {
                method: 'PUT',
                body: JSON.stringify({ ...quiz, is_active: newStatus })
            });

            if (res.ok) {
                fetchDuelQuizzes();
            } else {
                alert("Statusni o'zgartirishda xatolik!");
            }
        } catch (err) {
            console.error("Error toggling status:", err);
            alert("Xatolik yuz berdi!");
        }
    };

    const handleDeleteQuiz = async (id: string) => {
        if (!window.confirm("Rostdan ham bu duel savolini o'chirmoqchimisiz?")) return;
        try {
            const res = await apiFetch(`/api/duel-quizzes/${id}`, { method: 'DELETE' });
            if (res.ok) {
                fetchDuelQuizzes();
            } else {
                alert("O'chirishda xatolik!");
            }
        } catch (err) {
            console.error("Error deleting quiz:", err);
            alert("O'chirishda xatolik!");
        }
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
                        <ArrowLeft size={20} /> <span className="hidden md:inline">Bosh sahifa</span>
                    </button>

                    <div className="flex items-center gap-2 md:gap-4">
                        <div className="flex items-center gap-3">
                            <div className="text-right hidden sm:block">
                                <p className="text-sm font-bold text-slate-800 leading-tight">{user?.name}</p>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    {role === 'admin' ? 'Administrator' : "O'qituvchi"}
                                </p>
                            </div>

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
                </div>

                <div className="flex flex-col md:flex-row md:items-center gap-4">
                    <div className="flex items-center gap-4">
                        <img src={logo} alt="Ziyokor Logo" className="h-12 w-auto md:h-16 object-contain rounded-2xl shadow-sm" />
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-0">
                                Duel Savollari Boshqaruvi
                            </h1>
                            <p className="text-slate-500 text-sm md:text-base">O'quvchilar dueli uchun savollar bazasi</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Duel Quizzes Section */}
            <div className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-xl shadow-slate-200/50">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                    <div className="flex items-center gap-4">
                        <div className="bg-rose-100 p-3 rounded-2xl">
                            <Swords className="text-rose-600" size={28} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Mavjud Duel Testlari</h2>
                            <p className="text-slate-500 font-medium">Jami: {duelQuizzes.length} ta</p>
                        </div>
                    </div>
                    <button
                        onClick={() => navigate('/create?type=duel')}
                        className="bg-rose-600 hover:bg-rose-500 text-white px-8 py-3.5 rounded-2xl font-black transition-all shadow-lg shadow-rose-500/20 active:scale-95 flex items-center gap-2 group"
                    >
                        <Plus size={20} className="group-hover:rotate-90 transition-transform" />
                        YANGI DUEL SAVOLI
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {duelQuizzes.length === 0 ? (
                        <div className="col-span-full py-12 text-center bg-slate-50 rounded-2xl border-2 border-slate-100 border-dashed">
                            <Swords size={48} className="mx-auto mb-4 text-slate-200" />
                            <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">Hozircha duel savollari yaratilmagan</p>
                        </div>
                    ) : (
                        duelQuizzes.map(quiz => (
                            <div key={quiz.id} className="group bg-white border border-slate-100 rounded-3xl p-6 hover:shadow-2xl hover:shadow-rose-500/10 hover:border-rose-200 transition-all flex flex-col justify-between">
                                <div>
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex flex-col gap-2">
                                            <span className="px-3 py-1 bg-rose-50 text-rose-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-rose-100 w-fit">
                                                {quiz.level}
                                            </span>
                                            <button
                                                onClick={() => handleStatusToggle(quiz)}
                                                className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors focus:outline-none ${quiz.is_active !== false ? 'bg-rose-600' : 'bg-slate-200'}`}
                                            >
                                                <span
                                                    className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${quiz.is_active !== false ? 'translate-x-6' : 'translate-x-1'}`}
                                                />
                                            </button>
                                        </div>
                                        <div className="flex flex-col items-end gap-1">
                                            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">SAVOLLAR: {(typeof quiz.questions === 'string' ? JSON.parse(quiz.questions) : quiz.questions).length}</span>
                                            {quiz.is_active === false && <span className="text-[8px] font-black text-rose-500 uppercase">OFFLINE</span>}
                                        </div>
                                    </div>
                                    <h3 className={`font-bold ${quiz.is_active === false ? 'text-slate-400' : 'text-slate-800'} text-lg mb-4 line-clamp-2 leading-tight group-hover:text-rose-600 transition-colors uppercase tracking-tight`}>{quiz.title}</h3>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => navigate(`/edit-quiz/${quiz.id}?type=duel`)}
                                        className="flex-1 py-3 px-4 rounded-2xl bg-slate-50 text-slate-600 font-bold text-xs hover:bg-rose-50 hover:text-rose-600 transition-all flex items-center justify-center gap-2"
                                    >
                                        <Plus className="rotate-45" size={14} />
                                        Tahrirlash
                                    </button>
                                    <button
                                        onClick={() => handleDeleteQuiz(quiz.id)}
                                        className="p-3 rounded-2xl bg-rose-50 text-rose-500 hover:bg-rose-600 hover:text-white transition-all border border-rose-100"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default ManageDuels;
