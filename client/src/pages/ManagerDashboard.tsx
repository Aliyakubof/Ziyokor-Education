import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { apiFetch } from '../api';
import { Users, LogOut, ArrowLeft, Shield, BarChart3, GraduationCap, ChevronRight } from 'lucide-react';
import logo from '../assets/logo.jpeg';
import ManagerTeacherGroups from '../components/manager/ManagerTeacherGroups';
import ManagerGroupResults from '../components/manager/ManagerGroupResults';
import ManagerGroupContactsModal from '../components/manager/ManagerGroupContactsModal';
import ManagerShop from '../components/manager/ManagerShop';
import ManagerVocabulary from '../components/manager/ManagerVocabulary';
import ManagerSettings from '../components/manager/ManagerSettings';
import ManagerCarousel from '../components/manager/ManagerCarousel';

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
    const [activeTab, setActiveTab] = useState<'teachers' | 'shop' | 'vocabulary' | 'settings' | 'carousel'>('teachers');
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
            console.log('Manager teachers API status:', res.status);

            if (!res.ok) {
                const errorText = await res.text();
                console.error('Manager teachers API error body:', errorText);
                throw new Error(`Xatolik: ${res.status}`);
            }

            const data = await res.json();
            console.log('Manager teachers data received:', data);
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
        } else if (activeTab !== 'teachers') {
            setActiveTab('teachers');
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

        if (activeTab === 'shop') return <ManagerShop />;
        if (activeTab === 'vocabulary') return <ManagerVocabulary />;
        if (activeTab === 'settings') return <ManagerSettings />;
        if (activeTab === 'carousel') return <ManagerCarousel />;

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
                                className="bg-white rounded-2xl p-6 border border-slate-200 hover:border-indigo-400 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
                            >
                                <div>
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                                            <GraduationCap size={24} />
                                        </div>
                                    </div>

                                    <h3 className="text-lg font-bold text-slate-800 mb-4 group-hover:text-indigo-600 transition-colors truncate" title={teacher.name}>
                                        {teacher.name}
                                    </h3>

                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between text-sm text-slate-500 font-medium">
                                            <span className="flex items-center gap-2">
                                                <BarChart3 size={16} className="text-slate-300" /> Guruhlar
                                            </span>
                                            <span className="text-slate-900">{teacher.group_count || 0}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-sm text-slate-500 font-medium">
                                            <span className="flex items-center gap-2">
                                                <Users size={16} className="text-slate-300" /> O'quvchilar
                                            </span>
                                            <span className="text-slate-900">{teacher.student_count || 0}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-6 pt-4 border-t border-slate-50 flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-indigo-600 opacity-0 group-hover:opacity-100 transition-all">
                                    Batafsil ko'rish
                                    <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
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
                        <nav className="flex items-center gap-1 mt-2">
                            <button
                                onClick={() => { setActiveTab('teachers'); setSelectedTeacher(null); }}
                                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'teachers' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-100'}`}
                            >
                                O'qituvchilar
                            </button>
                            <button
                                onClick={() => { setActiveTab('shop'); setSelectedTeacher(null); }}
                                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'shop' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-100'}`}
                            >
                                Do'kon
                            </button>
                            <button
                                onClick={() => { setActiveTab('vocabulary'); setSelectedTeacher(null); }}
                                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'vocabulary' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-100'}`}
                            >
                                Lug'atlar
                            </button>
                            <button
                                onClick={() => { setActiveTab('settings'); setSelectedTeacher(null); }}
                                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'settings' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-100'}`}
                            >
                                Sozlamalar
                            </button>
                            <button
                                onClick={() => { setActiveTab('carousel'); setSelectedTeacher(null); }}
                                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'carousel' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-100'}`}
                            >
                                Karusel
                            </button>
                        </nav>
                    </div>
                </div>

                <div className="flex items-center gap-4 justify-end">
                    <div className="text-right hidden md:block">
                        <p className="text-sm font-black text-slate-800 leading-tight">{user?.name || 'Menejer'}</p>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Administrator</p>
                    </div>
                    <div className="h-10 w-px bg-slate-200 hidden md:block mx-2"></div>

                    <a
                        href="https://t.me/Z_education_bot?start=manager"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-2 bg-[#0088cc] text-white hover:bg-[#0077b5] rounded-xl transition-all font-bold text-xs shadow-sm"
                    >
                        <Shield size={16} /> <span className="hidden sm:inline">BOTGA ULANISH</span>
                    </a>

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
