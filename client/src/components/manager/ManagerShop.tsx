import { useState, useEffect } from 'react';
import { apiFetch } from '../../api';
import { ShoppingBag, Plus, Edit2, Trash2, Save, X, Unlock } from 'lucide-react';

interface ShopItem {
    id: string;
    name: string;
    type: 'avatar' | 'theme' | 'unlock';
    price: number;
    url?: string;
    color?: string;
    is_active: boolean;
    is_one_time: boolean;
}

export default function ManagerShop() {
    const [items, setItems] = useState<ShopItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingItem, setEditingItem] = useState<Partial<ShopItem> | null>(null);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        fetchItems();
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

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        const formData = new FormData();
        formData.append('image', file);

        try {
            const res = await fetch(`${import.meta.env.VITE_BACKEND_URL || ''}/api/manager/upload`, {
                method: 'POST',
                credentials: 'include',
                body: formData
            });

            if (res.ok) {
                const data = await res.json();
                setEditingItem(prev => ({ ...prev, url: data.url }));
            } else {
                alert('Rasm yuklashda xatolik');
            }
        } catch (err) {
            console.error('Upload error:', err);
            alert('Server bilan bog\'lanishda xatolik');
        } finally {
            setUploading(false);
        }
    };

    const handleSave = async () => {
        if (!editingItem) return;
        try {
            const method = editingItem.id ? 'PUT' : 'POST';
            const url = editingItem.id ? `/api/manager/shop/items/${editingItem.id}` : '/api/manager/shop/items';

            const res = await apiFetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editingItem)
            });

            if (res.ok) {
                fetchItems();
                setEditingItem(null);
            } else {
                const err = await res.json();
                alert(err.error || 'Xatolik yuz berdi');
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Haqiqatan ham o\'chirmoqchimisiz?')) return;
        try {
            const res = await apiFetch(`/api/manager/shop/items/${id}`, { method: 'DELETE' });
            if (res.ok) fetchItems();
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3">
                        <ShoppingBag className="text-indigo-600" /> Do'kon Boshqaruvi
                    </h2>
                    <p className="text-slate-500 font-medium text-sm mt-1 uppercase tracking-widest">O'quvchilar uchun mahsulotlarni boshqarish</p>
                </div>
                <button
                    onClick={() => setEditingItem({ name: '', type: 'avatar', price: 100, is_active: true, is_one_time: true })}
                    className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold text-sm shadow-lg shadow-indigo-500/20 hover:bg-indigo-700 transition-all active:scale-95"
                >
                    <Plus size={18} /> Yangi Qo'shish
                </button>
            </div>

            {editingItem && (
                <div className="bg-slate-50 rounded-2xl p-6 border-2 border-dashed border-indigo-200 animate-in zoom-in-95 duration-200">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-slate-800 uppercase tracking-widest text-xs">{editingItem.id ? 'Tahrirlash' : 'Yangi Mahsulot'}</h3>
                        <button onClick={() => setEditingItem(null)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Nomi</label>
                            <input
                                value={editingItem.name}
                                onChange={e => setEditingItem({ ...editingItem, name: e.target.value })}
                                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:outline-none focus:border-indigo-500 transition-colors"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Turi</label>
                            <select
                                value={editingItem.type}
                                onChange={e => setEditingItem({ ...editingItem, type: e.target.value as any })}
                                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:outline-none focus:border-indigo-500 transition-colors"
                            >
                                <option value="avatar">Avatar</option>
                                <option value="theme">Mavzu</option>
                                <option value="unlock">Ruxsat (Unlock)</option>
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Narxi (Coin)</label>
                            <input
                                type="number"
                                value={editingItem.price}
                                onChange={e => setEditingItem({ ...editingItem, price: parseInt(e.target.value) })}
                                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:outline-none focus:border-indigo-500 transition-colors"
                            />
                        </div>
                    </div>

                    {editingItem.type === 'avatar' && (
                        <div className="space-y-4 mb-6">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Avatar URL</label>
                                <div className="flex gap-2">
                                    <input
                                        value={editingItem.url || ''}
                                        onChange={e => setEditingItem({ ...editingItem, url: e.target.value })}
                                        placeholder="https://..."
                                        className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:outline-none focus:border-indigo-500 transition-colors"
                                    />
                                    <label className="cursor-pointer bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2">
                                        {uploading ? <div className="w-4 h-4 border-2 border-slate-600 border-t-transparent rounded-full animate-spin"></div> : <Plus size={18} />}
                                        Rasm Yuklash
                                        <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} disabled={uploading} />
                                    </label>
                                </div>
                            </div>
                            {editingItem.url && (
                                <div className="w-20 h-20 bg-white rounded-xl border border-slate-200 flex items-center justify-center overflow-hidden p-2">
                                    <img src={editingItem.url.startsWith('/') ? `${import.meta.env.VITE_BACKEND_URL || ''}${editingItem.url}` : editingItem.url} alt="Preview" className="w-full h-full object-contain" />
                                </div>
                            )}
                        </div>
                    )}

                    {editingItem.type === 'theme' && (
                        <div className="space-y-1 mb-6">
                            <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Mavzu Rangi (Hex Code yoki CSS Variable)</label>
                            <div className="flex gap-4 items-center">
                                <input
                                    value={editingItem.color || ''}
                                    onChange={e => setEditingItem({ ...editingItem, color: e.target.value })}
                                    placeholder="#ffffff yoki theme-emerald"
                                    className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:outline-none focus:border-indigo-500 transition-colors"
                                />
                                <div className="w-10 h-10 rounded-xl border shadow-inner" style={{ backgroundColor: editingItem.color?.startsWith('#') ? editingItem.color : 'white' }}></div>
                            </div>
                        </div>
                    )}

                    <div className="flex items-center gap-6 mb-6">
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={editingItem.is_active}
                                onChange={e => setEditingItem({ ...editingItem, is_active: e.target.checked })}
                                id="isActive"
                                className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                            />
                            <label htmlFor="isActive" className="text-sm font-bold text-slate-700 cursor-pointer">Faol (Sotuvda ko'rinadi)</label>
                        </div>
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={editingItem.is_one_time}
                                onChange={e => setEditingItem({ ...editingItem, is_one_time: e.target.checked })}
                                id="isOneTime"
                                className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                            />
                            <label htmlFor="isOneTime" className="text-sm font-bold text-slate-700 cursor-pointer">1 martalik (One-time)</label>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3">
                        <button onClick={() => setEditingItem(null)} className="px-5 py-2.5 bg-slate-200 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-300 transition-all">Bekor qilish</button>
                        <button onClick={handleSave} className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-emerald-500/20 hover:bg-emerald-700 transition-all flex items-center gap-2">
                            <Save size={18} /> Saqlash
                        </button>
                    </div>
                </div>
            )}

            <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-100">
                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Element</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Turi</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Narxi</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Amallar</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {loading ? (
                            <tr><td colSpan={4} className="px-6 py-12 text-center text-slate-400 font-medium tracking-widest uppercase text-xs">Yuklanmoqda...</td></tr>
                        ) : items.length === 0 ? (
                            <tr><td colSpan={4} className="px-6 py-12 text-center text-slate-400 font-medium tracking-widest uppercase text-xs">Mahsulotlar yo'q</td></tr>
                        ) : (
                            items.map(item => (
                                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center overflow-hidden border border-slate-100">
                                                {item.type === 'avatar' && item.url ? (
                                                    <img src={item.url.startsWith('/') ? `${import.meta.env.VITE_BACKEND_URL || ''}${item.url}` : item.url} className="w-8 h-8 object-contain" />
                                                ) : item.type === 'theme' ? (
                                                    <div className="w-6 h-6 rounded-md shadow-inner" style={{ backgroundColor: item.color?.startsWith('#') ? item.color : 'white' }}></div>
                                                ) : (
                                                    <Unlock size={20} className="text-slate-400" />
                                                )}
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-800 text-sm">{item.name}</p>
                                                <div className="flex gap-1 mt-0.5">
                                                    {!item.is_active && <span className="text-[8px] font-black uppercase text-red-500 bg-red-50 px-1.5 py-0.5 rounded-md">O'chirilgan</span>}
                                                    {item.is_one_time ? 
                                                        <span className="text-[8px] font-black uppercase text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded-md">1 Martalik</span> :
                                                        <span className="text-[8px] font-black uppercase text-emerald-500 bg-emerald-50 px-1.5 py-0.5 rounded-md">Forever</span>
                                                    }
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-md ${item.type === 'avatar' ? 'bg-blue-50 text-blue-600' :
                                            item.type === 'theme' ? 'bg-purple-50 text-purple-600' :
                                                'bg-orange-50 text-orange-600'
                                            }`}>
                                            {item.type}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="font-black text-slate-700 text-sm">{item.price} ⭐</span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => setEditingItem(item)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"><Edit2 size={16} /></button>
                                            <button onClick={() => handleDelete(item.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"><Trash2 size={16} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
