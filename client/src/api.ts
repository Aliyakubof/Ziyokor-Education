export const API_URL = import.meta.env.VITE_BACKEND_URL || "";
const BACKEND_URL = API_URL;

export const apiFetch = async (endpoint: string, options: RequestInit = {}) => {
    const url = endpoint.startsWith('http') ? endpoint : `${BACKEND_URL}${endpoint}`;

    const headers: Record<string, string> = {
        ...(options.headers as Record<string, string> || {}),
    };

    // Only set Content-Type if it's not already set and the body isn't FormData
    // (Browser automatically sets the correct multipart boundary for FormData)
    if (!headers['Content-Type'] && !(options.body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(url, {
        ...options,
        credentials: 'include', // Important for cookies
        headers,
    });
    return response;
};
