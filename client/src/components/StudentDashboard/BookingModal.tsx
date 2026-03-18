import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Calendar } from 'lucide-react';

interface BookingModalProps {
    groupSettings: any;
    availableTopics: any[];
    otherBookings: any[];
    onClose: () => void;
    onBook: (slot: string, topic: string) => void;
}

const BookingModal: React.FC<BookingModalProps> = ({ 
    groupSettings, 
    availableTopics, 
    otherBookings, 
    onClose, 
    onBook 
}) => {
    const [selectedTopic, setSelectedTopic] = useState('');

    const generateSlots = () => {
        if (!groupSettings?.extra_class_times) return [];
        const slots: string[] = [];
        groupSettings.extra_class_times.forEach((range: string) => {
            const parts = range.split('-');
            if (parts.length < 2) return;
            const start = parts[0].trim();
            const end = parts[1].trim();
            let current = new Date(`2000-01-01T${start}:00`);
            const endLimit = new Date(`2000-01-01T${end}:00`);
            
            while (current < endLimit) {
                const timeStr = current.toTimeString().slice(0, 5);
                slots.push(timeStr);
                current.setMinutes(current.getMinutes() + 30);
            }
        });
        return slots;
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
            <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden"
            >
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <div>
                        <h3 className="text-xl font-black text-slate-800">Vaqtni tanlang</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Mavjud slotlar (Max 4 talaba)</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-xl transition-colors">
                        <X size={24} className="text-slate-500" />
                    </button>
                </div>

                <div className="p-6 max-h-[70vh] overflow-y-auto space-y-6">
                    {groupSettings?.extra_class_days?.length > 0 ? (
                        <>
                            <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100">
                                <p className="text-sm font-bold text-amber-700 flex items-center gap-2">
                                    <Calendar size={16} />
                                    {groupSettings.extra_class_days.join(', ')} kunlari uchun
                                </p>
                                <p className="text-[10px] font-medium text-amber-600 mt-1 italic">
                                    * Bron qilish darsdan 24 soat oldin to'xtatiladi. Bekor qilish kamida 24 soat oldin.
                                </p>
                            </div>

                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">O'tmoqchi bo'lgan mavzuingiz</label>
                                <select 
                                    value={selectedTopic}
                                    onChange={(e) => setSelectedTopic(e.target.value)}
                                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3.5 font-bold text-sm outline-none focus:border-indigo-500 transition-all appearance-none cursor-pointer"
                                >
                                    <option value="">Mavzuni tanlang...</option>
                                    {availableTopics.map(t => (
                                        <option key={t.id} value={t.topic_name}>{t.topic_name}</option>
                                    ))}
                                    {availableTopics.length === 0 && (
                                        <option disabled>Hozircha mavzular yo'q</option>
                                    )}
                                </select>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-3">
                                {generateSlots().map(slot => {
                                    const count = otherBookings.filter(b => b.time_slot === slot).length;
                                    const isFull = count >= 4;
                                    return (
                                        <button
                                            key={slot}
                                            disabled={isFull}
                                            onClick={() => onBook(slot, selectedTopic)}
                                            className={`p-4 rounded-2xl border-2 transition-all text-center flex flex-col gap-1 ${
                                                isFull 
                                                    ? 'bg-slate-100 border-slate-200 opacity-50 cursor-not-allowed' 
                                                    : 'bg-white border-slate-100 hover:border-indigo-400 hover:shadow-md'
                                            }`}
                                        >
                                            <span className="text-xl font-black text-slate-800">{slot}</span>
                                            <div className="flex items-center justify-center gap-1">
                                                <div className={`w-2 h-2 rounded-full ${isFull ? 'bg-rose-500' : 'bg-emerald-500'}`}></div>
                                                <span className={`text-[10px] font-black uppercase ${isFull ? 'text-rose-600' : 'text-slate-400'}`}>
                                                    {count}/4 band
                                                </span>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </>
                    ) : (
                        <div className="text-center py-12 text-slate-400 italic">
                            Hozircha bo'sh vaqtlar belgilanmagan.
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    );
};

export default React.memo(BookingModal);
