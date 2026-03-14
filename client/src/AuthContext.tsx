import React, { createContext, useContext, useState } from 'react';
import { apiFetch } from './api';

interface User {
    id?: string;
    name: string;
    phone?: string;
    groupName?: string;
    teacherName?: string;
    groupId?: string;
}

type UserRole = 'admin' | 'teacher' | 'student' | 'manager';

interface AuthContextType {
    user: User | null;
    role: UserRole | null;
    activeThemeId: string | null;
    login: (userData: User, role: UserRole) => void;
    logout: () => void;
    setActiveThemeId: (themeId: string) => void;
    isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(() => {
        try {
            const savedUser = localStorage.getItem('ziyokor_user');
            return savedUser ? JSON.parse(savedUser) : null;
        } catch (e) {
            console.error('Failed to parse user from localStorage', e);
            return null;
        }
    });
    const [role, setRole] = useState<UserRole | null>(() => {
        return localStorage.getItem('ziyokor_role') as UserRole | null;
    });
    const [activeThemeId, setActiveThemeIdState] = useState<string | null>(() => {
        return localStorage.getItem('ziyokor_theme');
    });

    const setActiveThemeId = (themeId: string) => {
        setActiveThemeIdState(themeId);
        localStorage.setItem('ziyokor_theme', themeId);
    };

    const login = (userData: User, userRole: UserRole) => {
        setUser(userData);
        setRole(userRole);
        localStorage.setItem('ziyokor_user', JSON.stringify(userData));
        localStorage.setItem('ziyokor_role', userRole);
    };

    const logout = async () => {
        setUser(null);
        setRole(null);
        localStorage.removeItem('ziyokor_token');
        localStorage.removeItem('ziyokor_user');
        localStorage.removeItem('ziyokor_role');
        // Clear admin/teacher specific items just in case
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('role');

        try {
            await apiFetch('/api/logout', { method: 'POST' });
        } catch (err) {
            console.error('Logout error:', err);
        }
    };

    return (
        <AuthContext.Provider value={{ user, role, activeThemeId, login, logout, setActiveThemeId, isAuthenticated: !!user }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
