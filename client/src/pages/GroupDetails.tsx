import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, FileText, User, CheckCircle, XCircle, Trash2, Send, X, Clock, Phone, Download } from 'lucide-react';
import { apiFetch } from '../api';
import { useAuth } from '../AuthContext';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface GameResult {
    id: string;
    quiz_title: string;
    total_questions: number;
    created_at: string;
    player_results: any[];
}

interface Student {
    id: string;
    name: string;
    phone?: string;
    parent_name?: string;
    parent_phone?: string;
    parent_id?: string;
    last_contacted_at?: string;
    last_contacted_relative?: string;
    status: string;
}

interface ContactLog {
    id: string;
    relative: string;
    contacted_at: string;
}

const GroupDetails = () => {
    const { groupId } = useParams();
    const { role } = useAuth();
    const navigate = useNavigate();
    const [results, setResults] = useState<GameResult[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [groupName, setGroupName] = useState('');

    // Contact History State
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [historyLogs, setHistoryLogs] = useState<ContactLog[]>([]);
    const [historyStudent, setHistoryStudent] = useState<Student | null>(null);

    // PDF Export State
    const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
    const [pdfLoading, setPdfLoading] = useState(false);

    // Move Student State
    const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    const [teachers, setTeachers] = useState<any[]>([]);
    const [targetTeacherId, setTargetTeacherId] = useState('');
    const [targetGroups, setTargetGroups] = useState<any[]>([]);
    const [targetGroupId, setTargetGroupId] = useState('');

    useEffect(() => {
        if (groupId) {
            fetchStudents();
            fetchResults();
            fetchGroupName();
        }
    }, [groupId]);

    const fetchGroupName = async () => {
        try {
            const res = await apiFetch(`/api/groups/${groupId}`);
            if (res.ok) {
                const data = await res.json();
                setGroupName(data.name || '');
            }
        } catch { /* ignore */ }
    };

    const fetchStudents = async () => {
        try {
            const res = await apiFetch(`/api/students/${groupId}`);
            const data = await res.json();
            setStudents(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Error fetching students:', err);
        }
    };

    const fetchResults = async () => {
        try {
            const res = await apiFetch(`/api/groups/${groupId}/results`);
            const data = await res.json();
            setResults(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Error fetching results:', err);
        }
    };

    const handleDeleteStudent = async (studentId: string) => {
        if (!window.confirm("Haqiqatan ham bu o'quvchini o'chirmoqchimisiz?")) return;
        try {
            const res = await apiFetch(`/api/students/${studentId}`, { method: 'DELETE' });
            if (res.ok) {
                fetchStudents();
            } else {
                alert("Xatolik yuz berdi");
            }
        } catch (err) {
            console.error('Error deleting student:', err);
        }
    };

    const openMoveModal = async (student: Student) => {
        setSelectedStudent(student);
        setIsMoveModalOpen(true);
        // Fetch teachers
        try {
            const res = await apiFetch('/api/admin/teachers');
            const data = await res.json();
            setTeachers(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Error fetching teachers:', err);
        }
    };

    const handleTeacherChange = async (teacherId: string) => {
        setTargetTeacherId(teacherId);
        setTargetGroupId('');
        if (!teacherId) {
            setTargetGroups([]);
            return;
        }
        try {
            // Fetch groups for this teacher
            const res = await apiFetch(`/api/teachers/${teacherId}/groups`);
            if (res.ok) {
                const data = await res.json();
                setTargetGroups(Array.isArray(data) ? data : []);
            } else {
                setTargetGroups([]);
            }
        } catch (err) {
            console.error('Error fetching groups:', err);
        }
    };

    const handleMoveStudent = async () => {
        if (!selectedStudent || !targetGroupId) return;
        if (!window.confirm(`"${selectedStudent.name}" ni tanlangan guruhga ko'chirmoqchimisiz?`)) return;

        try {
            const res = await apiFetch(`/api/students/${selectedStudent.id}/move`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ newGroupId: targetGroupId })
            });
            if (res.ok) {
                setIsMoveModalOpen(false);
                setTargetTeacherId('');
                setTargetGroupId('');
                fetchStudents();
                alert("O'quvchi muvaffaqiyatli ko'chirildi!");
            } else {
                alert("Xatolik yuz berdi");
            }
        } catch (err) {
            console.error('Error moving student:', err);
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('uz-UZ', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const safeParseResults = (resultsData: any) => {
        if (!resultsData) return [];
        if (Array.isArray(resultsData)) return resultsData;
        try {
            return typeof resultsData === 'string' ? JSON.parse(resultsData) : resultsData;
        } catch (e) {
            console.error('Error parsing player results:', e);
            return [];
        }
    };

    // Add Student State
    const [isAddStudentModalOpen, setIsAddStudentModalOpen] = useState(false);
    const [newStudentName, setNewStudentName] = useState('');
    const [newStudentPhone, setNewStudentPhone] = useState('');
    const [parentName, setParentName] = useState('');
    const [parentPhone, setParentPhone] = useState('');

    // Pending Contacts State
    const [pendingContacts, setPendingContacts] = useState<Record<string, string>>({});

    const handleAddStudent = async () => {
        if (!newStudentName || !newStudentPhone || !parentName || !parentPhone) {
            alert("Iltimos, barcha maydonlarni to'ldiring!");
            return;
        }

        try {
            const res = await apiFetch('/api/students', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: newStudentName,
                    groupId,
                    phone: newStudentPhone,
                    parentName,
                    parentPhone
                })
            });

            if (res.ok) {
                const data = await res.json();
                setIsAddStudentModalOpen(false);
                setNewStudentName('');
                setNewStudentPhone('');
                setParentName('');
                setParentPhone('');
                fetchStudents();
                alert(`O'quvchi qo'shildi!\nID: ${data.id}\nOta-ona uchun ID kod: ${data.parentId}`);
            } else {
                alert("Xatolik yuz berdi");
            }
        } catch (err) {
            console.error('Error adding student:', err);
        }
    };

    const handleContact = async (studentId: string, relative: string) => {
        try {
            const res = await apiFetch(`/api/students/${studentId}/contact`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ relative })
            });

            if (res.ok) {
                const data = await res.json();
                setStudents(prev => prev.map(s =>
                    s.id === studentId
                        ? { ...s, last_contacted_relative: data.relative, last_contacted_at: data.contactedAt }
                        : s
                ));
            }
        } catch (err) {
            console.error('Error updating contact:', err);
        }
    };

    const fetchContactHistory = async (student: Student) => {
        setHistoryStudent(student);
        setIsHistoryModalOpen(true);
        setHistoryLogs([]);
        try {
            const res = await apiFetch(`/api/students/${student.id}/contact-logs`);
            if (res.ok) {
                const data = await res.json();
                setHistoryLogs(Array.isArray(data) ? data : []);
            }
        } catch (err) {
            console.error('Error fetching contact logs:', err);
        }
    };

    const handleExportPdf = async (filter: 'today' | 'week' | 'all') => {
        setIsPdfModalOpen(false);
        setPdfLoading(true);
        try {
            const res = await apiFetch(`/api/groups/${groupId}/contact-logs?filter=${filter}`);
            const logs: any[] = await res.json();

            const doc = new jsPDF();

            // Header
            doc.setFontSize(18);
            doc.setTextColor(67, 56, 202); // indigo
            doc.text('Ziyokor Education', 14, 18);

            doc.setFontSize(13);
            doc.setTextColor(30, 30, 30);
            const gName = (logs[0]?.group_name) || groupName || groupId || '';
            doc.text(`Guruh: ${gName}`, 14, 28);

            const filterLabel = filter === 'today' ? 'Bugun' : filter === 'week' ? 'Oxirgi 7 kun' : "Barcha vaqt";
            doc.setFontSize(10);
            doc.setTextColor(120, 120, 120);
            doc.text(`Davr: ${filterLabel}  |  Sana: ${new Date().toLocaleDateString('uz-UZ')}`, 14, 36);
            doc.text(`Jami bog'lanishlar: ${logs.length}`, 14, 42);

            if (logs.length === 0) {
                doc.setFontSize(12);
                doc.setTextColor(180, 180, 180);
                doc.text("Bu davrda hech qanday bog'lanish amalga oshirilmagan.", 14, 58);
            } else {
                const rows = logs.map((log, i) => [
                    i + 1,
                    log.student_name || '-',
                    `${log.parent_name || 'Ota-ona'} (${log.relative})`,
                    log.parent_phone || '-',
                    new Date(log.contacted_at).toLocaleDateString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric' })
                    + '  ' + new Date(log.contacted_at).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })
                ]);

                autoTable(doc, {
                    startY: 48,
                    head: [['#', "O'quvchi ismi", 'Yaqini', 'Telefon', "Bog'langan vaqt"]],
                    body: rows,
                    styles: { font: 'helvetica', fontSize: 9, cellPadding: 4 },
                    headStyles: { fillColor: [67, 56, 202], textColor: 255, fontStyle: 'bold' },
                    alternateRowStyles: { fillColor: [245, 247, 255] },
                    columnStyles: {
                        0: { cellWidth: 10, halign: 'center' },
                        2: { cellWidth: 42 },
                        3: { cellWidth: 36 },
                        4: { cellWidth: 46 },
                    },
                });
            }

            const safeGroupName = gName.replace(/[^a-zA-Z0-9_]/g, '_');
            doc.save(`Aloqa_${safeGroupName}_${filter}_${Date.now()}.pdf`);
        } catch (err) {
            console.error('PDF export error:', err);
            alert("PDF yaratishda xatolik yuz berdi");
        } finally {
            setPdfLoading(false);
        }
    };

    return (
        <div className="min-h-screen p-8 bg-transparent font-sans">

            <div className="max-w-7xl mx-auto relative z-10">
                {/* Header */}
                <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-6">
                        <button
                            onClick={() => navigate(role === 'admin' ? '/admin/groups' : '/teacher')}
                            className="p-3 rounded-2xl bg-white border border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-200 hover:shadow-lg transition-all"
                        >
                            <ArrowLeft size={24} />
                        </button>
                        <div>
                            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Guruh Tafsilotlari</h1>
                            <p className="text-slate-500">O'quvchilar ro'yxati va test natijalari</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setIsPdfModalOpen(true)}
                            disabled={pdfLoading}
                            className="bg-white border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 font-bold py-3 px-5 rounded-xl transition-all shadow-sm flex items-center gap-2 disabled:opacity-50"
                        >
                            {pdfLoading ? (
                                <span className="w-5 h-5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <Download size={18} />
                            )}
                            PDF Eksport
                        </button>
                        <button
                            onClick={() => setIsAddStudentModalOpen(true)}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg hover:shadow-indigo-500/30 flex items-center gap-2"
                        >
                            <User size={20} />
                            O'quvchi Qo'shish
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-[70%_30%] gap-8">
                    {/* Left Column: Students List */}
                    <div className="space-y-6">
                        <div className="bg-white rounded-[2rem] p-6 border border-slate-200 shadow-sm h-fit">
                            <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                                <User className="text-indigo-500" />
                                O'quvchilar
                            </h2>
                            <div className="overflow-y-auto max-h-[600px] pr-2 custom-scrollbar">
                                {students.length === 0 ? (
                                    <p className="text-slate-400 text-center py-4">O'quvchilar yo'q</p>
                                ) : (
                                    <>
                                        {/* Desktop Table */}
                                        <div className="hidden md:block">
                                            <table className="w-full text-left border-collapse">
                                                <thead className="bg-slate-50/50">
                                                    <tr>
                                                        <th className="p-4 text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">O'quvchi</th>
                                                        <th className="p-4 text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Bog'lanish</th>
                                                        <th className="p-4 text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Holat / Tarix</th>
                                                        {role === 'admin' && <th className="p-4 text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 text-right">Amallar</th>}
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                    {students.map(student => (
                                                        <tr key={student.id} className="hover:bg-slate-50/50 transition-colors">
                                                            <td className="p-4">
                                                                <div className="flex flex-col">
                                                                    <span className="font-bold text-slate-800">{student.name}</span>
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-[10px] font-mono text-slate-400">ID: {student.id}</span>
                                                                        <span className="text-slate-200 text-[10px]">|</span>
                                                                        <span className="text-[10px] font-black text-indigo-500 uppercase tracking-tighter">Ota-ona ID: {student.parent_id}</span>
                                                                    </div>
                                                                    <div className="flex items-center gap-2 mt-1">
                                                                        <span className="text-xs text-slate-500 flex items-center gap-1"><Phone size={10} /> {student.phone || '-'}</span>
                                                                        <span className="text-slate-200 text-[10px]">•</span>
                                                                        <span className="text-xs text-slate-400 font-medium">{student.parent_name || 'Ota-ona'}: {student.parent_phone || '-'}</span>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="p-4">
                                                                <div className="flex items-center gap-2">
                                                                    <select
                                                                        className="p-2 bg-white border border-slate-200 rounded-lg text-xs font-black text-slate-600 outline-none focus:ring-2 focus:ring-indigo-500/30 cursor-pointer w-32 shadow-sm"
                                                                        value={pendingContacts[student.id] || ''}
                                                                        onChange={(e) => setPendingContacts(prev => ({ ...prev, [student.id]: e.target.value }))}
                                                                    >
                                                                        <option value="">Tanlang...</option>
                                                                        {['Otasi', 'Onasi', 'Bobosi', 'Buvisi', 'Akasi', "Bog'lana olmadik"].map((rel) => (
                                                                            <option key={rel} value={rel}>{rel}</option>
                                                                        ))}
                                                                    </select>
                                                                    {pendingContacts[student.id] && (
                                                                        <button
                                                                            onClick={() => {
                                                                                handleContact(student.id, pendingContacts[student.id]);
                                                                                setPendingContacts(prev => {
                                                                                    const next = { ...prev };
                                                                                    delete next[student.id];
                                                                                    return next;
                                                                                });
                                                                            }}
                                                                            className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all shadow-md shadow-green-200 active:scale-90"
                                                                            title="Tasdiqlash"
                                                                        >
                                                                            <CheckCircle size={16} />
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </td>
                                                            <td className="p-4">
                                                                <div className="flex items-center gap-3">
                                                                    <button
                                                                        onClick={() => fetchContactHistory(student)}
                                                                        className="p-2 bg-slate-100 text-slate-400 rounded-lg hover:bg-slate-200 hover:text-indigo-600 transition-all shadow-sm"
                                                                        title="Tarix"
                                                                    >
                                                                        <Clock size={16} />
                                                                    </button>
                                                                    {student.last_contacted_relative && (
                                                                        <div className="flex flex-col">
                                                                            <span className="text-[10px] font-black text-indigo-500 uppercase tracking-tighter bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100 w-fit">
                                                                                {student.last_contacted_relative}
                                                                            </span>
                                                                            <span className="text-[9px] text-slate-400 font-mono mt-0.5">
                                                                                {student.last_contacted_at && new Date(student.last_contacted_at).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}
                                                                            </span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </td>
                                                            {role === 'admin' && (
                                                                <td className="p-4 text-right">
                                                                    <div className="flex justify-end gap-2">
                                                                        <button
                                                                            onClick={() => openMoveModal(student)}
                                                                            className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-100"
                                                                        >
                                                                            <Send size={16} />
                                                                        </button>
                                                                        <button
                                                                            onClick={() => handleDeleteStudent(student.id)}
                                                                            className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100"
                                                                        >
                                                                            <Trash2 size={16} />
                                                                        </button>
                                                                    </div>
                                                                </td>
                                                            )}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>

                                        {/* Mobile List View */}
                                        <div className="md:hidden space-y-4">
                                            {students.map(student => (
                                                <div key={student.id} className="bg-slate-50/50 rounded-2xl border border-slate-100 p-4 shadow-sm">
                                                    <div className="flex justify-between items-start mb-3">
                                                        <div className="flex-1 min-w-0">
                                                            <h3 className="font-black text-slate-800 text-base truncate">{student.name}</h3>
                                                            <span className="text-[9px] font-mono text-slate-400 tracking-wider">ID: {student.id}</span>
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={() => fetchContactHistory(student)}
                                                                className="p-2 bg-white text-slate-400 rounded-lg border border-slate-100 shadow-sm"
                                                            >
                                                                <Clock size={16} />
                                                            </button>
                                                            {role === 'admin' && (
                                                                <>
                                                                    <button
                                                                        onClick={() => openMoveModal(student)}
                                                                        className="p-2 text-blue-500 bg-white border border-blue-100 rounded-lg shadow-sm"
                                                                    >
                                                                        <Send size={16} />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleDeleteStudent(student.id)}
                                                                        className="p-2 text-red-500 bg-white border border-red-100 rounded-lg shadow-sm"
                                                                    >
                                                                        <Trash2 size={16} />
                                                                    </button>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-2 mb-4">
                                                        <div className="bg-white p-2.5 rounded-xl border border-slate-100/50">
                                                            <p className="text-[10px] text-slate-400 font-black uppercase mb-1 tracking-widest">O'QUVCHI</p>
                                                            <p className="text-[11px] font-bold text-slate-600 flex items-center gap-1 truncate"><Phone size={10} /> {student.phone || '-'}</p>
                                                        </div>
                                                        <div className="bg-white p-2.5 rounded-xl border border-slate-100/50">
                                                            <p className="text-[10px] text-slate-400 font-black uppercase mb-1 tracking-widest">{student.parent_name || 'OTA-ONA'}</p>
                                                            <p className="text-[11px] font-bold text-slate-600 flex items-center gap-1 truncate"><Phone size={10} /> {student.parent_phone || '-'}</p>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-3">
                                                        <div className="flex-1 flex items-center gap-2">
                                                            <select
                                                                className={`flex-1 p-2.5 ${pendingContacts[student.id] ? 'bg-white text-slate-900 border-2 border-indigo-500' : 'bg-indigo-600 text-white border-0'} rounded-xl text-xs font-black outline-none shadow-lg shadow-indigo-500/20 transition-all`}
                                                                value={pendingContacts[student.id] || ''}
                                                                onChange={(e) => setPendingContacts(prev => ({ ...prev, [student.id]: e.target.value }))}
                                                            >
                                                                <option value="">BOG'LANISH...</option>
                                                                {['Otasi', 'Onasi', 'Bobosi', 'Buvisi', 'Akasi', "Bog'lana olmadik"].map((rel) => (
                                                                    <option key={rel} value={rel}>{rel}</option>
                                                                ))}
                                                            </select>
                                                            {pendingContacts[student.id] && (
                                                                <button
                                                                    onClick={() => {
                                                                        handleContact(student.id, pendingContacts[student.id]);
                                                                        setPendingContacts(prev => {
                                                                            const next = { ...prev };
                                                                            delete next[student.id];
                                                                            return next;
                                                                        });
                                                                    }}
                                                                    className="p-3 bg-green-500 text-white rounded-xl shadow-lg shadow-green-200 active:scale-90 transition-transform"
                                                                >
                                                                    <CheckCircle size={20} />
                                                                </button>
                                                            )}
                                                        </div>
                                                        {student.last_contacted_relative && (
                                                            <div className="flex items-center gap-2 bg-indigo-50 px-3 py-2 rounded-xl border border-indigo-100">
                                                                <div className="flex flex-col leading-none">
                                                                    <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">{student.last_contacted_relative}</span>
                                                                    <span className="text-[11px] font-bold text-indigo-600">
                                                                        {student.last_contacted_at && new Date(student.last_contacted_at).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Quiz History */}
                    <div className="space-y-6">
                        <h2 className="text-xl font-bold text-slate-900 px-2">Test Tarixi</h2>
                        {results.length > 0 ? (
                            results.map((result) => (
                                <div key={result.id} className="bg-white rounded-[2rem] p-6 border border-slate-200 shadow-sm hover:shadow-md transition-all">
                                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                                        <div>
                                            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                                <FileText className="text-indigo-500" size={24} />
                                                {result.quiz_title}
                                            </h2>
                                            <p className="text-slate-400 text-sm font-medium flex items-center gap-2 mt-1">
                                                <Calendar size={14} />
                                                {formatDate(result.created_at)}
                                            </p>
                                        </div>
                                        <div className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl font-bold text-sm">
                                            Unit Test
                                        </div>
                                    </div>

                                    {/* Students Results Table (Desktop) */}
                                    <div className="hidden md:block overflow-x-auto">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="border-b border-slate-100 text-slate-400 text-xs font-black uppercase tracking-widest">
                                                    <th className="pb-3 px-2">O'quvchi</th>
                                                    <th className="pb-3 px-2 text-center">To'g'ri / Jami</th>
                                                    <th className="pb-3 px-2 text-center">Foiz</th>
                                                    <th className="pb-3 px-2 text-right">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {safeParseResults(result.player_results).map((player: any) => {
                                                    const score = player.score || 0;
                                                    const correctCount = Math.round(score / 100);
                                                    const total = result.total_questions || 0;
                                                    const percentage = total > 0 ? Math.round((correctCount / total) * 100) : 0;
                                                    const isPassed = percentage > 59;

                                                    return (
                                                        <tr key={player.id} className="hover:bg-slate-50">
                                                            <td className="py-3 px-2 font-bold text-slate-700 flex items-center gap-2">
                                                                <User size={16} className="text-slate-400" />
                                                                {player.name}
                                                            </td>
                                                            <td className="py-3 px-2 text-center text-slate-500 font-mono">
                                                                {correctCount} / {total}
                                                            </td>
                                                            <td className="py-3 px-2 text-center font-black font-mono text-slate-700">
                                                                {percentage}%
                                                            </td>
                                                            <td className="py-3 px-2 text-right">
                                                                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-widest ${isPassed
                                                                    ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                                                                    : 'bg-red-50 text-red-600 border border-red-100'
                                                                    }`}>
                                                                    {isPassed ? (
                                                                        <><CheckCircle size={14} /> Passed</>
                                                                    ) : (
                                                                        <><XCircle size={14} /> Failed</>
                                                                    )}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Students Results List (Mobile) */}
                                    <div className="md:hidden space-y-3">
                                        {safeParseResults(result.player_results).map((player: any) => {
                                            const score = player.score || 0;
                                            const correctCount = Math.round(score / 100);
                                            const total = result.total_questions || 0;
                                            const percentage = total > 0 ? Math.round((correctCount / total) * 100) : 0;
                                            const isPassed = percentage > 59;

                                            return (
                                                <div key={player.id} className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center">
                                                    <div>
                                                        <p className="font-bold text-slate-800 text-sm mb-1">{player.name}</p>
                                                        <div className="flex gap-2 text-xs">
                                                            <span className="font-mono text-slate-500">{correctCount}/{total}</span>
                                                            <span className="font-black text-slate-700">{percentage}%</span>
                                                        </div>
                                                    </div>
                                                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${isPassed
                                                        ? 'bg-emerald-100 text-emerald-700'
                                                        : 'bg-red-100 text-red-700'
                                                        }`}>
                                                        {isPassed ? 'Passed' : 'Failed'}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-16">
                                <div className="inline-block p-6 rounded-full bg-slate-100 mb-4 text-slate-300">
                                    <FileText size={48} />
                                </div>
                                <h3 className="text-xl font-bold text-slate-400">Hozircha natijalar yo'q</h3>
                                <p className="text-slate-400 mt-2">Bu guruhda hali Unit Test o'tkazilmagan.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Add Student Modal */}
            {
                isAddStudentModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                        <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold text-slate-800">Yangi o'quvchi qo'shish</h3>
                                <button onClick={() => setIsAddStudentModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                    <X size={24} />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-sm font-bold text-slate-700 block mb-1">F.I.SH</label>
                                    <input
                                        type="text"
                                        value={newStudentName}
                                        onChange={(e) => setNewStudentName(e.target.value)}
                                        placeholder="Ism Familiya Sharifi"
                                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-medium outline-none focus:ring-2 focus:ring-indigo-500/50"
                                    />
                                </div>

                                <div>
                                    <label className="text-sm font-bold text-slate-700 block mb-1">O'quvchi Raqami</label>
                                    <input
                                        type="tel"
                                        value={newStudentPhone}
                                        onChange={(e) => setNewStudentPhone(e.target.value)}
                                        placeholder="+9989..."
                                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-medium outline-none focus:ring-2 focus:ring-indigo-500/50"
                                    />
                                </div>

                                <hr className="border-slate-100 my-2" />
                                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Ota-ona ma'lumotlari</p>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-1">
                                        <label className="text-sm font-bold text-slate-700 block mb-1">Kimligi</label>
                                        <select
                                            value={parentName}
                                            onChange={(e) => setParentName(e.target.value)}
                                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-medium outline-none focus:ring-2 focus:ring-indigo-500/50"
                                        >
                                            <option value="">Tanlang</option>
                                            <option value="Otasi">Otasi</option>
                                            <option value="Onasi">Onasi</option>
                                            <option value="Buvisi">Buvisi</option>
                                            <option value="Bobosi">Bobosi</option>
                                            <option value="Akasi">Akasi</option>
                                        </select>
                                    </div>
                                    <div className="col-span-1">
                                        <label className="text-sm font-bold text-slate-700 block mb-1">Raqami</label>
                                        <input
                                            type="tel"
                                            value={parentPhone}
                                            onChange={(e) => setParentPhone(e.target.value)}
                                            placeholder="+9989..."
                                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-medium outline-none focus:ring-2 focus:ring-indigo-500/50"
                                        />
                                    </div>
                                </div>

                                <button
                                    onClick={handleAddStudent}
                                    className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-indigo-500/20"
                                >
                                    Qo'shish
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* History Modal */}
            {
                isHistoryModalOpen && historyStudent && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                        <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in duration-200 max-h-[80vh] flex flex-col">
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h3 className="text-xl font-bold text-slate-800">Aloqalar Tarixi</h3>
                                    <p className="text-sm text-slate-500 font-medium">{historyStudent.name}</p>
                                </div>
                                <button onClick={() => setIsHistoryModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                    <X size={24} />
                                </button>
                            </div>

                            <div className="overflow-y-auto custom-scrollbar flex-1 space-y-4 pr-2">
                                {historyLogs.length === 0 ? (
                                    <div className="text-center py-10">
                                        <Clock size={48} className="mx-auto text-slate-200 mb-2" />
                                        <p className="text-slate-400">Hozircha tarix mavjud emas</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {historyLogs.map((log) => (
                                            <div key={log.id} className="flex gap-4">
                                                <div className="flex flex-col items-center">
                                                    <div className="w-2 h-2 rounded-full bg-indigo-400 mt-2"></div>
                                                    <div className="w-0.5 h-full bg-indigo-100 my-1"></div>
                                                </div>
                                                <div className="bg-indigo-50/50 rounded-xl p-3 flex-1 border border-indigo-100">
                                                    <div className="flex justify-between items-start mb-1">
                                                        <span className="font-bold text-indigo-900 text-sm flex items-center gap-1">
                                                            <Phone size={12} />
                                                            {log.relative}
                                                        </span>
                                                        <span className="text-[10px] font-black text-indigo-300 uppercase tracking-wider">
                                                            BIZ BOG' LANDIK
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-slate-500 font-mono">
                                                        {new Date(log.contacted_at).toLocaleDateString('uz-UZ', { month: 'long', day: 'numeric' })}
                                                        <span className="mx-2">•</span>
                                                        {new Date(log.contacted_at).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )
            }

            {/* PDF Export Filter Modal */}
            {isPdfModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl">
                        <div className="flex justify-between items-center mb-5">
                            <div>
                                <h3 className="text-lg font-bold text-slate-800">PDF Eksport</h3>
                                <p className="text-xs text-slate-400 font-medium mt-0.5">Qaysi davrni yuklab olasiz?</p>
                            </div>
                            <button onClick={() => setIsPdfModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <X size={22} />
                            </button>
                        </div>

                        <div className="space-y-3">
                            <button
                                onClick={() => handleExportPdf('today')}
                                className="w-full flex items-center gap-4 p-4 rounded-xl border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50 transition-all group"
                            >
                                <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center group-hover:bg-emerald-200 transition-colors">
                                    <Calendar size={20} className="text-emerald-600" />
                                </div>
                                <div className="text-left">
                                    <p className="font-bold text-slate-800 text-sm">📅 Bugungi</p>
                                    <p className="text-xs text-slate-400">Faqat bugungi bog'lanishlar</p>
                                </div>
                            </button>

                            <button
                                onClick={() => handleExportPdf('week')}
                                className="w-full flex items-center gap-4 p-4 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50 transition-all group"
                            >
                                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                                    <Calendar size={20} className="text-blue-600" />
                                </div>
                                <div className="text-left">
                                    <p className="font-bold text-slate-800 text-sm">📆 Haftalik</p>
                                    <p className="text-xs text-slate-400">Oxirgi 7 kunlik bog'lanishlar</p>
                                </div>
                            </button>

                            <button
                                onClick={() => handleExportPdf('all')}
                                className="w-full flex items-center gap-4 p-4 rounded-xl border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50 transition-all group"
                            >
                                <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center group-hover:bg-indigo-200 transition-colors">
                                    <Download size={20} className="text-indigo-600" />
                                </div>
                                <div className="text-left">
                                    <p className="font-bold text-slate-800 text-sm">🗂️ Barcha vaqt</p>
                                    <p className="text-xs text-slate-400">Barcha bog'lanishlar tarixi</p>
                                </div>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Move Student Modal */}
            {
                isMoveModalOpen && selectedStudent && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                        <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold text-slate-800">O'quvchini ko'chirish</h3>
                                <button onClick={() => setIsMoveModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                    <X size={24} />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100 mb-4">
                                    <p className="text-xs text-indigo-400 font-bold uppercase tracking-wider mb-1">O'quvchi</p>
                                    <p className="font-bold text-indigo-900 text-lg">{selectedStudent.name}</p>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-700">O'qituvchini tanlang</label>
                                    <select
                                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-medium outline-none focus:ring-2 focus:ring-indigo-500/50"
                                        value={targetTeacherId}
                                        onChange={(e) => handleTeacherChange(e.target.value)}
                                    >
                                        <option value="">Tanlang...</option>
                                        {teachers.map(t => (
                                            <option key={t.id} value={t.id}>{t.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-700">Guruhni tanlang</label>
                                    <select
                                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-medium outline-none focus:ring-2 focus:ring-indigo-500/50"
                                        value={targetGroupId}
                                        onChange={(e) => setTargetGroupId(e.target.value)}
                                        disabled={!targetTeacherId}
                                    >
                                        <option value="">Tanlang...</option>
                                        {targetGroups.map(g => (
                                            <option key={g.id} value={g.id}>{g.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <button
                                    onClick={handleMoveStudent}
                                    disabled={!targetGroupId}
                                    className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
                                >
                                    <Send size={18} /> Ko'chirish
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default GroupDetails;
