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
        <div className="min-h-screen p-8 relative overflow-hidden">
            <div className="max-w-7xl mx-auto flex flex-col h-full">
                <div className="flex justify-between items-center mb-12">
                    <button
                        onClick={() => navigate('/teacher')}
                        className="flex items-center gap-2 text-slate-400 hover:text-white transition-all hover:translate-x-[-4px]"
                    >
                        <ArrowLeft size={20} /> Orqaga
                    </button>

                    <div className="flex items-center gap-2 px-6 py-2 glass rounded-2xl border-slate-700/30">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                        <span className="text-sm font-bold text-slate-300 uppercase tracking-widest leading-none">Lobby Active</span>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-1">
                    {/* Left Side: Game Info & QR */}
                    <div className="lg:col-span-2 space-y-8 h-full">
                        <section className="glass rounded-[3rem] p-10 flex flex-col items-center text-center relative overflow-hidden border-slate-700/30">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-500"></div>

                            <h2 className="text-3xl font-black text-white mb-8 tracking-tight">Unit Quizga qo'shiling</h2>

                            <div className="relative group mb-8">
                                <div className="absolute -inset-4 bg-gradient-to-tr from-blue-500 to-indigo-500 rounded-[2.5rem] blur-2xl opacity-20 group-hover:opacity-30 transition-opacity"></div>
                                <div className="relative bg-white p-6 rounded-[2rem] shadow-2xl">
                                    {pin ? (
                                        <QRCode value={joinUrl} size={220} />
                                    ) : (
                                        <div className="w-[220px] h-[220px] bg-slate-100 animate-pulse rounded-lg" />
                                    )}
                                </div>
                            </div>

                            <div className="flex flex-col items-center gap-4">
                                <div className="glass-blue border-transparent px-10 py-5 rounded-[2rem] flex flex-col items-center gap-1 shadow-xl shadow-blue-500/5">
                                    <span className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em] ml-1">O'tish kodi (PIN)</span>
                                    <span className="text-6xl font-black tracking-[0.2em] text-white text-glow mb-1">{pin || '......'}</span>
                                </div>

                                <div className="flex items-center gap-3 text-slate-400 bg-slate-900/60 px-6 py-3 rounded-2xl border border-slate-700/30 hover:border-slate-500/50 transition-all cursor-pointer group">
                                    <LinkIcon size={18} className="group-hover:text-blue-400" />
                                    <code className="text-sm font-medium tracking-tight font-mono">{joinUrl}</code>
                                </div>
                            </div>
                        </section>

                        {/* Controls */}
                        <section className="glass-indigo rounded-[3rem] p-10 border-transparent shadow-2xl relative overflow-hidden">
                            <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                                <div className="flex items-center gap-6">
                                    <div className="bg-indigo-500/10 p-5 rounded-[2rem]">
                                        <Timer className="text-indigo-400" size={40} />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-xs font-black text-indigo-400 uppercase tracking-widest mb-1">Vaqt chegarasi</span>
                                        <div className="flex items-center gap-3">
                                            <input
                                                type="number"
                                                value={timerValue}
                                                onChange={(e) => setTimerValue(parseInt(e.target.value))}
                                                className="w-24 bg-slate-900/60 border border-indigo-500/30 text-4xl font-black text-center py-3 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all text-white"
                                            />
                                            <span className="text-2xl font-black text-slate-600">SONIYA</span>
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={handleStart}
                                    disabled={players.length === 0 || isStarting}
                                    className="relative px-16 py-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-600 text-white rounded-[2rem] font-black text-3xl transition-all shadow-2xl shadow-blue-500/20 flex items-center gap-4 btn-premium overflow-hidden group"
                                >
                                    <Play size={32} className="fill-current group-hover:scale-110 transition-transform" />
                                    <span>BOSHLASH</span>
                                    {players.length === 0 && (
                                        <div className="absolute inset-0 bg-slate-900/80 flex flex-col items-center justify-center backdrop-blur-sm">
                                            <p className="text-[10px] font-black tracking-widest uppercase">O'quvchilar yo'q</p>
                                        </div>
                                    )}
                                </button>
                            </div>
                        </section>
                    </div>

                    {/* Right Side: Players List */}
                    <div className="glass rounded-[3rem] p-8 flex flex-col border-slate-700/30 max-h-[calc(100vh-160px)]">
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-4">
                                <div className="bg-emerald-500/10 p-3 rounded-2xl">
                                    <Users className="text-emerald-400 w-6 h-6" />
                                </div>
                                <h3 className="text-2xl font-black text-white tracking-tight">Navbatdagilar</h3>
                            </div>
                            <div className="bg-emerald-500/20 text-emerald-400 px-4 py-2 rounded-2xl text-sm font-black border border-emerald-500/20">
                                {players.length}
                            </div>
                        </div>

                        <div className="flex-1 space-y-4 overflow-y-auto pr-2 custom-scrollbar">
                            {players.map((player) => (
                                <div
                                    key={player.id}
                                    className={`flex items-center justify-between p-5 rounded-[1.5rem] border transition-all duration-500 ${player.status === 'Cheating'
                                        ? 'bg-red-500/10 border-red-500/50 animate-pulse'
                                        : 'glass-blue border-transparent'
                                        }`}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`w-3 h-3 rounded-full shadow-lg ${player.status === 'Online' ? 'bg-emerald-500 shadow-emerald-500/20' :
                                            player.status === 'Cheating' ? 'bg-red-500 shadow-red-500/20' : 'bg-slate-600'
                                            }`} />
                                        <span className="font-bold text-white tracking-tight">{player.name}</span>
                                    </div>

                                    {player.status === 'Cheating' && (
                                        <div className="flex items-center gap-2 text-red-500 bg-red-500/10 px-3 py-1.5 rounded-xl border border-red-500/20">
                                            <AlertTriangle size={14} />
                                            <span className="text-[10px] font-black uppercase tracking-widest">Xavf!</span>
                                        </div>
                                    )}
                                </div>
                            ))}

                            {players.length === 0 && (
                                <div className="h-64 flex flex-col items-center justify-center text-slate-500 text-center gap-6">
                                    <div className="w-20 h-20 bg-slate-900/50 rounded-[2rem] flex items-center justify-center animate-pulse border border-slate-800/50">
                                        <Users size={32} className="opacity-10" />
                                    </div>
                                    <div className="space-y-2">
                                        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Hali hech kim yo'q</p>
                                        <p className="text-xs font-medium text-slate-600 max-w-[200px] leading-relaxed">
                                            O'quvchilar yuqoridagi QR kodni skanerlashlari kerak
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UnitLobby;
