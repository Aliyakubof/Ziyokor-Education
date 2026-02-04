import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { socket } from '../socket';

interface QuestionData {
    text: string;
    options: string[];
    timeLimit: number;
    questionIndex: number;
    totalQuestions: number;
    correctIndex: number;
}

export default function HostGame() {
    const { pin } = useParams();
    const [searchParams] = useSearchParams();
    const [question, setQuestion] = useState<QuestionData | null>(null);
    const [answersCount, setAnswersCount] = useState(0);
    const [timeLeft, setTimeLeft] = useState(0);
    const [showResult, setShowResult] = useState(false);
    const [leaderboard, setLeaderboard] = useState<any[] | null>(null);

    useEffect(() => {
        // If redirected from Lobby with ?start=true, trigger start
        if (searchParams.get('start') === 'true') {
            socket.emit('host-start-game', pin);
        }

        socket.on('question-new', (q) => {
            setQuestion(q);
            setTimeLeft(q.timeLimit);
            setAnswersCount(0);
            setShowResult(false);
        });

        socket.on('answers-count', (count) => {
            setAnswersCount(count);
        });

        socket.on('game-over', (finalLeaderboard) => {
            setLeaderboard(finalLeaderboard);
        });

        return () => {
            socket.off('question-new');
            socket.off('answers-count');
            socket.off('game-over');
        };
    }, [pin, searchParams]);

    // Timer
    useEffect(() => {
        if (timeLeft > 0 && !showResult && !leaderboard) {
            const timer = setInterval(() => setTimeLeft(t => t - 1), 1000);
            return () => clearInterval(timer);
        } else if (timeLeft === 0 && !showResult && question && !leaderboard) {
            // Time up
            // In a real app, server sends time-up. Here client is master for display?
            // No, let's keep it manual flow or just show result.
            setShowResult(true);
        }
    }, [timeLeft, showResult, question, leaderboard]);

    const nextQuestion = () => {
        socket.emit('host-next-question', pin);
    };

    if (leaderboard) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-brand-dark p-8">
                <h1 className="text-6xl font-black mb-12 text-white">Podium</h1>
                <div className="flex items-end gap-4">
                    {leaderboard[1] && (
                        <div className="flex flex-col items-center">
                            <div className="text-2xl font-bold mb-2 text-white">{leaderboard[1].name}</div>
                            <div className="bg-gray-400 w-32 h-48 rounded-t-lg flex items-center justify-center text-4xl font-black text-white shadow-xl">2</div>
                            <div className="text-xl font-bold mt-2 text-gray-300">{leaderboard[1].score} pts</div>
                        </div>
                    )}
                    {leaderboard[0] && (
                        <div className="flex flex-col items-center z-10">
                            <div className="text-4xl font-bold mb-4 text-white animate-bounce">{leaderboard[0].name}</div>
                            <div className="bg-yellow-400 w-40 h-64 rounded-t-lg flex items-center justify-center text-6xl font-black text-white shadow-2xl relative overflow-hidden">
                                1
                                <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                            </div>
                            <div className="text-2xl font-bold mt-4 text-yellow-400">{leaderboard[0].score} pts</div>
                        </div>
                    )}
                    {leaderboard[2] && (
                        <div className="flex flex-col items-center">
                            <div className="text-2xl font-bold mb-2 text-white">{leaderboard[2].name}</div>
                            <div className="bg-orange-700 w-32 h-32 rounded-t-lg flex items-center justify-center text-4xl font-black text-white shadow-xl">3</div>
                            <div className="text-xl font-bold mt-2 text-orange-400">{leaderboard[2].score} pts</div>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    if (!question) return <div className="text-white text-center mt-20 text-2xl">Loading...</div>;

    return (
        <div className="flex flex-col h-screen bg-gray-100">
            {/* Header */}
            <div className="bg-white p-6 shadow flex justify-between items-center">
                <div className="text-gray-500 font-bold text-xl">{question.questionIndex} / {question.totalQuestions}</div>
                <h2 className="text-3xl font-black text-center flex-1">{question.text}</h2>
                <div className="bg-brand-purple text-white rounded-full w-16 h-16 flex items-center justify-center text-2xl font-bold">
                    {timeLeft}
                </div>
            </div>

            {/* Main Area */}
            <div className="flex-1 flex items-center justify-center relative p-8">
                <div className="absolute left-10 top-1/2 -translate-y-1/2 bg-brand-dark text-white p-6 rounded-xl text-center shadow-xl">
                    <div className="text-5xl font-black mb-2">{answersCount}</div>
                    <div className="text-lg uppercase tracking-widest font-bold">Answers</div>
                </div>

                {showResult && (
                    <button onClick={nextQuestion} className="z-50 bg-brand-purple text-white px-8 py-4 rounded-xl text-2xl font-bold shadow-2xl hover:scale-105 transition animate-pulse">
                        Next Question
                    </button>
                )}
            </div>

            {/* Options */}
            <div className="grid grid-cols-2 h-1/3 text-white text-2xl font-bold">
                {question.options.map((opt, i) => (
                    <div key={i} className={`
                flex items-center justify-center p-8 transition-opacity duration-500
                ${i === 0 ? 'bg-kahoot-red' : i === 1 ? 'bg-kahoot-blue' : i === 2 ? 'bg-kahoot-yellow' : 'bg-kahoot-green'}
                ${showResult ? (i === question.correctIndex ? 'opacity-100 scale-105 shadow-2xl z-10' : 'opacity-20 scale-95') : 'opacity-100'}
             `}>
                        {/* Shapes */}
                        <span className="mr-4 drop-shadow-md">
                            {i === 0 && '▲'} {i === 1 && '◆'} {i === 2 && '●'} {i === 3 && '■'}
                        </span>
                        <span className="drop-shadow-md">{opt}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
