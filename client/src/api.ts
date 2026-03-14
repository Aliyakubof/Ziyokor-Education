export const API_URL = import.meta.env.VITE_BACKEND_URL || "";
const BACKEND_URL = API_URL;

export const apiFetch = async (endpoint: string, options: RequestInit = {}) => {
    const url = endpoint.startsWith('http') ? endpoint : `${BACKEND_URL}${endpoint}`;

    const response = await fetch(url, {
        ...options,
        credentials: 'include', // Important for cookies
        headers: {
            'Content-Type': 'application/json',
            ...(options.headers || {}),
        },
    });
    return response;
};
