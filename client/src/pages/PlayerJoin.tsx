import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { socket } from '../socket';

export default function PlayerJoin() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [pin, setPin] = useState(searchParams.get('pin') || '');
    const [name, setName] = useState('');

    const hasPinInUrl = !!searchParams.get('pin');

    useEffect(() => {
        socket.connect();

        socket.on('joined', () => {
            navigate('/play');
        });

        socket.on('error', (msg) => {
            alert(msg);
        });

        return () => {
            socket.off('joined');
            socket.off('error');
        };
    }, [navigate]);

    const joinGame = () => {
        if (!pin || !name) return;
        localStorage.setItem('kahoot-pin', pin);
        socket.emit('player-join', { pin, name });
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden transition-colors" style={{ backgroundColor: 'var(--bg-color)' }}>
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/10 rounded-full blur-[100px]"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[100px]"></div>
            </div>

            <div className="rounded-[3rem] p-10 text-center max-w-md w-full shadow-xl border relative z-10 transition-colors" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
                <h1 className="text-4xl md:text-5xl font-black mb-6 md:mb-8 text-center break-words max-w-full" style={{ color: 'var(--text-color)' }}>Kahoot!</h1>
                <div className="flex flex-col gap-3 w-full max-w-xs md:max-w-sm mx-auto">
                    {!hasPinInUrl && (
                        <input
                            className="p-3 md:p-4 rounded-xl text-center text-lg md:text-xl font-bold shadow-lg transition-colors"
                            style={{ backgroundColor: 'var(--input-bg)', color: 'var(--text-color)', borderColor: 'var(--border-color)' }}
                            placeholder="Game PIN"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={pin}
                            onChange={e => setPin(e.target.value)}
                        />
                    )}
                    <input
                        className="p-3 md:p-4 rounded-xl text-center text-lg md:text-xl font-bold shadow-lg transition-colors"
                        style={{ backgroundColor: 'var(--input-bg)', color: 'var(--text-color)', borderColor: 'var(--border-color)' }}
                        placeholder="Nickname"
                        value={name}
                        onChange={e => setName(e.target.value)}
                    />
                    <button
                        onClick={joinGame}
                        className="p-3 md:p-4 rounded-xl font-bold text-lg md:text-xl transition mt-2 shadow-xl active:scale-95"
                        style={{ backgroundColor: 'var(--primary-color)', color: 'var(--button-text-color)' }}
                    >
                        Enter
                    </button>
                </div>
            </div>
        </div>
    );
}
