import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Users, Plus, LogOut, ArrowLeft, PlayCircle, 
    Trash2, ChevronDown, X, Calendar, CheckSquare, BookOpen,
    FileText
} from 'lucide-react';
import { apiFetch } from '../api';
import { useAuth } from '../AuthContext';
import logo from '../assets/logo.jpeg';

interface Group {
    id: string;
    name: string;
    teacher_name?: string;
    teacher_id?: string;
    level?: string;
    extra_class_days?: string[];
    extra_class_times?: string[];
}

interface UnitQuiz {
    id: string;
    level: string;
    unit: string;
    title: string;
    questions?: any;
    is_active?: boolean;
}

interface Battle {
    id: string;
    group_a_id: string;
    group_b_id: string;
    group_a_name: string;
    group_b_name: string;
    score_a: number;
    score_b: number;
    status: string;
}

// --- Battle Status Component ---
const BattleStatus = ({ battle, groupId, onViewDetails }: { battle: Battle | null; groupId: string; onViewDetails: (id: string) => void }) => {
    if (!battle) return <span className="text-slate-400 text-xs italic opacity-50">Battle yo'q</span>;

    const isA = battle.group_a_id === groupId;
    const myScore = isA ? battle.score_a : battle.score_b;
    const oppScore = isA ? battle.score_b : battle.score_a;
    const oppName = isA ? battle.group_b_name : battle.group_a_name;

    const total = myScore + oppScore || 1;
    const percentage = Math.round((myScore / total) * 100);

    return (
        <div
            onClick={(e) => { e.stopPropagation(); onViewDetails(battle.id); }}
            className="flex flex-col gap-2 min-w-[140px] cursor-pointer p-2 rounded-xl transition-all border group/battle hover:shadow-lg bg-white border-slate-200"
        >
            <div className="flex justify-between text-[9px] font-black uppercase tracking-wider">
                <span className="text-slate-400">Siz</span>
                <div className="flex items-center gap-1">
                    <span className="text-rose-500 truncate max-w-[60px]">{oppName}</span>
                    <ChevronDown size={10} className="-rotate-90 opacity-30 group-hover/battle:opacity-100 text-slate-400" />
                </div>
            </div>
            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden flex border border-slate-200 shadow-inner">
                <div
                    className="h-full bg-gradient-to-r from-indigo-600 to-indigo-400 transition-all duration-1000 ease-out"
                    style={{ width: `${percentage}%` }}
                />
                <div
                    className="h-full bg-gradient-to-l from-rose-600 to-rose-400 transition-all duration-1000 ease-out"
                    style={{ width: `${100 - percentage}%` }}
                />
            </div>
            <div className="flex justify-between text-[10px] font-black tabular-nums">
                <span className="text-indigo-600">{myScore.toLocaleString()} XP</span>
                <span className="text-slate-400">{oppScore.toLocaleString()} XP</span>
            </div>
        </div>
    );
};

