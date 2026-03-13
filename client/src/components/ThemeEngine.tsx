import React, { useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { themes, defaultTheme } from '../themeConfig';

export const ThemeEngine: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { activeThemeId, role } = useAuth();

    useEffect(() => {
        // Only apply themes for student role
        if (role !== 'student') {
            // Reset to default or clear if not a student
            clearTheme();
            return;
        }

        const themeId = activeThemeId || defaultTheme;
        const theme = themes[themeId] || themes[defaultTheme];
        
        const root = document.documentElement;
        root.style.setProperty('--primary-color', theme.primary);
        root.style.setProperty('--secondary-color', theme.secondary);
        root.style.setProperty('--bg-color', theme.bg);
        root.style.setProperty('--text-color', theme.text);
        root.style.setProperty('--card-bg', theme.cardBg);
        root.style.setProperty('--border-color', theme.border);
        root.style.setProperty('--accent-color', theme.accent);
        
        // Background gradient for standard pages
        root.style.setProperty('--bg-gradient-from', theme.bg);
        root.style.setProperty('--bg-gradient-to', theme.bg === '#ffffff' ? '#f8fafc' : theme.bg);

    }, [activeThemeId, role]);

    const clearTheme = () => {
        const root = document.documentElement;
        root.style.removeProperty('--primary-color');
        root.style.removeProperty('--secondary-color');
        root.style.removeProperty('--bg-color');
        root.style.removeProperty('--text-color');
        root.style.removeProperty('--card-bg');
        root.style.removeProperty('--border-color');
        root.style.removeProperty('--accent-color');
        root.style.removeProperty('--bg-gradient-from');
        root.style.removeProperty('--bg-gradient-to');
    };

    return <>{children}</>;
};
