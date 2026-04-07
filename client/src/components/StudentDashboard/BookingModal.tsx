import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { X, Calendar, Clock, ChevronRight } from 'lucide-react';

interface BookingModalProps {
    groupSettings: any;
    availableTopics: any[];
    otherBookings: any[];
    onClose: () => void;
    onBook: (slot: string, topic: string, bookingDate: string) => void;
}

// Maps Uzbek day names to JS getDay() values (0=Sunday)
const DAY_MAP: Record<string, number> = {
    'Yakshanba': 0, 'Dushanba': 1, 'Seshanba': 2,
    'Chorshanba': 3, 'Payshanba': 4, 'Juma': 5, 'Shanba': 6
};


// Format date as "Seshanba, 25-mart"
const MONTH_UZ = ['yanvar','fevral','mart','aprel','may','iyun','iyul','avgust','sentabr','oktabr','noyabr','dekabr'];
function formatDateUz(d: Date): string {
    const dayNames = ['Yakshanba','Dushanba','Seshanba','Chorshanba','Payshanba','Juma','Shanba'];
    return `${dayNames[d.getDay()]}, ${d.getDate()}-${MONTH_UZ[d.getMonth()]}`;
}
function toISO(d: Date): string {
    return d.toISOString().split('T')[0];
}

