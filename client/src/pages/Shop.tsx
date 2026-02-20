import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { apiFetch } from '../api';
import { ShoppingBag, ChevronLeft, Coins, CheckCircle2, AlertCircle, ShoppingCart } from 'lucide-react';

export default function Shop() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [purchasing, setPurchasing] = useState<string | null>(null);
    const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);
    const [balance, setBalance] = useState(0);

    useEffect(() => {
        fetchItems();
        fetchStats();
    }, []);

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

    return (
        <div className="min-h-screen bg-slate-50 font-sans pb-10">
            {/* Header */}
            <div className="bg-gradient-to-br from-emerald-600 to-teal-800 pt-8 pb-16 px-6 text-white relative overflow-hidden">
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
                            <ShoppingBag className="text-emerald-300" size={32} />
                            Do'kon
                        </h1>
                        <p className="text-emerald-100 font-medium font-sm">Profilni ko'rinishini o'zgartiring</p>
                    </div>
                    <div className="bg-white/20 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/20 flex items-center gap-2 shadow-lg">
                        <span className="text-xl font-black">{balance.toLocaleString()}</span>
                        <Coins size={20} className="text-yellow-400 fill-yellow-400/20" />
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="px-4 -mt-10 relative z-10 space-y-6">
                {/* Feedback Message */}
                {message && (
                    <div className={`p-4 rounded-2xl shadow-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300 ${message.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
                        {message.type === 'success' ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
                        <span className="font-bold">{message.text}</span>
                    </div>
                )}

                {loading ? (
                    <div className="py-20 text-center bg-white rounded-3xl shadow-sm">
                        <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-slate-400 font-medium">Elementlar yuklanmoqda...</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-4">
                        {items.map((item) => (
                            <div key={item.id} className="bg-white rounded-3xl p-4 shadow-sm border border-slate-100 flex flex-col items-center text-center group">
                                <div className="w-24 h-24 rounded-2xl bg-slate-50 mb-4 flex items-center justify-center overflow-hidden border border-slate-50 group-hover:scale-105 transition-transform duration-300">
                                    {item.type === 'avatar' ? (
                                        <img src={item.url} alt={item.name} className="w-20 h-20 object-contain" />
                                    ) : (
                                        <div className="w-16 h-16 rounded-xl shadow-inner" style={{ backgroundColor: item.color }}></div>
                                    )}
                                </div>
                                <h3 className="font-bold text-slate-800 text-sm mb-1">{item.name}</h3>
                                <p className="text-[10px] text-slate-400 font-bold uppercase mb-4">{item.type === 'avatar' ? 'Avatar' : 'Mavzu'}</p>

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
                                            {item.price}
                                        </>
                                    )}
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {!loading && items.length === 0 && (
                    <div className="py-20 text-center bg-white rounded-3xl shadow-sm px-10">
                        <ShoppingBag size={48} className="mx-auto mb-4 text-slate-200" />
                        <p className="text-slate-400 font-medium">Hozircha do'konda buyumlar yo'q</p>
                    </div>
                )}
            </div>
        </div>
    );
}
