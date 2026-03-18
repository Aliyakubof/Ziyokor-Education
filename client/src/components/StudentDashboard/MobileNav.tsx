import React from 'react';
import { LayoutDashboard, History, UserCircle } from 'lucide-react';

interface MobileNavProps {
    activeTab: 'home' | 'history' | 'profile';
    onTabChange: (tab: 'home' | 'history' | 'profile') => void;
}

const MobileNav: React.FC<MobileNavProps> = ({ activeTab, onTabChange }) => {
    return (
        <div 
            className="fixed bottom-0 left-0 w-full border-t px-6 py-2 z-50 pb-safe md:hidden transition-colors duration-500" 
            style={{ 
                backgroundColor: 'var(--card-bg)', 
                borderColor: 'var(--border-color)', 
                backdropFilter: 'blur(12px)', 
                WebkitBackdropFilter: 'blur(12px)' 
            }}
        >
            <div className="max-w-md mx-auto flex justify-between items-center">
                <button
                    onClick={() => onTabChange('home')}
                    className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${activeTab === 'home' ? '-translate-y-2' : 'opacity-40 hover:opacity-100'}`}
                    style={{ color: activeTab === 'home' ? 'var(--primary-color)' : 'var(--text-color)' }}
                >
                    <div 
                        className={`p-2 rounded-full transition-all ${activeTab === 'home' ? 'text-white shadow-lg' : ''}`} 
                        style={{ backgroundColor: activeTab === 'home' ? 'var(--primary-color)' : 'transparent', boxShadow: activeTab === 'home' ? '0 10px 15px -3px rgba(0,0,0,0.1)' : 'none' }}>
                        <LayoutDashboard size={24} />
                    </div>
                    <span className="text-[10px] font-bold">Asosiy</span>
                </button>

                <button
                    onClick={() => onTabChange('history')}
                    className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${activeTab === 'history' ? '-translate-y-2' : 'opacity-40 hover:opacity-100'}`}
                    style={{ color: activeTab === 'history' ? 'var(--primary-color)' : 'var(--text-color)' }}
                >
                    <div 
                        className={`p-2 rounded-full transition-all ${activeTab === 'history' ? 'text-white shadow-lg' : ''}`} 
                        style={{ backgroundColor: activeTab === 'history' ? 'var(--primary-color)' : 'transparent', boxShadow: activeTab === 'history' ? '0 10px 15px -3px rgba(0,0,0,0.1)' : 'none' }}>
                        <History size={24} />
                    </div>
                    <span className="text-[10px] font-bold">Tarix</span>
                </button>

                <button
                    onClick={() => onTabChange('profile')}
                    className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${activeTab === 'profile' ? '-translate-y-2' : 'opacity-40 hover:opacity-100'}`}
                    style={{ color: activeTab === 'profile' ? 'var(--primary-color)' : 'var(--text-color)' }}
                >
                    <div 
                        className={`p-2 rounded-full transition-all ${activeTab === 'profile' ? 'text-white shadow-lg' : ''}`} 
                        style={{ backgroundColor: activeTab === 'profile' ? 'var(--primary-color)' : 'transparent', boxShadow: activeTab === 'profile' ? '0 10px 15px -3px rgba(0,0,0,0.1)' : 'none' }}>
                        <UserCircle size={24} />
                    </div>
                    <span className="text-[10px] font-bold">Profil</span>
                </button>
            </div>
        </div>
    );
};

export default React.memo(MobileNav);