const BookingModal: React.FC<BookingModalProps> = ({ groupSettings, availableTopics, otherBookings, onClose, onBook }) => {
    const [selectedTopic, setSelectedTopic] = useState('');
    const [selectedSlot, setSelectedSlot] = useState<{ time: string; date: Date; key: string } | null>(null);

    // Build list of (dayName, date, time) combos for only the SINGLE nearest extra class day
    const slots = useMemo(() => {
        const days: string[] = groupSettings?.extra_class_days || [];
        const times: string[] = groupSettings?.extra_class_times || [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (days.length === 0 || times.length === 0) return [];

        // Find the nearest upcoming extra class date (today counts if today is an extra day)
        let nearestDate: Date | null = null;
        let nearestDayName = '';

        days.forEach(dayName => {
            const dayIdx = DAY_MAP[dayName];
            if (dayIdx === undefined) return;
            
            // Find next occurrence (today counts if before cutoff)
            let diff = (dayIdx - today.getDay() + 7) % 7;
            
            // Cutoff check for today. User wants DO NOT allow today booking.
            // "bron 1-2kun oldin qilinishi kerak" means nearest diff must be > 0.
            if (diff === 0) {
                diff = 7; // Next occurrence
            }

            const candidate = new Date(today);
            candidate.setDate(today.getDate() + diff);
            
            if (!nearestDate || candidate < nearestDate) {
                nearestDate = candidate;
                nearestDayName = dayName;
            }
        });

        if (!nearestDate) return [];

        const result: { dayName: string; date: Date; time: string; key: string }[] = [];
        times.forEach(range => {
            const parts = range.split('-');
            if (parts.length < 2) return;
            const start = parts[0].trim();
            const end = parts[1].trim();
            let cur = new Date(`2000-01-01T${start}:00`);
            const endLimit = new Date(`2000-01-01T${end}:00`);
            while (cur < endLimit) {
                const timeStr = cur.toTimeString().slice(0, 5);
                const key = `${toISO(nearestDate!)}_${timeStr}`;
                if (!result.find(r => r.key === key)) {
                    result.push({ dayName: nearestDayName, date: nearestDate!, time: timeStr, key });
                }
                cur.setMinutes(cur.getMinutes() + 30);
            }
        });

        // Sort by time
        result.sort((a, b) => a.time.localeCompare(b.time));
        return result;
    }, [groupSettings]);

    // Count existing bookings per (date, time) slot
    const getCount = (date: Date, time: string) => {
        const iso = toISO(date);
        return otherBookings.filter(b => b.booking_date === iso && b.time_slot === time).length;
    };

    // Group slots by date
    const slotsByDate = useMemo(() => {
        const map: Record<string, typeof slots> = {};
        slots.forEach(s => {
            const k = toISO(s.date);
            if (!map[k]) map[k] = [];
            map[k].push(s);
        });
        return map;
    }, [slots]);

    const handleBook = () => {
        if (!selectedSlot) return;
        onBook(selectedSlot.time, selectedTopic, toISO(selectedSlot.date));
    };

    return (
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md"
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.92, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="bg-white w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden"
                style={{ maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
            >
                {/* Header */}
                <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-indigo-600 to-violet-600 text-white flex-shrink-0">
                    <div>
                        <h3 className="text-xl font-black">Vaqt tanlang</h3>
                        <p className="text-[10px] font-bold opacity-70 uppercase tracking-widest mt-0.5">
                            {groupSettings?.extra_class_days?.join(' · ') || ''} kunlari
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-colors">
                        <X size={22} />
                    </button>
                </div>

                <div className="p-5 overflow-y-auto flex-1 space-y-5">
                    {/* Topic */}
                    {availableTopics.length > 0 && (
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Qaysi mavzuda yordam kerak?</label>
                            <select
                                value={selectedTopic}
                                onChange={e => setSelectedTopic(e.target.value)}
                                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 py-3 font-bold text-sm outline-none focus:border-indigo-500 transition-all cursor-pointer"
                            >
                                <option value="">Mavzuni tanlang (ixtiyoriy)</option>
                                {availableTopics.map(t => (
                                    <option key={t.id} value={t.topic_name}>{t.topic_name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Slot list grouped by date */}
                    {Object.keys(slotsByDate).length > 0 ? (
                        Object.entries(slotsByDate).map(([dateStr, daySlots]) => (
                            <div key={dateStr}>
                                <div className="flex items-center gap-2 mb-2">
                                    <Calendar size={14} className="text-indigo-500" />
                                    <span className="text-xs font-black text-slate-500 uppercase tracking-wide">{formatDateUz(daySlots[0].date)}</span>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    {daySlots.map(s => {
                                        const count = getCount(s.date, s.time);
                                        const isFull = count >= 4;
                                        const isSelected = selectedSlot?.key === s.key;
                                        return (
                                            <button
                                                key={s.key}
                                                disabled={isFull}
                                                onClick={() => setSelectedSlot(isSelected ? null : s)}
                                                className={`p-3 rounded-2xl border-2 transition-all text-center ${
                                                    isFull
                                                        ? 'bg-slate-100 border-slate-200 opacity-40 cursor-not-allowed'
                                                        : isSelected
                                                            ? 'bg-indigo-600 border-indigo-600 shadow-lg shadow-indigo-200'
                                                            : 'bg-white border-slate-100 hover:border-indigo-400 hover:shadow-md'
                                                }`}
                                            >
                                                <div className={`flex items-center justify-center gap-1.5 ${isSelected ? 'text-white' : 'text-slate-800'}`}>
                                                    <Clock size={14} />
                                                    <span className="text-lg font-black">{s.time}</span>
                                                </div>
                                                <div className="flex items-center justify-center gap-1 mt-1">
                                                    <div className={`w-1.5 h-1.5 rounded-full ${isFull ? 'bg-rose-500' : isSelected ? 'bg-white' : 'bg-emerald-500'}`} />
                                                    <span className={`text-[10px] font-black uppercase ${isFull ? 'text-rose-500' : isSelected ? 'text-indigo-100' : 'text-slate-400'}`}>
                                                        {count}/4
                                                    </span>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-12 text-slate-400 italic text-sm">
                            Hozircha bo'sh vaqtlar belgilanmagan.
                        </div>
                    )}
                </div>

                {/* Book button */}
                <div className="p-5 border-t border-slate-100 flex-shrink-0">
                    <button
                        disabled={!selectedSlot}
                        onClick={handleBook}
                        className={`w-full py-4 rounded-2xl font-black text-white flex items-center justify-center gap-2 transition-all ${
                            selectedSlot ? 'bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200 active:scale-95' : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                        }`}
                    >
                        {selectedSlot ? (
                            <>
                                <span>{formatDateUz(selectedSlot.date)} — {selectedSlot.time}</span>
                                <ChevronRight size={18} />
                            </>
                        ) : 'Vaqt tanlang'}
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
};

export default React.memo(BookingModal);
