import { useState, useEffect } from 'react';
import { apiFetch, API_URL } from '../../api';
import { Image as ImageIcon, Plus, Trash2, Upload, Layout, AlertCircle, Check } from 'lucide-react';

interface CarouselSlide {
    id: string;
    image_url: string;
    title: string;
    description: string;
    order_index: number;
}

export default function ManagerCarousel() {
    const [slides, setSlides] = useState<CarouselSlide[]>([]);
    const [loading, setLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Form state
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [orderIndex, setOrderIndex] = useState(0);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    useEffect(() => {
        fetchSlides();
    }, []);

    const fetchSlides = async () => {
        setLoading(true);
        try {
            const res = await apiFetch('/api/carousel');
            if (res.ok) {
                const data = await res.json();
                setSlides(data);
            }
        } catch (err) {
            console.error('Fetch slides error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0]);
        }
    };

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedFile) return;

        setIsUploading(true);
        setMessage(null);

        const formData = new FormData();
        formData.append('image', selectedFile);
        formData.append('title', title);
        formData.append('description', description);
        formData.append('order_index', String(orderIndex));

        try {
            const res = await apiFetch('/api/manager/carousel', {
                method: 'POST',
                body: formData
            });

            if (res.ok) {
                setMessage({ type: 'success', text: 'Slayd muvaffaqiyatli qo\'shildi' });
                setTitle('');
                setDescription('');
                setOrderIndex(0);
                setSelectedFile(null);
                fetchSlides();
            } else {
                throw new Error('Yuklashda xatolik');
            }
        } catch (err) {
            setMessage({ type: 'error', text: 'Xatolik yuz berdi' });
        } finally {
            setIsUploading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Ushbu slaydni o\'chirmoqchimisiz?')) return;

        try {
            const res = await apiFetch(`/api/manager/carousel/${id}`, { method: 'DELETE' });
            if (res.ok) {
                setSlides(slides.filter(s => s.id !== id));
                setMessage({ type: 'success', text: 'Slayd o\'chirildi' });
            }
        } catch (err) {
            console.error('Delete error:', err);
            setMessage({ type: 'error', text: 'O\'chirishda xatolik' });
        }
    };

    const baseUrl = API_URL;

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3">
                        <ImageIcon className="text-indigo-600" /> Karusel Boshqaruvi
                    </h2>
                    <p className="text-slate-500 font-medium text-sm mt-1 uppercase tracking-widest">Bosh sahifadagi slaydlarni boshqarish</p>
                </div>
            </div>

            {message && (
                <div className={`flex items-center gap-3 p-4 rounded-2xl animate-in slide-in-from-top-2 duration-300 ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
                    {message.type === 'success' ? <Check size={18} /> : <AlertCircle size={18} />}
                    <span className="text-sm font-bold">{message.text}</span>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Upload Form */}
                <div className="lg:col-span-1">
                    <form onSubmit={handleUpload} className="bg-white rounded-[2rem] p-6 border border-slate-200 shadow-sm space-y-4">
                        <h3 className="text-lg font-black text-slate-900 flex items-center gap-2 mb-2">
                            <Plus className="text-indigo-600" size={20} /> Yangi Slayd
                        </h3>

                        <div className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Sarlavha</label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-indigo-500"
                                    placeholder="Masalan: Interaktiv Ta'lim"
                                    required
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Tavsif</label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:border-indigo-500"
                                    placeholder="Qisqacha tavsif yozing..."
                                    rows={3}
                                    required
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Tartib (Order)</label>
                                <input
                                    type="number"
                                    value={orderIndex || 0}
                                    onChange={(e) => {
                                        const val = parseInt(e.target.value);
                                        setOrderIndex(isNaN(val) ? 0 : val);
                                    }}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Rasm (File)</label>
                                <div className="relative group/upload">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleFileChange}
                                        className="hidden"
                                        id="carousel-file-input"
                                        required
                                    />
                                    <label
                                        htmlFor="carousel-file-input"
                                        className="flex flex-col items-center justify-center gap-3 p-8 border-2 border-dashed border-slate-200 rounded-2xl cursor-pointer hover:bg-slate-50 hover:border-indigo-400 transition-all"
                                    >
                                        <Upload className="text-slate-400 group-hover/upload:text-indigo-600 transition-colors" size={32} />
                                        <span className="text-xs font-black text-slate-500 uppercase tracking-widest">
                                            {selectedFile ? selectedFile.name : 'Rasm tanlang'}
                                        </span>
                                    </label>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isUploading || !selectedFile}
                                className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 text-white font-black rounded-2xl shadow-lg shadow-indigo-200 transition-all active:scale-95 uppercase tracking-widest text-xs"
                            >
                                {isUploading ? 'Yuklanmoqda...' : 'SAQLASH'}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Slides List */}
                <div className="lg:col-span-2">
                    <div className="bg-white rounded-[2rem] p-6 border border-slate-200 shadow-sm h-full">
                        <h3 className="text-lg font-black text-slate-900 flex items-center gap-2 mb-6">
                            <Layout className="text-indigo-600" size={20} /> Mavjud Slaydlar
                        </h3>

                        {loading ? (
                            <div className="text-center py-20 opacity-30 font-black uppercase tracking-widest">Yuklanmoqda...</div>
                        ) : slides.length === 0 ? (
                            <div className="text-center py-20 border-2 border-dashed border-slate-100 rounded-3xl opacity-30 font-black uppercase tracking-[0.2em] flex flex-col items-center gap-4">
                                <ImageIcon size={48} />
                                Slaydlar yo'q
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {slides.map(slide => (
                                    <div key={slide.id} className="group relative rounded-2xl overflow-hidden border border-slate-100 shadow-sm hover:shadow-md transition-all">
                                        <img
                                            src={slide.image_url.startsWith('http') ? slide.image_url : `${baseUrl}${slide.image_url}`}
                                            className="w-full h-40 object-cover"
                                            alt={slide.title}
                                        />
                                        <div className="p-4 bg-white">
                                            <div className="flex justify-between items-start mb-1">
                                                <h4 className="font-black text-slate-900 truncate pr-2">{slide.title}</h4>
                                                <span className="bg-slate-50 px-2 py-0.5 rounded text-[10px] font-black text-slate-400">#{slide.order_index}</span>
                                            </div>
                                            <p className="text-xs text-slate-500 line-clamp-2">{slide.description}</p>
                                        </div>

                                        <button
                                            onClick={() => handleDelete(slide.id)}
                                            className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:bg-red-600"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
