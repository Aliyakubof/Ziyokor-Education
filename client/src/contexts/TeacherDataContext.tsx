import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from '../AuthContext';
import { apiFetch } from '../api';
import { socket } from '../socket';

interface Group {
    id: string;
    name: string;
    teacher_name?: string;
    teacher_id?: string;
    level?: string;
    extra_class_days?: string[];
    extra_class_times?: string[];
}

interface TeacherDataContextType {
    groups: Group[];
    unitQuizzes: any[];
    battles: Record<string, any>;
    allTeachers: any[];
    availableSlots: any[];
    isLoading: boolean;
    refreshData: () => Promise<void>;
}

const TeacherDataContext = createContext<TeacherDataContextType | undefined>(undefined);

export const TeacherDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user, role } = useAuth();
    const [groups, setGroups] = useState<Group[]>([]);
    const [unitQuizzes, setUnitQuizzes] = useState<any[]>([]);
    const [battles, setBattles] = useState<Record<string, any>>({});
    const [allTeachers, setAllTeachers] = useState<any[]>([]);
    const [availableSlots, setAvailableSlots] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchBattles = useCallback(async (groupIds: string[]) => {
        if (groupIds.length === 0) return;
        try {
            const res = await apiFetch('/api/battles/batch/current', {
                method: 'POST',
                body: JSON.stringify({ groupIds })
            });
            if (res.ok) {
                const data = await res.json();
                setBattles(data || {});
            }
        } catch (e) {
            console.error('Error fetching batch battles:', e);
        }
    }, []);

    const fetchData = useCallback(async () => {
        if (!user?.id || (role !== 'teacher' && role !== 'admin' && role !== 'manager')) return;

        setIsLoading(true);
        try {
            const promises: Promise<any>[] = [
                apiFetch('/api/unit-quizzes'),
                apiFetch('/api/available-slots')
            ];

            if (role === 'admin' || role === 'manager') {
                promises.push(apiFetch('/api/admin/groups'));
                promises.push(apiFetch('/api/admin/teachers'));
            } else {
                promises.push(apiFetch(`/api/teachers/${user.id}/groups`));
            }

            const results = await Promise.all(promises);
            
            const quizzes = await results[0].json();
            const slots = await results[1].json();
            const groupsData = await results[2].json();
            
            setUnitQuizzes(Array.isArray(quizzes) ? quizzes : []);
            setAvailableSlots(Array.isArray(slots) ? slots : []);
            const finalGroups = Array.isArray(groupsData) ? groupsData : [];
            setGroups(finalGroups);

            if (role === 'admin' || role === 'manager') {
                const teachers = await results[3].json();
                setAllTeachers(Array.isArray(teachers) ? teachers : []);
            }

            if (finalGroups.length > 0) {
                fetchBattles(finalGroups.map(g => g.id));
            }

        } catch (err) {
            console.error('Failed to fetch teacher data', err);
        } finally {
            setIsLoading(false);
        }
    }, [user?.id, role, fetchBattles]);

    useEffect(() => {
        fetchData();

        if (user?.id && socket) {
            socket.emit('identify', { userId: user.id, role: role || '' });

            const handleGroupUpdate = () => fetchData();
            const handleBattleUpdate = () => {
               if (groups.length > 0) fetchBattles(groups.map(g => g.id));
            };

            socket.on('group_update', handleGroupUpdate);
            socket.on('battle_update', handleBattleUpdate);

            return () => {
                socket.off('group_update', handleGroupUpdate);
                socket.off('battle_update', handleBattleUpdate);
            };
        }
    }, [user?.id, role, socket, fetchData, fetchBattles, groups.length]);

    return (
        <TeacherDataContext.Provider value={{ 
            groups, 
            unitQuizzes, 
            battles, 
            allTeachers, 
            availableSlots, 
            isLoading, 
            refreshData: fetchData 
        }}>
            {children}
        </TeacherDataContext.Provider>
    );
};

export const useTeacherData = () => {
    const context = useContext(TeacherDataContext);
    if (context === undefined) {
        throw new Error('useTeacherData must be used within a TeacherDataProvider');
    }
    return context;
};
