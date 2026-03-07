const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "";

export const apiFetch = async (endpoint: string, options: RequestInit = {}) => {
    const url = endpoint.startsWith('http') ? endpoint : `${BACKEND_URL}${endpoint}`;
    const token = localStorage.getItem('ziyokor_token');

    // Send role and phone for server-side auth middleware
    const userStr = localStorage.getItem('ziyokor_user');
    const roleStr = localStorage.getItem('ziyokor_role');
    let userPhone = '';
    try {
        if (userStr) userPhone = JSON.parse(userStr)?.phone || '';
    } catch { }

    const response = await fetch(url, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : '',
            'x-user-role': roleStr || '',
            'x-user-phone': userPhone,
            ...(options.headers || {}),
        },
    });
    return response;
};
