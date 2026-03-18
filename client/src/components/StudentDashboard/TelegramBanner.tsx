import React from 'react';
import { ChevronRight } from 'lucide-react';

interface TelegramBannerProps {
    studentId?: string;
}

const TelegramBanner: React.FC<TelegramBannerProps> = ({ studentId }) => {
    return (
        <a
            href={`https://t.me/Z_education_bot?start=${studentId}`}
            target="_blank"
            rel="noreferrer"
            className="block bg-gradient-to-r from-sky-500 to-blue-600 rounded-2xl p-4 text-white shadow-lg shadow-sky-500/20 relative overflow-hidden"
        >
            <div className="relative z-10 flex items-center justify-between">
                <div>
                    <h3 className="font-bold text-sm">Botga ulanish</h3>
                    <p className="text-xs text-sky-100 opacity-90">Natijalarni telefonda oling</p>
                </div>
                <div className="bg-white/20 p-2 rounded-full">
                    <ChevronRight size={20} />
                </div>
            </div>
            <div className="absolute -bottom-4 -right-4 w-20 h-20 bg-white/10 rounded-full blur-xl"></div>
        </a>
    );
};

export default React.memo(TelegramBanner);
