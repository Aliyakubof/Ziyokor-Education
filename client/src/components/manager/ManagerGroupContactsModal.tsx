import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../api';
import { Phone, Users, X, PhoneCall } from 'lucide-react';

interface Group {
    id: string;
    name: string;
}

interface StudentContact {
    id: string;
    name: string;
    phone: string;
    parent_name: string;
    parent_phone: string;
}

interface ManagerGroupContactsModalProps {
    group: Group;
    onClose: () => void;
}

const ManagerGroupContactsModal: React.FC<ManagerGroupContactsModalProps> = ({ group, onClose }) => {
    const [students, setStudents] = useState<StudentContact[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStudents = async () => {
            try {
                const res = await apiFetch(`/api/manager/groups/${group.id}/students`);
                const data = await res.json();
                setStudents(Array.isArray(data) ? data : []);
            } catch (err) {
                console.error('Error fetching group students:', err);
                setStudents([]);
            } finally {
                setLoading(false);
            }
        };
        fetchStudents();
    }, [group.id]);

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
            <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
                <div className="p-6 md:p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50 relative">
                    <div>
                        <h3 className="text-2xl font-black text-slate-900 flex items-center gap-3">
                            <Users className="text-indigo-600" /> O'quvchilar bilan bog'lanish
                        </h3>
                        <p className="text-slate-500 font-medium text-sm mt-1 uppercase tracking-widest">{group.name} guruhi</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 bg-white border border-slate-200 hover:border-red-200 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-full flex items-center justify-center transition-all shadow-sm group absolute right-6 top-6"
                    >
                        <X size={20} className="group-hover:scale-110 transition-transform" />
                    </button>
                </div>

                <div className="p-6 md:p-8 overflow-y-auto flex-1 custom-scrollbar">
                    {loading ? (
                        <div className="text-center py-12 text-slate-500 font-medium tracking-widest uppercase text-sm">Ma'lumotlar yuklanmoqda...</div>
                    ) : students.length === 0 ? (
                        <div className="text-center py-12 bg-slate-50 rounded-2xl border border-slate-200 text-slate-500 font-medium tracking-widest uppercase text-sm">
                            Bu guruhda o'quvchilar yo'q.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {students.map((student) => (
                                <div key={student.id} className="bg-white border border-slate-200 rounded-2xl p-5 hover:border-indigo-300 transition-colors shadow-sm relative group overflow-hidden">
                                    <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-indigo-50 to-transparent -mr-12 -mt-12 rounded-full z-0 pointer-events-none"></div>
                                    <div className="relative z-10">
                                        <h4 className="font-black text-lg text-slate-800 mb-1 truncate" title={student.name}>{student.name}</h4>
                                        <div className="flex items-center gap-2 mb-4">
                                            <span className="text-[10px] font-black uppercase tracking-widest bg-slate-100 text-slate-500 px-2 py-0.5 rounded border border-slate-200">
                                                ID: {student.id}
                                            </span>
                                        </div>

                                        <div className="space-y-3">
                                            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">O'quvchi raqami</div>
                                                <div className="flex items-center justify-between">
                                                    <span className="font-bold text-slate-700 font-mono tracking-tight">{student.phone || 'Kiritilmagan'}</span>
                                                    {student.phone && (
                                                        <a href={`tel:${student.phone}`} className="w-8 h-8 rounded-full bg-indigo-50 hover:bg-indigo-100 text-indigo-600 flex items-center justify-center transition-colors border border-indigo-100">
                                                            <Phone size={14} />
                                                        </a>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="bg-orange-50 p-3 rounded-xl border border-orange-100">
                                                <div className="text-[10px] font-black uppercase tracking-widest text-orange-400 mb-1">Ota-ona: {student.parent_name || 'Noma\'lum'}</div>
                                                <div className="flex items-center justify-between">
                                                    <span className="font-bold text-orange-800 font-mono tracking-tight">{student.parent_phone || 'Kiritilmagan'}</span>
                                                    {student.parent_phone && (
                                                        <a href={`tel:${student.parent_phone}`} className="w-8 h-8 rounded-full bg-white hover:bg-orange-100 text-orange-600 flex items-center justify-center transition-colors border border-orange-200 shadow-sm">
                                                            <PhoneCall size={14} />
                                                        </a>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ManagerGroupContactsModal;
