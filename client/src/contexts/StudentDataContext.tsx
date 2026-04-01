import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from '../AuthContext';
import { apiFetch } from '../api';
import { socket } from '../socket';

interface StudentStats {
    gamesPlayed: number;
    totalScore: number;
    rank: number;
    coins: number;
    streakCount: number;
    isHero: boolean;
    hasTrophy: boolean;
    weeklyBattleScore: number;
    groupId: string;
    level: string; // Added level
    avatarUrl: string | null;
    hasAvatarUnlock: boolean;
    active_theme_color: string | null;
}

interface StudentDataContextType {
    stats: StudentStats | null;
    battle: any | null;
    history: any[];
    bookings: {
        myBooking: any | null;
        otherBookings: any[];
        groupSettings: any | null;
        availableTopics: any[];
    };
    isLoading: boolean;
    refreshData: () => Promise<void>;
}

const StudentDataContext = createContext<StudentDataContextType | undefined>(undefined);

export const StudentDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user, role, activeThemeId, setActiveThemeId } = useAuth();
    const [stats, setStats] = useState<StudentStats | null>(null);
    const [battle, setBattle] = useState<any>(null);
    const [history, setHistory] = useState<any[]>([]);
    const [bookings, setBookings] = useState<any>({
        myBooking: null,
        otherBookings: [],
        groupSettings: null,
        availableTopics: []
    });
    const [isLoading, setIsLoading] = useState(true);

    const fetchBookingData = useCallback(async (groupId: string, userId: string, level: string) => {
        try {
            const [groupRes, bookingsRes, topicsRes] = await Promise.all([
                apiFetch(`/api/groups/${groupId}`),
                apiFetch(`/api/groups/${groupId}/extra-class-bookings`),
                apiFetch('/api/level-topics')
            ]);

            let groupData = null;
            let otherBookings = [];
            let myBooking = null;
            let availableTopics = [];

            if (groupRes.ok) groupData = await groupRes.json();
            if (bookingsRes.ok) {
                const b = await bookingsRes.json();
                otherBookings = b;
                myBooking = b.find((item: any) => item.student_id === userId);
            }
            if (topicsRes.ok) {
                const t = await topicsRes.json();
                availableTopics = t.filter((item: any) => item.level === (groupData?.level || level));
            }

            setBookings({
                groupSettings: groupData,
                otherBookings,
                myBooking,
                availableTopics
            });
        } catch (err) {
            console.error('Failed to fetch booking data', err);
        }
    }, []);

    const fetchData = useCallback(async () => {
        if (!user?.id || role !== 'student') {
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        try {
            const statsRes = await apiFetch(`/api/student/${user.id}/stats`);
            if (statsRes.ok) {
                const statsData = await statsRes.json();
                setStats(statsData);

                if (statsData.groupId) {
                    const battleRes = await apiFetch(`/api/battles/current/${statsData.groupId}`);
                    if (battleRes.ok) setBattle(await battleRes.json());

                    await fetchBookingData(statsData.groupId, user.id, statsData.level || 'Beginner');
                }
            }

            const historyRes = await apiFetch(`/api/student/${user.id}/history`);
            if (historyRes.ok) setHistory(await historyRes.json());

        } catch (err) {
            console.error('Failed to fetch student data', err);
        } finally {
            setIsLoading(false);
        }
    }, [user?.id, role, fetchBookingData]);

    useEffect(() => {
        const theme = stats?.active_theme_color;
        // Only update global theme if it's different from what we already have
        if (theme && theme !== activeThemeId) {
            setActiveThemeId(theme);
        }
    }, [stats?.active_theme_color, activeThemeId, setActiveThemeId]);

    useEffect(() => {
        fetchData();

        if (user?.id && socket) {
            socket.emit('identify', { userId: user.id, role: 'student' });

            const handleStatsUpdate = (newStats: Partial<StudentStats>) => {
                setStats(prev => prev ? { ...prev, ...newStats } : null);
            };

            const handleBattleUpdate = (newBattle: any) => {
                setBattle(newBattle);
            };

            const handleBookingUpdate = () => {
                if (stats?.groupId && user?.id) {
                    fetchBookingData(stats.groupId, user.id, stats.level || 'Beginner');
                }
            };

            socket.on('stats_update', handleStatsUpdate);
            socket.on('battle_update', handleBattleUpdate);
            socket.on('booking_update', handleBookingUpdate);

            return () => {
                socket.off('stats_update', handleStatsUpdate);
                socket.off('battle_update', handleBattleUpdate);
                socket.off('booking_update', handleBookingUpdate);
            };
        }
    }, [user?.id, socket, fetchData, stats?.groupId, stats?.level, fetchBookingData]);

    return (
        <StudentDataContext.Provider value={{ stats, battle, history, bookings, isLoading, refreshData: fetchData }}>
            {children}
        </StudentDataContext.Provider>
    );
};

export const useStudentData = () => {
    const context = useContext(StudentDataContext);
    if (context === undefined) {
        throw new Error('useStudentData must be used within a StudentDataProvider');
    }
    return context;
};
