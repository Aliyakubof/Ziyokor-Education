import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../api';
import { PlusCircle, Search, Edit2, Trash2, ArrowLeft } from 'lucide-react';
import { useAuth } from '../AuthContext';

export default function AdminVocabBattles() {
    const navigate = useNavigate();
    const { role } = useAuth();
    const [battles, setBattles] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchBattles();
    }, []);

    const fetchBattles = async () => {
        try {
            const res = await apiFetch('/api/admin/vocab-battles');
            if (res.ok) {
                const data = await res.json();
                setBattles(data);
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
        <div className="min-h-screen p-8 bg-slate-50">
            <div className="max-w-6xl mx-auto space-y-8">
                <header className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate(role === 'admin' ? '/admin' : '/teacher')} className="p-3 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors">
                            <ArrowLeft size={20} className="text-slate-600" />
                        </button>
                        <div>
                            <h1 className="text-2xl font-black text-slate-800 tracking-tight">Vocabulary Battles</h1>
                            <p className="text-slate-500 font-medium">Lug'at musobaqasi darajalari va levellarini boshqarish</p>
                        </div>
                    </div>
                    <button
                        onClick={() => navigate('/admin/vocab-battles/create')}
                        className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl flex items-center gap-2 transition-colors"
                    >
                        <PlusCircle size={20} /> Yangi qo'shish
                    </button>
                </header>

                {loading ? (
                    <div className="text-center p-12 text-slate-500 font-bold">Yuklanmoqda...</div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {battles.map(battle => (
                            <div key={battle.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col gap-4">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="text-xs font-black text-indigo-500 uppercase tracking-widest mb-1">{battle.daraja}</div>
                                        <h3 className="text-xl font-black text-slate-800">Level {battle.level}</h3>
                                        <p className="text-sm font-medium text-slate-500 mt-1 line-clamp-1">{battle.title || "Sarlavhasiz"}</p>
                                    </div>
                                    <div className="bg-slate-50 px-3 py-1 rounded-lg text-xs font-bold text-slate-600">
                                        {battle.questions?.length || 0} savol
                                    </div>
                                </div>
                                <div className="flex gap-2 mt-auto pt-4 border-t border-slate-100">
                                    <button
                                        onClick={() => navigate(`/admin/vocab-battles/edit/${battle.id}`)}
                                        className="flex-1 flex justify-center items-center gap-2 py-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-xl font-bold transition-colors"
                                    >
                                        <Edit2 size={16} /> Tahrirlash
                                    </button>
                                    <button
                                        onClick={() => deleteBattle(battle.id)}
                                        className="p-2 bg-red-50 text-red-500 hover:bg-red-100 rounded-xl transition-colors"
                                    >
                                        <Trash2 size={20} />
                                    </button>
                                </div>
                            </div>
                        ))}
                        {battles.length === 0 && (
                            <div className="col-span-full text-center p-12 bg-white rounded-3xl border border-slate-200 border-dashed text-slate-400 font-bold">
                                Hozircha Vocabulary Battle'lar yo'q
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
