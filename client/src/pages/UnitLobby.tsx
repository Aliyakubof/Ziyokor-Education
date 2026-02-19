import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import QRCode from 'react-qr-code';
import { socket } from '../socket';
import { Timer, Users, Play, Link as LinkIcon, ArrowLeft, Copy, Check, AlertTriangle } from 'lucide-react';

interface Player {
    id: string;
    name: string;
    status?: 'Online' | 'Offline' | 'Cheating';
}

const UnitLobby = () => {
    const { quizId, groupId } = useParams();
    const navigate = useNavigate();
    const [pin, setPin] = useState<string | null>(null);
    const [players, setPlayers] = useState<Player[]>([]);
    const [customTime, setCustomTime] = useState<number>(30);
    const [isStarting, setIsStarting] = useState(false);
    const [copied, setCopied] = useState(false);

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
        // Pass the custom time limit (in minutes) to the server
        socket.emit('host-start-game', { pin, timeLimit: customTime });
        navigate(`/host-game/${pin}`);
    };

    const joinUrl = `${window.location.origin}/unit-join/${pin}`;

    const copyLink = () => {
        navigator.clipboard.writeText(joinUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="min-h-screen p-6 relative overflow-hidden bg-transparent font-sans">


            <div className="max-w-[1600px] mx-auto flex flex-col h-full relative z-10">
                {/* Header */}
                <div className="flex justify-between items-center mb-8">
                    <button
                        onClick={() => navigate('/teacher')}
                        className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 transition-all font-bold"
                    >
                        <ArrowLeft size={24} /> Orqaga
                    </button>

                    <div className="bg-white px-8 py-3 rounded-full shadow-sm border border-slate-200 flex items-center gap-3">
                        <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></div>
                        <span className="text-slate-600 font-extrabold tracking-wider uppercase text-sm">Lobby Active</span>
                    </div>
                </div>

                <div className="grid grid-cols-12 gap-8 flex-1 h-[calc(100vh-140px)]">

                    {/* LEFT COLUMN: Real-time Student Table */}
                    <div className="col-span-12 lg:col-span-4 flex flex-col">
                        <div className="bg-white rounded-[2.5rem] p-6 shadow-xl border border-slate-200 flex flex-col h-full overflow-hidden relative">
                            <div className="flex items-center justify-between mb-6 px-2">
                                <div className="flex items-center gap-3">
                                    <div className="bg-indigo-50 p-3 rounded-2xl">
                                        <Users className="text-indigo-600" size={24} />
                                    </div>
                                    <h3 className="text-xl font-black text-slate-800">O'quvchilar</h3>
                                </div>
                                <span className="bg-indigo-100 text-indigo-600 px-4 py-1.5 rounded-full text-sm font-black border border-indigo-200">
                                    {players.length}
                                </span>
                            </div>

                            <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                                {players.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-4 opacity-60">
                                        <Users size={48} />
                                        <p className="font-bold text-center text-sm uppercase tracking-wider">Hali hech kim yo'q</p>
                                    </div>
                                ) : (
                                    players.map((player) => (
                                        <div key={player.id} className={`
                                            flex items-center justify-between p-4 rounded-2xl border transition-all
                                            ${player.status === 'Cheating'
                                                ? 'bg-red-50 border-red-200 shadow-[0_0_15px_rgba(239,68,68,0.2)]'
                                                : 'bg-slate-50 border-slate-100 hover:border-indigo-200'}
                                        `}>
                                            <div className="flex items-center gap-3">
                                                <div className={`w-2.5 h-2.5 rounded-full ${player.status === 'Cheating' ? 'bg-red-500 animate-pulse' : 'bg-indigo-500'}`} />
                                                <h3 className="font-black text-slate-800 text-lg leading-tight truncate max-w-[120px]">{player.name}</h3>
                                            </div>

                                            {player.status === 'Cheating' && (
                                                <div className="flex items-center gap-1.5 text-red-600 bg-white px-2 py-1 rounded-lg border border-red-100 shadow-sm">
                                                    <AlertTriangle size={12} />
                                                    <span className="text-[10px] font-black uppercase">DIQQAT</span>
                                                </div>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>

                            {/* Bottom fade for scrolling list */}
                            <div className="absolute bottom-0 left-0 w-full h-8 bg-gradient-to-t from-white to-transparent pointer-events-none"></div>
                        </div>
                    </div>

                    {/* CENTER/RIGHT COLUMN: Controls, QR, Timer */}
                    <div className="col-span-12 lg:col-span-8 flex flex-col gap-6">

                        {/* QR Code & Pin Section */}
                        <div className="bg-white rounded-[3rem] p-8 shadow-xl border border-slate-200 relative overflow-hidden flex flex-col md:flex-row items-center justify-around gap-8">
                            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>

                            {/* QR Code */}
                            <div className="relative group">
                                <div className="absolute -inset-4 bg-gradient-to-tr from-blue-400 to-indigo-400 rounded-[2.5rem] blur-xl opacity-20 group-hover:opacity-30 transition-all"></div>
                                <div className="relative bg-white p-4 rounded-[2rem] shadow-lg border border-slate-100">
                                    {pin ? <QRCode value={joinUrl} size={180} /> : <div className="w-[180px] h-[180px] bg-slate-100 animate-pulse rounded-xl" />}
                                </div>
                            </div>

                            {/* Link & PIN */}
                            <div className="flex flex-col items-center md:items-start gap-6">
                                <div className="text-center md:text-left">
                                    <h2 className="text-4xl font-black text-slate-800 mb-2 tracking-tight">Qo'shiling</h2>
                                    <p className="text-slate-500 font-medium">Telefoningiz orqali skanerlang yoki PIN kodni kiriting</p>
                                </div>

                                <div className="flex flex-col gap-4 w-full">
                                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col items-center">
                                        <span className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Game PIN</span>
                                        <span className="text-5xl font-black text-indigo-600 tracking-widest">{pin || '...'}</span>
                                    </div>

                                    <div className="flex items-center gap-2 w-full">
                                        <div className="flex-1 bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl flex items-center gap-3 text-slate-500 overflow-hidden">
                                            <LinkIcon size={16} />
                                            <span className="text-sm font-mono truncate">{joinUrl}</span>
                                        </div>
                                        <button
                                            onClick={copyLink}
                                            className="bg-indigo-50 hover:bg-indigo-100 text-indigo-600 p-3 rounded-xl transition-colors border border-indigo-200"
                                            title="Nusxa olish"
                                        >
                                            {copied ? <Check size={20} /> : <Copy size={20} />}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Control Card: Timer & Start Button */}
                        <div className="flex-1 bg-white rounded-[3rem] p-10 shadow-xl border border-slate-200 flex flex-col items-center justify-center relative overflow-hidden">
                            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                                <div className="absolute -top-20 -right-20 w-64 h-64 bg-emerald-100/50 rounded-full blur-3xl"></div>
                                <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-blue-100/50 rounded-full blur-3xl"></div>
                            </div>

                            <div className="relative z-10 flex flex-col items-center w-full max-w-lg">
                                <div className="mb-8 flex flex-col items-center">
                                    <div className="flex items-center gap-3 text-slate-400 mb-2">
                                        <Timer size={20} />
                                        <span className="font-bold text-xs uppercase tracking-widest">Global Timer (Daqiqa)</span>
                                    </div>
                                    <div className="flex items-end gap-2">
                                        <input
                                            type="number"
                                            value={customTime}
                                            onChange={(e) => setCustomTime(Number(e.target.value))}
                                            className="w-40 text-6xl font-black text-slate-800 text-center bg-transparent border-b-4 border-slate-100 focus:border-indigo-500 focus:outline-none transition-all p-2"
                                            min="1"
                                        />
                                        <span className="text-xl font-black text-slate-300 mb-4">MIN</span>
                                    </div>
                                </div>

                                <button
                                    onClick={handleStart}
                                    disabled={players.length === 0 || isStarting}
                                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-slate-200 disabled:to-slate-300 disabled:text-slate-400 text-white py-6 rounded-2xl font-black text-2xl shadow-xl shadow-blue-500/20 transition-all active:scale-95 flex items-center justify-center gap-3 group"
                                >
                                    <Play className="fill-current group-hover:scale-110 transition-transform" size={28} />
                                    <span>BOSHLASH</span>
                                </button>
                                {players.length === 0 && (
                                    <p className="mt-4 text-xs font-bold text-slate-400 uppercase tracking-widest animate-pulse">
                                        O'quvchilar kutilmoqda...
                                    </p>
                                )}
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
};

export default UnitLobby;
