export interface ThemeDefinition {
    primary: string;
    secondary: string;
    bg: string;
    text: string;
    cardBg: string;
    border: string;
    accent: string;
}

export const themes: Record<string, ThemeDefinition> = {
    'theme-indigo': {
        primary: '#6366f1',
        secondary: '#4338ca',
        bg: '#f5f7ff', 
        text: '#1e1b4b',
        cardBg: '#ffffff',
        border: '#c7d2fe',
        accent: '#818cf8'
    },
    'theme-emerald': {
        primary: '#10b981',
        secondary: '#059669',
        bg: '#f0fdf4',
        text: '#064e3b',
        cardBg: '#ffffff',
        border: '#bbf7d0',
        accent: '#34d399'
    },
    'theme-sunset': {
        primary: '#f59e0b',
        secondary: '#d97706',
        bg: '#fffbeb',
        text: '#451a03',
        cardBg: '#ffffff',
        border: '#fef3c7',
        accent: '#fbbf24'
    },
    'theme-cyber': {
        primary: '#22d3ee',
        secondary: '#0891b2',
        bg: '#020617', // Deeper black/dark
        text: '#f8fafc',
        cardBg: '#0f172a',
        border: '#1e293b',
        accent: '#06b6d4'
    },
    'theme-sakura': {
        primary: '#f472b6',
        secondary: '#db2777',
        bg: '#fff1f2',
        text: '#4c0519',
        cardBg: '#ffffff',
        border: '#ffe4e6',
        accent: '#fb7185'
    },
    'theme-ocean': {
        primary: '#38bdf8',
        secondary: '#0284c7',
        bg: '#082f49', // Deep dark ocean
        text: '#f0f9ff',
        cardBg: '#0c4a6e',
        border: '#075985',
        accent: '#0ea5e9'
    },
    'theme-general': {
        primary: '#6d28d9',
        secondary: '#5b21b6',
        bg: '#fdfbff',
        text: '#1e1b4b',
        cardBg: '#ffffff',
        border: '#ddd6fe',
        accent: '#8b5cf6'
    }
};

export const defaultTheme = 'theme-general';