// --- Student Management Modal ---
const StudentModal = ({
    isOpen,
    onClose,
    group,
    onAddStudent
}: {
    isOpen: boolean;
    onClose: () => void;
    group: Group | null;
    onAddStudent: (data: any) => void;
}) => {
    const [newStudentName, setNewStudentName] = useState('');
    const [newStudentPhone, setNewStudentPhone] = useState('');
    const [parentName, setParentName] = useState('');
    const [parentPhone, setParentPhone] = useState('');

    if (!isOpen || !group) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (newStudentName.trim() && newStudentPhone && parentName && parentPhone) {
            onAddStudent({
                name: newStudentName,
                phone: newStudentPhone,
                parentName,
                parentPhone
            });
            setNewStudentName('');
            setNewStudentPhone('');
            setParentName('');
            setParentPhone('');
        } else {
            alert("Iltimos, barcha maydonlarni to'ldiring!");
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <div className="bg-white w-full max-w-lg rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-slate-50">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <Users className="text-indigo-600" size={20} />
                        {group.name} - O'quvchilar
                    </h3>
                    <button onClick={onClose} className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-500 transition-colors">
                        <X size={18} />
                    </button>
                </div>

                <div className="p-6">
                    <div className="space-y-4">
                        <div>
                            <label className="text-sm font-bold text-slate-700 block mb-1">F.I.SH</label>
                            <input
                                type="text"
                                value={newStudentName}
                                onChange={(e) => setNewStudentName(e.target.value)}
                                placeholder="Ism Familiya Sharifi"
                                className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl font-medium outline-none focus:ring-2 focus:ring-indigo-500/50"
                            />
                        </div>

                        <div>
                            <label className="text-sm font-bold text-slate-700 block mb-1">O'quvchi Raqami</label>
                            <input
                                type="tel"
                                value={newStudentPhone}
                                onChange={(e) => setNewStudentPhone(e.target.value)}
                                placeholder="+9989..."
                                className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl font-medium outline-none focus:ring-2 focus:ring-indigo-500/50"
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
                                    className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl font-medium outline-none focus:ring-2 focus:ring-indigo-500/50"
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
                                    className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl font-medium outline-none focus:ring-2 focus:ring-indigo-500/50"
                                />
                            </div>
                        </div>

                        <button
                            onClick={handleSubmit}
                            className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-indigo-500/20"
                        >
                            Qo'shish
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- Extra Class Schedule Modal ---
const ScheduleModal = ({
    isOpen,
    onClose,
    group,
    onForcedBook,
    onDeleteBooking
}: {
    isOpen: boolean;
    onClose: () => void;
    group: Group | null;
    onForcedBook: (studentId: string, slot: string, topic: string) => void;
    onDeleteBooking: (id: string) => void;
}) => {
    const [bookings, setBookings] = useState<any[]>([]);
    const [students, setStudents] = useState<any[]>([]);
    const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
    const [isAddingManually, setIsAddingManually] = useState(false);
    const [availableTopics, setAvailableTopics] = useState<any[]>([]);
    const [customTopic, setCustomTopic] = useState('');
    const [selectedTopic, setSelectedTopic] = useState('');

    useEffect(() => {
        if (isOpen && group) {
            fetchData();
        }
    }, [isOpen, group]);

    const fetchData = async () => {
        if(!group) return;
        try {
            const [bRes, sRes, tRes] = await Promise.all([
                apiFetch(`/api/groups/${group.id}/extra-class-bookings`),
                apiFetch(`/api/groups/${group.id}/students`),
                apiFetch('/api/level-topics')
            ]);
            if (bRes.ok) setBookings(await bRes.json());
            if (sRes.ok) setStudents(await sRes.json());
            if (tRes.ok) {
                const allTopics = await tRes.json();
                setAvailableTopics(allTopics.filter((t: any) => t.level === group.level));
            }
        } catch (e) { }
    };

    if (!isOpen || !group) return null;

    const generateSlots = () => {
        if (!group.extra_class_times) return [];
        const slots: string[] = [];
        group.extra_class_times.forEach((range: string) => {
            const parts = range.split('-');
            if (parts.length < 2) return;
            const start = parts[0].trim();
            const end = parts[1].trim();
            let current = new Date(`2000-01-01T${start}:00`);
            const endLimit = new Date(`2000-01-01T${end}:00`);
            while (current < endLimit) {
                slots.push(current.toTimeString().slice(0, 5));
                current.setMinutes(current.getMinutes() + 30);
            }
        });
        return slots;
    };

    const slots = generateSlots();

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="flex justify-between items-center p-6 border-b bg-slate-50">
                    <div>
                        <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                            <Calendar className="text-indigo-600" size={24} />
                            {group.name} - Jadval
                        </h3>
                        <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">
                            {group.extra_class_days?.join(', ')} kunlari
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-xl text-slate-500 transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {slots.length > 0 ? (
                        slots.map(slot => {
                            const slotBookings = bookings.filter(b => b.time_slot === slot);
                            const forcedCount = slotBookings.filter(b => b.is_forced).length;
                            const studentCount = slotBookings.filter(b => !b.is_forced).length;
                            
                            return (
                                <div key={slot} className="p-4 bg-slate-50 rounded-2xl border-2 border-slate-100 space-y-3">
                                    <div className="flex justify-between items-start">
                                        <span className="text-lg font-black text-indigo-600">{slot}</span>
                                        <div className="flex flex-col items-end gap-1">
                                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase ${forcedCount >= 5 ? 'bg-rose-100 text-rose-600' : 'bg-blue-100 text-blue-600'}`}>
                                                Teacher: {forcedCount}/5
                                            </span>
                                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase ${studentCount >= 4 ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                                Student: {studentCount}/4
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-3">
                                        {slotBookings.map(b => (
                                            <div key={b.id} className={`flex items-center gap-3 px-3 py-2 rounded-xl border-2 shadow-sm transition-all ${b.is_completed ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-100'}`}>
                                                <div className="flex flex-col">
                                                    <span className={`text-xs font-black ${b.is_completed ? 'text-emerald-700 line-through opacity-50' : 'text-slate-800'}`}>
                                                        {b.student_name}
                                                    </span>
                                                    {b.topic && (
                                                        <span className="text-[9px] font-bold text-slate-400 italic">
                                                            Topic: {b.topic}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-1.5 ml-auto border-l pl-2 border-slate-100">
                                                    <button
                                                        onClick={async () => {
                                                            const res = await apiFetch(`/api/extra-class-bookings/${b.id}/complete`, {
                                                                method: 'PATCH',
                                                                body: JSON.stringify({ isCompleted: !b.is_completed })
                                                            });
                                                            if (res.ok) fetchData();
                                                        }}
                                                        className={`p-1 rounded-lg transition-all ${b.is_completed ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400 hover:bg-emerald-100 hover:text-emerald-500'}`}
                                                        title={b.is_completed ? "Tugallanmagan" : "Bajarildi"}
                                                    >
                                                        <CheckSquare size={14} />
                                                    </button>
                                                    <button 
                                                        onClick={async () => {
                                                            await onDeleteBooking(b.id);
                                                            fetchData();
                                                        }}
                                                        className="p-1 rounded-lg bg-slate-100 text-rose-400 hover:bg-rose-100 hover:text-rose-600 transition-all"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                        <button 
                                            onClick={() => { setSelectedSlot(slot); setIsAddingManually(true); }}
                                            className="w-10 h-10 rounded-xl border-2 border-dashed border-indigo-200 text-indigo-400 flex items-center justify-center hover:bg-indigo-50 hover:border-indigo-400 transition-all"
                                        >
                                            <Plus size={20} />
                                        </button>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="text-center py-12 text-slate-400 italic">
                            Kunlar va vaqtlarni kiriting.
                        </div>
                    )}
                </div>
            </div>

            {isAddingManually && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/20 backdrop-blur-sm p-4">
                    <div className="bg-white w-full max-w-sm rounded-[2rem] p-6 shadow-2xl">
                        <div className="flex justify-between items-center mb-4">
                            <h4 className="text-lg font-black text-slate-800">{selectedSlot} ga qo'shish</h4>
                            <button onClick={() => setIsAddingManually(false)} className="p-2 text-slate-400"><X size={20} /></button>
                        </div>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5 px-1">Mavzu (ixtiyoriy)</label>
                                <div className="space-y-2">
                                    <select 
                                        value={selectedTopic}
                                        onChange={(e) => setSelectedTopic(e.target.value)}
                                        className="w-full p-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold text-sm outline-none focus:border-indigo-500 transition-all"
                                    >
                                        <option value="">Ro'yxatdan tanlang...</option>
                                        {availableTopics.map(t => (
                                            <option key={t.id} value={t.topic_name}>{t.topic_name}</option>
                                        ))}
                                        <option value="custom">Boshqa mavzu yozish...</option>
                                    </select>

                                    {(selectedTopic === 'custom' || availableTopics.length === 0) && (
                                        <input 
                                            type="text" 
                                            placeholder="Mavzuni qo'lda kiriting..." 
                                            value={customTopic}
                                            onChange={(e) => setCustomTopic(e.target.value)}
                                            className="w-full p-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold text-sm outline-none focus:border-indigo-500 transition-all"
                                        />
                                    )}
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">O'quvchini tanlang</label>
                                <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                                    {students.filter(s => !bookings.some(b => b.student_id === s.id)).map(s => (
                                        <button
                                            key={s.id}
                                            onClick={async () => {
                                                if (selectedSlot) {
                                                    const finalTopic = selectedTopic === 'custom' ? customTopic : (selectedTopic || customTopic);
                                                    await onForcedBook(s.id, selectedSlot, finalTopic);
                                                    setSelectedTopic('');
                                                    setCustomTopic('');
                                                    setIsAddingManually(false);
                                                    setTimeout(fetchData, 500);
                                                }
                                            }}
                                            className="w-full text-left p-3 hover:bg-indigo-50 rounded-xl transition-colors font-bold text-sm text-slate-700 flex justify-between items-center group border border-transparent hover:border-indigo-100"
                                        >
                                            {s.name}
                                            <Plus className="opacity-0 group-hover:opacity-100 text-indigo-400" size={16} />
                                        </button>
                                    ))}
                                    {students.length === 0 && (
                                        <p className="text-center py-4 text-slate-400 italic text-xs">Guruhda o'quvchilar topilmadi.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- Group Row Component ---
const GroupRow = ({
    group,
    unitQuizzes,
    onOpenStudents,
    onOpenSchedule,
    onLaunch,
    onEdit,
    onDelete,
    navigate,
    isAdmin,
    battle
}: {
    group: Group;
    unitQuizzes: UnitQuiz[];
    onOpenStudents: (group: Group) => void;
    onOpenSchedule: (group: Group) => void;
    onLaunch: (quizId: string, groupId: string) => void;
    onEdit: (group: Group) => void;
    onDelete?: (groupId: string) => void;
    navigate: any;
    isAdmin?: boolean;
    battle: Battle | null;
}) => {
    const [selectedLevel, setSelectedLevel] = useState<string>('');
    const [selectedUnit, setSelectedUnit] = useState<string>('');
    const [selectedQuizId, setSelectedQuizId] = useState<string>('');

    const levels = useMemo(() => {
        const uniqueLevels = Array.from(new Set(unitQuizzes.map(q => q.level))).sort();
        return uniqueLevels;
    }, [unitQuizzes]);

    const units = useMemo(() => {
        if (!selectedLevel) return [];
        const uniqueUnits = Array.from(new Set(
            unitQuizzes
                .filter(q => q.level === selectedLevel)
                .map(q => q.unit)
        )).sort();
        return uniqueUnits;
    }, [unitQuizzes, selectedLevel]);

    return (
        <tr className="border-b transition-colors group border-slate-100 hover:bg-slate-50/50">
            <td className="p-4 cursor-pointer" onClick={() => navigate(isAdmin ? `/admin/group/${group.id}` : `/teacher/group/${group.id}`)}>
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg border shadow-sm bg-white border-slate-200 text-indigo-600">
                        {group.name.charAt(0)}
                    </div>
                    <div>
                        <span className="font-black tracking-tight transition-colors block text-slate-800">{group.name}</span>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{group.level || 'Beginner'}</span>
                    </div>
                </div>
            </td>

            {!isAdmin && (
                <td className="p-4">
                    <BattleStatus
                        battle={battle}
                        groupId={group.id}
                        onViewDetails={(id) => navigate(`/student/battle/${id}`)}
                    />
                </td>
            )}

            {isAdmin && (
                <td className="p-4">
                    <div className="flex items-center gap-2 text-slate-600">
                        <Users size={16} className="text-slate-400" />
                        <span className="font-medium">{group.teacher_name || 'Noma\'lum'}</span>
                    </div>
                </td>
            )}

            <td className="p-4">
                <div className="relative max-w-[150px]">
                    <select
                        value={selectedLevel}
                        onChange={(e) => {
                            setSelectedLevel(e.target.value);
                            setSelectedUnit('');
                            setSelectedQuizId('');
                        }}
                        className="w-full bg-white border border-slate-300 rounded-lg pl-3 pr-8 py-2 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 transition-all appearance-none cursor-pointer"
                    >
                        <option value="">Daraja...</option>
                        {levels.map(level => (
                            <option key={level} value={level}>{level}</option>
                        ))}
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                </div>
            </td>

            <td className="p-4">
                <div className="relative max-w-[150px]">
                    <select
                        value={selectedUnit}
                        onChange={(e) => {
                            const newUnit = e.target.value;
                            setSelectedUnit(newUnit);
                            const quiz = unitQuizzes.find(q => q.level === selectedLevel && q.unit === newUnit);
                            setSelectedQuizId(quiz ? quiz.id : '');
                        }}
                        disabled={!selectedLevel}
                        className="w-full bg-white border border-slate-300 rounded-lg pl-3 pr-8 py-2 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 transition-all appearance-none disabled:opacity-50"
                    >
                        <option value="">Unit...</option>
                        {units.map(unit => (
                            <option key={unit} value={unit}>Unit {unit}</option>
                        ))}
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                </div>
            </td>

            <td className="p-4">
                <div className="flex gap-2 justify-end">
                    <button
                        onClick={() => onOpenSchedule(group)}
                        className="p-2 rounded-lg text-slate-500 hover:bg-white hover:text-emerald-600 hover:shadow-sm border border-transparent hover:border-slate-200 transition-all"
                        title="Jadval"
                    >
                        <Calendar size={20} />
                    </button>
                    <button
                        onClick={() => onOpenStudents(group)}
                        className="p-2 rounded-lg text-slate-500 hover:bg-white hover:text-indigo-600 hover:shadow-sm border border-transparent hover:border-slate-200 transition-all"
                        title="O'quvchilar"
                    >
                        <Users size={20} />
                    </button>
                    <button
                        onClick={() => onEdit(group)}
                        className="p-2 rounded-lg text-slate-500 hover:bg-white hover:text-blue-600 hover:shadow-sm border border-transparent hover:border-slate-200 transition-all"
                        title="Tahrirlash"
                    >
                        <Plus className="rotate-45" size={20} />
                    </button>
                    <button
                        onClick={() => selectedQuizId && onLaunch(selectedQuizId, group.id)}
                        disabled={!selectedQuizId}
                        className="px-4 py-2 rounded-lg bg-teal-600 text-white font-semibold hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm shadow-sm"
                    >
                        <PlayCircle size={16} />
                        Boshlash
                    </button>
                    {isAdmin && onDelete && (
                        <button
                            onClick={() => onDelete(group.id)}
                            className="p-2 rounded-lg text-red-500 hover:bg-red-50 hover:text-red-700 transition-colors border border-transparent hover:border-red-100"
                        >
                            <Trash2 size={20} />
                        </button>
                    )}
                </div>
            </td>
        </tr>
    );
};

// --- Mobile Group Card Component ---
const MobileGroupCard = ({
    group,
    unitQuizzes,
    onLaunch,
    onOpenSchedule,
    onEdit
}: {
    group: Group;
    unitQuizzes: UnitQuiz[];
    onLaunch: (quizId: string, groupId: string) => void;
    onOpenSchedule: (group: Group) => void;
    onEdit: (group: Group) => void;
}) => {
    const [selectedLevel, setSelectedLevel] = useState<string>('');
    const [selectedUnit, setSelectedUnit] = useState<string>('');
    const [selectedQuizId, setSelectedQuizId] = useState<string>('');

    const levels = useMemo(() => {
        return Array.from(new Set(unitQuizzes.map(q => q.level))).sort();
    }, [unitQuizzes]);

    const units = useMemo(() => {
        if (!selectedLevel) return [];
        return Array.from(new Set(
            unitQuizzes
                .filter(q => q.level === selectedLevel)
                .map(q => q.unit)
        )).sort();
    }, [unitQuizzes, selectedLevel]);

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
                <div className="relative">
                    <select
                        value={selectedLevel}
                        onChange={(e) => {
                            setSelectedLevel(e.target.value);
                            setSelectedUnit('');
                            setSelectedQuizId('');
                        }}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-3 pr-8 py-2.5 text-sm font-medium text-slate-700 outline-none appearance-none"
                    >
                        <option value="">Daraja...</option>
                        {levels.map(level => (
                            <option key={level} value={level}>{level}</option>
                        ))}
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                </div>

                <div className="relative">
                    <select
                        value={selectedUnit}
                        onChange={(e) => {
                            const newUnit = e.target.value;
                            setSelectedUnit(newUnit);
                            const quiz = unitQuizzes.find(q => q.level === selectedLevel && q.unit === newUnit);
                            setSelectedQuizId(quiz ? quiz.id : '');
                        }}
                        disabled={!selectedLevel}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-3 pr-8 py-2.5 text-sm font-medium text-slate-700 outline-none appearance-none disabled:opacity-50"
                    >
                        <option value="">Unit...</option>
                        {units.map(unit => (
                            <option key={unit} value={unit}>Unit {unit}</option>
                        ))}
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                </div>
            </div>

            <div className="flex gap-2">
                <button
                    onClick={() => onOpenSchedule(group)}
                    className="flex-1 py-3 rounded-xl bg-emerald-50 text-emerald-600 font-bold border border-emerald-100 hover:bg-emerald-100 transition-colors flex items-center justify-center gap-2"
                >
                    <Calendar size={18} />
                    Jadval
                </button>
                <button
                    onClick={() => selectedQuizId && onLaunch(selectedQuizId, group.id)}
                    disabled={!selectedQuizId}
                    className="flex-[2] py-3 rounded-xl bg-teal-600 text-white font-bold hover:bg-teal-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                    <PlayCircle size={18} />
                    Boshlash
                </button>
                <button
                    onClick={() => onEdit(group)}
                    className="flex-1 py-3 rounded-xl bg-slate-100 text-slate-600 font-bold hover:bg-slate-200 transition-colors flex items-center justify-center"
                >
                    <Plus className="rotate-45" size={18} />
                </button>
            </div>
        </div>
    );
};

// --- Student Search Component ---
const StudentSearchInput = ({ navigate }: { navigate: any }) => {
    const { user, role } = useAuth();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [wrapperRef]);

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            if (query.trim()) {
                handleSearch();
            } else {
                setResults([]);
                setIsOpen(false);
            }
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [query]);

    const handleSearch = async () => {
        if (!query.trim()) return;
        setLoading(true);
        setIsOpen(true);
        try {
            const url = `/api/students/search?q=${encodeURIComponent(query)}&teacherId=${encodeURIComponent(user?.id || '')}&role=${encodeURIComponent(role || '')}`;
            const res = await apiFetch(url);
            if (res.ok) {
                const data = await res.json();
                setResults(Array.isArray(data) ? data : []);
            }
        } catch (err) {
            console.error('[Search] Error:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div ref={wrapperRef} className="relative w-full md:w-64 z-50">
            <div className="relative">
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => query && setIsOpen(true)}
                    placeholder="O'quvchi qidirish..."
                    className="w-full bg-white border border-slate-300 rounded-lg pl-10 pr-4 py-2 text-slate-800 text-sm focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm"
                />
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                    {loading ? <div className="animate-spin h-4 w-4 border-2 border-indigo-500 border-t-transparent rounded-full" /> : <Users size={16} />}
                </div>
            </div>

            {isOpen && (query || results.length > 0) && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-slate-100 max-h-[400px] overflow-y-auto">
                    {results.length > 0 ? (
                        <div className="py-1">
                            {results.map((student) => (
                                <div
                                    key={student.id}
                                    onClick={() => {
                                        navigate(`/teacher/group/${student.group_id}`);
                                        setIsOpen(false);
                                        setQuery('');
                                    }}
                                    className="px-4 py-3 hover:bg-slate-50 cursor-pointer border-b border-slate-50 last:border-0"
                                >
                                    <p className="font-bold text-slate-800 text-sm">{student.name}</p>
                                    <div className="flex justify-between items-center text-xs text-slate-500 mt-0.5">
                                        <span className="text-indigo-600 font-medium">{student.group_name}</span>
                                        <span className="opacity-50">ID: {student.id}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="p-4 text-center text-slate-400 text-sm">
                            {loading ? "Qidirilmoqda..." : "Hech narsa topilmadi"}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

const TeacherDashboard = () => {
    const navigate = useNavigate();
    const { user, logout, role } = useAuth();

    // Data State
    const [groups, setGroups] = useState<Group[]>([]);
    const [unitQuizzes, setUnitQuizzes] = useState<UnitQuiz[]>([]);
    const [battles, setBattles] = useState<Record<string, Battle>>({});

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
    const [newGroupName, setNewGroupName] = useState('');
    const [newGroupLevel, setNewGroupLevel] = useState('Beginner');
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editGroupName, setEditGroupName] = useState('');
    const [editGroupLevel, setEditGroupLevel] = useState('');
    const [editGroupTeacherId, setEditGroupTeacherId] = useState('');
    const [editExtraClassDays, setEditExtraClassDays] = useState<string[]>([]);
    const [editExtraClassTimes, setEditExtraClassTimes] = useState<string[]>([]);
    const [isScheduleOpen, setIsScheduleOpen] = useState(false);
    const [isTopicsModalOpen, setIsTopicsModalOpen] = useState(false);
    const [allTeachers, setAllTeachers] = useState<any[]>([]);
    const [availableSlots, setAvailableSlots] = useState<any[]>([]);

    useEffect(() => {
        if (role === 'admin') {
            fetchAllGroups();
            fetchAllTeachers();
        } else if (user?.id) {
            fetchGroups();
        }
        fetchUnitQuizzes();
        fetchAvailableSlots();
    }, [user, role]);

    const fetchAllTeachers = async () => {
        try {
            const res = await apiFetch('/api/admin/teachers');
            const data = await res.json();
            setAllTeachers(Array.isArray(data) ? data : []);
        } catch (err) {}
    };

    const fetchAllGroups = async () => {
        try {
            const res = await apiFetch('/api/admin/groups');
            const data = await res.json();
            setGroups(Array.isArray(data) ? data : []);
            if (data.length > 0) fetchBattles(data.map((g: any) => g.id));
        } catch (err) {}
    };

    const fetchBattles = async (groupIds: string[]) => {
        const battleMap: Record<string, Battle> = {};
        for (const id of groupIds) {
            try {
                const res = await apiFetch(`/api/battles/current/${id}`);
                const data = await res.json();
                if (data) battleMap[id] = data;
            } catch (e) { }
        }
        setBattles(battleMap);
    };

    const fetchGroups = async () => {
        if (!user?.id) return;
        try {
            const res = await apiFetch(`/api/teachers/${user.id}/groups`);
            const data = await res.json();
            setGroups(Array.isArray(data) ? data : []);
            if (data.length > 0) fetchBattles(data.map((g: any) => g.id));
        } catch (err) {}
    };

    const fetchUnitQuizzes = async () => {
        try {
            const res = await apiFetch('/api/unit-quizzes');
            const data = await res.json();
            setUnitQuizzes(Array.isArray(data) ? data : []);
        } catch (err) {}
    };

    const fetchAvailableSlots = async () => {
        try {
            const res = await apiFetch('/api/available-slots');
            const data = await res.json();
            setAvailableSlots(Array.isArray(data) ? data : []);
        } catch (err) {}
    };

    const handleCreateGroup = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user?.id || !newGroupName.trim()) return;
        const res = await apiFetch('/api/groups', {
            method: 'POST',
            body: JSON.stringify({ name: newGroupName, teacherId: user.id, level: newGroupLevel })
        });
        if (res.ok) {
            setNewGroupName('');
            setNewGroupLevel('Beginner');
            if (role === 'admin') fetchAllGroups(); else fetchGroups();
        }
    };

    const handleEditGroup = (group: Group) => {
        setSelectedGroup(group);
        setEditGroupName(group.name);
        setEditGroupLevel(group.level || 'Beginner');
        setEditGroupTeacherId(group.teacher_id || '');
        setEditExtraClassDays(group.extra_class_days || []);
        setEditExtraClassTimes(group.extra_class_times || []);
        setIsEditModalOpen(true);
    };

    const handleUpdateGroup = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedGroup || !editGroupName.trim()) return;
        const res = await apiFetch(`/api/groups/${selectedGroup.id}`, {
            method: 'PUT',
            body: JSON.stringify({
                name: editGroupName,
                level: editGroupLevel,
                teacherId: role === 'admin' ? editGroupTeacherId : selectedGroup.teacher_id,
                extraClassDays: editExtraClassDays,
                extraClassTimes: editExtraClassTimes
            })
        });
        if (res.ok) {
            setIsEditModalOpen(false);
            if (role === 'admin') fetchAllGroups(); else fetchGroups();
        } else {
            alert("Xatolik!");
        }
    };

    const handleOpenStudentModal = (group: Group) => {
        setSelectedGroup(group);
        setIsModalOpen(true);
    };

    const handleOpenSchedule = (group: Group) => {
        setSelectedGroup(group);
        setIsScheduleOpen(true);
    };

    const handleAddStudent = async (data: any) => {
        if (!selectedGroup) return;
        const res = await apiFetch('/api/students', {
            method: 'POST',
            body: JSON.stringify({ ...data, groupId: selectedGroup.id })
        });
        if (res.ok) {
            alert("O'quvchi qo'shildi!");
            setIsModalOpen(false);
        } else {
            alert("Xatolik!");
        }
    };

    const handleForcedBook = async (studentId: string, slot: string, topic: string = '') => {
        if (!selectedGroup) return;
        try {
            const res = await apiFetch(`/api/students/${studentId}/book-extra-class`, {
                method: 'POST',
                body: JSON.stringify({ groupId: selectedGroup.id, timeSlot: slot, isForced: true, topic })
            });
            if (!res.ok) {
                const data = await res.json();
                alert(data.error || "Xatolik");
            }
        } catch (e) {}
    };

    const handleDeleteBooking = async (id: string) => {
        try {
            await apiFetch(`/api/extra-class-bookings/${id}`, { method: 'DELETE' });
        } catch (e) {}
    };

    const handleLaunchQuiz = (quizId: string, groupId: string) => {
        navigate(`/unit-lobby/${quizId}/${groupId}`);
    };

    const handleDeleteGroup = async (groupId: string) => {
        if (!window.confirm("O'chirmoqchimisiz?")) return;
        try {
            const res = await apiFetch(`/api/groups/${groupId}`, { method: 'DELETE' });
            if (res.ok) {
                setGroups(groups.filter(g => g.id !== groupId));
                alert("O'chirildi!");
            }
        } catch (err) {}
    };

    const handleDownloadWeeklyReport = async () => {
        try {
            const res = await apiFetch('/api/teacher/weekly-report');
            if (res.ok) {
                const blob = await res.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `haftalik-hisobot-${new Date().toLocaleDateString('uz-UZ')}.pdf`;
                document.body.appendChild(a);
                a.click();
                a.remove();
            } else {
                alert("Hisobot yuklab olishda xatolik yuz berdi.");
            }
        } catch (err) {
            console.error('Error downloading report:', err);
            alert("Xatolik!");
        }
    };

    return (
        <div className="min-h-screen p-4 md:p-8 bg-slate-50 text-slate-900">
            {/* Header */}
            <div className="max-w-7xl mx-auto mb-10 border-b pb-6 border-slate-200">
                <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate('/')} className="p-2.5 rounded-xl border bg-white border-slate-200 text-slate-600 shadow-sm">
                            <ArrowLeft size={20} />
                        </button>
                        <div className="flex items-center gap-4">
                            <img src={logo} alt="Logo" className="h-14 w-14 object-cover rounded-2xl border-2 border-slate-100 shadow-lg" />
                            <div>
                                <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                                    {role === 'admin' ? "Barcha Guruhlar" : "O'qituvchi Kabineti"}
                                </h1>
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Tizim boshqaruvi</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
                        <div className="w-full md:w-auto flex flex-col md:flex-row gap-4">
                            <StudentSearchInput navigate={navigate} />
                            
                            <form onSubmit={handleCreateGroup} className="flex gap-2 w-full md:w-auto">
                                <input
                                    type="text"
                                    value={newGroupName}
                                    onChange={(e) => setNewGroupName(e.target.value)}
                                    placeholder="Guruh nomi..."
                                    className="bg-white border border-slate-300 rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 w-full md:w-40"
                                />
                                <button type="submit" className="bg-indigo-600 text-white px-3 py-2 rounded-lg hover:bg-indigo-700 transition-colors">
                                    <Plus size={20} />
                                </button>
                            </form>
                        </div>

                        <div className="flex flex-wrap items-center justify-center md:justify-end gap-2 w-full md:w-auto">
                            <button 
                                onClick={() => setIsTopicsModalOpen(true)}
                                className="flex-1 md:flex-none px-3 py-2 bg-indigo-50 text-indigo-600 rounded-lg border border-indigo-100 hover:bg-indigo-100 transition-colors text-xs md:text-sm font-bold flex items-center justify-center gap-2"
                                title="Mavzularni boshqarish"
                            >
                                <BookOpen size={16} /> <span className="md:inline">Mavzular</span>
                            </button>
                            <button 
                                onClick={handleDownloadWeeklyReport}
                                className="flex-1 md:flex-none px-3 py-2 bg-emerald-50 text-emerald-600 rounded-lg border border-emerald-100 hover:bg-emerald-100 transition-colors text-xs md:text-sm font-bold flex items-center justify-center gap-2"
                                title="Haftalik hisobotni PDF yuklab olish"
                            >
                                <FileText size={16} /> <span className="md:inline">PDF Hisobot</span>
                            </button>
                            <button onClick={() => { logout(); navigate('/login'); }} className="flex-1 md:flex-none px-3 py-2 bg-white text-red-600 rounded-lg border border-red-100 hover:bg-red-50 transition-colors text-xs md:text-sm font-bold flex items-center justify-center gap-2">
                                <LogOut size={16} /> <span className="md:inline">Chiqish</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-7xl mx-auto">
                {/* Desktop View */}
                <div className="hidden md:block bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-black tracking-widest">
                            <tr>
                                <th className="p-4">Guruh</th>
                                {role !== 'admin' && <th className="p-4">Battle</th>}
                                {role === 'admin' && <th className="p-4">O'qituvchi</th>}
                                <th className="p-4">Daraja</th>
                                <th className="p-4">Unit</th>
                                <th className="p-4 text-right">Amallar</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {groups.map(g => (
                                <GroupRow
                                    key={g.id}
                                    group={g}
                                    unitQuizzes={unitQuizzes}
                                    onOpenStudents={handleOpenStudentModal}
                                    onOpenSchedule={handleOpenSchedule}
                                    onLaunch={handleLaunchQuiz}
                                    onEdit={handleEditGroup}
                                    onDelete={handleDeleteGroup}
                                    navigate={navigate}
                                    isAdmin={role === 'admin'}
                                    battle={battles[g.id] || null}
                                />
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Mobile View */}
                <div className="md:hidden space-y-4">
                    {groups.map(g => (
                        <div key={g.id} className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3" onClick={() => navigate(role === 'admin' ? `/admin/group/${g.id}` : `/teacher/group/${g.id}`)}>
                                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-black">{g.name.charAt(0)}</div>
                                    <div>
                                        <h3 className="font-black text-slate-800">{g.name}</h3>
                                        <p className="text-[10px] uppercase font-black text-slate-400">{g.level}</p>
                                    </div>
                                </div>
                                <div className="flex gap-1">
                                    <button onClick={() => handleOpenStudentModal(g)} className="p-2 text-slate-400 hover:text-indigo-600"><Users size={20} /></button>
                                    {role === 'admin' && <button onClick={() => handleDeleteGroup(g.id)} className="p-2 text-rose-400"><Trash2 size={20} /></button>}
                                </div>
                            </div>
                            <MobileGroupCard
                                group={g}
                                unitQuizzes={unitQuizzes}
                                onLaunch={handleLaunchQuiz}
                                onOpenSchedule={handleOpenSchedule}
                                onEdit={handleEditGroup}
                            />
                        </div>
                    ))}
                </div>
            </div>

            {/* Modals */}
            <StudentModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} group={selectedGroup} onAddStudent={handleAddStudent} />
            
            <ScheduleModal
                isOpen={isScheduleOpen}
                onClose={() => setIsScheduleOpen(false)}
                group={selectedGroup}
                onForcedBook={handleForcedBook}
                onDeleteBooking={handleDeleteBooking}
            />

            {isEditModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <div className="bg-white rounded-[2rem] w-full max-w-md p-8 shadow-2xl overflow-y-auto max-h-[90vh]">
                        <div className="flex justify-between items-center mb-8">
                            <h3 className="text-2xl font-black text-slate-800 tracking-tight">Tahrirlash</h3>
                            <button onClick={() => setIsEditModalOpen(false)} className="p-2 text-slate-400"><X size={24} /></button>
                        </div>

                        <form onSubmit={handleUpdateGroup} className="space-y-6">
                            <div>
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">Guruh Nomi</label>
                                <input type="text" value={editGroupName} onChange={(e) => setEditGroupName(e.target.value)} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold" />
                            </div>

                            <div>
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">Daraja</label>
                                <select value={editGroupLevel} onChange={(e) => setEditGroupLevel(e.target.value)} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold appearance-none outline-none">
                                    {['Beginner', 'Elementary', 'Pre-Intermediate', 'Intermediate', 'Pre-IELTS', 'IELTS'].map(lvl => <option key={lvl} value={lvl}>{lvl}</option>)}
                                </select>
                            </div>

                            {role === 'admin' && (
                                <div>
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">O'qituvchi</label>
                                    <select value={editGroupTeacherId} onChange={(e) => setEditGroupTeacherId(e.target.value)} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none">
                                        <option value="">O'qituvchini tanlang...</option>
                                        {allTeachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                    </select>
                                </div>
                            )}

                            <div className="border-t pt-6 space-y-6">
                                <div>
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-3 px-1">Qo'shimcha dars kunlari</label>
                                    <div className="flex flex-wrap gap-2">
                                        {['Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba'].map(day => (
                                            <button
                                                key={day} type="button"
                                                onClick={() => editExtraClassDays.includes(day) ? setEditExtraClassDays(editExtraClassDays.filter(d => d !== day)) : setEditExtraClassDays([...editExtraClassDays, day])}
                                                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border-2 ${editExtraClassDays.includes(day) ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-100 text-slate-500'}`}
                                            >
                                                {day}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-3 px-1">Vaqt oraliqlari</label>
                                    <div className="space-y-2">
                                        {editExtraClassTimes.map((time, idx) => (
                                            <div key={idx} className="flex gap-2">
                                                <div className="flex-1 p-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold text-sm">{time}</div>
                                                <button type="button" onClick={() => setEditExtraClassTimes(editExtraClassTimes.filter((_, i) => i !== idx))} className="p-3 text-rose-500 bg-rose-50 rounded-xl"><X size={18} /></button>
                                            </div>
                                        ))}
                                        <select
                                            className="w-full p-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold text-sm outline-none"
                                            onChange={(e) => {
                                                if (e.target.value && !editExtraClassTimes.includes(e.target.value)) {
                                                    setEditExtraClassTimes([...editExtraClassTimes, e.target.value]);
                                                }
                                                e.target.value = "";
                                            }}
                                        >
                                            <option value="">Vaqt qo'shish...</option>
                                            {availableSlots.map(slot => (
                                                <option key={slot.id} value={slot.time_text}>
                                                    {slot.time_text} {slot.day_of_week ? `(${slot.day_of_week})` : ''}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <button type="button" onClick={() => setIsEditModalOpen(false)} className="flex-1 py-4 rounded-2xl bg-slate-100 font-bold">Bekor qilish</button>
                                <button type="submit" className="flex-[2] py-4 rounded-2xl bg-indigo-600 text-white font-black shadow-lg shadow-indigo-500/30">Saqlash</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {isTopicsModalOpen && (
                <ManageTopicsModal 
                    isOpen={isTopicsModalOpen} 
                    onClose={() => setIsTopicsModalOpen(false)} 
                />
            )}
        </div>
    );
};

// --- Manage Topics Modal ---
const ManageTopicsModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
    const [topics, setTopics] = useState<any[]>([]);
    const [newLevel, setNewLevel] = useState('Beginner');
    const [newTopicName, setNewTopicName] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (isOpen) fetchTopics();
    }, [isOpen]);

    const fetchTopics = async () => {
        try {
            const res = await apiFetch('/api/level-topics');
            if (res.ok) setTopics(await res.json());
        } catch (e) { }
    };

    const handleAdd = async () => {
        if (!newTopicName.trim()) return;
        setIsLoading(true);
        try {
            const res = await apiFetch('/api/level-topics', {
                method: 'POST',
                body: JSON.stringify({ level: newLevel, topicName: newTopicName })
            });
            if (res.ok) {
                setNewTopicName('');
                fetchTopics();
            }
        } catch (e) { }
        setIsLoading(false);
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm("O'chirmoqchimisiz?")) return;
        try {
            const res = await apiFetch(`/api/level-topics/${id}`, { method: 'DELETE' });
            if (res.ok) fetchTopics();
        } catch (e) { }
    };

    if (!isOpen) return null;

    const levelsList = ['Beginner', 'Elementary', 'Pre-Intermediate', 'Intermediate', 'IELTS 1', 'IELTS 2'];

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
            <div className="bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
                <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <div>
                        <h3 className="text-2xl font-black text-slate-800">Mavzularni boshqarish</h3>
                        <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">Har bir daraja uchun mavzular ro'yxati</p>
                    </div>
                    <button onClick={onClose} className="p-3 hover:bg-slate-200 rounded-2xl text-slate-500 transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-8 space-y-6">
                    <div className="flex gap-3">
                        <select 
                            value={newLevel}
                            onChange={(e) => setNewLevel(e.target.value)}
                            className="bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 py-3 font-bold text-sm outline-none focus:border-indigo-500 transition-all"
                        >
                            {levelsList.map(l => <option key={l} value={l}>{l}</option>)}
                        </select>
                        <input 
                            value={newTopicName}
                            onChange={(e) => setNewTopicName(e.target.value)}
                            placeholder="Yangi mavzu nomi..."
                            className="flex-1 bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-3 font-bold text-sm outline-none focus:border-indigo-500 transition-all"
                        />
                        <button 
                            onClick={handleAdd}
                            disabled={isLoading}
                            className="bg-indigo-600 text-white p-3 rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50"
                        >
                            <Plus size={24} />
                        </button>
                    </div>

                    <div className="space-y-4 overflow-y-auto pr-2 max-h-[50vh] custom-scrollbar">
                        {levelsList.map(l => {
                            const levelTopics = topics.filter(t => t.level === l);
                            return (
                                <div key={l} className="space-y-2">
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-400"></div>
                                        {l}
                                    </h4>
                                    <div className="grid grid-cols-1 gap-2">
                                        {levelTopics.length > 0 ? (
                                            levelTopics.map(t => (
                                                <div key={t.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 group hover:border-indigo-200 transition-colors">
                                                    <span className="text-sm font-bold text-slate-700">{t.topic_name}</span>
                                                    <button 
                                                        onClick={() => handleDelete(t.id)}
                                                        className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-[10px] text-slate-300 italic ml-4">Mavzular yo'q</p>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TeacherDashboard;
