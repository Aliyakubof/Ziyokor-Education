import React, { createContext, useContext, useState, useEffect } from 'react';

interface User {
    id?: string;
    name: string;
    phone: string;
}

interface AuthContextType {
    user: User | null;
    role: 'admin' | 'teacher' | null;
    login: (userData: User, role: 'admin' | 'teacher') => void;
    logout: () => void;
    isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [role, setRole] = useState<'admin' | 'teacher' | null>(null);

    useEffect(() => {
        const savedUser = localStorage.getItem('ziyokor_user');
        const savedRole = localStorage.getItem('ziyokor_role');
        if (savedUser && savedRole) {
            setUser(JSON.parse(savedUser));
            setRole(savedRole as 'admin' | 'teacher');
        }
    }, []);

    const login = (userData: User, userRole: 'admin' | 'teacher') => {
        setUser(userData);
        setRole(userRole);
        localStorage.setItem('ziyokor_user', JSON.stringify(userData));
        localStorage.setItem('ziyokor_role', userRole);
    };

    const logout = () => {
        setUser(null);
        setRole(null);
        localStorage.removeItem('ziyokor_user');
        localStorage.removeItem('ziyokor_role');
    };

    return (
        <AuthContext.Provider value={{ user, role, login, logout, isAuthenticated: !!user }}>
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
