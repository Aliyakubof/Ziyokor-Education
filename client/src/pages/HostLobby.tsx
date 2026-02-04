import QRCode from 'react-qr-code';
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, Play } from 'lucide-react';
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
        <div className="min-h-screen p-8 relative overflow-hidden">
            <div className="max-w-7xl mx-auto flex flex-col h-full">
                <div className="flex justify-between items-center mb-12">
                    <button
                        onClick={() => navigate('/')}
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
                    {/* Left: QR and PIN */}
                    <div className="lg:col-span-2 space-y-8">
                        <section className="glass rounded-[3rem] p-10 flex flex-col items-center text-center relative overflow-hidden border-slate-700/30">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>

                            <h2 className="text-3xl font-black text-white mb-8 tracking-tight">O'yinga qo'shiling</h2>

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
                                    <span className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em] mb-1">O'yin kodi (PIN)</span>
                                    <span className="text-6xl font-black tracking-[0.2em] text-white text-glow">{pin || '......'}</span>
                                </div>
                            </div>
                        </section>

                        <section className="glass p-8 rounded-[2.5rem] border-slate-700/30">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="bg-indigo-500/10 p-3 rounded-2xl text-indigo-400">
                                        <Users size={24} />
                                    </div>
                                    <div className="text-xl font-black text-white">{players.length} ta o'yinchi</div>
                                </div>

                                <button
                                    onClick={startGame}
                                    disabled={players.length === 0}
                                    className="px-12 py-5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-600 text-white rounded-2xl font-black text-xl transition-all shadow-xl shadow-blue-500/20 btn-premium flex items-center gap-3"
                                >
                                    <span>BOSHLASH</span>
                                    <Play size={20} className="fill-current" />
                                </button>
                            </div>
                        </section>
                    </div>

                    {/* Right: Players List */}
                    <div className="glass rounded-[3rem] p-8 flex flex-col border-slate-700/30 max-h-[calc(100vh-160px)]">
                        <h3 className="text-xl font-black text-white mb-8 tracking-tight">O'yinchilar</h3>

                        <div className="flex-1 space-y-3 overflow-y-auto pr-2 custom-scrollbar">
                            {players.map((p) => (
                                <div key={p.id} className="glass-blue border-transparent p-4 rounded-2xl flex items-center gap-4 animate-float">
                                    <div className="w-2 h-2 bg-emerald-500 rounded-full shadow-lg shadow-emerald-500/20"></div>
                                    <span className="font-bold text-white tracking-tight">{p.name}</span>
                                </div>
                            ))}

                            {players.length === 0 && (
                                <div className="h-64 flex flex-col items-center justify-center text-slate-700 text-center gap-4">
                                    <Users size={32} className="opacity-10" />
                                    <p className="text-xs font-bold uppercase tracking-widest leading-relaxed">O'yinchilar qo'shilishini kuting...</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
