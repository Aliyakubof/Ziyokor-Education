import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { apiFetch } from '../api';
import { Users, LogOut, ArrowLeft, Shield, BarChart3, GraduationCap, ChevronRight } from 'lucide-react';
import logo from '../assets/logo.jpeg';
import ManagerTeacherGroups from '../components/manager/ManagerTeacherGroups';
import ManagerGroupResults from '../components/manager/ManagerGroupResults';
import ManagerGroupContactsModal from '../components/manager/ManagerGroupContactsModal';

interface Teacher {
    id: string;
    name: string;
    phone: string;
    group_count: string;
    student_count: string;
}

interface Group {
    id: string;
    name: string;
    level: string;
    student_count: string;
}

const ManagerDashboard: React.FC = () => {
    const navigate = useNavigate();
    const { user, logout } = useAuth();

    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [loading, setLoading] = useState(true);

    // View state management
    const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
    const [selectedGroupForResults, setSelectedGroupForResults] = useState<Group | null>(null);
    const [selectedGroupForContacts, setSelectedGroupForContacts] = useState<Group | null>(null);

    useEffect(() => {
        fetchTeachers();
    }, []);

    const fetchTeachers = async () => {
        setLoading(true);
        try {
            const res = await apiFetch('/api/manager/teachers');
            const data = await res.json();
            setTeachers(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Error fetching teachers for manager:', err);
            setTeachers([]);
        } finally {
            setLoading(false);
        }
    };

    const handleBack = () => {
        if (selectedGroupForResults) {
            setSelectedGroupForResults(null);
        } else if (selectedTeacher) {
            setSelectedTeacher(null);
        } else {
            navigate('/');
        }
    };

    const renderDashboardContent = () => {
        if (selectedGroupForResults) {
            return (
                <ManagerGroupResults
                    group={selectedGroupForResults}
                    onBack={() => setSelectedGroupForResults(null)}
                />
            );
        }

        if (selectedTeacher) {
            return (
                <ManagerTeacherGroups
                    teacherId={selectedTeacher.id}
                    teacherName={selectedTeacher.name}
                    onBack={() => setSelectedTeacher(null)}
                    onViewGroupResults={setSelectedGroupForResults}
                    onViewGroupStudents={setSelectedGroupForContacts}
                />
            );
        }

        return (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-200">
                    <div>
                        <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3">
                            <Shield className="text-indigo-600" /> Barcha O'qituvchilar
                        </h2>
                        <p className="text-slate-500 font-medium text-sm mt-1 uppercase tracking-widest">
                            Natijalarni ko'rish uchun o'qituvchini tanlang
                        </p>
                    </div>
                </div>

                {loading ? (
                    <div className="text-center py-12 text-slate-500 font-medium tracking-widest uppercase text-sm">Ma'lumotlar yuklanmoqda...</div>
                ) : teachers.length === 0 ? (
                    <div className="text-center py-12 bg-slate-50 rounded-2xl border border-slate-200 text-slate-500 font-medium tracking-widest uppercase text-sm">
                        O'qituvchilar topilmadi.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {teachers.map(teacher => (
                            <div
                                key={teacher.id}
                                onClick={() => setSelectedTeacher(teacher)}
                                className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm hover:border-indigo-400 hover:shadow-lg transition-all cursor-pointer group relative overflow-hidden flex flex-col justify-between"
                            >
                                {/* Decorative background shape */}
                                <div className="absolute -right-8 -top-8 w-32 h-32 bg-indigo-50 rounded-full group-hover:scale-150 transition-transform duration-500 ease-out z-0 pointer-events-none"></div>

                                <div className="relative z-10">
                                    <div className="flex items-center justify-between mb-6">
                                        <div className="w-14 h-14 bg-indigo-100 rounded-2xl flex items-center justify-center text-indigo-700 shadow-inner">
                                            <GraduationCap size={28} />
                                        </div>
                                        <div className="bg-slate-50 px-3 py-1 rounded-full border border-slate-100 flex items-center gap-2 group-hover:bg-white transition-colors">
                                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Faol</span>
                                        </div>
                                    </div>

                                    <h3 className="text-xl font-black text-slate-800 mb-2 truncate group-hover:text-indigo-700 transition-colors" title={teacher.name}>
                                        {teacher.name}
                                    </h3>

                                    <div className="grid grid-cols-2 gap-4 mt-6">
                                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 group-hover:border-indigo-100 transition-colors">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Guruhlar</p>
                                            <p className="text-2xl font-black text-slate-700 flex items-center gap-2">
                                                {teacher.group_count || 0}
                                            </p>
                                        </div>
                                        <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100 group-hover:border-indigo-200 transition-colors">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-1">O'quvchilar</p>
                                            <p className="text-2xl font-black text-indigo-700 flex items-center gap-2">
                                                <Users size={18} className="text-indigo-400" />
                                                {teacher.student_count || 0}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="relative z-10 mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-indigo-600 font-bold text-sm tracking-wide uppercase">
                                    Batafsil ko'rish
                                    <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-transparent p-4 md:p-8 max-w-7xl mx-auto font-sans text-slate-900">
            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 lg:mb-12 pb-6 border-b border-indigo-100/50 relative z-10 bg-white/50 backdrop-blur-md rounded-3xl px-6 py-4 shadow-sm border border-white">
                <div className="flex items-center gap-4">
                    <img src={logo} alt="Ziyokor Logo" className="h-12 w-auto md:h-16 object-contain rounded-2xl shadow-sm" />
                    <div>
                        <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
                            Menejer Paneli
                        </h1>
                        <p className="text-indigo-600 font-bold text-sm uppercase tracking-widest flex items-center gap-2">
                            <BarChart3 size={16} /> O'quv jarayonlari nazorati
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-4 justify-end">
                    <div className="text-right hidden md:block">
                        <p className="text-sm font-black text-slate-800 leading-tight">{user?.name || 'Menejer'}</p>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Administrator</p>
                    </div>
                    <div className="h-10 w-px bg-slate-200 hidden md:block mx-2"></div>
                    <button
                        onClick={handleBack}
                        className="p-3 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-xl transition-all font-medium"
                        title="Orqaga / Bosh sahifaga"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <button
                        onClick={() => {
                            logout();
                            navigate('/login');
                        }}
                        className="flex items-center gap-2 px-4 py-2.5 bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 rounded-xl transition-colors border border-red-200 font-bold text-sm shadow-sm"
                    >
                        <LogOut size={18} /> <span className="hidden sm:inline uppercase tracking-widest text-[10px]">Chiqish</span>
                    </button>
                </div>
            </header>

            {/* Main Content Area */}
            <main>
                {renderDashboardContent()}
            </main>

            {/* Modals */}
            {selectedGroupForContacts && (
                <ManagerGroupContactsModal
                    group={selectedGroupForContacts}
                    onClose={() => setSelectedGroupForContacts(null)}
                />
            )}
        </div>
    );
};

export default ManagerDashboard;
