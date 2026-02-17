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
        <div className="flex flex-col items-center justify-center min-h-[100dvh] bg-brand-purple p-6">
            <h1 className="text-4xl md:text-5xl font-black mb-6 md:mb-8 text-center break-words max-w-full">Kahoot!</h1>
            <div className="flex flex-col gap-3 w-full max-w-xs md:max-w-sm">
                {!hasPinInUrl && (
                    <input
                        className="p-3 md:p-4 rounded-xl text-center text-lg md:text-xl font-bold text-black shadow-lg"
                        placeholder="Game PIN"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={pin}
                        onChange={e => setPin(e.target.value)}
                    />
                )}
                <input
                    className="p-3 md:p-4 rounded-xl text-center text-lg md:text-xl font-bold text-black shadow-lg"
                    placeholder="Nickname"
                    value={name}
                    onChange={e => setName(e.target.value)}
                />
                <button
                    onClick={joinGame}
                    className="bg-black text-white p-3 md:p-4 rounded-xl font-bold text-lg md:text-xl hover:bg-gray-900 transition mt-2 shadow-xl active:scale-95"
                >
                    Enter
                </button>
            </div>
        </div>
    );
}
