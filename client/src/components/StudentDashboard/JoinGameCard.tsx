import React, { useState } from 'react';
import { Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface JoinGameCardProps {
    studentId?: string;
}

const JoinGameCard: React.FC<JoinGameCardProps> = ({ studentId }) => {
    const [pin, setPin] = useState('');
    const navigate = useNavigate();

    const handleJoinGame = (e: React.FormEvent) => {
        e.preventDefault();
        if (pin.length === 6) {
            if (studentId) {
                localStorage.setItem('student-id', studentId);
            }
            navigate(`/unit-join/${pin}`);
        } else {
            alert("Iltimos, 6 xonali PIN kodni to'g'ri kiriting");
        }
    };

    return (
        <div 
            className="rounded-3xl p-6 shadow-xl shadow-indigo-900/5 border relative overflow-hidden group transition-colors" 
            style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}
        >
            <div className="absolute top-0 right-0 w-32 h-32 rounded-full -mr-10 -mt-10 group-hover:scale-150 transition-transform duration-500 opacity-20" style={{ backgroundColor: 'var(--primary-color)' }}></div>
            <h2 className="text-lg font-black mb-4 relative z-10 flex items-center gap-2" style={{ color: 'var(--text-color)' }}>
                Testga Kirish
            </h2>
            <form onSubmit={handleJoinGame} className="relative z-10">
                <input
                    type="text"
                    placeholder="6 xonali PIN kiriting"
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="w-full border-2 rounded-xl px-4 py-3 font-mono text-lg font-bold text-center tracking-widest focus:outline-none transition-colors mb-3"
                    style={{ backgroundColor: 'var(--bg-color)', borderColor: 'var(--border-color)', color: 'var(--text-color)' }}
                />
                <button 
                    type="submit" 
                    className="w-full text-white font-bold py-3.5 rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95" 
                    style={{ backgroundColor: 'var(--primary-color)', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                >
                    <Zap size={20} className="fill-white" /> Boshlash
                </button>
            </form>
        </div>
    );
};

export default React.memo(JoinGameCard);
