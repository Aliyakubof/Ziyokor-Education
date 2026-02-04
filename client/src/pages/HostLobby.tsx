import QRCode from 'react-qr-code';
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { socket } from '../socket';

export default function HostLobby() {
    const { quizId } = useParams();
    const navigate = useNavigate();
    const [pin, setPin] = useState('');
    const [players, setPlayers] = useState<any[]>([]);

    useEffect(() => {
        socket.connect();
        socket.emit('host-create-game', quizId);

        socket.on('game-created', (gamePin) => {
            setPin(gamePin);
        });

        socket.on('player-update', (updatedPlayers) => {
            setPlayers(updatedPlayers);
        });

        return () => {
            socket.off('game-created');
            socket.off('player-update');
        };
    }, [quizId]);

    const startGame = () => {
        socket.emit('host-start-game', pin);
        navigate(`/host-game/${pin}`);
    };

    const joinUrl = `${window.location.protocol}//${window.location.hostname}:${window.location.port}/join?pin=${pin}`;

    return (
        <div className="min-h-screen bg-brand-dark flex flex-col items-center pt-10 p-4">
            <div className="flex gap-8 mb-12">
                <div className="bg-white rounded-lg p-6 shadow-2xl text-center">
                    <h2 className="text-gray-500 font-bold uppercase tracking-wider mb-4">Scan to Join</h2>
                    {pin && (
                        <div className="bg-white p-2">
                            <QRCode value={joinUrl} size={192} />
                        </div>
                    )}
                </div>
                <div className="bg-white rounded-lg p-8 shadow-2xl text-center flex flex-col justify-center min-w-[300px]">
                    <h2 className="text-gray-500 font-bold uppercase tracking-wider mb-2">Or enter PIN:</h2>
                    <div className="text-7xl font-black text-black tracking-widest">{pin || '...'}</div>
                </div>
            </div>

            <div className="flex flex-wrap gap-4 justify-center w-full max-w-5xl mb-12">
                {players.map((p) => (
                    <div key={p.id} className="bg-brand-purple px-6 py-3 rounded-full text-xl font-bold animate-bounce shadow-lg">
                        {p.name}
                    </div>
                ))}
                {players.length === 0 && <div className="text-gray-400 text-xl animate-pulse">Waiting for players...</div>}
            </div>

            <div className="fixed bottom-0 left-0 right-0 bg-black/30 p-4 flex justify-between items-center px-12 backdrop-blur-md">
                <div className="text-2xl font-bold">{players.length} Players</div>
                <button
                    onClick={startGame}
                    disabled={players.length === 0}
                    className="bg-white text-black text-2xl font-bold px-8 py-3 rounded hover:scale-105 transition disabled:opacity-50 disabled:hover:scale-100"
                >
                    Start Result
                </button>
            </div>
        </div>
    );
}
