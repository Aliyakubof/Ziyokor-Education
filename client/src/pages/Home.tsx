import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { LogIn, Settings, Users, PlusCircle, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
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

    const slides = [
        {
            image: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=1200&auto=format&fit=crop",
            title: "Interaktiv Ta'lim",
            description: "O'quvchilar uchun qiziqarli va samarali bilim olish tizimi"
        },
        {
            image: "https://images.unsplash.com/photo-1509062522246-3755977927d7?q=80&w=1200&auto=format&fit=crop",
            title: "Guruhlar Boshqaruvi",
            description: "O'qituvchilar uchun qulay va tezkor guruh nazorati"
        },
        {
            image: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=1200&auto=format&fit=crop",
            title: "Bilimni Sinash",
            description: "Zamonaviy testlar va natijalarni real vaqtda kuzatish"
        }
    ];

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentSlide(prev => (prev + 1) % slides.length);
        }, 5000);
        return () => clearInterval(timer);
    }, []);

    const nextSlide = () => setCurrentSlide(prev => (prev + 1) % slides.length);
    const prevSlide = () => setCurrentSlide(prev => (prev - 1 + slides.length) % slides.length);

    useEffect(() => {
        if (isAuthenticated) {
            if (role === 'student') {
                navigate('/student/dashboard');
            } else {
                fetchStats();
            }
        }
    }, [isAuthenticated, role, user]);

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
        <div className="min-h-screen bg-transparent font-sans text-slate-900 flex flex-col">
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
                                src={slide.image}
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

                    {/* Create Quiz - Only for Admin */}
                    {role === 'admin' && (
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
