import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, PlayCircle, Plus, ArrowLeft, LogOut, X, ChevronDown, Trash2, Send } from 'lucide-react';
import { apiFetch } from '../api';
import { useAuth } from '../AuthContext';
import logo from '../assets/logo.jpeg';

interface Group {
    id: string;
    name: string;
    teacher_name?: string;
    level?: string;
}

interface UnitQuiz {
    id: string;
    title: string;
    level: string;
    unit: string;
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
const BattleStatus = ({ battle, groupId }: { battle: Battle | null; groupId: string }) => {
    if (!battle) return <span className="text-slate-300 text-xs italic">Battle yo'q</span>;

    const isA = battle.group_a_id === groupId;
    const myScore = isA ? battle.score_a : battle.score_b;
    const oppScore = isA ? battle.score_b : battle.score_a;
    const oppName = isA ? battle.group_b_name : battle.group_a_name;

    const total = myScore + oppScore || 1;
    const percentage = Math.round((myScore / total) * 100);

    return (
        <div className="flex flex-col gap-1 min-w-[120px]">
            <div className="flex justify-between text-[10px] font-bold">
                <span className="text-indigo-600 truncate max-w-[60px]">Siz</span>
                <span className="text-red-500 truncate max-w-[60px]">{oppName}</span>
            </div>
            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden flex">
                <div
                    className="h-full bg-indigo-500 transition-all duration-500"
                    style={{ width: `${percentage}%` }}
                />
                <div
                    className="h-full bg-red-400 transition-all duration-500"
                    style={{ width: `${100 - percentage}%` }}
                />
            </div>
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>{myScore} XP</span>
                <span>{oppScore} XP</span>
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

                        {/* Additional Fields (Hidden logic if needed, but requested to be enhanced) */}
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

const GroupRow = ({
    group,
    unitQuizzes,
    onOpenStudents,
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

    // Extract unique levels
    const levels = useMemo(() => {
        const uniqueLevels = Array.from(new Set(unitQuizzes.map(q => q.level))).sort();
        return uniqueLevels;
    }, [unitQuizzes]);

    // Extract unique units based on selected level
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
        <tr className="border-b border-slate-100 hover:bg-slate-50 transition-colors group">
            {/* Group Name */}
            <td className="p-4 cursor-pointer" onClick={() => navigate(isAdmin ? `/admin/group/${group.id}` : `/teacher/group/${group.id}`)}>
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-lg">
                        {group.name.charAt(0)}
                    </div>
                    <div>
                        <span className="font-semibold text-slate-800 group-hover:text-indigo-600 transition-colors block">{group.name}</span>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{group.level || 'Beginner'}</span>
                    </div>
                </div>
            </td>

            {/* Battle Status */}
            {!isAdmin && (
                <td className="p-4">
                    <BattleStatus battle={battle} groupId={group.id} />
                </td>
            )}

            {/* Teacher Name (Admin Only) */}
            {isAdmin && (
                <td className="p-4">
                    <div className="flex items-center gap-2 text-slate-600">
                        <Users size={16} className="text-slate-400" />
                        <span className="font-medium">{group.teacher_name || 'Noma\'lum'}</span>
                    </div>
                </td>
            )}

            {/* Level Selection */}
            <td className="p-4">
                <div className="relative max-w-[150px]">
                    <select
                        value={selectedLevel}
                        onChange={(e) => {
                            setSelectedLevel(e.target.value);
                            setSelectedUnit('');
                            setSelectedQuizId('');
                        }}
                        className="w-full bg-white border border-slate-300 rounded-lg pl-3 pr-8 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 appearance-none cursor-pointer"
                    >
                        <option value="">Daraja...</option>
                        {levels.map(level => (
                            <option key={level} value={level}>{level}</option>
                        ))}
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                </div>
            </td>

            {/* Unit Selection */}
            <td className="p-4">
                <div className="relative max-w-[150px]">
                    <select
                        value={selectedUnit}
                        onChange={(e) => {
                            const newUnit = e.target.value;
                            setSelectedUnit(newUnit);
                            // Auto-select the quiz for this level and unit
                            const quiz = unitQuizzes.find(q => q.level === selectedLevel && q.unit === newUnit);
                            setSelectedQuizId(quiz ? quiz.id : '');
                        }}
                        disabled={!selectedLevel}
                        className="w-full bg-white border border-slate-300 rounded-lg pl-3 pr-8 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 appearance-none cursor-pointer disabled:opacity-50 disabled:bg-slate-50 disabled:cursor-not-allowed"
                    >
                        <option value="">Unit...</option>
                        {units.map(unit => (
                            <option key={unit} value={unit}>Unit {unit}</option>
                        ))}
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                </div>
            </td>

            {/* Actions */}
            <td className="p-4">
                <div className="flex gap-2 justify-end">
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
                            title="Guruhni o'chirish"
                        >
                            <Trash2 size={20} />
                        </button>
                    )}
                </div>
            </td>
        </tr>
    );
};

const MobileGroupCard = ({
    group,
    unitQuizzes,
    onLaunch,
    onEdit
}: {
    group: Group;
    unitQuizzes: UnitQuiz[];
    onLaunch: (quizId: string, groupId: string) => void;
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
        <div className="grid grid-cols-2 gap-3">
            <div className="relative">
                <select
                    value={selectedLevel}
                    onChange={(e) => {
                        setSelectedLevel(e.target.value);
                        setSelectedUnit('');
                        setSelectedQuizId('');
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-3 pr-8 py-2.5 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none"
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
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-3 pr-8 py-2.5 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none disabled:opacity-50"
                >
                    <option value="">Unit...</option>
                    {units.map(unit => (
                        <option key={unit} value={unit}>Unit {unit}</option>
                    ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
            </div>

            <div className="col-span-2 flex gap-2">
                <button
                    onClick={() => selectedQuizId && onLaunch(selectedQuizId, group.id)}
                    disabled={!selectedQuizId}
                    className="flex-[2] py-3 rounded-lg bg-teal-600 text-white font-bold hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm"
                >
                    <PlayCircle size={18} />
                    Testni Boshlash
                </button>
                <button
                    onClick={() => onEdit(group)}
                    className="flex-1 py-3 rounded-lg bg-white border border-slate-200 text-indigo-600 font-bold hover:bg-slate-50 transition-colors flex items-center justify-center gap-2 shadow-sm"
                >
                    <Plus className="rotate-45" size={18} />
                    Edit
                </button>
                {/* Note: In mobile view we might want to expose delete in the parent card header instead of here for better UX, 
                    but adding here for completion if passed. */}
            </div>
        </div>
    );
};

// --- Student Search Dropdown ---
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
        console.log(`[Search] Frontend - Q: "${query}", Role: ${role}, UserID: ${user?.id}`);
        try {
            // Encode role and teacherId to be safe
            const url = `/api/students/search?q=${encodeURIComponent(query)}&teacherId=${encodeURIComponent(user?.id || '')}&role=${encodeURIComponent(role || '')}`;

            console.log(`[Search] Fetching URL: ${url}`);
            const res = await apiFetch(url);
            if (res.ok) {
                const data = await res.json();
                setResults(Array.isArray(data) ? data : []);
                console.log(`[Search] Success: Found ${data.length} results`);
            } else {
                console.error(`[Search] Server error: ${res.status}`);
            }
        } catch (err) {
            console.error('[Search] Network error:', err);
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
                    onChange={(e) => {
                        setQuery(e.target.value);
                        if (!isOpen) setIsOpen(true);
                    }}
                    onFocus={() => query && setIsOpen(true)}
                    placeholder="Qidirish..."
                    className="w-full bg-white border border-slate-300 rounded-lg pl-10 pr-4 py-2 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
                />
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                    {loading ? <div className="animate-spin h-4 w-4 border-2 border-indigo-500 border-t-transparent rounded-full" /> : <Users size={16} />}
                </div>
            </div>

            {isOpen && (query || results.length > 0) && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-slate-100 max-h-[400px] overflow-y-auto overflow-x-hidden">
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
                                    <div className="flex flex-wrap gap-x-2 gap-y-1 text-xs text-slate-500 mt-0.5">
                                        <span className="font-mono bg-slate-100 px-1 rounded">ID: {student.id}</span>
                                        <span className="text-indigo-600 font-medium">{student.group_name}</span>
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

    useEffect(() => {
        if (role === 'admin') {
            fetchAllGroups();
        } else if (user?.id) {
            fetchGroups();
        }
        fetchUnitQuizzes();
    }, [user, role]);

    // Fetch all groups for admin
    const fetchAllGroups = async () => {
        try {
            const res = await apiFetch('/api/admin/groups');
            const data = await res.json();
            setGroups(Array.isArray(data) ? data : []);
            if (data.length > 0) fetchBattles(data.map((g: any) => g.id));
        } catch (err) {
            console.error('Error fetching all groups:', err);
        }
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

    // Fetch Groups for teacher
    const fetchGroups = async () => {
        if (!user?.id) return;
        try {
            const res = await apiFetch(`/api/groups/${user.id}`);
            const data = await res.json();
            setGroups(Array.isArray(data) ? data : []);
            if (data.length > 0) fetchBattles(data.map((g: any) => g.id));
        } catch (err) {
            console.error('Error fetching groups:', err);
        }
    };

    // Fetch Quizzes
    const fetchUnitQuizzes = async () => {
        try {
            const res = await apiFetch('/api/unit-quizzes');
            const data = await res.json();
            setUnitQuizzes(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Error fetching unit quizzes:', err);
        }
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
            fetchGroups();
        }
    };

    const handleEditGroup = (group: Group) => {
        setSelectedGroup(group);
        setEditGroupName(group.name);
        setEditGroupLevel(group.level || 'Beginner');
        setIsEditModalOpen(true);
    };

    const handleUpdateGroup = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedGroup || !editGroupName.trim()) return;

        const res = await apiFetch(`/api/groups/${selectedGroup.id}`, {
            method: 'PUT',
            body: JSON.stringify({ name: editGroupName, level: editGroupLevel })
        });

        if (res.ok) {
            setIsEditModalOpen(false);
            if (role === 'admin') fetchAllGroups();
            else fetchGroups();
        } else {
            alert("Xatolik yuz berdi!");
        }
    };

    const handleOpenStudentModal = (group: Group) => {
        setSelectedGroup(group);
        setIsModalOpen(true);
    };

    const handleAddStudent = async (data: any) => {
        if (!selectedGroup) return;

        const res = await apiFetch('/api/students', {
            method: 'POST',
            body: JSON.stringify({ ...data, groupId: selectedGroup.id })
        });

        if (res.ok) {
            alert("O'quvchi muvaffaqiyatli qo'shildi!");
            setIsModalOpen(false);
        } else {
            alert("Xatolik yuz berdi!");
        }
    };

    const handleLaunchQuiz = (quizId: string, groupId: string) => {
        navigate(`/unit-lobby/${quizId}/${groupId}`);
    };

    const handleDeleteGroup = async (groupId: string) => {
        if (!window.confirm("Bu guruhni o'chirmoqchimisiz? Barcha o'quvchilar va natijalar o'chib ketishi mumkin.")) {
            return;
        }

        try {
            const res = await apiFetch(`/api/groups/${groupId}`, {
                method: 'DELETE'
            });

            if (res.ok) {
                // Refresh list
                const newGroups = groups.filter(g => g.id !== groupId);
                setGroups(newGroups);
                alert("Guruh o'chirildi!");
            } else {
                alert("Xatolik yuz berdi!");
            }
        } catch (err) {
            console.error(err);
            alert("Server bilan bog'lanishda xatolik!");
        }
    };

    return (
        <div className="min-h-screen p-8 bg-transparent font-sans text-slate-900">
            {/* Header */}
            <div className="max-w-7xl mx-auto mb-10 flex flex-col md:flex-row justify-between items-center gap-6 border-b border-slate-200 pb-6">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/')}
                        className="p-2 rounded-lg bg-slate-200 text-slate-600 hover:bg-slate-300 transition-colors"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div className="flex items-center gap-4">
                        {/* Removed mobile search button as persistent search input will handle it */}
                        <img src={logo} alt="Ziyokor Logo" className="h-16 w-auto object-contain rounded-2xl shadow-sm" />
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                                {role === 'admin' ? "Ziyokor - Barcha Guruhlar" : "Ziyokor - O'qituvchi Kabineti"}
                            </h1>
                            <div className="flex items-center gap-3 mt-1">
                                <p className="text-slate-500 text-sm">
                                    {role === 'admin' ? "Tizimdagi barcha guruhlar ro'yxati" : "Guruhlar va testlarni boshqarish"}
                                </p>
                                <span className="text-slate-300">•</span>
                                <a
                                    href="https://t.me/Z_education_bot?start=teacher"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1.5 text-[#229ED9] hover:text-[#1d8dbd] font-bold text-xs transition-colors"
                                >
                                    <Send size={14} />
                                    Telegram Botga ulanish
                                </a>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col-reverse md:flex-row items-center gap-4 w-full md:w-auto">
                    {/* Global Student Search */}
                    <div className="w-full md:w-auto">
                        <StudentSearchInput navigate={navigate} />
                    </div>

                    <form onSubmit={handleCreateGroup} className="flex gap-2 w-full md:w-auto items-center">
                        <input
                            type="text"
                            value={newGroupName}
                            onChange={(e) => setNewGroupName(e.target.value)}
                            placeholder="Guruh nomi..."
                            className="bg-white border border-slate-300 rounded-lg px-4 py-2 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 w-full md:w-48"
                        />
                        <select
                            value={newGroupLevel}
                            onChange={(e) => setNewGroupLevel(e.target.value)}
                            className="bg-white border border-slate-300 rounded-lg px-2 py-2 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 w-28 appearance-none cursor-pointer"
                        >
                            {['Beginner', 'Elementary', 'Pre-Intermediate', 'Intermediate', 'Pre-IELTS', 'IELTS'].map(lvl => (
                                <option key={lvl} value={lvl}>{lvl}</option>
                            ))}
                        </select>
                        <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 px-3 py-2 rounded-lg text-white transition-colors shadow-sm shrink-0">
                            <Plus size={20} />
                        </button>
                    </form>

                    <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
                        <div className="flex items-center gap-3">
                            <div className="text-right">
                                <p className="text-sm font-bold text-slate-800 leading-tight">{user?.name}</p>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    {role === 'admin' ? 'Adminstrator' : "O'qituvchi"}
                                </p>
                            </div>
                            <button
                                onClick={() => {
                                    logout();
                                    navigate('/login');
                                }}
                                className="px-4 py-2 bg-white text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-red-200 text-sm font-medium flex items-center gap-2"
                            >
                                <LogOut size={16} /> Chiqish
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto">
                {/* Desktop Table View */}
                <div className="hidden md:block bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-xs font-semibold tracking-wider">
                                    <th className="p-4 w-1/4">Guruh Nomi</th>
                                    {role === 'admin' ? (
                                        <th className="p-4 w-1/4">O'qituvchi</th>
                                    ) : (
                                        <th className="p-4 w-1/4">Haftalik Battle</th>
                                    )}
                                    <th className="p-4 w-1/4">Daraja</th>
                                    <th className="p-4 w-1/4">Unit</th>
                                    <th className="p-4 w-1/4 text-right">Amallar</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {groups.length > 0 ? (
                                    groups.map(group => (
                                        <GroupRow
                                            key={group.id}
                                            group={group}
                                            unitQuizzes={unitQuizzes}
                                            onOpenStudents={handleOpenStudentModal}
                                            onLaunch={handleLaunchQuiz}
                                            onEdit={handleEditGroup}
                                            onDelete={handleDeleteGroup}
                                            navigate={navigate}
                                            isAdmin={role === 'admin'}
                                            battle={battles[group.id] || null}
                                        />
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={5} className="p-12 text-center text-slate-400">
                                            <Users size={32} className="mx-auto mb-2 opacity-30" />
                                            Hozircha guruhlar mavjud emas. Yuqorida yangi guruh yarating.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden space-y-4">
                    {groups.length > 0 ? (
                        groups.map(group => (
                            <div key={group.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden active:scale-[0.98] transition-transform">
                                <div className="flex justify-between items-stretch">
                                    <div
                                        className="flex-1 flex items-center gap-3 p-4 hover:bg-slate-50 cursor-pointer transition-colors"
                                        onClick={() => navigate(role === 'admin' ? `/admin/group/${group.id}` : `/teacher/group/${group.id}`)}
                                    >
                                        <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-700 font-black text-xl shadow-inner">
                                            {group.name.charAt(0)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-black text-slate-800 text-lg truncate">{group.name}</h3>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest bg-indigo-50 px-2 py-0.5 rounded">Guruh</span>
                                                {role === 'admin' && (
                                                    <p className="text-xs text-slate-400 truncate flex items-center gap-1">
                                                        • {group.teacher_name || 'Noma\'lum'}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="text-slate-300 pr-2">
                                            <ArrowLeft className="rotate-180" size={20} />
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 pr-4">
                                        {role === 'admin' && (
                                            <button
                                                onClick={() => handleDeleteGroup(group.id)}
                                                className="p-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 hover:text-red-600 transition-all border border-red-100"
                                            >
                                                <Trash2 size={22} />
                                            </button>
                                        )}
                                        <button
                                            onClick={() => handleOpenStudentModal(group)}
                                            className="p-3 bg-slate-50 text-slate-500 rounded-xl hover:bg-slate-100 hover:text-indigo-600 transition-all border border-slate-100"
                                        >
                                            <Users size={22} />
                                        </button>
                                    </div>
                                </div>

                                <div className="px-4 pb-4">
                                    {/* We reuse a simplified version of the logic here or just render the row logic in a different way. 
                                    Since GroupRow has state (selectedLevel, etc), we should probably extract that logic or just use the same component but styled differently?
                                    Actually, GroupRow returns a <tr>. We can't use it here.
                                    We need a MobileGroupCard component that handles the state.
                                */}
                                    <MobileGroupCard
                                        group={group}
                                        unitQuizzes={unitQuizzes}
                                        onLaunch={handleLaunchQuiz}
                                        onEdit={handleEditGroup}
                                    />
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center p-8 text-slate-400 bg-white rounded-xl border border-slate-200">
                            <Users size={32} className="mx-auto mb-2 opacity-30" />
                            Guruhlar mavjud emas
                        </div>
                    )}
                </div>
            </div>

            {/* Modals */}
            <StudentModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                group={selectedGroup}
                onAddStudent={handleAddStudent}
            />

            {/* Edit Group Modal */}
            {isEditModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <div className="bg-white rounded-[2rem] w-full max-w-md p-8 shadow-2xl animate-in fade-in zoom-in duration-200">
                        <div className="flex justify-between items-center mb-8">
                            <h3 className="text-2xl font-black text-slate-800 tracking-tight">Guruhni tahrirlash</h3>
                            <button onClick={() => setIsEditModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 transition-colors">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleUpdateGroup} className="space-y-6">
                            <div>
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">Guruh Nomi</label>
                                <input
                                    type="text"
                                    value={editGroupName}
                                    onChange={(e) => setEditGroupName(e.target.value)}
                                    placeholder="Guruh nomi"
                                    className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-800 outline-none focus:border-indigo-500 transition-all"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">Daraja</label>
                                <div className="relative">
                                    <select
                                        value={editGroupLevel}
                                        onChange={(e) => setEditGroupLevel(e.target.value)}
                                        className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-800 outline-none focus:border-indigo-500 transition-all appearance-none cursor-pointer"
                                    >
                                        {['Beginner', 'Elementary', 'Pre-Intermediate', 'Intermediate', 'Pre-IELTS', 'IELTS'].map(lvl => (
                                            <option key={lvl} value={lvl}>{lvl}</option>
                                        ))}
                                    </select>
                                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={20} />
                                </div>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsEditModalOpen(false)}
                                    className="flex-1 py-4 rounded-2xl bg-slate-100 text-slate-600 font-bold hover:bg-slate-200 transition-all"
                                >
                                    Bekor qilish
                                </button>
                                <button
                                    type="submit"
                                    className="flex-[2] py-4 rounded-2xl bg-indigo-600 text-white font-black shadow-lg shadow-indigo-500/30 hover:bg-indigo-700 transition-all"
                                >
                                    Saqlash
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TeacherDashboard;
