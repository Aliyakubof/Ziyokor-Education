import { useEffect, useState } from 'react';
import { socket } from '../socket';

export default function PlayerGame() {
    const [view, setView] = useState<'WAITING' | 'PLAYING' | 'ANSWERED' | 'FINISHED'>('WAITING');
    const [rank, setRank] = useState<any>(null);

    useEffect(() => {
        socket.on('game-started', () => {
            setView('WAITING'); // Waiting for question
        });

        socket.on('question-start', () => {
            setView('PLAYING');
        });

        socket.on('game-over', (leaderboard) => {
            setView('FINISHED');
            // Find my rank
            const myId = socket.id;
            const myRank = leaderboard.findIndex((p: any) => p.id === myId) + 1;
            const myScore = leaderboard.find((p: any) => p.id === myId)?.score || 0;
            setRank({ rank: myRank, score: myScore });
        });

        return () => {
            socket.off('game-started');
            socket.off('question-start');
            socket.off('game-over');
        };
    }, []);

    const sendAnswer = (idx: number) => {
        const pin = localStorage.getItem('kahoot-pin');
        if (!pin) return;
        socket.emit('player-answer', { pin, answerIndex: idx });
        setView('ANSWERED');
    };

    // We need to know the PIN. Ideally stored in context. 
    // For now, I'll rely on the server knowing which room the socket is in based on connection.
    // Actually, server code relies on `pin` payload in `player-answer`.
    // I need to store PIN in PlayerJoin and pass it here.
    // I'll fix this by using a simple global variable or url param if I redirect.
    // Since I just navigated, state is lost. I should have passed state in navigate.

    // FIX: socket.rooms contains the pin on server side? 
    // My server code: socket.on('player-answer', ({ pin ... })
    // I must send PIN.

    // Let's assume we modify PlayerJoin to save PIN to localStorage.

    if (view === 'FINISHED') {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-brand-purple text-white p-4">
                <div className="text-4xl font-bold mb-4">Quiz Finished!</div>
                <div className="bg-white text-black p-8 rounded-xl shadow-xl text-center">
                    <div className="text-2xl">You finished</div>
                    <div className="text-8xl font-black">{rank?.rank}{rank?.rank === 1 ? 'st' : rank?.rank === 2 ? 'nd' : rank?.rank === 3 ? 'rd' : 'th'}</div>
                    <div className="text-xl mt-4">Score: {rank?.score}</div>
                </div>
            </div>
        );
    }

    if (view === 'WAITING' || view === 'ANSWERED') {
        return (
            <div className="flex items-center justify-center min-h-screen bg-brand-dark">
                <div className="text-white text-2xl animate-pulse font-bold">
                    {view === 'WAITING' ? "Get Ready!" : "Answer Sent!"}
                    <br />
                    <span className="text-sm font-normal">Waiting for host...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen grid grid-cols-2 grid-rows-2">
            <button onClick={() => sendAnswer(0)} className="bg-kahoot-red flex items-center justify-center hover:brightness-110 active:scale-95 transition">
                <div className="w-12 h-12 bg-white skew-x-12 rotate-45 transform"></div>
            </button>
            <button onClick={() => sendAnswer(1)} className="bg-kahoot-blue flex items-center justify-center hover:brightness-110 active:scale-95 transition">
                <div className="w-12 h-12 bg-white rotate-45 transform"></div>
            </button>
            <button onClick={() => sendAnswer(2)} className="bg-kahoot-yellow flex items-center justify-center hover:brightness-110 active:scale-95 transition">
                <div className="w-12 h-12 bg-white rounded-full"></div>
            </button>
            <button onClick={() => sendAnswer(3)} className="bg-kahoot-green flex items-center justify-center hover:brightness-110 active:scale-95 transition">
                <div className="w-12 h-12 bg-white transform rotate-12"></div>
            </button>
        </div>
    );
}
