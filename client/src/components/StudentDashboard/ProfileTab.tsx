import React from 'react';
import { LogOut, Camera, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ProfileTabProps {
    user: any;
    stats: any;
    isUploadingAvatar: boolean;
    onAvatarUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onLogout: () => void;
}

const ProfileTab: React.FC<ProfileTabProps> = ({ user, stats, isUploadingAvatar, onAvatarUpload, onLogout }) => {
    const navigate = useNavigate();

    return (
        <div className="rounded-3xl p-6 shadow-sm border text-center relative transition-colors" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
            {/* Avatar Section */}
            <div className="relative w-28 h-28 mx-auto mb-4 group inline-block">
                <div 
                    className="w-28 h-28 rounded-[2.5rem] flex items-center justify-center text-4xl font-black text-white shadow-xl overflow-hidden relative border-4 transition-all" 
                    style={{ 
                        background: `linear-gradient(to tr, var(--primary-color), var(--secondary-color))`, 
                        borderColor: 'var(--card-bg)', 
                        boxShadow: '0 10px 15px -3px rgba(0,0,0,0.2)' 
                    }}
                >
                    {stats?.avatarUrl ? (
                        <img 
                            src={stats.avatarUrl.startsWith('/uploads') ? `${import.meta.env.VITE_BACKEND_URL}${stats.avatarUrl}` : stats.avatarUrl} 
                            alt="Avatar" 
                            className="w-full h-full object-cover" 
                        />
                    ) : (
                        <span>{user?.name?.charAt(0).toUpperCase()}</span>
                    )}

                    {/* Overlay for Upload or Lock */}
                    <div className={`absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer ${isUploadingAvatar ? 'opacity-100' : ''}`}>
                        {isUploadingAvatar ? (
                            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        ) : stats?.hasAvatarUnlock ? (
                            <label className="cursor-pointer w-full h-full flex flex-col items-center justify-center text-white">
                                <Camera size={24} className="mb-1" />
                                <span className="text-[10px] font-black uppercase">O'zgartirish</span>
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={onAvatarUpload}
                                    disabled={isUploadingAvatar}
                                />
                            </label>
                        ) : (
                            <div
                                className="w-full h-full flex flex-col items-center justify-center text-white cursor-pointer"
                                onClick={() => navigate('/student/shop')}
                            >
                                <Lock size={24} className="mb-1 text-rose-400" />
                                <span className="text-[10px] font-black uppercase text-center px-2 leading-tight">Do'kondan <br /> Oling</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <h2 className="text-xl font-black mb-1" style={{ color: 'var(--text-color)' }}>{user?.name}</h2>
            <p className="font-medium mb-6 opacity-60" style={{ color: 'var(--text-color)' }}>{user?.groupName}</p>

            <div className="space-y-2">
                <div className="flex justify-between items-center p-3 rounded-xl transition-colors" style={{ backgroundColor: 'var(--bg-color)' }}>
                    <span className="text-sm font-bold opacity-50" style={{ color: 'var(--text-color)' }}>ID Raqam</span>
                    <span className="font-mono font-bold" style={{ color: 'var(--text-color)' }}>{user?.id}</span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-xl transition-colors" style={{ backgroundColor: 'var(--bg-color)' }}>
                    <span className="text-sm font-bold opacity-50" style={{ color: 'var(--text-color)' }}>O'qituvchi</span>
                    <span className="font-bold" style={{ color: 'var(--text-color)' }}>{user?.teacherName}</span>
                </div>
            </div>

            <button
                onClick={onLogout}
                className="w-full mt-8 bg-rose-500/10 text-rose-500 font-bold py-3 rounded-xl hover:bg-rose-500/20 transition-colors flex items-center justify-center gap-2"
            >
                <LogOut size={18} /> Chiqish
            </button>
        </div>
    );
};

export default React.memo(ProfileTab);
