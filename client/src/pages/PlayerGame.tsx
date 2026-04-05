import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { socket } from '../socket';
import { Clock, CheckCircle2, XCircle, Info, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sword, Zap, Trophy, Crown } from 'lucide-react';

interface QuestionData {
    info?: string;
    text: string;
    options: string[];
    timeLimit: number;
    questionIndex: number;
    totalQuestions: number;
    correctIndex: number;
    type?: 'multiple-choice' | 'text-input' | 'true-false' | 'fill-blank' | 'find-mistake' | 'rewrite' | 'word-box' | 'info-slide' | 'matching' | 'vocabulary' | 'inline-blank' | 'inline-choice';
    acceptedAnswers?: string[];
}

const normalizeAnswer = (val: string | number): string => {
    if (val === null || val === undefined) return "";
    let s = String(val).toLowerCase();

    // Normalize various Uzbek/English apostrophes to '
    s = s.replace(/[ʻ’‘`]/g, "'");
    
    // Replace anything that is NOT a letter or a number or an apostrophe with a space
    // We use \p{L} for any Unicode letter and \p{N} for any number
    s = s.replace(/[^\p{L}\p{N}']/gu, " ");
    
    // Normalize multiple spaces and ensure trimmed
    s = s.replace(/\s+/g, " ");
    return s.trim();
};

const countCorrectParts = (studentAns: string | number, acceptedAnswers: string[]): number => {
    if (!studentAns) return 0;
    const sParts = String(studentAns).split('+').map(p => normalizeAnswer(p));
    const aParts = acceptedAnswers.map(p => normalizeAnswer(p));
    let count = 0;
    for (let i = 0; i < aParts.length; i++) {
        if (sParts[i] === aParts[i]) {
            count++;
        }
    }
    return count;
};

export default function PlayerGame() {
    const [view, setView] = useState<'WAITING' | 'PLAYING' | 'ANSWERED' | 'FINISHED' | 'UNIT_SUMMARY' | 'UNIT_REVIEW'>('WAITING');
    const viewRef = useRef(view);
    useEffect(() => { viewRef.current = view; }, [view]);

    const [question, setQuestion] = useState<QuestionData | null>(null);
    const [textAnswer, setTextAnswer] = useState('');
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    const [isConnected, setIsConnected] = useState(socket.connected);

    // Unit Quiz Specific States
    const [isUnitMode, setIsUnitMode] = useState(false);
    const [unitQuestions, setUnitQuestions] = useState<QuestionData[]>([]);
    const [currentUnitIndex, setCurrentUnitIndex] = useState(0);
    const currentUnitIndexRef = useRef(currentUnitIndex);

    useEffect(() => { currentUnitIndexRef.current = currentUnitIndex; }, [currentUnitIndex]);

    useEffect(() => {
        if (isUnitMode) {
            const pin = localStorage.getItem('kahoot-pin');
            if (pin) localStorage.setItem(`unit-index-${pin}`, String(currentUnitIndex));
        }
    }, [currentUnitIndex, isUnitMode]);
    const [unitAnswers, setUnitAnswers] = useState<Record<number, any>>({});
    const [unitCorrectAnswers, setUnitCorrectAnswers] = useState<any[]>([]);
    const [unitAIFeedback, setUnitAIFeedback] = useState<Record<number, string>>({});
    const [quizTitle, setQuizTitle] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [playerAvatar, setPlayerAvatar] = useState<string | null>(null);
    const [isDuel, setIsDuel] = useState(false);
    const [duelSync, setDuelSync] = useState<any[]>([]);
    const [battleEffects, setBattleEffects] = useState<any[]>([]);
    const [isShaking, setIsShaking] = useState(false);
    const [isUnloading, setIsUnloading] = useState(false);
    const [isBlockedByCheat, setIsBlockedByCheat] = useState(false);

    const pinFromStore = localStorage.getItem('kahoot-pin');
    const idFromStore = localStorage.getItem('student-id');

    // Initial load from PIN-specific localStorage
    useEffect(() => {
        if (pinFromStore) {
            try {
                const saved = localStorage.getItem(`unit-answers-${pinFromStore}`);
                if (saved) {
                    const parsed = JSON.parse(saved);
                    setUnitAnswers(parsed);
                } else {
                    setUnitAnswers({});
                }
            } catch (e) {
                console.error('Error loading unit answers:', e);
                setUnitAnswers({});
            }
        }
    }, [pinFromStore]);
    
    useEffect(() => {
        if (idFromStore) {
            const cached = localStorage.getItem(`stats_${idFromStore}`);
            if (cached) {
                try {
                    const data = JSON.parse(cached);
                    if (data.avatarUrl) {
                        setPlayerAvatar(data.avatarUrl.startsWith('/uploads') ? `${import.meta.env.VITE_BACKEND_URL}${data.avatarUrl}` : data.avatarUrl);
                    }
                } catch (e) {
                    console.error('Error parsing cached stats:', e);
                }
            }
        }
    }, [idFromStore]);

    useEffect(() => {
        const onConnect = () => {
            setIsConnected(true);
            const pin = localStorage.getItem('kahoot-pin');
            const studentId = localStorage.getItem('student-id');
            if (pin) {
                console.log('[Socket] Reconnected, requesting game status for pin:', pin);
                socket.emit('player-get-status', { pin, studentId: studentId || undefined });
            }
        };
        const onDisconnect = () => setIsConnected(false);

        socket.on('connect', onConnect);
        socket.on('disconnect', onDisconnect);

        socket.on('game-started', (data: any) => {
            setView('WAITING');
            if (data?.title) setQuizTitle(data.title);
        });

        socket.on('unit-finished', (data: { score: number }) => {
            setIsSubmitting(false);
            setView('FINISHED');
            console.log('[Unit] Finished successfully:', data);
        });
        socket.on('unit-game-started', (data: { questions: any, endTime: number, title: string, createdAt?: number, isDuel?: boolean }) => {
            console.log('[Unit] Game started event received:', data);

            let questions = data?.questions;
            if (typeof questions === 'string') {
                try { questions = JSON.parse(questions); } catch (e) { questions = []; }
            }

            if (!questions || !Array.isArray(questions) || questions.length === 0) {
                console.error('Invalid questions data received for unit game:', data);
                setError('Savollar yuklanishida xatolik yuz berdi.');
                setView('WAITING');
                return;
            }

            const pin = localStorage.getItem('kahoot-pin');

            // SESSION RESET LOGIC
            if (pin && data.createdAt) {
                const lastCreatedAt = localStorage.getItem(`unit-created-at-${pin}`);
                if (lastCreatedAt && lastCreatedAt !== String(data.createdAt)) {
                    console.log('[Session] New session detected. Resetting local answers.');
                    localStorage.removeItem(`unit-answers-${pin}`);
                    localStorage.removeItem(`unit-index-${pin}`);
                    setUnitAnswers({});
                }
                localStorage.setItem(`unit-created-at-${pin}`, String(data.createdAt));
            }

            setIsUnitMode(true);
            setUnitQuestions(questions);
            setQuizTitle(data.title);

            // Reload answers after possible reset
            const currentPin = localStorage.getItem('kahoot-pin');
            const savedAnswersRaw = currentPin ? localStorage.getItem(`unit-answers-${currentPin}`) : null;
            const savedAnswers = savedAnswersRaw ? JSON.parse(savedAnswersRaw) : {};
            setUnitAnswers(savedAnswers);

            // Sync answers back to the server
            if (currentPin && Object.keys(savedAnswers).length > 0) {
                socket.emit('player-sync-answers', { pin: currentPin, answers: savedAnswers });
            }

            // Determine where to place the user
            const savedIndexRaw = currentPin ? localStorage.getItem(`unit-index-${currentPin}`) : null;
            const savedIndex = savedIndexRaw !== null ? parseInt(savedIndexRaw) : -1;

            const firstUnanswered = questions.findIndex((_: any, idx: number) => savedAnswers[idx] === undefined);

            if (viewRef.current !== 'WAITING' && viewRef.current !== 'FINISHED') {
                // Already playing (socket reconnect without full page reload)
                // Preserve current view and index using ref to avoid stale closure
                const preservedIndex = currentUnitIndexRef.current;
                setCurrentUnitIndex(preservedIndex);
                setQuestion(questions[preservedIndex]);
            } else {
                // Initial load
                if (savedIndex !== -1 && savedIndex < questions.length) {
                    setCurrentUnitIndex(savedIndex);
                    setQuestion(questions[savedIndex]);
                    setView('PLAYING');
                } else if (firstUnanswered === -1) {
                    // All answered
                    setView('UNIT_SUMMARY');
                    setCurrentUnitIndex(0); // fallback index
                    setQuestion(questions[0]);
                } else {
                    setCurrentUnitIndex(firstUnanswered);
                    setQuestion(questions[firstUnanswered]);
                    setView('PLAYING');
                }
            }
            if (data.isDuel) setIsDuel(true);
        });

        socket.on('duel-started', () => {
            setIsDuel(true);
            setIsUnitMode(true);
        });

        socket.on('duel-status-sync', (players: any[]) => {
            setDuelSync(players);
        });

        socket.on('duel-damage', (data: { targetId: string, damage: number, attackerId: string, combo: number }) => {
            const id = Math.random().toString(36).substring(7);
            setBattleEffects(prev => [...prev.slice(-5), { id, ...data, type: 'DAMAGE' }]);
            
            // Screen shake on damage
            const myId = localStorage.getItem('student-id') || socket.id;
            if (data.targetId === myId) {
                setIsShaking(true);
                setTimeout(() => setIsShaking(false), 500);
            }

            setTimeout(() => {
                setBattleEffects(prev => prev.filter(e => e.id !== id));
            }, 2000);
        });

        socket.on('duel-effect', (data: { type: string, playerId: string }) => {
            const id = Math.random().toString(36).substring(7);
            setBattleEffects(prev => [...prev.slice(-5), { id, ...data, type: 'SPECIAL' }]);
            setTimeout(() => {
                setBattleEffects(prev => prev.filter(e => e.id !== id));
            }, 2000);
        });

        socket.on('duel-ko', (data: { winnerId: string, loserId: string }) => {
            const id = 'ko-' + Math.random().toString(36).substring(7);
            setBattleEffects(prev => [...prev, { id, ...data, type: 'KO' }]);
        });

        socket.on('question-start', (q) => {
            setQuestion(q);
            setView('PLAYING');
            setTextAnswer('');
        });

        socket.on('unit-finished', (data: { score?: number, correctAnswers?: any[], aiFeedbackMap?: Record<number, string>, hidden?: boolean }) => {
            setIsSubmitting(false);
            const pin = localStorage.getItem('kahoot-pin');
            if (pin) {
                localStorage.removeItem(`unit-answers-${pin}`);
                localStorage.removeItem(`unit-index-${pin}`);
            }
            localStorage.removeItem('unit-answers'); // cleanup legacy
            setView('FINISHED');

            if (data.hidden) {
                setUnitCorrectAnswers([]);
                setUnitAIFeedback({});
            } else {
                setUnitCorrectAnswers(data.correctAnswers || []);
                setUnitAIFeedback(data.aiFeedbackMap || {});
            }
        });

        socket.on('error', (msg: string) => {
            console.error('[Socket Error]:', msg);
            setIsSubmitting(false);
            if (msg.includes('O\'yin topilmadi') || msg.includes('pin')) {
                setError(msg);
            }
        });

        socket.on('game-over', () => {
            setView('FINISHED');
        });

        socket.on('player-accepted', () => {
            console.log('[Anti-Cheat] Teacher accepted you. Resuming...');
            setIsBlockedByCheat(false);
        });

        socket.on('player-update', (players: any[]) => {
            const myId = localStorage.getItem('student-id') || socket.id;
            const me = players.find(p => p.id === myId);
            if (me) {
                if (me.isCheater) setIsBlockedByCheat(true);
                else setIsBlockedByCheat(false);
            }
        });

        socket.on('player-update-delta', (changedPlayers: any[]) => {
            const myId = localStorage.getItem('student-id') || socket.id;
            const me = changedPlayers.find(p => p.id === myId);
            if (me) {
                if (me.isCheater !== undefined) {
                    if (me.isCheater) setIsBlockedByCheat(true);
                    else setIsBlockedByCheat(false);
                }
            }
        });

        // Request status once on mount
        if (pinFromStore) {
            console.log('[Init] Requesting game status for pin:', pinFromStore);
            socket.emit('player-get-status', { pin: pinFromStore, studentId: idFromStore || undefined });
        }

        // Anti-Cheat listener
        let cheatTimeout: any = null;
        let wakeLock: any = null;

        const requestWakeLock = async () => {
            try {
                if ('wakeLock' in navigator && (navigator as any).wakeLock) {
                    wakeLock = await (navigator as any).wakeLock.request('screen');
                }
            } catch (err) {
                console.error('WakeLock API failed:', err);
            }
        };

        if (viewRef.current === 'PLAYING' || viewRef.current === 'WAITING') {
            requestWakeLock();
        }

        const handleVisibilityChange = () => {
            const pin = localStorage.getItem('kahoot-pin');
            const studentId = localStorage.getItem('student-id') || socket.id;
            
            if (document.hidden && !isUnloading && viewRef.current === 'PLAYING') {
                if (pin && studentId) {
                    // Trigger immediately as requested
                    socket.emit('student-status-update', { pin, studentId, status: 'Cheating' });
                }
            } else if (!document.hidden && viewRef.current === 'PLAYING') {
                if (cheatTimeout) {
                    clearTimeout(cheatTimeout);
                    cheatTimeout = null;
                }
                if (pin && studentId) {
                    socket.emit('student-status-update', { pin, studentId, status: 'Online' });
                }
                requestWakeLock();
            }
        };

        const handleBeforeUnload = () => {
            setIsUnloading(true);
            if (wakeLock && typeof wakeLock.release === 'function') {
                wakeLock.release().catch(console.error);
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            socket.off('connect', onConnect);
            socket.off('disconnect', onDisconnect);
            socket.off('game-started');
            socket.off('unit-game-started');
            socket.off('question-start');
            socket.off('unit-finished');
            socket.off('game-over');
            socket.off('duel-status-sync');
            socket.off('duel-damage');
            socket.off('duel-effect');
            socket.off('duel-ko');
            socket.off('player-accepted');
            socket.off('player-update');
            socket.off('player-update-delta');
            socket.off('error');
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [isUnloading]);

    const saveUnitAnswer = (val: number | string) => {
        const newAnswers = { ...unitAnswers, [currentUnitIndex]: val };
        setUnitAnswers(newAnswers);

        const pin = localStorage.getItem('kahoot-pin');
        if (pin) {
            localStorage.setItem(`unit-answers-${pin}`, JSON.stringify(newAnswers));

            socket.emit('player-answer',
                { pin, answer: val, questionIndex: currentUnitIndex },
                () => {
                    // Ack handled
                }
            );
        }
    };

    const goToQuestion = (index: number) => {
        setCurrentUnitIndex(index);
        const nextQ = unitQuestions[index];
        setQuestion(nextQ);
        setTextAnswer(unitAnswers[index] || '');
        setView('PLAYING');
    };

    const getCurrentTopic = () => {
        if (!isUnitMode || !unitQuestions.length) return null;
        for (let i = currentUnitIndex; i >= 0; i--) {
            if (unitQuestions[i].type === 'info-slide') return unitQuestions[i].text;
        }
        return null;
    };

    const finalizeSubmission = () => {
        const pin = localStorage.getItem('kahoot-pin');
        if (pin) {
            setIsSubmitting(true);
            socket.emit('unit-player-finish', { pin });
        }
    };

    const sendAnswer = (val: number | string) => {
        if (isUnitMode) {
            saveUnitAnswer(val);
            return;
        }
        const pin = localStorage.getItem('kahoot-pin');
        if (!pin) return;
        socket.emit('player-answer', { pin, answer: val });
        setView('ANSWERED');
    };

    if (view === 'FINISHED') {
        const myId = localStorage.getItem('student-id') || socket.id;
        const me = duelSync.find(p => p.id === myId);
        const opponent = duelSync.find(p => p.id !== myId);
        const amIWinner = me && opponent ? me.hp > opponent.hp : true;

        if (isDuel) {
            return (
                <div className="flex flex-col items-center justify-center min-h-screen p-6 relative overflow-hidden" style={{ backgroundColor: '#0f172a' }}>
                    {/* Background decor */}
                    <div className="absolute inset-0 z-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at center, #f43f5e 0%, transparent 70%)' }}></div>
                    
                    <motion.div 
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="relative z-10 rounded-[3.5rem] p-10 text-center max-w-xl w-full shadow-2xl border-4 backdrop-blur-xl transition-colors" 
                        style={{ backgroundColor: 'rgba(30, 41, 59, 0.7)', borderColor: amIWinner ? '#fbbf24' : '#f43f5e' }}
                    >
                        <div className={`w-32 h-32 ${amIWinner ? 'bg-amber-500 shadow-amber-500/50' : 'bg-rose-500 shadow-rose-500/50'} rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 shadow-2xl animate-bounce`}>
                            {amIWinner ? <Trophy className="text-white" size={64} /> : <XCircle className="text-white" size={64} />}
                        </div>
                        
                        <h1 className="text-5xl font-black mb-2 text-white italic tracking-tighter">
                            {amIWinner ? "G'ALABA!" : "MAG'LUBIYAT"}
                        </h1>
                        <p className="font-black text-xs uppercase tracking-[0.3em] mb-10 opacity-60 text-white">Duel yakunlandi</p>

                        <div className="grid grid-cols-2 gap-4 mb-10">
                            <div className="p-6 rounded-3xl bg-white/5 border border-white/10">
                                <p className="text-[10px] font-black uppercase opacity-40 text-white mb-1">SIZNING BALLINGIZ</p>
                                <p className="text-3xl font-black text-amber-400">{me?.score || 0}</p>
                            </div>
                            <div className="p-6 rounded-3xl bg-white/5 border border-white/10">
                                <p className="text-[10px] font-black uppercase opacity-40 text-white mb-1">RAQIB BALLI</p>
                                <p className="text-3xl font-black text-rose-400">{opponent?.score || 0}</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <button onClick={() => setView('UNIT_SUMMARY')} className="w-full bg-white/10 hover:bg-white/20 text-white font-black py-4 rounded-2xl transition-all border border-white/10">NATIJALARNI KO'RISH</button>
                            <button onClick={() => navigate('/student/dashboard', { replace: true })} className="w-full text-white font-black py-4 rounded-2xl shadow-xl transition-transform active:scale-95" style={{ backgroundColor: amIWinner ? '#f59e0b' : '#e11d48' }}>DASHBOARDGA QAYTISH</button>
                        </div>
                    </motion.div>
                </div>
            );
        }

        if (isUnitMode) {
            setTimeout(() => { navigate('/student/dashboard', { replace: true }); }, 3000); // Increased from 100ms
            return (
                <div className="flex flex-col items-center justify-center min-h-screen p-6 transition-colors" style={{ backgroundColor: 'var(--bg-color)' }}>
                    <motion.div 
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="text-center"
                    >
                        <div className="w-20 h-20 border-4 border-primary-color border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
                        <h2 className="text-2xl font-black" style={{ color: 'var(--text-color)' }}>Natijalar yuborilmoqda...</h2>
                    </motion.div>
                </div>
            );
        }

        return (
            <div className="flex flex-col items-center justify-center min-h-screen p-6 transition-colors" style={{ backgroundColor: 'var(--bg-color)' }}>
                <div className="rounded-[3rem] p-10 text-center max-w-md w-full shadow-xl border transition-colors" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
                    <div className="w-24 h-24 bg-gradient-to-tr from-emerald-400 to-teal-500 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-xl">
                        <CheckCircle2 className="text-white" size={48} />
                    </div>
                    <h1 className="text-4xl font-black mb-2" style={{ color: 'var(--text-color)' }}>Test Yakunlandi!</h1>
                    <p className="font-bold text-xs uppercase tracking-widest mb-10 opacity-50" style={{ color: 'var(--text-color)' }}>Muvaffaqiyatli topshirildi</p>
                    <div className="mb-10 border rounded-[2rem] px-8 py-10 transition-colors" style={{ backgroundColor: 'color-mix(in srgb, var(--primary-color), transparent 90%)', borderColor: 'var(--border-color)' }}>
                        <Info className="mx-auto mb-4" size={24} style={{ color: 'var(--primary-color)' }} />
                        <p className="font-bold" style={{ color: 'var(--text-color)' }}>Natijalar o'qituvchingizga yuborildi.</p>
                    </div>
                    <button onClick={() => navigate('/student/dashboard', { replace: true })} className="w-full text-white font-black py-4 rounded-2xl shadow-lg transition-transform active:scale-95" style={{ backgroundColor: 'var(--primary-color)' }}>ASOSIY MENYUGA QAYTISH</button>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center transition-colors" style={{ backgroundColor: 'var(--bg-color)' }}>
                <div className="rounded-[3rem] p-10 text-center max-w-md w-full shadow-xl border transition-colors" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
                    <div className="w-24 h-24 bg-red-100 rounded-[2rem] flex items-center justify-center mx-auto mb-8 animate-bounce">
                        <XCircle className="text-red-500" size={48} />
                    </div>
                    <h2 className="text-3xl font-black mb-2" style={{ color: 'var(--text-color)' }}>Xatolik</h2>
                    <p className="font-medium mb-10 opacity-60" style={{ color: 'var(--text-color)' }}>{error}</p>
                    <button onClick={() => window.location.reload()} className="w-full text-white font-black py-4 rounded-2xl mb-4 shadow-lg" style={{ backgroundColor: 'var(--primary-color)' }}>QAYTADAN URINISH</button>
                    <button onClick={() => navigate('/student/dashboard', { replace: true })} className="w-full font-bold text-xs uppercase tracking-widest opacity-40" style={{ color: 'var(--text-color)' }}>DASHBOARDGA QAYTISH</button>
                </div>
            </div>
        );
    }

    if (!isConnected) {
        return (
            <div className="fixed inset-0 bg-black/80 z-50 flex flex-col items-center justify-center p-6 text-center backdrop-blur-sm text-white">
                <div className="w-20 h-20 border-4 border-white/20 border-t-white rounded-full animate-spin mb-6"></div>
                <h2 className="text-2xl font-black">Aloqa uzildi</h2>
                <p>Internet bilan bog'lanish qayta tiklanmoqda...</p>
            </div>
        );
    }

    if (view === 'WAITING' || (view === 'ANSWERED' && !isUnitMode)) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen p-6 transition-colors" style={{ backgroundColor: 'var(--bg-color)' }}>
                <div className="flex flex-col items-center gap-8">
                    <div className="relative">
                        <div className="w-32 h-32 border-4 border-slate-200 border-t-blue-500 rounded-full animate-spin"></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                            {playerAvatar ? (
                                <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white shadow-xl">
                                    <img src={playerAvatar} alt="Avatar" className="w-full h-full object-cover" />
                                </div>
                            ) : (
                                view === 'WAITING' ? <Clock className="text-blue-500 animate-pulse" size={40} /> : <CheckCircle2 className="text-emerald-500 animate-bounce" size={40} />
                            )}
                        </div>
                    </div>
                    <div className="text-center">
                        <h2 className="text-3xl font-black mb-2" style={{ color: 'var(--text-color)' }}>
                            {view === 'WAITING' ? "Tayyor turing!" : "Javob yuborildi!"}
                        </h2>
                        <p className="font-bold text-xs uppercase tracking-[0.2em] animate-pulse opacity-50" style={{ color: 'var(--text-color)' }}>
                            {view === 'WAITING' ? "Savol yuklanmoqda..." : "Keyingi savolni kuting"}
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    if (view === 'UNIT_SUMMARY') {
        return (
            <div className="min-h-screen flex flex-col p-6 transition-colors" style={{ backgroundColor: 'var(--bg-color)' }}>
                <div className="w-full max-w-2xl mx-auto rounded-[3rem] p-8 shadow-xl border flex-1 flex flex-col transition-colors" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
                    <h2 className="text-3xl font-black mb-2 text-center" style={{ color: 'var(--text-color)' }}>Xulosa</h2>
                    <p className="font-bold text-xs uppercase tracking-widest mb-8 text-center italic opacity-40" style={{ color: 'var(--text-color)' }}>Javoblaringizni tekshiring</p>
                    <div className="flex-1 overflow-y-auto space-y-3 pr-2 scroll-hide">
                        {unitQuestions.map((q, idx) => (
                            <button key={idx} onClick={() => goToQuestion(idx)} className="w-full flex items-center justify-between p-5 rounded-2xl border transition-colors" style={{ backgroundColor: 'var(--bg-color)', borderColor: 'var(--border-color)' }}>
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black opacity-30" style={{ backgroundColor: 'var(--card-bg)', color: 'var(--text-color)' }}>{idx + 1}</div>
                                    <div className="text-left">
                                        <p className="text-sm font-bold line-clamp-1" style={{ color: 'var(--text-color)' }}>{q.text}</p>
                                        <p className="text-[10px] font-black uppercase mt-0.5">
                                            {q.type === 'info-slide' ? <span className="text-blue-400">Mavzu</span> : unitAnswers[idx] !== undefined ? <span className="text-emerald-500">Javob berilgan</span> : <span className="text-orange-400">Javobsiz</span>}
                                        </p>
                                    </div>
                                </div>
                                <div className="opacity-30" style={{ color: 'var(--text-color)' }}>→</div>
                            </button>
                        ))}
                    </div>
                    <div className="mt-8 space-y-3">
                        <button onClick={finalizeSubmission} disabled={isSubmitting} className="w-full py-6 rounded-[2rem] font-black text-2xl text-white shadow-xl" style={{ backgroundColor: 'var(--primary-color)' }}>
                            {isSubmitting ? "YUBORILMOQDA..." : "TESTNI TUGATISH"}
                        </button>
                        <button onClick={() => goToQuestion(0)} className="w-full font-bold text-xs uppercase opacity-40" style={{ color: 'var(--text-color)' }}>Savollarga qaytish</button>
                    </div>
                </div>
            </div>
        );
    }

    const renderQuestionContent = () => {
        if (!question) return null;
        const isReview = view === 'UNIT_REVIEW';
        const correctInfo = isReview ? unitCorrectAnswers[currentUnitIndex] : null;
        const playerAns = unitAnswers[currentUnitIndex] || '';

        if (question.type === 'word-box') {
            const parts = question.text.split(/\[\d+\]/);
            const placeholders = question.text.match(/\[\d+\]/g) || [];
            const currentAnswersList: string[] = (isReview ? playerAns : textAnswer)?.split('+').map((s: string) => s.trim()) || [];
            // Pad to full length
            while (currentAnswersList.length < placeholders.length) currentAnswersList.push('');
            
            const earned = countCorrectParts(playerAns, question.acceptedAnswers || []);
            const total = question.acceptedAnswers?.length || 0;
            const isAllCorrect = earned === total && total > 0;

            // Which words are already used in blanks
            const usedWords = new Set(currentAnswersList.filter(Boolean));

            const handleWordClick = (word: string) => {
                if (isReview) return;
                // Find first empty slot
                const newAns = [...currentAnswersList];
                while (newAns.length < placeholders.length) newAns.push('');
                const emptyIdx = newAns.findIndex(v => !v);
                if (emptyIdx === -1) return; // all filled
                newAns[emptyIdx] = word;
                const finalVal = newAns.join('+');
                setTextAnswer(finalVal);
                if (isUnitMode) saveUnitAnswer(finalVal);
            };

            const handleBlankClick = (idx: number) => {
                if (isReview) return;
                const newAns = [...currentAnswersList];
                newAns[idx] = '';
                const finalVal = newAns.join('+');
                setTextAnswer(finalVal);
                if (isUnitMode) saveUnitAnswer(finalVal);
            };

            return (
                <div className="w-full max-w-4xl mx-auto space-y-4">
                    <div className="rounded-[2rem] p-4 md:p-8 shadow-xl border transition-colors" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
                        {isReview && (
                            <div className={`mb-4 p-3 rounded-2xl text-center font-black text-sm ${isAllCorrect ? 'bg-emerald-50 text-emerald-600' : (earned > 0 ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600')}`}>
                                NATIJA: {earned}/{total}
                            </div>
                        )}

                        <h2 className="text-center text-sm font-bold opacity-30 italic mb-4" style={{ color: 'var(--text-color)' }}>So'zlar qutisidan to'ldiring</h2>

                        {/* Word Bank — compact & scrollable on mobile */}
                        <div className="flex flex-wrap justify-center gap-2 mb-6 p-3 rounded-2xl border-2 border-dashed transition-colors" style={{ backgroundColor: 'var(--bg-color)', borderColor: 'var(--border-color)' }}>
                            {question.options.map((opt: string, i: number) => {
                                const isUsed = usedWords.has(opt);
                                return (
                                    <motion.button
                                        key={`word-${opt}-${i}`}
                                        layoutId={`word-${opt}`}
                                        onClick={() => !isUsed && handleWordClick(opt)}
                                        disabled={isReview || isUsed}
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: isUsed ? 0.25 : 1, scale: isUsed ? 0.9 : 1 }}
                                        whileTap={{ scale: 0.92 }}
                                        className={`px-3 py-1.5 rounded-xl border-2 font-bold text-sm transition-all ${
                                            isUsed ? 'cursor-not-allowed line-through' : 'active:scale-95 cursor-pointer shadow-sm'
                                        }`}
                                        style={{ 
                                            backgroundColor: isUsed ? 'transparent' : 'var(--card-bg)', 
                                            borderColor: isUsed ? 'var(--border-color)' : 'var(--primary-color)',
                                            color: isUsed ? 'var(--text-color)' : 'var(--primary-color)'
                                        }}
                                    >
                                        {opt}
                                    </motion.button>
                                );
            })}
                        </div>

                        {/* Question text with blank slots */}
                        <div className="text-base md:text-2xl leading-loose text-center" style={{ color: 'var(--text-color)' }}>
                            {parts.map((part: string, i: number) => (
                                <span key={i}>
                                    {part}
                                    {i < parts.length - 1 && (
                                        currentAnswersList[i]
                                            ? (
                                                <motion.button
                                                    layoutId={`word-${currentAnswersList[i]}`}
                                                    onClick={() => handleBlankClick(i)}
                                                    disabled={isReview}
                                                    initial={{ scale: 0.8 }}
                                                    animate={{ scale: 1 }}
                                                    whileTap={{ scale: 0.92 }}
                                                    className={`mx-1 px-2 py-0.5 rounded-xl border-2 font-bold transition-all align-middle inline-flex items-center gap-1
                                                        ${isReview
                                                            ? (currentAnswersList[i]?.toLowerCase().trim() === question.acceptedAnswers?.[i]?.toLowerCase().trim()
                                                                ? 'bg-emerald-50 border-emerald-400 text-emerald-700'
                                                                : 'bg-red-50 border-red-400 text-red-700')
                                                            : 'active:bg-red-50 active:border-red-300 active:text-red-600'
                                                        }`}
                                                    style={{ 
                                                        backgroundColor: isReview ? '' : 'color-mix(in srgb, var(--primary-color), transparent 90%)',
                                                        borderColor: isReview ? '' : 'var(--primary-color)',
                                                        color: isReview ? '' : 'var(--primary-color)'
                                                    }}
                                                >
                                                    {currentAnswersList[i]}
                                                    {!isReview && <span className="text-xs opacity-60">✕</span>}
                                                </motion.button>
                                            ) : (
                                                <span className="mx-1 inline-block w-16 md:w-24 border-b-2 border-dashed border-slate-400 text-center text-slate-300 align-middle">
                                                    ?
                                                </span>
                                            )
                                    )}
                                </span>
                            ))}
                        </div>
                        {isReview && !isAllCorrect && (
                            <div className="mt-8 p-4 bg-indigo-50 rounded-2xl text-indigo-600 font-bold text-center">
                                To'g'ri: {question.acceptedAnswers?.join(', ')}
                            </div>
                        )}
                    </div>
                </div>
            );
        }

        if (question.type === 'matching') {
            const currentAnswersList = (isReview ? playerAns : textAnswer)?.split('+').map((s: string) => s.trim()) || [];
            const earned = countCorrectParts(playerAns, question.acceptedAnswers || []);
            const total = question.acceptedAnswers?.length || 0;
            const isAllCorrect = earned === total && total > 0;

            return (
                <div className="w-full max-w-4xl mx-auto space-y-6">
                    <div className="rounded-[2.5rem] p-8 shadow-xl border transition-colors" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
                        {isReview && (
                            <div className={`mb-6 p-4 rounded-2xl text-center font-black ${isAllCorrect ? 'bg-emerald-50 text-emerald-600' : (earned > 0 ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600')}`}>
                                NATIJA: {earned}/{total}
                            </div>
                        )}

                        <h2 className="text-center text-xl font-bold opacity-30 italic mb-8" style={{ color: 'var(--text-color)' }}>Match the items</h2>

                        <div className="space-y-4">
                            {question.options.map((opt, i) => (
                                <div key={i} className="flex items-center gap-4">
                                    <div className="flex-1 p-4 rounded-2xl font-bold border transition-colors" style={{ backgroundColor: 'var(--bg-color)', borderColor: 'var(--border-color)', color: 'var(--text-color)' }}>
                                        {opt}
                                    </div>
                                    <div className="text-slate-300">→</div>
                                    <div className="flex-1">
                                        <input
                                            type="text"
                                            value={currentAnswersList[i] || ''}
                                            readOnly={isReview}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                const newAns = [...currentAnswersList];
                                                while (newAns.length < question.options.length) newAns.push('');
                                                newAns[i] = val;
                                                const finalVal = newAns.join('+');
                                                setTextAnswer(finalVal);
                                            }}
                                            onBlur={() => isUnitMode && !isReview && saveUnitAnswer(textAnswer)}
                                            className={`w-full p-4 rounded-2xl border-2 font-bold transition-all outline-none ${isReview
                                                ? (normalizeAnswer(currentAnswersList[i]) === normalizeAnswer(question.acceptedAnswers?.[i] || '') ? 'border-emerald-200 bg-emerald-50 text-emerald-600' : 'border-red-200 bg-red-50 text-red-600')
                                                : ''
                                                }`}
                                            style={{ 
                                                backgroundColor: isReview ? '' : 'var(--card-bg)',
                                                borderColor: isReview ? '' : 'var(--border-color)',
                                                color: 'var(--text-color)'
                                            }}
                                            placeholder="Match..."
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                        {isReview && !isAllCorrect && (
                            <div className="mt-8 p-4 bg-indigo-50 rounded-2xl text-indigo-600 font-bold text-center">
                                To'g'ri tartib: {question.acceptedAnswers?.join(', ')}
                            </div>
                        )}
                    </div>
                </div>
            );
        }

        if (question.type === 'inline-blank') {
            const regex = /\[_{3,}\]/g;
            const parts = question.text.split(regex);
            const currentAnswersList = (isReview ? playerAns : textAnswer)?.split('+').map((s: string) => s.trim()) || [];
            const earned = countCorrectParts(playerAns, question.acceptedAnswers || []);
            const total = question.acceptedAnswers?.length || 0;
            const isAllCorrect = earned === total && total > 0;

            return (
                <div className="w-full max-w-4xl mx-auto rounded-[2.5rem] p-8 shadow-xl border transition-colors" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
                    {isReview && (
                        <div className={`mb-6 p-4 rounded-2xl text-center font-black ${isAllCorrect ? 'bg-emerald-50 text-emerald-600' : (earned > 0 ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600')}`}>
                            NATIJA: {earned}/{total}
                        </div>
                    )}
                    <h2 className="text-center text-xl font-bold opacity-30 italic mb-8" style={{ color: 'var(--text-color)' }}>Fill in the blanks [_______]</h2>
                    <div className="text-xl md:text-2xl leading-loose text-center" style={{ color: 'var(--text-color)' }}>
                        {parts.map((part, i) => (
                            <span key={i}>
                                {part}
                                {i < parts.length - 1 && (
                                    <input
                                        type="text"
                                        value={currentAnswersList[i] || ''}
                                        readOnly={isReview}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            const newAns = [...currentAnswersList];
                                            while (newAns.length < parts.length - 1) newAns.push('');
                                            newAns[i] = val;
                                            setTextAnswer(newAns.join('+'));
                                        }}
                                        onBlur={() => isUnitMode && !isReview && saveUnitAnswer(textAnswer)}
                                        className={`mx-2 border-b-4 bg-transparent text-center font-bold outline-none align-middle transition-all ${isReview ? (normalizeAnswer(currentAnswersList[i]) === normalizeAnswer(question.acceptedAnswers?.[i] || '') ? 'border-emerald-400 text-emerald-600' : 'border-red-400 text-red-600') : 'border-indigo-300 focus:border-indigo-600'}`}
                                        style={{ width: '120px', color: 'var(--text-color)' }}
                                        placeholder="..."
                                    />
                                )}
                            </span>
                        ))}
                    </div>
                </div>
            );
        }

        if (question.type === 'inline-choice') {
            const regex = /\[(.*?)\]/g;
            const parts = question.text.split(regex);
            const currentAnswersList = (isReview ? playerAns : textAnswer)?.split('+').map((s: string) => s.trim()) || [];
            
            return (
                <div className="w-full max-w-4xl mx-auto rounded-[2.5rem] p-8 shadow-xl border transition-colors" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
                    <h2 className="text-center text-xl font-bold opacity-30 italic mb-8" style={{ color: 'var(--text-color)' }}>Choose the correct option</h2>
                    <div className="text-xl md:text-2xl leading-loose text-center" style={{ color: 'var(--text-color)' }}>
                        {parts.map((part, i) => {
                            if (i % 2 === 0) return <span key={i}>{part}</span>;
                            
                            const idx = (i - 1) / 2;
                            const rawOptions = part.split('/').map(s => s.trim());
                            const selectedOption = currentAnswersList[idx];

                            return (
                                <span key={i} className="inline-flex flex-wrap gap-1 mx-1 align-middle">
                                    {rawOptions.map((opt, oIdx) => {
                                        const isCorrect = opt.endsWith('*');
                                        const label = isCorrect ? opt.slice(0, -1) : opt;
                                        const isSelected = selectedOption === label;
                                        const hasSelection = !!selectedOption;

                                        let backgroundColor = 'var(--bg-color)';
                                        let borderColor = 'var(--border-color)';
                                        let textColor = 'var(--text-color)';

                                        if (hasSelection) {
                                            if (isSelected) {
                                                if (isCorrect) {
                                                    backgroundColor = '#10b981'; // Emerald
                                                    borderColor = '#fbbf24'; // Yellow
                                                    textColor = 'white';
                                                } else {
                                                    backgroundColor = '#ef4444'; // Red
                                                    borderColor = '#ef4444';
                                                    textColor = 'white';
                                                }
                                            } else if (isCorrect) {
                                                // Always highlight correct answer if something was selected
                                                backgroundColor = 'rgba(16, 185, 129, 0.1)';
                                                borderColor = '#10b981';
                                                textColor = '#10b981';
                                            }
                                        }

                                        return (
                                            <button
                                                key={oIdx}
                                                disabled={hasSelection || isReview}
                                                onClick={() => {
                                                    const newAns = [...currentAnswersList];
                                                    // Ensure array is filled up to idx
                                                    while (newAns.length <= idx) newAns.push('');
                                                    newAns[idx] = label;
                                                    const finalVal = newAns.join('+');
                                                    setTextAnswer(finalVal);
                                                    if (isUnitMode) saveUnitAnswer(finalVal);
                                                }}
                                                className={`px-3 py-1 rounded-xl text-sm font-bold border-2 transition-all ${!hasSelection && !isReview ? 'hover:border-indigo-500 active:scale-95' : 'cursor-default'}`}
                                                style={{ backgroundColor, borderColor, color: textColor }}
                                            >
                                                {label}
                                            </button>
                                        );
                                    })}
                                </span>
                            );
                        })}
                    </div>
                </div>
            );
        }

        if (['text-input', 'fill-blank', 'find-mistake', 'rewrite'].includes(question.type || '')) {
            const isFillBlankMulti = question.type === 'fill-blank' && question.text.includes('[...]');
            const normalizedPlayerAns = normalizeAnswer(playerAns);
            const isCorrect = isReview && correctInfo?.acceptedAnswers?.some((a: string) => normalizeAnswer(a) === normalizedPlayerAns);

            if (isFillBlankMulti) {
                const parts = question.text.split('[...]');
                const currentAnswersList = (isReview ? playerAns : textAnswer)?.split('+').map((s: string) => s.trim()) || [];
                return (
                    <div className="w-full max-w-4xl mx-auto rounded-[2.5rem] p-8 shadow-xl border transition-colors" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
                        {isReview && <div className="mb-6 p-4 rounded-2xl bg-slate-50/10 text-center font-black" style={{ color: 'var(--text-color)' }}>{correctInfo?.acceptedAnswers?.join('+')}</div>}
                        <h2 className="text-center text-xl font-bold opacity-30 italic mb-8" style={{ color: 'var(--text-color)' }}>Fill in the blanks</h2>
                        <div className="text-xl md:text-2xl leading-loose text-center" style={{ color: 'var(--text-color)' }}>
                            {parts.map((part, i) => (
                                <span key={i}>
                                    {part}
                                    {i < parts.length - 1 && (
                                        <input type="text" value={currentAnswersList[i] || ''} readOnly={isReview} onChange={(e) => {
                                            const val = e.target.value;
                                            const newAns = [...currentAnswersList];
                                            newAns[i] = val;
                                            setTextAnswer(newAns.join('+'));
                                        }} onBlur={() => isUnitMode && !isReview && saveUnitAnswer(textAnswer)} className="mx-2 w-32 border-b-2 bg-slate-50 text-center font-bold outline-none align-middle" placeholder="..." />
                                    )}
                                </span>
                            ))}
                        </div>
                    </div>
                );
            }

            const aiFeedback = isReview ? unitAIFeedback[currentUnitIndex] : null;
            return (
                <div className="w-full max-w-2xl mx-auto rounded-[2.5rem] p-8 md:p-12 shadow-xl border transition-colors" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
                    {isReview && <div className={`mb-6 p-4 rounded-2xl text-center font-black ${isCorrect ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>{isCorrect ? "TO'G'RI!" : 'XATO!'}</div>}
                    <h2 className="text-center text-xl font-bold opacity-30 italic mb-8" style={{ color: 'var(--text-color)' }}>{question.type}</h2>
                    <div className="text-xl md:text-2xl font-bold text-center mb-10 leading-relaxed" style={{ color: 'var(--text-color)' }}>{question.text}</div>
                    <textarea rows={2} value={isReview ? (playerAns || '') : textAnswer} readOnly={isReview} onChange={(e) => {
                        const val = e.target.value;
                        setTextAnswer(val);
                        e.target.style.height = 'auto';
                        e.target.style.height = `${e.target.scrollHeight}px`;
                    }} onBlur={() => isUnitMode && !isReview && saveUnitAnswer(textAnswer.trim())} className="w-full border-2 rounded-2xl px-6 py-4 text-center text-xl font-bold mb-6 resize-none transition-colors" style={{ backgroundColor: 'var(--bg-color)', borderColor: 'var(--border-color)', color: 'var(--text-color)' }} placeholder="Javobingizni yozing..." />
                    {isReview && aiFeedback && <div className="bg-blue-50 p-4 rounded-2xl mb-4 text-sm font-bold text-blue-700">AI: {aiFeedback}</div>}
                    {isReview && !isCorrect && <div className="bg-indigo-50 p-4 rounded-2xl text-indigo-600 font-bold">To'g'ri: {correctInfo?.acceptedAnswers?.join('+')}</div>}
                </div>
            );
        }

        if (question.type === 'vocabulary') {
            const correctWord = correctInfo?.acceptedAnswers?.[0] || '';
            const isCorrect = isReview && playerAns === correctWord;
            const targetWord = question.acceptedAnswers?.[0] || '';
            const currentVal = (isReview ? playerAns : textAnswer) || '';
            const displayChars = targetWord.split('');

            return (
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full max-w-4xl mx-auto space-y-8"
                >
                    <div className="rounded-[2.5rem] p-8 md:p-12 shadow-xl border transition-colors" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
                        <div className="text-center space-y-6">
                            <h2 className="text-3xl md:text-5xl font-black leading-tight" style={{ color: 'var(--text-color)' }}>{question.text}</h2>
                        </div>
                        <div className="mt-12 flex flex-nowrap justify-start md:justify-center gap-2 w-full overflow-x-auto pb-4 scroll-hide items-center touch-pan-x">
                            {displayChars.map((char, i) => {
                                if (char === ' ') {
                                    return <div key={i} className="flex-shrink-0" style={{ width: targetWord.length > 10 ? '0.5rem' : '1.5rem' }} />;
                                }

                                const isAlphaNum = /[a-zA-Z0-9]/.test(char);
                                if (!isAlphaNum) {
                                    return <span key={i} className="text-2xl md:text-4xl font-black text-slate-400 px-1">{char}</span>;
                                }

                                const boxWidth = targetWord.length > 15 ? 'w-6 md:w-8' : targetWord.length > 10 ? 'w-8 md:w-12' : 'w-12 md:w-16';
                                const boxHeight = targetWord.length > 15 ? 'h-10 md:h-12' : targetWord.length > 10 ? 'h-12 md:h-16' : 'h-16 md:h-20';
                                const fontSize = targetWord.length > 15 ? 'text-sm md:text-xl' : targetWord.length > 10 ? 'text-lg md:text-2xl' : 'text-2xl md:text-4xl';

                                return (
                                    <motion.input 
                                        key={i} 
                                        id={`voc-box-${i}`} type="text" maxLength={1} value={currentVal[i] === ' ' ? '' : (currentVal[i] || '')}
                                        initial={{ scale: 0.8 }}
                                        animate={{ scale: 1 }}
                                        whileFocus={{ scale: 1.05, borderColor: '#6366f1' }}
                                        readOnly={isReview}
                                        autoFocus={!isReview && !displayChars.slice(0, i).some(c => /[a-zA-Z0-9]/.test(c))}
                                        autoComplete="off"
                                        onKeyDown={(e: any) => {
                                            if (e.key === 'Backspace' && (!currentVal[i] || currentVal[i] === ' ') && i > 0) {
                                                let prevIdx = i - 1;
                                                while (prevIdx >= 0 && !/[a-zA-Z0-9]/.test(targetWord[prevIdx])) prevIdx--;
                                                if (prevIdx >= 0) {
                                                    const prevBox = document.getElementById(`voc-box-${prevIdx}`) as HTMLInputElement;
                                                    prevBox?.focus();
                                                }
                                            }
                                        }}
                                        onChange={(e: any) => {
                                            let val = e.target.value.slice(-1).toLowerCase();
                                            if (!val) val = ' ';
                                            if (val !== ' ' && !/[a-z0-9]/i.test(val)) return;

                                            const newChars = currentVal.split('');
                                            while (newChars.length < targetWord.length) newChars.push(' ');
                                            displayChars.forEach((c, idx) => {
                                                if (!/[a-zA-Z0-9]/.test(c)) newChars[idx] = c;
                                            });

                                            newChars[i] = val;
                                            const finalVal = newChars.join('');
                                            setTextAnswer(finalVal);
                                            if (!isReview && isUnitMode) saveUnitAnswer(finalVal);

                                            if (val && i < targetWord.length - 1) {
                                                let nextIdx = i + 1;
                                                while (nextIdx < targetWord.length && !/[a-zA-Z0-9]/.test(targetWord[nextIdx])) nextIdx++;
                                                if (nextIdx < targetWord.length) {
                                                    const nextBox = document.getElementById(`voc-box-${nextIdx}`) as HTMLInputElement;
                                                    nextBox?.focus();
                                                }
                                            }
                                        }}
                                        className={`flex-shrink-0 ${boxWidth} ${boxHeight} ${fontSize} font-black text-center rounded-lg md:rounded-2xl border-2 transition-all outline-none uppercase shadow-sm ${isReview ? (isCorrect ? 'bg-emerald-50 border-emerald-500 text-emerald-600' : 'bg-red-50 border-red-500 text-red-600') : (currentVal[i] ? 'border-primary shadow-[0_0_15px_rgba(59,130,246,0.2)]' : 'border-white/10 focus:border-indigo-500')}`}
                                        style={{ 
                                            backgroundColor: isReview ? '' : 'var(--bg-color)',
                                            borderColor: !isReview && currentVal[i] ? 'var(--primary-color)' : '',
                                            color: isReview ? '' : 'var(--text-color)'
                                        }}
                                    />
                                );
                            })}
                        </div>
                        {isReview && !isCorrect && <div className="mt-8 p-6 rounded-3xl bg-emerald-50 text-emerald-600 text-center font-black">To'g'ri: {question.acceptedAnswers?.[0]}</div>}
                    </div>
                </motion.div>
            );
        }

        if (question.type === 'true-false') {
            const currentAns = unitAnswers[currentUnitIndex];
            const isTrueCorrect = isReview && correctInfo?.correctIndex === 0;
            const isFalseCorrect = isReview && correctInfo?.correctIndex === 1;
            return (
                <div className="flex flex-col h-full space-y-6">
                    <div className="text-xl md:text-2xl font-bold text-center leading-relaxed px-4" style={{ color: 'var(--text-color)' }}>{question.text}</div>
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <button onClick={() => !isReview && sendAnswer(0)} disabled={isReview} className={`rounded-[2rem] flex flex-col items-center justify-center p-8 transition-all shadow-xl border-4 ${isReview ? (isTrueCorrect ? 'bg-emerald-500 border-yellow-400' : currentAns === 0 ? 'bg-red-500' : 'bg-slate-200 opacity-30') : (isUnitMode && currentAns === 0 ? 'bg-blue-600 border-yellow-400 shadow-blue-500/40' : 'bg-blue-500 border-transparent shadow-blue-500/20 active:scale-95')}`}>
                            <CheckCircle2 size={48} className="text-white mb-4" />
                            <span className="text-2xl font-black text-white">TRUE</span>
                        </button>
                        <button onClick={() => !isReview && sendAnswer(1)} disabled={isReview} className={`rounded-[2rem] flex flex-col items-center justify-center p-8 transition-all shadow-xl border-4 ${isReview ? (isFalseCorrect ? 'bg-emerald-500 border-yellow-400' : currentAns === 1 ? 'bg-red-500' : 'bg-slate-200 opacity-30') : (isUnitMode && currentAns === 1 ? 'bg-red-600 border-yellow-400 shadow-red-500/40' : 'bg-red-500 border-transparent shadow-red-500/20 active:scale-95')}`}>
                            <XCircle size={48} className="text-white mb-4" />
                            <span className="text-2xl font-black text-white">FALSE</span>
                        </button>
                    </div>
                </div>
            );
        }

        if (question.type === 'info-slide') {
            return (
                <div className="flex items-center justify-center h-full">
                    <div className="w-full max-w-2xl rounded-[2.5rem] p-8 shadow-2xl border text-center relative overflow-hidden transition-colors" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
                        <div className="absolute top-0 left-0 w-full h-2" style={{ backgroundColor: 'var(--primary-color)' }}></div>
                        <Info className="mx-auto mb-6" size={32} style={{ color: 'var(--primary-color)' }} />
                        <h2 className="text-[10px] font-black uppercase tracking-[0.3em] mb-4 opacity-40" style={{ color: 'var(--text-color)' }}>Information</h2>
                        <p className="text-2xl md:text-3xl font-black leading-tight" style={{ color: 'var(--text-color)' }}>{question.text}</p>
                    </div>
                </div>
            );
        }

        // Multiple Choice / Default
        const currentAnsMCQ = unitAnswers[currentUnitIndex];
        return (
            <div className="flex flex-col h-full space-y-6">
                <div className="text-xl md:text-2xl font-bold text-center leading-relaxed px-4" style={{ color: 'var(--text-color)' }}>{question.text}</div>
                <div className="flex-1 grid grid-cols-2 gap-4">
                    {[0, 1, 2, 3].map(i => {
                        const isCorrect = isReview && correctInfo?.correctIndex === i;
                        const isWrongSelection = isReview && currentAnsMCQ === i && !isCorrect;
                        return (
                            <button key={i} onClick={() => !isReview && sendAnswer(i)} disabled={isReview} className={`border-4 rounded-3xl flex flex-col items-center justify-center p-4 transition-all shadow-xl ${isReview ? (isCorrect ? 'bg-emerald-500 border-yellow-400 text-white' : isWrongSelection ? 'bg-red-500 text-white' : 'opacity-30') : (isUnitMode && currentAnsMCQ === i ? 'border-primary' : 'border-transparent active:scale-95')}`} style={{ backgroundColor: isReview ? '' : 'var(--card-bg)', borderColor: isReview ? '' : (isUnitMode && currentAnsMCQ === i ? 'var(--primary-color)' : 'var(--border-color)') }}>
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white mb-2 ${i === 0 ? 'bg-blue-500' : i === 1 ? 'bg-emerald-500' : i === 2 ? 'bg-orange-500' : 'bg-indigo-500'}`}>
                                    <span>{i === 0 ? '▲' : i === 1 ? '◆' : i === 2 ? '●' : '■'}</span>
                                </div>
                                <span className="text-sm md:text-lg font-bold text-center leading-tight" style={{ color: 'var(--text-color)' }}>{question.options[i]}</span>
                            </button>
                        );
                    })}
                </div>
            </div>
        );
    };

    const ArenaUI = () => {
        if (!isDuel || !duelSync.length) return null;

        const myId = localStorage.getItem('student-id') || socket.id;
        const me = duelSync.find(p => p.id === myId) || { hp: 100, combo: 0, score: 0 };
        const opponent = duelSync.find(p => p.id !== myId) || { hp: 100, combo: 0, score: 0 };

        return (
            <div className="w-full max-w-4xl mx-auto mb-8 relative">
                {/* Battle Effects Layer */}
                <div className="absolute inset-0 pointer-events-none z-50">
                    <AnimatePresence>
                        {battleEffects.map(effect => (
                            <motion.div
                                key={effect.id}
                                initial={{ opacity: 0, y: 0, scale: 0.5 }}
                                animate={{ opacity: 1, y: -100, scale: 1.5 }}
                                exit={{ opacity: 0 }}
                                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                            >
                                {effect.type === 'DAMAGE' && (
                                    <span className={`text-5xl font-black italic drop-shadow-2xl ${effect.targetId === myId ? 'text-red-500' : 'text-yellow-400'}`}>
                                        -{effect.damage}
                                    </span>
                                )}
                                {effect.type === 'SPECIAL' && (
                                    <div className="flex flex-col items-center">
                                        <Zap className="text-blue-400 fill-blue-400" size={64} />
                                        <span className="text-3xl font-black text-blue-400 uppercase tracking-tighter">{effect.type}</span>
                                    </div>
                                )}
                                {effect.type === 'KO' && (
                                    <motion.div 
                                        initial={{ scale: 0, rotate: -20 }}
                                        animate={{ scale: 1.2, rotate: 0 }}
                                        className="bg-black/80 backdrop-blur-md p-10 rounded-[3rem] border-4 border-yellow-400 shadow-[0_0_50px_rgba(234,179,8,0.5)]"
                                    >
                                        <Trophy className="text-yellow-400 mx-auto mb-4" size={80} />
                                        <h2 className="text-6xl font-black text-white italic">K.O.</h2>
                                    </motion.div>
                                )}
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>

                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 bg-black/10 p-6 rounded-[2.5rem] backdrop-blur-sm border border-white/5 shadow-2xl">
                    {/* Me */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between px-2">
                            <span className="font-black text-white/50 text-xs uppercase tracking-widest">Siz</span>
                            <div className="flex items-center gap-1">
                                <Sword size={12} className="text-primary-color" />
                                <span className="font-bold text-white text-sm">{me.score}</span>
                            </div>
                        </div>
                        <div className="h-4 bg-black/40 rounded-full overflow-hidden border border-white/10 relative shadow-inner">
                            <motion.div 
                                initial={{ width: '100%' }}
                                animate={{ width: `${me.hp}%` }}
                                className={`h-full bg-gradient-to-r ${me.hp < 30 ? 'from-red-600 to-red-400 shadow-[0_0_15px_rgba(220,38,38,0.5)]' : 'from-emerald-600 to-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)]'}`}
                            />
                            {me.hp < 100 && (
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-white/80">{me.hp}%</span>
                            )}
                        </div>
                        <AnimatePresence>
                            {me.combo > 1 && (
                                <motion.div 
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="flex items-center gap-2"
                                >
                                    <div className="px-2 py-0.5 bg-yellow-400 text-black rounded-lg text-[10px] font-black shadow-lg">COMBO X{me.combo}</div>
                                    <Zap size={14} className="text-yellow-400 fill-yellow-400 animate-pulse" />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* VS */}
                    <div className="flex flex-col items-center">
                        <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10 shadow-lg mb-1">
                            <span className="font-black text-white/20 italic italic text-xl">VS</span>
                        </div>
                        <div className="w-1 h-8 bg-gradient-to-b from-white/10 to-transparent rounded-full" />
                    </div>

                    {/* Opponent */}
                    <div className="space-y-3 text-right">
                        <div className="flex items-center justify-between px-2 flex-row-reverse">
                            <span className="font-black text-white/50 text-xs uppercase tracking-widest">Raqib</span>
                            <div className="flex items-center gap-1">
                                <span className="font-bold text-white text-sm">{opponent.score}</span>
                                <Crown size={12} className="text-yellow-500" />
                            </div>
                        </div>
                        <div className="h-4 bg-black/40 rounded-full overflow-hidden border border-white/10 relative shadow-inner">
                            <motion.div 
                                initial={{ width: '100%' }}
                                animate={{ width: `${opponent.hp}%` }}
                                className={`h-full bg-gradient-to-l ${opponent.hp < 30 ? 'from-red-600 to-red-400 shadow-[0_0_15px_rgba(220,38,38,0.5)]' : 'from-indigo-600 to-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.3)]'}`}
                            />
                            {opponent.hp < 100 && (
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-white/80">{opponent.hp}%</span>
                            )}
                        </div>
                        <AnimatePresence>
                            {opponent.combo > 1 && (
                                <motion.div 
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    className="flex items-center gap-2 justify-end"
                                >
                                    <Zap size={14} className="text-indigo-400 fill-indigo-400 animate-pulse" />
                                    <div className="px-2 py-0.5 bg-indigo-500 text-white rounded-lg text-[10px] font-black shadow-lg">COMBO X{opponent.combo}</div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className={`flex flex-col h-[100dvh] transition-colors relative overflow-hidden ${isDuel ? 'bg-[#0f172a]' : ''}`} style={{ backgroundColor: isDuel ? '' : 'var(--bg-color)' }}>
            {/* Battle Background Elements */}
            <AnimatePresence>
                {isDuel && (
                    <>
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 0.4 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 z-0 pointer-events-none"
                            style={{ 
                                background: 'radial-gradient(circle at 50% 120%, rgba(244, 63, 94, 0.2) 0%, transparent 60%), radial-gradient(circle at 50% -20%, rgba(99, 102, 241, 0.1) 0%, transparent 60%)'
                            }}
                        />
                        {/* Floating particles */}
                        {[...Array(12)].map((_, i) => (
                            <motion.div
                                key={i}
                                initial={{ y: '110vh', x: `${Math.random() * 100}vw`, opacity: 0, scale: Math.random() * 0.5 + 0.5 }}
                                animate={{ 
                                    y: '-10vh', 
                                    opacity: [0, 0.8, 0],
                                    x: `${(Math.random() * 100) + (Math.sin(i) * 10)}vw` 
                                }}
                                transition={{ 
                                    duration: Math.random() * 5 + 5, 
                                    repeat: Infinity, 
                                    delay: Math.random() * 10,
                                    ease: "linear"
                                }}
                                className="absolute w-1 h-1 bg-rose-500 rounded-full blur-[1px] z-0"
                            />
                        ))}
                    </>
                )}
            </AnimatePresence>

            <motion.div 
                animate={isShaking ? { x: [-10, 10, -10, 10, 0] } : { x: 0 }}
                transition={{ duration: 0.4 }}
                className="flex flex-col h-full relative z-10"
            >
                <header className="backdrop-blur-md p-4 flex justify-between items-center border-b shrink-0 transition-colors" style={{ backgroundColor: isDuel ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.05)', borderColor: isDuel ? 'rgba(255,255,255,0.1)' : 'var(--border-color)' }}>
                <div className="flex items-center gap-3">
                    <div className="border px-4 py-1.5 rounded-xl transition-colors" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
                        <span className="text-[10px] font-black uppercase block opacity-40" style={{ color: 'var(--text-color)' }}>{isUnitMode ? 'Unit' : 'Savol'}</span>
                        <div className="text-lg font-black" style={{ color: 'var(--primary-color)' }}>
                            {isUnitMode ? (
                                (() => {
                                    const nonInfoTotal = unitQuestions.filter(q => q.type !== 'info-slide').length;
                                    const nonInfoCurrent = unitQuestions.slice(0, currentUnitIndex + 1).filter(q => q.type !== 'info-slide').length;
                                    return `${nonInfoCurrent} / ${nonInfoTotal}`;
                                })()
                            ) : `${question?.questionIndex} / ${question?.totalQuestions}`}
                        </div>
                    </div>
                </div>
                <div className="flex-1 text-center">
                    <h2 className="text-[10px] font-black uppercase tracking-widest opacity-40" style={{ color: 'var(--text-color)' }}>{question?.info || getCurrentTopic() || quizTitle}</h2>
                </div>
            </header>

            <main className="flex-1 p-4 md:p-6 overflow-y-auto w-full max-w-5xl mx-auto flex flex-col">
                <ArenaUI />
                
                {/* Unit Mode Navigation at the Top */}
                {isUnitMode && (view === 'PLAYING' || view === 'UNIT_REVIEW') && (
                    <div className="flex items-center justify-between mb-6 gap-4 shrink-0">
                        <button 
                            onClick={() => { if (currentUnitIndex > 0) goToQuestion(currentUnitIndex - 1); }} 
                            disabled={currentUnitIndex === 0} 
                            className="px-5 py-2.5 rounded-xl font-bold disabled:opacity-30 border transition-all active:scale-95 text-xs md:text-sm" 
                            style={{ 
                                backgroundColor: isDuel ? 'rgba(255,255,255,0.05)' : 'var(--card-bg)', 
                                borderColor: isDuel ? 'rgba(255,255,255,0.1)' : 'var(--border-color)', 
                                color: isDuel ? 'white' : 'var(--text-color)' 
                            }}
                        >
                            ← Orqaga
                        </button>

                        <div className="flex-1 flex justify-center font-black text-xs md:text-sm uppercase tracking-widest" style={{ color: isDuel ? 'white' : 'var(--text-color)', opacity: 0.4 }}>
                            {(() => {
                                const nonInfoTotal = unitQuestions.filter(q => q.type !== 'info-slide').length;
                                const nonInfoCurrent = unitQuestions.slice(0, currentUnitIndex + 1).filter(q => q.type !== 'info-slide').length;
                                return `${nonInfoCurrent} / ${nonInfoTotal}`;
                            })()}
                        </div>

                        {currentUnitIndex === unitQuestions.length - 1 ? (
                            <button 
                                onClick={() => setView(view === 'UNIT_REVIEW' ? 'FINISHED' : 'UNIT_SUMMARY')} 
                                className="px-5 py-2.5 rounded-xl font-black text-white shadow-lg text-xs md:text-sm active:scale-95 transition-transform" 
                                style={{ backgroundColor: isDuel ? '#e11d48' : 'var(--primary-color)' }}
                            >
                                {view === 'UNIT_REVIEW' ? 'YAKUNLASH' : 'SUBMIT'}
                            </button>
                        ) : (
                            <button 
                                onClick={() => goToQuestion(currentUnitIndex + 1)} 
                                className="px-5 py-2.5 text-white rounded-xl font-bold shadow-lg text-xs md:text-sm active:scale-95 transition-transform" 
                                style={{ backgroundColor: isDuel ? '#e11d48' : 'var(--primary-color)' }}
                            >
                                Keyingisi →
                            </button>
                        )}
                    </div>
                )}

                <div className="flex-1 relative">{renderQuestionContent()}</div>
            </main>


            {isBlockedByCheat && (
                <div className="fixed inset-0 z-[100] bg-slate-900/90 backdrop-blur-xl flex flex-col items-center justify-center p-8 text-center">
                    <motion.div 
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="bg-white rounded-[3rem] p-10 max-w-sm w-full shadow-2xl relative overflow-hidden"
                    >
                        <div className="absolute top-0 left-0 w-full h-2 bg-red-500"></div>
                        <div className="w-24 h-24 bg-red-50 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 animate-pulse">
                            <AlertTriangle className="text-red-500" size={48} />
                        </div>
                        <h2 className="text-3xl font-black text-slate-800 mb-4 italic">DIQQAT!</h2>
                        <p className="text-slate-500 font-bold mb-10 leading-relaxed text-sm">
                            Siz test sahifasini tark etdingiz. <br/>
                            <span className="text-red-500">O'qituvchi sizni qaytadan qabul qilishi kutilmoqda...</span>
                        </p>
                        <div className="flex items-center justify-center gap-3 text-slate-400 font-black text-[10px] uppercase tracking-widest">
                            <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce"></div>
                            Kuting...
                        </div>
                    </motion.div>
                </div>
            )}
        </motion.div>
    </div>
    );
}
