import { useState, useEffect } from 'react';
import { apiFetch } from '../../api';
import { Settings, RefreshCw, Info, AlertCircle, Check } from 'lucide-react';

interface SystemSetting {
    key: string;
    value: any;
    description: string;
    updated_at: string;
}

export default function ManagerSettings() {
    const [settings, setSettings] = useState<SystemSetting[]>([]);
    const [loading, setLoading] = useState(true);
    const [savingKey, setSavingKey] = useState<string | null>(null);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        setLoading(true);
        try {
            const res = await apiFetch('/api/manager/settings');
            if (res.ok) {
                const data = await res.json();
                setSettings(data);
            }
        } catch (err) {
            console.error('Fetch settings error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdate = async (key: string, newValue: any) => {
        setSavingKey(key);
        setMessage(null);
        try {
            const res = await apiFetch(`/api/manager/settings/${key}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ value: newValue })
            });

            if (res.ok) {
                setMessage({ type: 'success', text: 'Sozlama saqlandi' });
                setSettings(prev => prev.map(s => s.key === key ? { ...s, value: newValue } : s));
            } else {
                throw new Error('Saqlashda xatolik');
            }
        } catch (err) {
            setMessage({ type: 'error', text: 'Xatolik yuz berdi' });
        } finally {
            setSavingKey(null);
            setTimeout(() => setMessage(null), 3000);
        }
    };

    const renderInput = (setting: SystemSetting) => {
        const val = setting.value;
        const type = typeof val;

        if (Array.isArray(val)) {
            return (
                <textarea
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-mono focus:outline-none focus:border-indigo-500 transition-colors"
                    rows={3}
                    defaultValue={JSON.stringify(val, null, 2)}
                    onBlur={(e) => {
                        try {
                            const parsed = JSON.parse(e.target.value);
                            if (JSON.stringify(parsed) !== JSON.stringify(val)) {
                                handleUpdate(setting.key, parsed);
                            }
                        } catch (err) {
                            setMessage({ type: 'error', text: 'JSON format noto\'g\'ri' });
                            e.target.value = JSON.stringify(val, null, 2);
                        }
                    }}
                />
            );
        }

        if (type === 'number') {
            return (
                <input
                    type="number"
                    step="0.1"
                    className="w-32 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold focus:outline-none focus:border-indigo-500 transition-colors"
                    defaultValue={val}
                    onBlur={(e) => {
                        const num = parseFloat(e.target.value);
                        if (!isNaN(num) && num !== val) {
                            handleUpdate(setting.key, num);
                        }
                    }}
                />
            );
        }

        return (
            <input
                type="text"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-medium focus:outline-none focus:border-indigo-500 transition-colors"
                defaultValue={val}
                onBlur={(e) => {
                    if (e.target.value !== val) {
                        handleUpdate(setting.key, e.target.value);
                    }
                }}
            />
        );
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3">
                        <Settings className="text-indigo-600" /> Tizim Sozlamalari
                    </h2>
                    <p className="text-slate-500 font-medium text-sm mt-1 uppercase tracking-widest">Bot va platforma parametrlarini boshqarish</p>
                </div>
                <button
                    onClick={fetchSettings}
                    className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                    title="Yangilash"
                >
                    <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                </button>
            </div>

            {message && (
                <div className={`flex items-center gap-3 p-4 rounded-2xl animate-in slide-in-from-top-2 duration-300 ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
                    {message.type === 'success' ? <Check size={18} /> : <AlertCircle size={18} />}
                    <span className="text-sm font-bold">{message.text}</span>
                </div>
            )}

            <div className="grid grid-cols-1 gap-4">
                {loading && settings.length === 0 ? (
                    <div className="py-12 text-center text-slate-400 font-medium tracking-widest uppercase text-xs bg-white rounded-3xl border border-slate-100">Yuklanmoqda...</div>
                ) : (
                    settings.map(setting => (
                        <div key={setting.key} className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm group hover:border-indigo-200 transition-all">
                            <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                                <div className="space-y-2 flex-1">
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-sm font-black text-slate-800 font-mono">{setting.key}</h3>
                                        {savingKey === setting.key && <RefreshCw size={14} className="animate-spin text-indigo-500" />}
                                    </div>
                                    <p className="text-slate-500 text-xs font-medium flex items-start gap-2">
                                        <Info size={14} className="mt-0.5 shrink-0 text-slate-300" />
                                        {setting.description}
                                    </p>
                                    <p className="text-[10px] text-slate-300 font-black uppercase tracking-widest">Oxirgi yangilanish: {new Date(setting.updated_at).toLocaleString()}</p>
                                </div>
                                <div className="md:w-1/2 lg:w-1/3">
                                    <div className="flex items-center gap-3">
                                        {renderInput(setting)}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
