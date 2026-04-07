import { useState } from 'react';
import { useAuth } from '../AuthContext';
import { apiFetch } from '../api';
import imageCompression from 'browser-image-compression';
import { LayoutDashboard, History, UserCircle, LogOut } from 'lucide-react';
import logo from '../assets/logo.jpeg';

// Modular Components
import XPProgress from '../components/StudentDashboard/XPProgress';
import BattleCard from '../components/StudentDashboard/BattleCard';
import JoinGameCard from '../components/StudentDashboard/JoinGameCard';
import QuickStats from '../components/StudentDashboard/QuickStats';
import NavGrid from '../components/StudentDashboard/NavGrid';
import BookingCard from '../components/StudentDashboard/BookingCard';
import RankCard from '../components/StudentDashboard/RankCard';
import TelegramBanner from '../components/StudentDashboard/TelegramBanner';
import HistoryTab from '../components/StudentDashboard/HistoryTab';
import ProfileTab from '../components/StudentDashboard/ProfileTab';
import BookingModal from '../components/StudentDashboard/BookingModal';
import MobileNav from '../components/StudentDashboard/MobileNav';
import { useStudentData } from '../contexts/StudentDataContext';

export default function StudentDashboard() {
    const { user, logout } = useAuth();
    const { stats, battle, history, bookings, isLoading, refreshData } = useStudentData();
    const [activeTab, setActiveTab] = useState<'home' | 'history' | 'profile'>('home');
    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
    const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);

    const { myBooking, otherBookings, groupSettings, availableTopics } = bookings;

    const handleBook = async (slot: string, topic: string, bookingDate: string) => {
        if (!groupSettings?.extra_class_days || groupSettings.extra_class_days.length === 0) {
            alert("Hali qo'shimcha dars kunlari belgilanmagan!");
            return;
        }
        if (!window.confirm(`${bookingDate} — ${slot} vaqtiga bron qilmoqchimisiz?`)) return;

        try {
            const res = await apiFetch(`/api/students/${user?.id}/book-extra-class`, {
                method: 'POST',
                body: JSON.stringify({
                    groupId: stats?.groupId || '',
                    timeSlot: slot,
                    topic: topic,
                    bookingDate: bookingDate
                })
            });
            if (res.ok) {
                setIsBookingModalOpen(false);
                refreshData();
            } else {
                const err = await res.json();
                alert(err.error || "Xatolik yuz berdi!");
            }
        } catch (err) {
            alert("Xatolik!");
        }
    };

    const cancelBooking = async () => {
        if (!myBooking) return;

        const daysMap: Record<string, number> = {
            'Dushanba': 1, 'Seshanba': 2, 'Chorshanba': 3, 'Payshanba': 4, 'Juma': 5, 'Shanba': 6, 'Yakshanba': 0
        };

        const now = new Date();
        const extraDays = groupSettings?.extra_class_days || [];
        
        let canCancel = true;
        for (const dayName of extraDays) {
            const dayNum = daysMap[dayName];
            if (dayNum !== undefined) {
                const nextDay = new Date();
                nextDay.setDate(now.getDate() + ((dayNum + 7 - now.getDay()) % 7));
                if (nextDay.toDateString() === now.toDateString()) {
                    canCancel = false;
                    break;
                }
                const diffHours = (nextDay.getTime() - now.getTime()) / (1000 * 60 * 60);
                if (diffHours < 24) {
                    canCancel = false;
                    break;
                }
            }
        }

        if (!canCancel) {
            alert("Darsga 24 soatdan kam vaqt qoldi. Bekor qilib bo'lmaydi!");
            return;
        }

        if (!window.confirm("Bronni bekor qilmoqchimisiz?")) return;
        
        try {
            const res = await apiFetch(`/api/extra-class-bookings/${myBooking.id}`, { method: 'DELETE' });
            if (res.ok) {
                refreshData();
            }
        } catch (e) {
            alert("Xatolik!");
        }
    };

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user?.id) return;

        try {
            setIsUploadingAvatar(true);
            const options = {
                maxSizeMB: 0.1,
                maxWidthOrHeight: 400,
                useWebWorker: true,
                fileType: "image/jpeg"
            };

            const compressedBlob = await imageCompression(file, options);
            const reader = new FileReader();
            reader.readAsDataURL(compressedBlob);
            reader.onloadend = async () => {
                const base64data = reader.result;
                const res = await apiFetch(`/api/student/${user.id}/avatar`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ avatar_url: base64data })
                });

                if (res.ok) {
                    refreshData();
                } else {
                    const errInfo = await res.json();
                    alert(errInfo.error || "Rasm joylashda xatolik yuz berdi");
                }
                setIsUploadingAvatar(false);
            };
        } catch (error) {
            console.error(error);
            alert("Rasmni qayta ishlashda xatolik!");
            setIsUploadingAvatar(false);
        }
    };

    return (
        <div className="min-h-screen font-sans pb-24 md:pb-12 relative overflow-hidden transition-colors duration-500" style={{ backgroundColor: 'var(--bg-color)' }}>
            {/* Background Gradients */}
            <div 
                className="absolute top-0 left-0 w-full h-full z-0 opacity-100 transition-colors duration-1000"
                style={{ background: `linear-gradient(to bottom, var(--bg-gradient-from, #f8fafc), var(--bg-gradient-to, transparent))` }}
            ></div>
            <div 
                className="absolute top-[-100px] right-[-100px] w-[500px] h-[500px] rounded-full blur-[120px] z-0 opacity-50"
                style={{ backgroundColor: 'var(--primary-color, #4f46e5)' }}
            ></div>
            <div 
                className="absolute top-[200px] left-[-100px] w-[400px] h-[400px] rounded-full blur-[100px] z-0 opacity-30"
                style={{ backgroundColor: 'var(--secondary-color, #3b82f6)' }}
            ></div>

            <div className="max-w-7xl mx-auto md:px-8 relative z-10">
                <div className="flex flex-col lg:grid lg:grid-cols-12 lg:gap-12 lg:pt-12">

                    {/* Left Column / Header Section (Mobile: Top, Laptop: Aside) */}
                    <header className="lg:col-span-4 px-6 pt-8 pb-6 h-fit lg:sticky lg:top-8 transition-colors" style={{ color: 'var(--text-color)' }}>
                        <div className="flex justify-between items-start mb-6 font-sans">
                            <div className="flex items-center gap-3 flex-1 min-w-0 pr-4">
                                <div className="w-14 h-14 rounded-2xl flex-shrink-0 flex items-center justify-center border-2 shadow-lg overflow-hidden relative" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)', color: 'var(--primary-color)' }}>
                                    {stats?.avatarUrl ? (
                                        <img 
                                            src={stats.avatarUrl?.startsWith('/uploads') ? `${import.meta.env.VITE_BACKEND_URL}${stats.avatarUrl}` : stats.avatarUrl} 
                                            alt="Avatar" 
                                            className="w-full h-full object-cover" 
                                        />
                                    ) : (
                                        <span className="text-2xl font-black">
                                            {user?.name?.charAt(0).toUpperCase()}
                                        </span>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h1 className="text-xl font-bold leading-none mb-1 truncate">{user?.name}</h1>
                                    <div className="flex items-center gap-2 text-sm font-medium opacity-60">
                                        <span className="px-2 py-0.5 rounded text-xs flex-shrink-0" style={{ backgroundColor: 'var(--border-color)' }}>ID: {user?.id}</span>
                                        <span className="truncate">{user?.groupName}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="p-1.5 rounded-xl border flex-shrink-0" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
                                <img src={logo} alt="Logo" className="w-8 h-8 rounded-lg" />
                            </div>
                        </div>

                        <XPProgress totalScore={stats?.totalScore || 0} isLoading={isLoading} />
                        <BattleCard battle={battle} groupId={stats?.groupId || ''} isLoading={isLoading} />

                        {/* Desktop Navigation */}
                        <nav className="hidden lg:flex flex-col gap-2 mt-8">
                            <button
                                onClick={() => setActiveTab('home')}
                                className={`flex items-center gap-4 px-6 py-4 rounded-2xl font-black transition-all ${activeTab === 'home' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'hover:bg-white/50 opacity-60 hover:opacity-100'}`}
                                style={{ color: activeTab === 'home' ? 'white' : 'var(--text-color)' }}
                            >
                                <LayoutDashboard size={22} />
                                <span>Asosiy Panel</span>
                            </button>
                            <button
                                onClick={() => setActiveTab('history')}
                                className={`flex items-center gap-4 px-6 py-4 rounded-2xl font-black transition-all ${activeTab === 'history' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'hover:bg-white/50 opacity-60 hover:opacity-100'}`}
                                style={{ color: activeTab === 'history' ? 'white' : 'var(--text-color)' }}
                            >
                                <History size={22} />
                                <span>O'yinlar Tarixi</span>
                            </button>
                            <button
                                onClick={() => setActiveTab('profile')}
                                className={`flex items-center gap-4 px-6 py-4 rounded-2xl font-black transition-all ${activeTab === 'profile' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'hover:bg-white/50 opacity-60 hover:opacity-100'}`}
                                style={{ color: activeTab === 'profile' ? 'white' : 'var(--text-color)' }}
                            >
                                <UserCircle size={22} />
                                <span>Shaxsiy Profil</span>
                            </button>
                            
                            <button
                                onClick={logout}
                                className="flex items-center gap-4 px-6 py-4 rounded-2xl font-black transition-all hover:bg-rose-50 text-rose-500 mt-4 opacity-70 hover:opacity-100"
                            >
                                <LogOut size={22} />
                                <span>Chiqish</span>
                            </button>
                        </nav>
                    </header>

                    {/* Right Column / Main Content Area */}
                    <main className="lg:col-span-8 px-4 -mt-4 lg:mt-0 space-y-6">
                        {activeTab === 'home' && (
                            <>
                                <JoinGameCard studentId={user?.id} />
                                <QuickStats coins={stats?.coins || 0} />
                                <NavGrid />
                                <BookingCard 
                                    myBooking={myBooking} 
                                    groupSettings={groupSettings} 
                                    onCancel={cancelBooking} 
                                    onOpenModal={() => setIsBookingModalOpen(true)} 
                                />
                                <RankCard stats={stats || { gamesPlayed: 0, totalScore: 0, rank: 0, coins: 0, streakCount: 0, isHero: false, hasTrophy: false, weeklyBattleScore: 0, groupId: '', level: 'Beginner', avatarUrl: null, hasAvatarUnlock: false, active_theme_color: null }} />
                                <TelegramBanner studentId={user?.id} />
                            </>
                        )}

                        {activeTab === 'history' && <HistoryTab history={history} />}

                        {activeTab === 'profile' && (
                            <ProfileTab 
                                user={user} 
                                stats={stats} 
                                isUploadingAvatar={isUploadingAvatar} 
                                onAvatarUpload={handleAvatarUpload} 
                                onLogout={logout} 
                            />
                        )}
                    </main>
                </div>
            </div>

            <MobileNav activeTab={activeTab} onTabChange={setActiveTab} />

            {isBookingModalOpen && (
                <BookingModal 
                    groupSettings={groupSettings} 
                    availableTopics={availableTopics} 
                    otherBookings={otherBookings} 
                    onClose={() => setIsBookingModalOpen(false)} 
                    onBook={handleBook} 
                />
            )}

            {isLoading && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/50 backdrop-blur-sm">
                    <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
            )}
        </div>
    );
}
