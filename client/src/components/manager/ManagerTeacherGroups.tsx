import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../api';
import { Users, Phone, Shield, History, FileDown } from 'lucide-react';

interface Group {
    id: string;
    name: string;
    level: string;
    student_count: string; // BIGINT count from pg comes as string
}

interface ManagerTeacherGroupsProps {
    teacherId: string;
    teacherName: string;
    onBack: () => void;
    onViewGroupResults: (group: Group) => void;
    onViewGroupStudents: (group: Group) => void;
}

const ManagerTeacherGroups: React.FC<ManagerTeacherGroupsProps> = ({ teacherId, teacherName, onBack, onViewGroupResults, onViewGroupStudents }) => {
    const [groups, setGroups] = useState<Group[]>([]);
    const [loading, setLoading] = useState(true);

    const [downloading, setDownloading] = useState(false);

    useEffect(() => {
        const fetchGroups = async () => {
            try {
                const res = await apiFetch(`/api/manager/teachers/${teacherId}/groups`);
                const data = await res.json();
                setGroups(Array.isArray(data) ? data : []);
            } catch (err) {
                console.error('Error fetching teacher groups:', err);
                setGroups([]);
            } finally {
                setLoading(false);
            }
        };
        fetchGroups();
    }, [teacherId]);

    const handleDownloadWeeklyReport = async () => {
        setDownloading(true);
        try {
            const res = await apiFetch(`/api/teacher/weekly-report?teacherId=${teacherId}`);
            if (!res.ok) throw new Error('Yuklashda xatolik');

            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `haftalik-hisobot-${teacherName}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (err) {
            console.error(err);
            alert('Hisobotni yuklashda xatolik yuz berdi');
        } finally {
            setDownloading(false);
        }
    };

    return (
        <div className="animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 pb-4 border-b border-slate-200 gap-4">
                <div>
                    <button onClick={onBack} className="text-slate-500 hover:text-indigo-600 font-medium text-xs md:text-sm flex items-center gap-2 mb-2 transition-colors">
                        ← Orqaga
                    </button>
                    <h2 className="text-xl md:text-2xl font-black text-slate-900 flex items-center gap-3">
                        <Shield className="text-indigo-600" /> {teacherName} - Guruhlari
                    </h2>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <button
                        onClick={handleDownloadWeeklyReport}
                        disabled={downloading}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-xl font-bold text-xs md:text-sm shadow-lg shadow-emerald-500/20 hover:bg-emerald-700 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {downloading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <FileDown size={18} />}
                        Haftalik Hisobot (PDF)
                    </button>
                    <div className="bg-indigo-50 text-indigo-700 px-4 py-2 rounded-xl font-bold border border-indigo-100 shadow-sm text-xs md:text-sm">
                        {groups.length} ta Guruh
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="text-center py-12">Yuklanmoqda...</div>
            ) : groups.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 rounded-2xl border border-slate-200 text-slate-500 font-medium">
                    Bu o'qituvchining hozircha guruhlari yo'q.
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {groups.map(group => (
                        <div key={group.id} className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:border-indigo-300 hover:shadow-md transition-all group/card flex flex-col justify-between h-full">
                            <div>
                                <div className="flex justify-between items-start mb-4">
                                    <h3 className="text-xl font-bold text-slate-900 group-hover/card:text-indigo-600 transition-colors uppercase tracking-tight truncate flex-1" title={group.name}>{group.name}</h3>
                                    <span className="px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-bold uppercase tracking-wider rounded-lg border border-indigo-100">
                                        {group.level}
                                    </span>
                                </div>

                                <div className="flex items-center gap-2 text-slate-500 mb-6 font-medium text-sm">
                                    <Users size={16} />
                                    <span>{group.student_count || 0} ta o'quvchi</span>
                                </div>
                            </div>

                            <div className="flex flex-col gap-3 mt-4 pt-4 border-t border-slate-100">
                                <button
                                    onClick={() => onViewGroupResults(group)}
                                    className="w-full flex justify-center items-center gap-2 bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-slate-900 py-3 rounded-xl transition-colors font-semibold border border-slate-200"
                                >
                                    <History size={18} /> Olingan Testlar
                                </button>
                                <button
                                    onClick={() => onViewGroupStudents(group)}
                                    className="w-full flex justify-center items-center gap-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 hover:text-indigo-800 py-3 rounded-xl transition-colors font-semibold border border-indigo-200"
                                >
                                    <Phone size={18} /> Bug'lanish (Ota-onalar)
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ManagerTeacherGroups;
