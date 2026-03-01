import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../api';
import { Users, X } from 'lucide-react';

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
    last_contacted_at?: string;
    last_contacted_relative?: string;
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
                                            <div className="bg-orange-50 p-3 rounded-xl border border-orange-100">
                                                <div className="text-[10px] font-black uppercase tracking-widest text-orange-400">Ota-ona: {student.parent_name || "Noma'lum"}</div>
                                            </div>

                                            {student.last_contacted_at && (
                                                <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100">
                                                    <div className="text-[10px] font-black uppercase tracking-widest text-emerald-500 mb-1">So'nggi bog'lanish</div>
                                                    <div className="text-xs font-bold text-emerald-800">
                                                        {new Date(student.last_contacted_at).toLocaleString('uz-UZ', {
                                                            day: '2-digit',
                                                            month: '2-digit',
                                                            hour: '2-digit',
                                                            minute: '2-digit'
                                                        })} - {student.last_contacted_relative}
                                                    </div>
                                                </div>
                                            )}
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
