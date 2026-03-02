import { useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { registerPlugin } from '@capacitor/core';
import { Capacitor } from '@capacitor/core';
import { apiFetch } from './api';

const UsageStats = registerPlugin<{
    checkPermissions: () => Promise<{ granted: boolean }>;
    requestPermissions: () => Promise<void>;
    getUsageData: () => Promise<{ totalScreenTimeMs: number, topApps: any[] }>;
}>('UsageStats');

export default function AppMonitor({ children }: { children: React.ReactNode }) {
    const { isAuthenticated, role, user } = useAuth();
    const [needsPermission, setNeedsPermission] = useState(false);

    useEffect(() => {
        if (!isAuthenticated || role !== 'student' || !Capacitor.isNativePlatform()) return;

        const checkAndReport = async () => {
            try {
                const { granted } = await UsageStats.checkPermissions();
                if (!granted) {
                    setNeedsPermission(true);
                    return;
                }

                setNeedsPermission(false);

                // Fetch stats and send to backend
                const data = await UsageStats.getUsageData();
                if (data && user?.id) {
                    await apiFetch(`/api/student/${user.id}/usage`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(data)
                    });
                }
            } catch (err) {
                console.error("UsageStats monitor error:", err);
            }
        };

        checkAndReport();

        // Run every hour while app is open
        const interval = setInterval(checkAndReport, 60 * 60 * 1000);
        return () => clearInterval(interval);

    }, [isAuthenticated, role, user]);

    if (needsPermission) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 text-center">
                <div className="bg-white p-8 rounded-2xl shadow-2xl max-w-md w-full">
                    <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <svg className="w-10 h-10 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-4">Shaxsiy Ta'lim Kuzatuvi</h2>
                    <p className="text-gray-600 mb-8">
                        Ziyokor ilovasidan to'liq foydalanish va natijalaringizni hisoblash uchun
                        telefoningiz sozlamalaridan <b>"Usage Access" qismiga kirib Ziyokor ilovasiga ruxsat berishingiz</b> kerak.
                    </p>
                    <button
                        onClick={() => UsageStats.requestPermissions()}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl transition-all"
                    >
                        Sozlamalarni Ochasiz
                    </button>
                    <p className="mt-4 text-xs text-gray-400">Ruxsat bergach, ilovaga qaytib kiring.</p>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}
