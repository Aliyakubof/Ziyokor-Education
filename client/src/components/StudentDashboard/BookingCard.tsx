import React from 'react';
import { Calendar, Clock, X, CheckCircle2 } from 'lucide-react';

interface BookingCardProps {
    myBooking: any;
    groupSettings: any;
    onCancel: () => void;
    onOpenModal: () => void;
}

const MONTH_UZ = ['yanvar','fevral','mart','aprel','may','iyun','iyul','avgust','sentabr','oktabr','noyabr','dekabr'];
const DAY_UZ = ['Yakshanba','Dushanba','Seshanba','Chorshanba','Payshanba','Juma','Shanba'];

function formatDate(dateStr: string): string {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T00:00:00');
    return `${DAY_UZ[d.getDay()]}, ${d.getDate()}-${MONTH_UZ[d.getMonth()]}`;
}

function isDatePast(dateStr: string | null | undefined): boolean {
    if (!dateStr) return false;
    const d = new Date(dateStr + 'T23:59:59');
    return d < new Date();
}

const BookingCard: React.FC<BookingCardProps> = ({ myBooking, onCancel, onOpenModal }) => {
    const isPast = myBooking ? isDatePast(myBooking.booking_date) || myBooking.is_completed : false;

    return (
        <div className="rounded-3xl p-6 shadow-xl border relative overflow-hidden transition-colors" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h2 className="text-lg font-black flex items-center gap-2" style={{ color: 'var(--text-color)' }}>
                        <Calendar size={20} className="text-indigo-500" />
                        Qo'shimcha dars
                    </h2>
                    <p className="text-xs font-bold mt-1 opacity-50" style={{ color: 'var(--text-color)' }}>
                        Haftalik 30-daqiqalik darsni bron qiling
                    </p>
                </div>
                {myBooking && !isPast && (
                    <div className="bg-emerald-500/10 text-emerald-500 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest border border-emerald-500/20">
                        Band qilingan
                    </div>
                )}
                {isPast && (
                    <div className="bg-slate-100 text-slate-400 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest flex items-center gap-1">
                        <CheckCircle2 size={10} /> O'tdi
                    </div>
                )}
            </div>

            {myBooking && !isPast ? (
                <div className="flex items-center justify-between p-4 bg-indigo-50 border-2 border-indigo-100 rounded-2xl">
                    <div>
                        <div className="text-xs font-black text-indigo-400 uppercase tracking-widest leading-none mb-1">Bron qilingan</div>
                        {myBooking.booking_date && (
                            <div className="text-sm font-black text-indigo-700 flex items-center gap-1.5 mb-1">
                                <Calendar size={13} className="text-indigo-400" />
                                {formatDate(myBooking.booking_date)}
                            </div>
                        )}
                        <div className="text-2xl font-black text-indigo-700 flex items-center gap-2">
                            <Clock size={18} className="text-indigo-400" />
                            {myBooking.time_slot}
                        </div>
                        {myBooking.topic && (
                            <div className="text-[10px] font-bold text-indigo-500 mt-1.5 bg-white inline-block px-2 py-0.5 rounded-lg border border-indigo-100">
                                Mavzu: {myBooking.topic}
                            </div>
                        )}
                    </div>
                    <button
                        onClick={onCancel}
                        className="p-3 bg-white text-rose-500 rounded-xl hover:bg-rose-50 transition-colors shadow-sm"
                        title="Bekor qilish"
                    >
                        <X size={20} />
                    </button>
                </div>
            ) : (
                <>
                    {isPast && myBooking && (
                        <div className="mb-3 p-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold text-slate-400 flex items-center gap-2">
                            <CheckCircle2 size={14} className="text-emerald-400" />
                            Oldingi bron: {formatDate(myBooking.booking_date)} — {myBooking.time_slot}
                        </div>
                    )}
                    <button
                        onClick={onOpenModal}
                        className="w-full py-4 rounded-2xl bg-indigo-600 text-white font-black hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2"
                    >
                        <Calendar size={20} />
                        {isPast ? 'Navbatdagi darsni bron qiling' : 'Vaqtni tanlash'}
                    </button>
                </>
            )}
        </div>
    );
};

export default React.memo(BookingCard);
