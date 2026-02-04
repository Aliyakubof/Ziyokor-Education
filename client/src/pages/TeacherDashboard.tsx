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
        const res = await apiFetch(`/api/groups/${teacherId}`);
        const data = await res.json();
        setGroups(data);
    };

    const fetchStudents = async (groupId: string) => {
        const res = await apiFetch(`/api/students/${groupId}`);
        const data = await res.json();
        setStudents(data);
    };

    const fetchUnitQuizzes = async () => {
        const res = await apiFetch('/api/unit-quizzes');
        const data = await res.json();
        setUnitQuizzes(data);
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
                    className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl transition-all border border-red-500/20"
                >
                    <LogOut size={18} /> Chiqish
                </button>
            </div>

            <header className="mb-12">
                <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-400 to-teal-500 bg-clip-text text-transparent">
                    {user?.name || "O'qituvchi Kabineti"}
                </h1>
                <p className="text-slate-400 mt-2">Guruhlar va o'quvchilarni boshqarish</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Groups Section */}
                <section className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <Users className="text-emerald-400" />
                        <h2 className="text-2xl font-semibold text-white">Guruhlar</h2>
                    </div>

                    <form onSubmit={handleCreateGroup} className="flex gap-2 mb-6">
                        <input
                            type="text"
                            value={groupName}
                            onChange={(e) => setGroupName(e.target.value)}
                            placeholder="Guruh nomi"
                            className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                            required
                        />
                        <button type="submit" className="bg-emerald-600 hover:bg-emerald-500 p-2 rounded-lg transition-colors">
                            <Plus size={20} />
                        </button>
                    </form>

                    <div className="space-y-2">
                        {groups.map(group => (
                            <button
                                key={group.id}
                                onClick={() => setSelectedGroup(group.id)}
                                className={`w-full text-left p-4 rounded-xl border transition-all ${selectedGroup === group.id
                                    ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400'
                                    : 'bg-slate-900/50 border-slate-700/30 text-slate-400 hover:border-slate-600'
                                    }`}
                            >
                                {group.name}
                            </button>
                        ))}
                    </div>
                </section>

                {/* Students Section */}
                <section className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <GraduationCap className="text-teal-400" />
                        <h2 className="text-2xl font-semibold text-white">O'quvchilar</h2>
                    </div>

                    {selectedGroup ? (
                        <>
                            <form onSubmit={handleCreateStudent} className="flex gap-2 mb-6">
                                <input
                                    type="text"
                                    value={studentName}
                                    onChange={(e) => setStudentName(e.target.value)}
                                    placeholder="F.I.SH"
                                    className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/50"
                                    required
                                />
                                <button type="submit" className="bg-teal-600 hover:bg-teal-500 p-2 rounded-lg transition-colors">
                                    <Plus size={20} />
                                </button>
                            </form>

                            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                {students.map(student => (
                                    <div key={student.id} className="bg-slate-900/50 border border-slate-700/30 rounded-xl p-3 flex justify-between items-center">
                                        <div>
                                            <p className="font-medium text-white text-sm">{student.name}</p>
                                            <p className="text-xs text-emerald-500/70 font-mono">ID: {student.id}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        <div className="h-40 flex items-center justify-center text-slate-500 text-sm italic">
                            O'quvchilarni ko'rish uchun guruh tanlang
                        </div>
                    )}
                </section>

                {/* quiz Launch Section */}
                <section className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <PlayCircle className="text-orange-400" />
                        <h2 className="text-2xl font-semibold text-white">Quiz Boshlash</h2>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1">Unit Quiz tanlang</label>
                            <select
                                value={selectedQuizId}
                                onChange={(e) => setSelectedQuizId(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                            >
                                <option value="">Tanlang...</option>
                                {unitQuizzes.map(quiz => (
                                    <option key={quiz.id} value={quiz.id}>
                                        {quiz.level} - Unit {quiz.unit}: {quiz.title}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <button
                            onClick={handleLaunchQuiz}
                            disabled={!selectedGroup || !selectedQuizId}
                            className="w-full bg-orange-600 hover:bg-orange-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-orange-900/20 flex items-center justify-center gap-2 mt-4"
                        >
                            <PlayCircle size={24} /> Start Unit Quiz
                        </button>

                        {!selectedGroup && (
                            <p className="text-xs text-orange-400/70 text-center mt-2 italic">
                                Quizni boshlash uchun avval guruh tanlang
                            </p>
                        )}
                    </div>
                </section>
            </div>
        </div>
    );
};

export default TeacherDashboard;
