import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { LogIn, Settings, Users, PlusCircle, ArrowRight, ChevronLeft, ChevronRight, Send, Swords, Shield } from 'lucide-react';
import { apiFetch } from '../api';
import logo from '../assets/logo.jpeg';

export default function Home() {
    const { isAuthenticated, role, logout, user } = useAuth();
    const navigate = useNavigate();
    const [pin, setPin] = useState('');
    const [stats, setStats] = useState({
        teachers: 0,
        groups: 0,
        quizzes: 0
    });
    const [currentSlide, setCurrentSlide] = useState(0);
    const [soloQuizStatus, setSoloQuizStatus] = useState<'on' | 'off'>('on');
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

    const [staticSlides] = useState([
        {
            image_url: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=1200&auto=format&fit=crop",
            title: "Interaktiv Ta'lim",
            description: "O'quvchilar uchun qiziqarli va samarali bilim olish tizimi"
        },
        {
            image_url: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=1200&auto=format&fit=crop",
            title: "Guruhlar Boshqaruvi",
            description: "O'qituvchilar uchun qulay va tezkor guruh nazorati"
        },
        {
            image_url: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?q=80&w=1200&auto=format&fit=crop",
            title: "Bilimni Sinash",
            description: "Zamonaviy testlar va natijalarni real vaqtda kuzatish"
        }
    ]);

    const [slides, setSlides] = useState<any[]>([]);

    useEffect(() => {
        const fetchSlides = async () => {
            try {
                const res = await apiFetch('/api/carousel');
                if (res.ok) {
                    const data = await res.json();
                    if (Array.isArray(data) && data.length > 0) {
                        setSlides(data);
                    } else {
                        setSlides(staticSlides);
                    }
                } else {
                    setSlides(staticSlides);
                }
            } catch (err) {
                console.error('Error fetching slides:', err);
                setSlides(staticSlides);
            }
        };

        fetchSlides();
    }, [staticSlides]);

    useEffect(() => {
        if (slides.length <= 1) return;
        const timer = setInterval(() => {
            setCurrentSlide(prev => (prev + 1) % slides.length);
        }, 5000);
        return () => clearInterval(timer);
    }, [slides]);

    const nextSlide = () => setCurrentSlide(prev => (prev + 1) % slides.length);
    const prevSlide = () => setCurrentSlide(prev => (prev - 1 + slides.length) % slides.length);

    useEffect(() => {
        if (isAuthenticated) {
            fetchStats();
            if (role === 'admin' || role === 'teacher') {
                fetchSoloQuizStatus();
            }
        }
    }, [isAuthenticated, role, user]);

    const fetchSoloQuizStatus = async () => {
        try {
            const res = await apiFetch('/api/settings/solo_quiz_status');
            if (res.ok) {
                const data = await res.json();
                if (data.value) setSoloQuizStatus(data.value);
            }
        } catch (err) {
            console.error('Error fetching solo quiz status:', err);
        }
    };

    const toggleSoloQuizStatus = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsUpdatingStatus(true);
        const newStatus = soloQuizStatus === 'on' ? 'off' : 'on';
        try {
            const res = await apiFetch(`/api/manager/settings/solo_quiz_status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ value: newStatus })
            });
            if (res.ok) {
                setSoloQuizStatus(newStatus);
            }
        } catch (err) {
            console.error('Error toggling solo quiz status:', err);
        } finally {
            setIsUpdatingStatus(false);
        }
    };

    const fetchStats = async () => {
        try {
            if (role === 'admin') {
                const res = await apiFetch('/api/admin/stats');
                const data = await res.json();
                setStats(data);
            } else if (role === 'teacher' && user?.id) {
                const res = await apiFetch(`/api/teacher/${user.id}/stats`);
                const data = await res.json();
                setStats({ ...data, teachers: 0 }); // Teachers don't see teacher count
            } else {
                // Guest or public view - maybe show general stats if needed, or just 0
                const quizRes = await apiFetch('/api/unit-quizzes');
                const quizzes = await quizRes.json();
                setStats(prev => ({ ...prev, quizzes: Array.isArray(quizzes) ? quizzes.length : 0 }));
            }
        } catch (err) {
            console.error("Error fetching stats:", err);
        }
    };

    const handleJoin = (e: React.FormEvent) => {
        e.preventDefault();
        if (pin.length === 6) {
            if (role === 'student' && user?.id) {
                localStorage.setItem('student-id', user.id);
            }
            navigate(`/unit-join/${pin}`);
        } else {
            alert("Iltimos, 6 xonali PIN kodni kiriting");
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900 flex flex-col relative z-0">
            {/* Navbar */}
            <nav className="border-b border-slate-100 py-4 px-6 md:px-12 bg-white sticky top-0 z-50 shadow-sm">
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    {/* Brand to the left */}
                    <div className="flex items-center gap-2">
                        <img src={logo} alt="Ziyokor" className="h-10 w-auto rounded-lg shadow-sm" />
                        <span className="font-black text-2xl tracking-tighter text-slate-900 uppercase">Ziyokor</span>
                    </div>

                    {/* Right Actions */}
                    <div className="flex items-center gap-4">
                        {isAuthenticated ? (
                            <div className="flex items-center gap-4">
                                <span className="text-sm font-semibold text-slate-600 hidden md:inline">{user?.name}</span>
                                <button
                                    onClick={() => {
                                        logout();
                                        navigate('/login');
                                    }}
                                    className="text-sm font-bold text-red-600 hover:text-red-700 transition-colors"
                                >
                                    Chiqish
                                </button>
                            </div>
                        ) : (
                            <Link
                                to="/login"
                                className="text-sm font-bold text-indigo-600 hover:text-indigo-700 transition-colors flex items-center gap-1"
                            >
                                <LogIn size={16} /> Kirish
                            </Link>
                        )}
                    </div>
                </div>
            </nav>

            {/* Main Content Area */}
            <main className="flex-1 max-w-7xl mx-auto w-full p-6 md:p-12 flex flex-col items-center">

                {/* Carousel */}
                <div className="w-full max-w-6xl mb-8 relative group h-[250px] md:h-[380px] overflow-hidden rounded-3xl shadow-xl">
                    {slides.map((slide, index) => (
                        <div
                            key={index}
                            className={`absolute inset-0 transition-all duration-1000 ease-in-out ${index === currentSlide ? 'opacity-100 scale-100' : 'opacity-0 scale-105'
                                }`}
                        >
                            <img
                                src={slide.image_url.startsWith('http') ? slide.image_url : `${import.meta.env.VITE_BACKEND_URL || ''}${slide.image_url}`}
                                alt={slide.title}
                                className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/20 to-transparent"></div>
                            <div className="absolute bottom-10 left-10 right-10 text-white">
                                <h2 className="text-3xl md:text-5xl font-black mb-2 tracking-tight">{slide.title}</h2>
                                <p className="text-lg md:text-xl text-slate-200 font-medium max-w-xl">{slide.description}</p>
                            </div>
                        </div>
                    ))}

                    {/* Navigation Buttons */}
                    <button
                        onClick={prevSlide}
                        className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 backdrop-blur-md text-white p-3 rounded-full opacity-0 group-hover:opacity-100 transition-all transform -translate-x-4 group-hover:translate-x-0"
                    >
                        <ChevronLeft size={24} />
                    </button>
                    <button
                        onClick={nextSlide}
                        className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 backdrop-blur-md text-white p-3 rounded-full opacity-0 group-hover:opacity-100 transition-all transform translate-x-4 group-hover:translate-x-0"
                    >
                        <ChevronRight size={24} />
                    </button>

                    {/* Dots */}
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
                        {slides.map((_, index) => (
                            <button
                                key={index}
                                onClick={() => setCurrentSlide(index)}
                                className={`h-2 rounded-full transition-all ${index === currentSlide ? 'w-8 bg-white' : 'w-2 bg-white/40'
                                    }`}
                            />
                        ))}
                    </div>
                </div>

                {/* Cards Grid - Use flex for better centering when fewer cards are present */}
                <div className="flex flex-wrap justify-center gap-6 w-full max-w-6xl">

                    {/* Admin - Only for Admin */}
                    {role === 'admin' && (
                        <Link to="/admin" className="w-full md:w-[280px] group bg-slate-50 hover:bg-white border border-slate-200 hover:border-indigo-200 rounded-2xl p-8 transition-all hover:shadow-xl hover:shadow-indigo-500/10 flex flex-col items-center relative overflow-hidden">
                            <div className="bg-blue-100 text-blue-600 p-4 rounded-xl mb-6 group-hover:scale-110 transition-transform">
                                <Settings size={32} />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 mb-2">Admin Panel</h3>
                            <p className="text-slate-500 text-sm font-medium mb-4">O'qituvchilar boshqaruvi</p>
                            <span className="inline-flex items-center justify-center bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                                {stats.teachers} ta O'qituvchi
                            </span>
                        </Link>
                    )}

                    {/* Manager - Only for Manager or Admin */}
                    {(role === 'manager' || role === 'admin') && (
                        <Link to="/manager" className="w-full md:w-[280px] group bg-indigo-50 hover:bg-white border border-indigo-100 hover:border-indigo-300 rounded-2xl p-8 transition-all hover:shadow-xl hover:shadow-indigo-500/10 flex flex-col items-center relative overflow-hidden">
                            <div className="bg-indigo-600 text-white p-4 rounded-xl mb-6 group-hover:scale-110 transition-transform shadow-lg shadow-indigo-200">
                                <Users size={32} />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 mb-2">Menejer Paneli</h3>
                            <p className="text-slate-500 text-sm font-medium mb-4">Natijalar nazorati</p>
                            <span className="inline-flex items-center justify-center bg-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                                Monitoring
                            </span>
                        </Link>
                    )}

                    {/* Student Dashboard */}
                    {role === 'student' && (
                        <Link to="/student/dashboard" className="w-full md:w-[280px] group bg-slate-50 hover:bg-white border border-slate-200 hover:border-indigo-200 rounded-2xl p-8 transition-all hover:shadow-xl hover:shadow-indigo-500/10 flex flex-col items-center relative overflow-hidden">
                            <div className="bg-indigo-100 text-indigo-600 p-4 rounded-xl mb-6 group-hover:scale-110 transition-transform">
                                <Users size={32} />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 mb-2">Kabinetim</h3>
                            <p className="text-slate-500 text-sm font-medium mb-4">Statistika va Tarix</p>
                        </Link>
                    )}

                    {/* Teacher - Only for Admin or Teacher */}
                    {(role === 'admin' || role === 'teacher') && (
                        <Link to={role === 'admin' ? "/admin/groups" : "/teacher"} className="w-full md:w-[280px] group bg-slate-50 hover:bg-white border border-slate-200 hover:border-emerald-200 rounded-2xl p-8 transition-all hover:shadow-xl hover:shadow-emerald-500/10 flex flex-col items-center relative overflow-hidden">
                            <div className="bg-emerald-100 text-emerald-600 p-4 rounded-xl mb-6 group-hover:scale-110 transition-transform">
                                <Users size={32} />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 mb-2">O'qituvchi</h3>
                            <p className="text-slate-500 text-sm font-medium mb-4">Guruhlar va o'quvchilar</p>
                            {role === 'teacher' && (
                                <span className="inline-flex items-center justify-center bg-emerald-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                                    {stats.groups} ta Guruh
                                </span>
                            )}
                        </Link>
                    )}

                    {/* Create Quiz - For Admin or Teacher */}
                    {(role === 'admin' || role === 'teacher') && (
                        <Link to="/create" className="w-full md:w-[280px] group bg-slate-50 hover:bg-white border border-slate-200 hover:border-violet-200 rounded-2xl p-8 transition-all hover:shadow-xl hover:shadow-violet-500/10 flex flex-col items-center relative overflow-hidden">
                            <div className="bg-violet-100 text-violet-600 p-4 rounded-xl mb-6 group-hover:scale-110 transition-transform">
                                <PlusCircle size={32} />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 mb-2">Quiz yaratish</h3>
                            <p className="text-slate-500 text-sm font-medium mb-4">Yangi testlar to'plami</p>
                            <span className="inline-flex items-center justify-center bg-violet-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                                {stats.quizzes} ta Quiz
                            </span>
                        </Link>
                    )}

                    {/* Vocab Battles Create - For Admin or Teacher */}
                    {(role === 'admin' || role === 'teacher') && (
                        <Link to="/admin/vocab-battles" className="w-full md:w-[280px] group bg-slate-50 hover:bg-white border border-slate-200 hover:border-pink-200 rounded-2xl p-8 transition-all hover:shadow-xl hover:shadow-pink-500/10 flex flex-col items-center relative overflow-hidden">
                            <div className="bg-pink-100 text-pink-600 p-4 rounded-xl mb-6 group-hover:scale-110 transition-transform">
                                <PlusCircle size={32} />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 mb-2">Vocab Battle</h3>
                            <p className="text-slate-500 text-sm font-medium mb-4">Lug'at musobaqalari</p>
                            <span className="inline-flex items-center justify-center bg-pink-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                                Boshqarish
                            </span>
                        </Link>
                    )}

                    {/* Duel Quizzes - For Admin or Teacher */}
                    {(role === 'admin' || role === 'teacher') && (
                        <Link to="/manage-duels" className="w-full md:w-[280px] group bg-slate-50 hover:bg-white border border-slate-200 hover:border-rose-200 rounded-2xl p-8 transition-all hover:shadow-xl hover:shadow-rose-500/10 flex flex-col items-center relative overflow-hidden">
                            <div className="bg-rose-100 text-rose-600 p-4 rounded-xl mb-6 group-hover:scale-110 transition-transform">
                                <Swords size={32} />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 mb-2">Duel Savollari</h3>
                            <p className="text-slate-500 text-sm font-medium mb-4">Savollar bazasini boshqarish</p>
                            <span className="inline-flex items-center justify-center bg-rose-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                                Boshqarish
                            </span>
                        </Link>
                    )}

                    {/* SoloQuiz Create & Control - For Admin or Teacher */}
                    {(role === 'admin' || role === 'teacher') && (
                        <div className="w-full md:w-[280px] group bg-white border border-slate-200 hover:border-indigo-200 rounded-3xl p-8 transition-all hover:shadow-xl hover:shadow-indigo-500/10 flex flex-col items-center relative overflow-hidden">
                            <div className="flex justify-between w-full mb-6">
                                <div 
                                    onClick={() => navigate('/create?type=solo')}
                                    className="bg-indigo-600 text-white p-4 rounded-xl cursor-pointer group-hover:scale-110 transition-transform shadow-lg shadow-indigo-100"
                                >
                                    <Shield size={32} />
                                </div>
                                <div className="flex flex-col items-end gap-1.5">
                                    <button
                                        onClick={toggleSoloQuizStatus}
                                        disabled={isUpdatingStatus}
                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-300 focus:outline-none ${soloQuizStatus === 'on' ? 'bg-emerald-500' : 'bg-slate-200'}`}
                                    >
                                        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform duration-300 ${soloQuizStatus === 'on' ? 'translate-x-6' : 'translate-x-1'}`} />
                                    </button>
                                    <span className={`text-[8px] font-black uppercase tracking-widest ${soloQuizStatus === 'on' ? 'text-emerald-600' : 'text-slate-400'}`}>
                                        {soloQuizStatus === 'on' ? 'ONLINE' : 'OFFLINE'}
                                    </span>
                                </div>
                            </div>
                            <div 
                                onClick={() => navigate('/create?type=solo')}
                                className="text-center cursor-pointer"
                            >
                                <h3 className="text-lg font-bold text-slate-900 mb-2">SoloQuiz Yaratish</h3>
                                <p className="text-slate-500 text-sm font-medium">Boshlamoqchi bo'lganlar uchun</p>
                            </div>
                        </div>
                    )}

                    {/* Telegram Bot Questions - For Admin or Teacher */}
                    {(role === 'admin' || role === 'teacher') && (
                        <Link to="/admin/telegram-questions" className="w-full md:w-[280px] group bg-slate-50 hover:bg-white border border-slate-200 hover:border-sky-200 rounded-2xl p-8 transition-all hover:shadow-xl hover:shadow-sky-500/10 flex flex-col items-center relative overflow-hidden">
                            <div className="bg-sky-100 text-sky-600 p-4 rounded-xl mb-6 group-hover:scale-110 transition-transform">
                                <Send size={32} className="rotate-0" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 mb-2">Telegram Bot</h3>
                            <p className="text-slate-500 text-sm font-medium mb-4">Savol yaratish</p>
                            <span className="inline-flex items-center justify-center bg-sky-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                                Savollar
                            </span>
                        </Link>
                    )}

                    {/* Unit Entry (Input) - ONLY FOR STUDENTS OR GUESTS (NOT TEACHERS/ADMINS) */}
                    {(role === 'student' || !isAuthenticated) && (
                        <div className="w-full md:w-[320px] bg-indigo-600 rounded-2xl p-8 text-white flex flex-col items-center relative overflow-hidden shadow-xl shadow-indigo-600/20">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
                            <h3 className="text-lg font-bold mb-1 relative z-10">Unitga kirish</h3>
                            <p className="text-indigo-200 text-xs font-medium mb-6 relative z-10">Test topshirish bo'limi</p>

                            <form onSubmit={handleJoin} className="w-full relative z-10">
                                <input
                                    type="text"
                                    placeholder="6 xonali PIN"
                                    value={pin}
                                    onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                    className="w-full bg-white/20 border border-white/30 rounded-xl px-4 py-3 text-white placeholder:text-indigo-200 font-mono text-center font-bold tracking-widest focus:outline-none focus:bg-white/30 mb-3"
                                />
                                <button type="submit" className="w-full bg-white text-indigo-600 font-bold py-3 rounded-xl hover:bg-indigo-50 transition-colors flex items-center justify-center gap-2">
                                    Boshlash <ArrowRight size={16} />
                                </button>
                            </form>
                        </div>
                    )}
                </div>
            </main>

            <footer className="py-6 text-center text-slate-400 text-sm font-medium">
                &copy; {new Date().getFullYear()} Ziyokor Education Platform
            </footer>
        </div>
    );
}
