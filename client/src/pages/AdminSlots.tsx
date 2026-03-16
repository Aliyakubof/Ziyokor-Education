import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Plus, Trash2, ArrowLeft, Calendar, Save, X } from 'lucide-react';
import { apiFetch } from '../api';
import { useAuth } from '../AuthContext';
import logo from '../assets/logo.jpeg';

interface Slot {
    id: string;
    time_text: string;
    day_of_week: string | null;
    created_at: string;
}

const AdminSlots = () => {
    const navigate = useNavigate();
    const { role } = useAuth();
    const [slots, setSlots] = useState<Slot[]>([]);
    const [loading, setLoading] = useState(true);

    // Form State
    const [timeText, setTimeText] = useState('');
    const [dayOfWeek, setDayOfWeek] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Edit State
    const [editingSlot, setEditingSlot] = useState<Slot | null>(null);
    const [editTimeText, setEditTimeText] = useState('');
    const [editDayOfWeek, setEditDayOfWeek] = useState('');

    useEffect(() => {
        fetchSlots();
    }, []);

    const fetchSlots = async () => {
        try {
            const res = await apiFetch('/api/available-slots');
            const data = await res.json();
            setSlots(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Error fetching slots:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleAddSlot = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const res = await apiFetch('/api/admin/available-slots', {
                method: 'POST',
                body: JSON.stringify({ time_text: timeText, day_of_week: dayOfWeek || null })
            });
            if (res.ok) {
                setTimeText('');
                setDayOfWeek('');
                fetchSlots();
            } else {
                alert("Xatolik yuz berdi");
            }
        } catch (error) {
            console.error('Error adding slot:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUpdateSlot = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingSlot) return;
        try {
            const res = await apiFetch(`/api/admin/available-slots/${editingSlot.id}`, {
                method: 'PUT',
                body: JSON.stringify({ time_text: editTimeText, day_of_week: editDayOfWeek || null })
            });
            if (res.ok) {
                setEditingSlot(null);
                fetchSlots();
            } else {
                alert("Yangilashda xatolik");
            }
        } catch (error) {
            console.error('Error updating slot:', error);
        }
    };

    const handleDeleteSlot = async (id: string) => {
        if (!window.confirm("Ushbu vaqtni o'chirmoqchimisiz?")) return;
        try {
            const res = await apiFetch(`/api/admin/available-slots/${id}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                fetchSlots();
            }
        } catch (error) {
            console.error('Error deleting slot:', error);
        }
    };

    const days = [
        "Dushanba", "Seshanba", "Chorshanba", "Payshanba", "Juma", "Shanba", "Yakshanba"
    ];

    if (role !== 'admin') {
        return <div className="p-10 text-center font-bold">Ruxsat berilmagan!</div>;
    }

    return (
        <div className="p-4 md:p-8 max-w-5xl mx-auto min-h-screen bg-transparent font-sans text-slate-900">
            {/* Header */}
            <div className="flex justify-between items-center mb-10">
                <button
                    onClick={() => navigate('/admin')}
                    className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors font-semibold"
                >
                    <ArrowLeft size={20} /> Orqaga
                </button>
                <div className="flex items-center gap-3">
                    <img src={logo} alt="Logo" className="h-10 w-auto rounded-lg" />
                    <h1 className="text-xl font-bold">Vaqtlar Boshqaruvi</h1>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Form Section */}
                <div className="lg:col-span-1">
                    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm sticky top-8">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="bg-indigo-100 p-2 rounded-xl text-indigo-600">
                                <Plus size={24} />
                            </div>
                            <h2 className="text-lg font-bold">Yangi vaqt qo'shish</h2>
                        </div>

                        <form onSubmit={handleAddSlot} className="space-y-5">
                            <div className="space-y-1.5">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Vaqt (masalan: 14:00 - 15:30)</label>
                                <div className="relative">
                                    <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <input
                                        type="text"
                                        placeholder="14:00 - 15:30"
                                        value={timeText}
                                        onChange={(e) => setTimeText(e.target.value)}
                                        className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Kun (ixtiyoriy)</label>
                                <div className="relative">
                                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <select
                                        value={dayOfWeek}
                                        onChange={(e) => setDayOfWeek(e.target.value)}
                                        className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none font-bold"
                                    >
                                        <option value="">Barcha kunlar uchun</option>
                                        {days.map(d => <option key={d} value={d}>{d}</option>)}
                                    </select>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 rounded-2xl shadow-lg shadow-slate-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {isSubmitting ? 'Saqlanmoqda...' : <><Plus size={20} /> Qo'shish</>}
                            </button>
                        </form>
                    </div>
                </div>

                {/* List Section */}
                <div className="lg:col-span-2">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="bg-slate-100 p-2 rounded-xl text-slate-600">
                            <Clock size={24} />
                        </div>
                        <h2 className="text-xl font-bold">Mavjud vaqtlar ro'yxati</h2>
                        <span className="ml-auto bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-bold font-mono">{slots.length} ta</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {loading ? (
                            <div className="col-span-full py-20 text-center text-slate-400 font-bold">Yuklanmoqda...</div>
                        ) : slots.length === 0 ? (
                            <div className="col-span-full py-20 text-center bg-slate-50 border-2 border-dashed border-slate-100 rounded-[2rem] text-slate-400 font-bold">
                                Hozircha vaqtlar qo'shilmagan.
                            </div>
                        ) : (
                            slots.map(slot => (
                                <div key={slot.id} className="group bg-white border border-slate-200 rounded-3xl p-5 hover:border-indigo-200 transition-all hover:shadow-xl hover:shadow-indigo-50/50">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                                            <Clock size={20} />
                                        </div>
                                        <div className="flex gap-1">
                                            <button
                                                onClick={() => {
                                                    setEditingSlot(slot);
                                                    setEditTimeText(slot.time_text);
                                                    setEditDayOfWeek(slot.day_of_week || '');
                                                }}
                                                className="p-2 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                                title="Tahrirlash"
                                            >
                                                ✎
                                            </button>
                                            <button
                                                onClick={() => handleDeleteSlot(slot.id)}
                                                className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                title="O'chirish"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>
                                    
                                    <p className="text-xl font-black text-slate-800 mb-1">{slot.time_text}</p>
                                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest">
                                        {slot.day_of_week || 'Har kuni'}
                                    </p>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Edit Modal */}
            {editingSlot && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-md p-8 shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-8">
                            <h3 className="text-2xl font-black text-slate-900">Vaqtni tahrirlash</h3>
                            <button onClick={() => setEditingSlot(null)} className="text-slate-300 hover:text-slate-500"><X size={24} /></button>
                        </div>

                        <form onSubmit={handleUpdateSlot} className="space-y-6">
                            <div className="space-y-1.5">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Vaqt</label>
                                <input
                                    type="text"
                                    value={editTimeText}
                                    onChange={(e) => setEditTimeText(e.target.value)}
                                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                                    required
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Kun</label>
                                <select
                                    value={editDayOfWeek}
                                    onChange={(e) => setEditDayOfWeek(e.target.value)}
                                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none font-bold"
                                >
                                    <option value="">Barcha kunlar uchun</option>
                                    {days.map(d => <option key={d} value={d}>{d}</option>)}
                                </select>
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setEditingSlot(null)}
                                    className="flex-1 py-4 border-2 border-slate-100 rounded-2xl text-slate-500 font-bold hover:bg-slate-50 transition-all font-mono uppercase tracking-widest text-xs"
                                >
                                    Bekor qilish
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 shadow-lg shadow-slate-200 transition-all flex items-center justify-center gap-2"
                                >
                                    <Save size={20} /> Saqlash
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminSlots;
