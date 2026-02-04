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
        <div className="flex flex-col items-center justify-center min-h-screen bg-brand-purple p-4">
            <h1 className="text-5xl font-black mb-8">Kahoot!</h1>
            <div className="flex flex-col gap-4 w-full max-w-sm">
                {!hasPinInUrl && (
                    <input
                        className="p-4 rounded text-center text-xl font-bold text-black"
                        placeholder="Game PIN"
                        value={pin}
                        onChange={e => setPin(e.target.value)}
                    />
                )}
                <input
                    className="p-4 rounded text-center text-xl font-bold text-black"
                    placeholder="Nickname"
                    value={name}
                    onChange={e => setName(e.target.value)}
                />
                <button
                    onClick={joinGame}
                    className="bg-black text-white p-4 rounded font-bold text-xl hover:bg-gray-900 transition mt-2"
                >
                    Enter
                </button>
            </div>
        </div>
    );
}
