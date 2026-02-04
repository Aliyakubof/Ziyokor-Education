import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, PlayCircle, Plus, ArrowLeft, GraduationCap, LogOut } from 'lucide-react';
import { apiFetch } from '../api';
import { useAuth } from '../AuthContext';

interface Group {
    id: string;
    name: string;
}

interface Student {
    id: string;
    name: string;
    status: string;
}

interface UnitQuiz {
    id: string;
    title: string;
    level: string;
    unit: string;
}

const TeacherDashboard = () => {
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const [groups, setGroups] = useState<Group[]>([]);
    const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
    const [students, setStudents] = useState<Student[]>([]);
    const [unitQuizzes, setUnitQuizzes] = useState<UnitQuiz[]>([]);

    // Forms
    const [groupName, setGroupName] = useState('');
    const [studentName, setStudentName] = useState('');

    // Quiz Launch
    const [selectedQuizId, setSelectedQuizId] = useState('');

    useEffect(() => {
        if (user?.id) {
            fetchGroups(user.id);
        }
        fetchUnitQuizzes();
    }, [user]);

    useEffect(() => {
        if (selectedGroup) {
            fetchStudents(selectedGroup);
        }
    }, [selectedGroup]);

    const fetchGroups = async (teacherId: string) => {
        try {
            const res = await apiFetch(`/api/groups/${teacherId}`);
            const data = await res.json();
            setGroups(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Error fetching groups:', err);
            setGroups([]);
        }
    };

    const fetchStudents = async (groupId: string) => {
        try {
            const res = await apiFetch(`/api/students/${groupId}`);
            const data = await res.json();
            setStudents(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Error fetching students:', err);
            setStudents([]);
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

    const handleCreateGroup = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user?.id) return;
        const res = await apiFetch('/api/groups', {
            method: 'POST',
            body: JSON.stringify({ name: groupName, teacherId: user.id })
        });
        if (res.ok) {
            setGroupName('');
            fetchGroups(user.id);
        }
    };

    const handleCreateStudent = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedGroup) return;
        const res = await apiFetch('/api/students', {
            method: 'POST',
            body: JSON.stringify({ name: studentName, groupId: selectedGroup })
        });
        if (res.ok) {
            setStudentName('');
            fetchStudents(selectedGroup);
        }
    };

    const handleLaunchQuiz = async () => {
        if (!selectedGroup || !selectedQuizId) return;
        navigate(`/unit-lobby/${selectedQuizId}/${selectedGroup}`);
    };

    return (
        <div className="p-8 max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <button
                    onClick={() => navigate('/')}
                    className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
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
                <div className="absolute -top-10 -left-10 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl animate-pulse"></div>
                <h1 className="text-5xl font-black bg-gradient-to-r from-emerald-400 to-teal-500 bg-clip-text text-transparent mb-4">
                    {user?.name || "O'qituvchi Kabineti"}
                </h1>
                <p className="text-slate-400 font-medium tracking-wide">Guruhlar va o'quvchilarni boshqarish tizimi</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-10">
                {/* Groups Section */}
                <section className="glass-emerald rounded-[2.5rem] p-8">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="bg-emerald-500/10 p-3 rounded-2xl">
                            <Users className="text-emerald-400 w-8 h-8" />
                        </div>
                        <h2 className="text-2xl font-black text-white tracking-tight">Guruhlar</h2>
                    </div>

                    <form onSubmit={handleCreateGroup} className="flex gap-2 mb-8">
                        <input
                            type="text"
                            value={groupName}
                            onChange={(e) => setGroupName(e.target.value)}
                            placeholder="Guruh nomi"
                            className="flex-1 bg-slate-900/40 border border-emerald-500/20 rounded-2xl px-5 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 font-medium transition-all"
                            required
                        />
                        <button type="submit" className="bg-emerald-600 hover:bg-emerald-500 p-3 rounded-2xl transition-all btn-premium shadow-lg shadow-emerald-500/20">
                            <Plus size={24} />
                        </button>
                    </form>

                    <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                        {groups.map(group => (
                            <button
                                key={group.id}
                                onClick={() => setSelectedGroup(group.id)}
                                className={`w-full text-left p-5 rounded-2xl border transition-all duration-300 flex items-center justify-between group ${selectedGroup === group.id
                                    ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 shadow-lg shadow-emerald-500/10'
                                    : 'bg-slate-900/40 border-slate-700/30 text-slate-400 hover:border-emerald-500/30'
                                    }`}
                            >
                                <span className="font-bold">{group.name}</span>
                                <div className={`w-2 h-2 rounded-full transition-all ${selectedGroup === group.id ? 'bg-emerald-400 animate-pulse' : 'bg-slate-700'}`}></div>
                            </button>
                        ))}
                    </div>
                </section>

                {/* Students Section */}
                <section className="glass rounded-[2.5rem] p-8 border-slate-700/30">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="bg-teal-500/10 p-3 rounded-2xl">
                            <GraduationCap className="text-teal-400 w-8 h-8" />
                        </div>
                        <h2 className="text-2xl font-black text-white tracking-tight">O'quvchilar</h2>
                    </div>

                    {selectedGroup ? (
                        <>
                            <form onSubmit={handleCreateStudent} className="flex gap-2 mb-8">
                                <input
                                    type="text"
                                    value={studentName}
                                    onChange={(e) => setStudentName(e.target.value)}
                                    placeholder="F.I.SH"
                                    className="flex-1 bg-slate-900/40 border border-slate-700/50 rounded-2xl px-5 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/50 font-medium transition-all"
                                    required
                                />
                                <button type="submit" className="bg-teal-600 hover:bg-teal-500 p-3 rounded-2xl transition-all btn-premium shadow-lg shadow-teal-500/20">
                                    <Plus size={24} />
                                </button>
                            </form>

                            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                                {students.map(student => (
                                    <div key={student.id} className="glass-emerald border-transparent rounded-2xl p-4 flex justify-between items-center group/item hover:border-teal-500/30 transition-all">
                                        <div>
                                            <p className="font-bold text-white mb-1">{student.name}</p>
                                            <p className="text-[10px] text-teal-400/70 font-black tracking-widest bg-teal-500/5 px-2 py-1 rounded inline-block uppercase">ID: {student.id}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        <div className="h-64 flex flex-col items-center justify-center text-slate-500 text-sm italic text-center gap-4 px-6">
                            <div className="w-16 h-16 bg-slate-800/50 rounded-3xl flex items-center justify-center mb-2 animate-pulse">
                                <Users size={24} className="opacity-20" />
                            </div>
                            <p>O'quvchilarni ko'rish va qo'shish uchun avval chapdan guruh tanlang</p>
                        </div>
                    )}
                </section>

                {/* Quiz Launch Section */}
                <section className="glass rounded-[2.5rem] p-8 border-slate-700/30">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="bg-orange-500/10 p-3 rounded-2xl">
                            <PlayCircle className="text-orange-400 w-8 h-8" />
                        </div>
                        <h2 className="text-2xl font-black text-white tracking-tight">Unit Quiz</h2>
                    </div>

                    <div className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Unit Quiz tanlang</label>
                            <select
                                value={selectedQuizId}
                                onChange={(e) => setSelectedQuizId(e.target.value)}
                                className="w-full bg-slate-900/40 border border-slate-700/50 rounded-2xl px-5 py-4 text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50 font-medium transition-all appearance-none cursor-pointer"
                            >
                                <option value="" className="bg-slate-900">Testni tanlang...</option>
                                {unitQuizzes.map(quiz => (
                                    <option key={quiz.id} value={quiz.id} className="bg-slate-900">
                                        {quiz.level} - Unit {quiz.unit}: {quiz.title}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <button
                            onClick={handleLaunchQuiz}
                            disabled={!selectedGroup || !selectedQuizId}
                            className="w-full bg-orange-600 hover:bg-orange-500 disabled:bg-slate-800/50 disabled:text-slate-600 text-white font-black py-5 rounded-2xl transition-all shadow-xl shadow-orange-500/10 btn-premium flex items-center justify-center gap-3 mt-4"
                        >
                            <PlayCircle size={28} /> <span>Unit testni boshlash</span>
                        </button>

                        {!selectedGroup && (
                            <p className="text-[10px] text-orange-400/50 text-center mt-2 font-bold uppercase tracking-widest">
                                Guruh tanlanmagan
                            </p>
                        )}
                    </div>
                </section>
            </div>
        </div>
    );
};

export default TeacherDashboard;
