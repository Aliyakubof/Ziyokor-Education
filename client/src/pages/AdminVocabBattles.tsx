import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../api';
import { PlusCircle, Edit2, Trash2, ArrowLeft } from 'lucide-react';
import { useAuth } from '../AuthContext';

export default function AdminVocabBattles() {
    const navigate = useNavigate();
    const { role } = useAuth();
    const [battles, setBattles] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isActive, setIsActive] = useState<boolean | null>(null);

    useEffect(() => {
        fetchBattles();
        fetchStatus();
    }, []);

    const fetchStatus = async () => {
        try {
            const res = await apiFetch('/api/manager/settings');
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data)) {
                    const activeSetting = data.find((s: any) => s.key === 'vocab_battle_active');
                    if (activeSetting) {
                        setIsActive(activeSetting.value === true || activeSetting.value === 'true');
                    }
                }
            }
        } catch (error) {
            console.error(error);
        }
    };

    const toggleStatus = async () => {
        const newValue = !isActive;
        try {
            const res = await apiFetch('/api/manager/settings/vocab_battle_active', {
                method: 'PUT',
                body: JSON.stringify({ value: newValue })
            });
            if (res.ok) {
                setIsActive(newValue);
            }
        } catch (error) {
            console.error(error);
        }
    };

    const fetchBattles = async () => {
        try {
            const res = await apiFetch('/api/admin/vocab-battles');
            if (res.ok) {
                const data = await res.json();
                setBattles(Array.isArray(data) ? data : []);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const deleteBattle = async (id: string) => {
        if (!window.confirm("Rostdan ham ushbu Lug'at jangini o'chirmoqchimisiz?")) return;
        try {
            const res = await apiFetch(`/api/admin/vocab-battles/${id}`, { method: 'DELETE' });
            if (res.ok) {
                setBattles(battles.filter(b => b.id !== id));
            }
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <div className="min-h-screen p-4 md:p-8 transition-colors duration-500 bg-slate-50 text-slate-900">
            <div className="max-w-6xl mx-auto space-y-8">
                <header className="flex flex-col md:flex-row gap-4 justify-between items-center p-6 rounded-[2rem] border shadow-sm transition-colors bg-white border-slate-200">
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={() => navigate(role === 'admin' ? '/admin' : '/teacher')} 
                            className="p-3 rounded-xl border transition-all active:scale-95 bg-slate-50 border-slate-200 text-slate-600"
                        >
                            <ArrowLeft size={20} />
                        </button>
                        <div>
                            <h1 className="text-2xl font-black tracking-tight text-slate-900">Vocabulary Battles</h1>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Musobaqa darajalarini boshqarish</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-3 px-4 py-2 rounded-2xl border bg-slate-50 border-slate-200">
                            <span className={`text-[10px] font-black uppercase tracking-widest ${isActive ? 'text-emerald-500' : 'text-slate-400'}`}>
                                {isActive === null ? 'Loading...' : isActive ? 'Active' : 'Hidden'}
                            </span>
                            <button
                                onClick={toggleStatus}
                                className={`w-12 h-6 rounded-full p-1 transition-colors duration-200 ease-in-out focus:outline-none ${isActive ? 'bg-emerald-500' : 'bg-slate-300'}`}
                            >
                                <div className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform duration-200 ease-in-out ${isActive ? 'translate-x-6' : 'translate-x-0'}`} />
                            </button>
                        </div>
                        <button
                            onClick={() => navigate('/admin/vocab-battles/create')}
                            className="px-6 py-3 font-black rounded-xl flex items-center gap-2 transition-all active:scale-95 shadow-lg bg-indigo-600 text-white shadow-indigo-200"
                        >
                            <PlusCircle size={20} /> Yangi qo'shish
                        </button>
                    </div>
                </header>

                {loading ? (
                    <div className="text-center p-12 text-slate-400 font-black uppercase tracking-widest">Yuklanmoqda...</div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {Array.isArray(battles) && battles.map(battle => (
                            <div key={battle.id} className="p-6 rounded-[2rem] border shadow-sm transition-all hover:shadow-xl flex flex-col gap-4 group bg-white border-slate-200">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="text-[10px] font-black uppercase tracking-widest mb-1 text-indigo-600">{battle.daraja}</div>
                                        <h3 className="text-xl font-black italic tracking-tighter text-slate-900">Level {battle.level}</h3>
                                        <p className="text-xs font-bold text-slate-400 mt-1 line-clamp-1">{battle.title || "Sarlavhasiz"}</p>
                                    </div>
                                    <div className="px-3 py-1 rounded-lg text-[10px] font-black border uppercase bg-slate-50 border-slate-100 text-slate-400">
                                        {battle.questions?.length || 0} savol
                                    </div>
                                </div>
                                <div className="flex gap-2 mt-auto pt-4 border-t border-slate-100">
                                    <button
                                        onClick={() => navigate(`/admin/vocab-battles/edit/${battle.id}`)}
                                        className="flex-1 flex justify-center items-center gap-2 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider border transition-all hover:bg-slate-50 bg-white border-slate-200 text-indigo-600"
                                    >
                                        <Edit2 size={14} /> Tahrirlash
                                    </button>
                                    <button
                                        onClick={() => deleteBattle(battle.id)}
                                        className="p-2.5 rounded-xl text-rose-500 hover:bg-rose-50 border border-slate-200 transition-colors"
                                    >
                                        <Trash2 size={20} />
                                    </button>
                                </div>
                            </div>
                        ))}
                        {battles.length === 0 && (
                            <div className="col-span-full text-center p-20 rounded-[3rem] border border-dashed text-slate-300 font-black uppercase tracking-[0.2em] border-slate-200">
                                Hozircha Battle'lar yo'q
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
