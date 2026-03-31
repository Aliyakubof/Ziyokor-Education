import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { apiFetch } from '../api';
import { ShoppingBag, ChevronLeft, Coins, CheckCircle2, AlertCircle, ShoppingCart } from 'lucide-react';
import { themes } from '../themeConfig';

export default function Shop() {
    const { user, setActiveThemeId: setGlobalThemeId } = useAuth();
    const navigate = useNavigate();
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [purchasing, setPurchasing] = useState<string | null>(null);
    const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);
    const [purchasedItems, setPurchasedItems] = useState<string[]>([]);
    const [activeThemeId, setActiveThemeId] = useState<string | null>(null);
    const [activeAvatarUrl, setActiveAvatarUrl] = useState<string | null>(null);
    const [balance, setBalance] = useState(0);

    useEffect(() => {
        fetchItems();
    }, []);

    useEffect(() => {
        if (user?.id) {
            fetchStats();
            fetchPurchases();
        }
    }, [user?.id]);

    const fetchItems = async () => {
        try {
            const res = await apiFetch('/api/shop/items');
            if (res.ok) setItems(await res.json());
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const res = await apiFetch(`/api/student/${user?.id}/stats`);
            if (res.ok) {
                const data = await res.json();
                setBalance(data.coins);
                setActiveThemeId(data.active_theme_id);
                setActiveAvatarUrl(data.avatarUrl);
                if (data.active_theme_color) {
                    setGlobalThemeId(data.active_theme_color);
                }
            }
        } catch (err) {
            console.error(err);
        }
    };

    const fetchPurchases = async () => {
        try {
            const res = await apiFetch(`/api/student/${user?.id}/purchases`);
            if (res.ok) {
                const data = await res.json();
                setPurchasedItems(data.map((p: any) => p.item_id));
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handlePurchase = async (itemId: string) => {
        setPurchasing(itemId);
        setMessage(null);
        try {
            const res = await apiFetch('/api/student/purchase', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ studentId: user?.id, itemId })
            });

            const data = await res.json();
            if (res.ok) {
                setMessage({ text: "Muvaffaqiyatli xarid qilindi!", type: 'success' });
                setBalance(data.newCoins);
                setPurchasedItems(prev => [...prev, itemId]);
            } else {
                setMessage({ text: data.error || "Xatolik yuz berdi", type: 'error' });
            }
        } catch (err) {
            setMessage({ text: "Server bilan aloqa uzildi", type: 'error' });
        } finally {
            setPurchasing(null);
            setTimeout(() => setMessage(null), 3000);
        }
    };

    const handleApplyTheme = async (themeId: string, themeColor: string) => {
        setPurchasing(themeId);
        try {
            const res = await apiFetch('/api/student/active-theme', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ studentId: user?.id, themeId })
            });

            if (res.ok) {
                setActiveThemeId(themeId);
                setGlobalThemeId(themeColor);
                setMessage({ text: "Mavzu muvaffaqiyatli o'rnatildi!", type: 'success' });
            } else {
                const data = await res.json();
                setMessage({ text: data.error || "Xatolik yuz berdi", type: 'error' });
            }
        } catch (err) {
            setMessage({ text: "Xatolik yuz berdi", type: 'error' });
        } finally {
            setPurchasing(null);
            setTimeout(() => setMessage(null), 3000);
        }
    };

    const handleApplyAvatar = async (itemId: string) => {
        setPurchasing(itemId);
        try {
            const res = await apiFetch('/api/student/active-avatar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ studentId: user?.id, itemId })
            });

            if (res.ok) {
                const data = await res.json();
                setActiveAvatarUrl(data.avatarUrl);
                setMessage({ text: "Avatar muvaffaqiyatli o'rnatildi!", type: 'success' });
            } else {
                const data = await res.json();
                setMessage({ text: data.error || "Xatolik yuz berdi", type: 'error' });
            }
        } catch (err) {
            setMessage({ text: "Xatolik yuz berdi", type: 'error' });
        } finally {
            setPurchasing(null);
            setTimeout(() => setMessage(null), 3000);
        }
    };

    return (
        <div className="min-h-screen font-sans pb-10 transition-colors duration-500" style={{ backgroundColor: 'var(--bg-color)' }}>
            {/* Header */}
            <div 
                className="pt-8 pb-16 px-6 text-white relative overflow-hidden transition-all duration-500"
                style={{ background: `linear-gradient(to bottom right, var(--primary-color, #059669), var(--secondary-color, #0d9488))` }}
            >
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
                <button
                    onClick={() => navigate(-1)}
                    className="mb-6 p-2 bg-white/10 rounded-xl hover:bg-white/20 transition-colors"
                >
                    <ChevronLeft size={24} />
                </button>
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-3xl font-black mb-2 flex items-center gap-3">
                            <ShoppingBag className="opacity-80" size={32} />
                            Do'kon
                        </h1>
                        <p className="text-white/80 font-medium font-sm">Profil ko'rinishini o'zgartiring</p>
                    </div>
                    <div className="bg-white/20 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/20 flex items-center gap-2 shadow-lg">
                        <span className="text-xl font-black">{balance.toLocaleString()}</span>
                        <Coins size={20} className="text-yellow-400 fill-yellow-400/20" />
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="px-4 relative z-10 space-y-6">
                {/* Feedback Message */}
                {message && (
                    <div className={`p-4 rounded-2xl shadow-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300 ${message.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
                        {message.type === 'success' ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
                        <span className="font-bold">{message.text}</span>
                    </div>
                )}

                {loading ? (
                    <div className="py-20 text-center rounded-3xl border shadow-sm transition-colors" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
                        <div className="w-10 h-10 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-4" style={{ borderColor: 'var(--primary-color)' }}></div>
                        <p className="font-medium opacity-50" style={{ color: 'var(--text-color)' }}>Elementlar yuklanmoqda...</p>
                    </div>
                ) : items.length === 0 ? (
                    <div className="py-20 text-center bg-white rounded-3xl shadow-sm px-10">
                        <ShoppingBag size={48} className="mx-auto mb-4 text-slate-200" />
                        <p className="text-slate-400 font-medium">Hozircha do'konda buyumlar yo'q</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {items.map((item) => {
                            const isPurchased = purchasedItems.includes(item.id);
                            const isThemeActive = item.type === 'theme' && activeThemeId === item.id;
                            const isAvatarActive = item.type === 'avatar' && activeAvatarUrl === item.url;
                            const isActive = isThemeActive || isAvatarActive;

                            return (
                                <div key={item.id} className="rounded-3xl p-4 flex flex-col items-center text-center group border shadow-sm transition-colors" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
                                    <div className="w-24 h-24 rounded-2xl mb-4 flex items-center justify-center overflow-hidden border group-hover:scale-105 transition-all duration-300" style={{ backgroundColor: 'var(--bg-color)', borderColor: 'var(--border-color)' }}>
                                        {item.type === 'avatar' ? (
                                            <img
                                                src={item.url?.startsWith('/') ? `${import.meta.env.VITE_BACKEND_URL || ''}${item.url}` : item.url}
                                                alt={item.name}
                                                className="w-20 h-20 object-contain"
                                            />
                                        ) : (
                                            <div className="w-16 h-16 rounded-xl shadow-inner border border-slate-100" style={{ backgroundColor: item.color?.startsWith('#') ? item.color : 'white' }}>
                                                {item.color?.startsWith('theme-') && (
                                                    <div className={`w-full h-full rounded-xl flex flex-col p-1.5 gap-1.5`} 
                                                         style={{ background: `linear-gradient(135deg, ${(themes as any)[item.color]?.primary || '#eee'}, ${(themes as any)[item.color]?.bg || '#f1f5f9'})` }}>
                                                        <div className="w-full h-1/3 rounded-lg opacity-40 bg-white shadow-sm"></div>
                                                        <div className="w-2/3 h-1/4 rounded-lg bg-white/60"></div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    <h3 className="font-bold text-sm mb-1" style={{ color: 'var(--text-color)' }}>{item.name}</h3>
                                    <p className="text-[10px] font-bold uppercase mb-4 opacity-50" style={{ color: 'var(--text-color)' }}>{item.type === 'avatar' ? 'Avatar' : item.type === 'theme' ? 'Mavzu' : 'Ruxsat'}</p>

                                    {isPurchased && item.is_one_time ? (
                                        <button
                                            onClick={() => item.type === 'theme' ? handleApplyTheme(item.id, item.color) : handleApplyAvatar(item.id)}
                                            disabled={isActive || purchasing === item.id}
                                            className={`w-full py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-1.5 transition-all ${isActive
                                                ? 'opacity-40 cursor-not-allowed'
                                                : 'text-white shadow-lg active:scale-95'
                                                }`}
                                            style={{ backgroundColor: isActive ? 'transparent' : 'var(--primary-color)', color: isActive ? 'var(--text-color)' : 'white' }}
                                        >
                                            {isActive ? 'O\'rnatilgan' : 'O\'rnatish'}
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => handlePurchase(item.id)}
                                            disabled={purchasing === item.id || balance < item.price}
                                            className={`w-full py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-1.5 transition-all ${balance < item.price
                                                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                                : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20 active:scale-95'
                                                }`}
                                        >
                                            {purchasing === item.id ? (
                                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                            ) : (
                                                <>
                                                    <ShoppingCart size={16} />
                                                    {isPurchased ? 'Yana Olish ' : ''} ({item.price})
                                                </>
                                            )}
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
