import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import QRCode from 'react-qr-code';
import { socket } from '../socket';
import { Timer, Users, Play, AlertTriangle, Link as LinkIcon, ArrowLeft } from 'lucide-react';

interface Player {
    id: string;
    name: string;
    status: 'Online' | 'Offline' | 'Cheating';
}

const UnitLobby = () => {
    const { quizId, groupId } = useParams();
    const navigate = useNavigate();
    const [pin, setPin] = useState<string | null>(null);
    const [players, setPlayers] = useState<Player[]>([]);
    const [timerValue, setTimerValue] = useState(30);
    const [isStarting, setIsStarting] = useState(false);

    useEffect(() => {
        socket.connect();
        socket.emit('host-create-unit-game', { quizId, groupId });

        socket.on('game-created', (newPin: string) => {
            setPin(newPin);
        });

        socket.on('player-update', (updatedPlayers: Player[]) => {
            setPlayers(updatedPlayers);
        });

        socket.on('error', (err) => alert(err));

        return () => {
            socket.off('game-created');
            socket.off('player-update');
            socket.off('error');
        };
    }, [quizId, groupId]);

    const handleStart = () => {
        if (!pin) return;
        setIsStarting(true);
        socket.emit('host-start-game', pin);
        navigate(`/host-game/${pin}`);
    };

    const joinUrl = `${window.location.origin}/unit-join/${pin}`;

    return (
        <div className="min-h-screen bg-slate-900 text-white p-8">
            <button
                onClick={() => navigate('/teacher')}
                className="flex items-center gap-2 text-slate-400 hover:text-white mb-8 transition-colors"
            >
                <ArrowLeft size={20} /> Orqaga
            </button>

            <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Side: Game Info & QR */}
                <div className="lg:col-span-2 space-y-8">
                    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-3xl p-8 flex flex-col items-center text-center">
                        <h2 className="text-2xl font-bold text-slate-400 mb-2">Quizga qo'shiling</h2>
                        <div className="bg-white p-4 rounded-2xl mb-6">
                            {pin ? (
                                <QRCode value={joinUrl} size={200} />
                            ) : (
                                <div className="w-[200px] h-[200px] bg-slate-200 animate-pulse rounded-lg" />
                            )}
                        </div>
                        <div className="bg-slate-900 border border-slate-700 px-6 py-3 rounded-xl flex items-center gap-3 mb-4">
                            <span className="text-slate-500 font-mono">PIN:</span>
                            <span className="text-4xl font-black tracking-widest text-emerald-400">{pin || '......'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-400 bg-slate-900/50 px-4 py-2 rounded-lg border border-slate-700/30">
                            <LinkIcon size={16} />
                            <code className="text-sm">{joinUrl}</code>
                        </div>
                    </div>

                    {/* Timer & Controls */}
                    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-3xl p-8">
                        <div className="flex flex-col items-center gap-6">
                            <div className="flex items-center gap-4">
                                <Timer className="text-indigo-400" size={32} />
                                <div className="flex items-center gap-2">
                                    <input
                                        type="number"
                                        value={timerValue}
                                        onChange={(e) => setTimerValue(parseInt(e.target.value))}
                                        className="w-24 bg-slate-900 border-2 border-indigo-500/30 text-4xl font-bold text-center py-2 rounded-xl focus:outline-none focus:border-indigo-500 transition-colors"
                                    />
                                    <span className="text-2xl font-bold text-slate-500">soniya</span>
                                </div>
                            </div>

                            <button
                                onClick={handleStart}
                                disabled={players.length === 0 || isStarting}
                                className="group relative px-12 py-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 rounded-2xl font-black text-2xl transition-all shadow-xl shadow-indigo-900/20 flex items-center gap-3 overflow-hidden"
                            >
                                <Play size={28} className="fill-current" />
                                START
                                {players.length === 0 && (
                                    <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center backdrop-blur-[1px]">
                                        <p className="text-xs font-bold text-indigo-400">O'quvchilarni kuting</p>
                                    </div>
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Right Side: Players List */}
                <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-3xl p-6 flex flex-col">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-2">
                            <Users className="text-emerald-400" />
                            <h3 className="text-xl font-bold">O'quvchilar</h3>
                        </div>
                        <span className="bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full text-sm font-bold">
                            {players.length} ta
                        </span>
                    </div>

                    <div className="flex-1 space-y-3 overflow-y-auto pr-2 custom-scrollbar">
                        {players.map((player) => (
                            <div
                                key={player.id}
                                className={`flex items-center justify-between p-4 rounded-xl border transition-all ${player.status === 'Cheating'
                                    ? 'bg-red-500/10 border-red-500/50 animate-pulse'
                                    : 'bg-slate-900/50 border-slate-700/30'
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-2 h-2 rounded-full ${player.status === 'Online' ? 'bg-emerald-500' :
                                        player.status === 'Cheating' ? 'bg-red-500' : 'bg-slate-600'
                                        }`} />
                                    <span className="font-semibold">{player.name}</span>
                                </div>

                                {player.status === 'Cheating' && (
                                    <div className="flex items-center gap-1 text-red-500 text-xs font-black uppercase">
                                        <AlertTriangle size={14} />
                                        <span>DIQQAT!</span>
                                    </div>
                                )}
                            </div>
                        ))}

                        {players.length === 0 && (
                            <div className="h-40 flex flex-col items-center justify-center text-slate-500 italic text-center">
                                <p className="text-sm">Hali hech kim qo'shilmadi</p>
                                <p className="text-xs mt-1">O'quvchilar QR kodni skanerlashlari kerak</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UnitLobby;
