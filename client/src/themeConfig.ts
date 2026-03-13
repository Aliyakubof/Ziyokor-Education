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
        primary: '#4f46e5',
        secondary: '#4338ca',
        bg: '#f8fafc', // Light slate bg
        text: '#1e293b',
        cardBg: '#ffffff',
        border: '#e2e8f0',
        accent: '#6366f1'
    },
    'theme-emerald': {
        primary: '#10b981',
        secondary: '#059669',
        bg: '#f0fdf4',
        text: '#064e3b',
        cardBg: '#ffffff',
        border: '#d1fae5',
        accent: '#34d399'
    },
    'theme-sunset': {
        primary: '#f59e0b',
        secondary: '#ea580c',
        bg: '#fffbeb',
        text: '#451a03',
        cardBg: '#ffffff',
        border: '#fef3c7',
        accent: '#fbbf24'
    },
    'theme-cyber': {
        primary: '#06b6d4',
        secondary: '#0891b2',
        bg: '#f0f9ff',
        text: '#083344',
        cardBg: '#ffffff',
        border: '#e0f2fe',
        accent: '#22d3ee'
    },
    'theme-sakura': {
        primary: '#f472b6',
        secondary: '#db2777',
        bg: '#fdf2f8',
        text: '#500724',
        cardBg: '#ffffff',
        border: '#fce7f3',
        accent: '#fb7185'
    },
    'theme-ocean': {
        primary: '#0891b2',
        secondary: '#0e7490',
        bg: '#f0f9ff',
        text: '#083344',
        cardBg: '#ffffff',
        border: '#cffafe',
        accent: '#22d3ee'
    }
};

export const defaultTheme = 'theme-indigo';
