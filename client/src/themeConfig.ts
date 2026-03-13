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
        bg: '#eef2ff', // Indigo 50 // Saturated light
        text: '#1e1b4b',
        cardBg: '#ffffff',
        border: '#c7d2fe',
        accent: '#818cf8'
    },
    'theme-emerald': {
        primary: '#10b981',
        secondary: '#047857',
        bg: '#ecfdf5', // Saturated emerald
        text: '#064e3b',
        cardBg: '#ffffff',
        border: '#6EE7B7',
        accent: '#34d399'
    },
    'theme-sunset': {
        primary: '#f97316',
        secondary: '#c2410c',
        bg: '#fff7ed', // Vibrant orange tint
        text: '#431407',
        cardBg: '#ffffff',
        border: '#fdba74',
        accent: '#fb923c'
    },
    'theme-cyber': {
        primary: '#06b6d4',
        secondary: '#0891b2',
        bg: '#0f172a', // Sleek dark blue
        text: '#f8fafc',
        cardBg: '#1e293b',
        border: '#334155',
        accent: '#22d3ee'
    },
    'theme-sakura': {
        primary: '#ec4899',
        secondary: '#be185d',
        bg: '#fdf2f8', // Warm pink
        text: '#500724',
        cardBg: '#ffffff',
        border: '#f9a8d4',
        accent: '#fb7185'
    },
    'theme-ocean': {
        primary: '#0ea5e9',
        secondary: '#0369a1',
        bg: '#0c4a6e', // Deep deep blue
        text: '#f0f9ff',
        cardBg: '#075985',
        border: '#082f49',
        accent: '#38bdf8'
    }
};

export const defaultTheme = 'theme-indigo';
