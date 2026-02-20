import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiFetch } from '../api';
import { PlusCircle, Save, ArrowLeft, Trash2, HelpCircle, CheckCircle2, FileQuestion, Type, List, AlertCircle, PenTool, XCircle, X, Info } from 'lucide-react';

interface QuestionDraft {
    info: string;
    text: string;
    options: string[];
    correctIndex: number;
    timeLimit: number;
    type: 'multiple-choice' | 'text-input' | 'true-false' | 'fill-blank' | 'find-mistake' | 'rewrite' | 'word-box' | 'info-slide';
    acceptedAnswers: string[];
}

export default function CreateQuiz() {
    const navigate = useNavigate();
    const { id } = useParams();
    const [title, setTitle] = useState('');
    const [level, setLevel] = useState('Beginner');
    const [unit, setUnit] = useState('1');
    const [timeLimit] = useState(30); // Default 30 minutes

    const [questions, setQuestions] = useState<QuestionDraft[]>([]);

    useEffect(() => {
        if (id) {
            fetchQuiz();
        }
    }, [id]);

    const fetchQuiz = async () => {
        try {
            const res = await apiFetch(`/api/unit-quizzes/${id}`);
            if (res.ok) {
                const data = await res.json();
                setTitle(data.title);
                setLevel(data.level);
                setUnit(data.unit);
                // Ensure questions is an array, handle if strictly parsed from JSON or already object
                const parsedQuestions = typeof data.questions === 'string' ? JSON.parse(data.questions) : data.questions;
                setQuestions(parsedQuestions || []);
            } else {
                alert("Quizni yuklashda xatolik!");
                navigate('/');
            }
        } catch (error) {
            console.error("Error fetching quiz:", error);
            alert("Quizni yuklashda xatolik!");
            navigate('/');
        }
    };

    const [qInfo, setQInfo] = useState('');
    const [qText, setQText] = useState('');
    const [qType, setQType] = useState<'multiple-choice' | 'text-input' | 'true-false' | 'fill-blank' | 'find-mistake' | 'rewrite' | 'word-box' | 'info-slide'>('multiple-choice');
    const [opts, setOpts] = useState(['', '', '', '']);
    const [correctIdx, setCorrectIdx] = useState(0);
    const [acceptedAnswers, setAcceptedAnswers] = useState('');

    const addQuestion = () => {
        if (!qText) return alert("Savol matnini kiriting");

        if (qType === 'multiple-choice') {
            if (opts.some(o => !o)) return alert("Barcha variantlarni to'ldiring");
            setQuestions([...questions, {
                info: qInfo,
                text: qText,
                options: opts,
                correctIndex: correctIdx,
                timeLimit: 0, // No time limit for unit quizzes
                type: 'multiple-choice',
                acceptedAnswers: []
            }]);
        } else if (qType === 'true-false') {
            setQuestions([...questions, {
                info: qInfo,
                text: qText,
                options: ["To'g'ri", "Noto'g'ri"],
                correctIndex: correctIdx, // 0 for True, 1 for False
                timeLimit: 0,
                type: 'true-false',
                acceptedAnswers: []
            }]);
        } else {
            // text-input, fill-blank, find-mistake, rewrite
            if (!acceptedAnswers.trim()) return alert("To'g'ri javoblarni kiriting");
            const answersList = acceptedAnswers.split(',').map(a => a.trim()).filter(a => a);
            setQuestions([...questions, {
                info: qInfo,
                text: qText,
                options: qType === 'word-box' ? opts : [],
                correctIndex: -1,
                timeLimit: 0,
                type: qType,
                acceptedAnswers: answersList
            }]);
        }

        // Reset form
        setQInfo('');
        setQText('');
        setOpts(['', '', '', '']);
        setCorrectIdx(0);
        setAcceptedAnswers('');
        setQType('multiple-choice');
    };

    const removeQuestion = (index: number) => {
        setQuestions(questions.filter((_, i) => i !== index));
    };

    const saveQuiz = async () => {
        if (!title || questions.length === 0) return alert("Sarlavha va kamida bitta savol qo'shing");
        try {
            const url = id ? `/api/unit-quizzes/${id}` : '/api/unit-quizzes';
            const method = id ? 'PUT' : 'POST';

            const res = await apiFetch(url, {
                method,
                body: JSON.stringify({
                    title,
                    level,
                    unit,
                    time_limit: timeLimit,
                    questions
                })
            });
            const data = await res.json();
            if (res.ok) {
                navigate(`/`); // Go back to home/admin panel
            } else {
                throw new Error(data.error || 'Xatolik');
            }
        } catch (err) {
            console.error(err);
            alert("Saqlashda xatolik yuz berdi");
        }
    };

    const [showImport, setShowImport] = useState(false);
    const [importText, setImportText] = useState('');
    const [isPdfLoading, setIsPdfLoading] = useState(false);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.type !== 'application/pdf') {
            alert('Faqat PDF fayllar qabul qilinadi');
            return;
        }

        setIsPdfLoading(true);
        try {
            // Dynamic import to avoid SSR/Build issues if any, and keep bundle size opt
            const pdfjsLib = await import('pdfjs-dist');
            // Set worker from CDN to avoid local file serving issues in dev/prod hybrid
            pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

            let extractedText = '';

            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();

                // Simple text extraction: join items with space
                // Can be improved by checking y-coordinates for lines, but this usually works for simple parsing
                const pageText = textContent.items
                    .map((item: any) => item.str)
                    .join(' ');

                extractedText += `\n--- Page ${i} ---\n` + pageText + '\n';
            }

            // Cleanup some common PDF glues if needed, but for now just raw append
            // Append to existing text so user doesn't lose what they typed
            setImportText(prev => prev + (prev ? '\n\n' : '') + extractedText);

        } catch (error) {
            console.error('PDF parsing error:', error);
            alert('PDF o\'qishda xatolik bo\'ldi. Fayl buzilgan bo\'lishi mumkin.');
        } finally {
            setIsPdfLoading(false);
            // Reset input so same file can be selected again if needed
            e.target.value = '';
        }
    };

    const handleBulkImport = () => {
        if (!importText.trim()) return;

        const lines = importText.split('\n').filter(l => l.trim());
        const newQuestions: QuestionDraft[] = [];

        // Context for grouping
        let currentHeader = '';
        let currentQuestion: QuestionDraft | null = null;

        const flushQuestion = () => {
            if (currentQuestion) {
                // Auto-detect type updates before saving
                if (currentQuestion.text.includes('______') || currentQuestion.text.includes('[...]')) {
                    currentQuestion.type = 'fill-blank';
                    currentQuestion.text = currentQuestion.text.replace(/______/g, '[...]');
                } else if (currentQuestion.text.toLowerCase().includes('correct the mistakes')) {
                    currentQuestion.type = 'find-mistake';
                }
                newQuestions.push(currentQuestion);
                currentQuestion = null;
            }
        };

        lines.forEach(line => {
            const trimmed = line.trim();
            if (trimmed.startsWith('--- Page')) return; // Skip page markers

            // Match numbered lines like "1. Question..." or "1) Question..."
            const match = trimmed.match(/^(\d+)[\.\)]\s+(.*)/);

            // Detect headers (simple heuristic: ends with colon, or is "Grammar: ...", "Vocabulary: ...")
            const isHeader = /^(Grammar:|Vocabulary:|Section|Part)\s/.test(trimmed) || (trimmed.endsWith(':') && trimmed.length < 50);

            if (match) {
                // Formatting: New Question Found
                flushQuestion(); // Save previous

                const qText = match[2];
                // Start new question
                currentQuestion = {
                    info: currentHeader,
                    text: qText, // We start with this line
                    options: ['', '', '', ''],
                    correctIndex: 0,
                    timeLimit: 0,
                    type: 'multiple-choice', // Default, will be re-evaluated on flush
                    acceptedAnswers: []
                };
            } else if (isHeader) {
                // Formatting: New Header Found
                flushQuestion(); // Save previous question if any
                currentHeader = trimmed; // Update context

                // Also add as Info Slide
                newQuestions.push({
                    info: 'SECTION',
                    text: trimmed,
                    options: [],
                    correctIndex: 0,
                    timeLimit: 0,
                    type: 'info-slide',
                    acceptedAnswers: []
                });
            } else {
                // Continuation line?
                if (currentQuestion) {
                    // Append to current question text
                    // Add space for continuity
                    currentQuestion.text += ' ' + trimmed;
                } else {
                    // Stray text at start? Treat as header info
                    // Check if it looks like a continuation of a header or standalone text
                    // For now, treat as info slide
                    newQuestions.push({
                        info: 'INFO',
                        text: trimmed,
                        options: [],
                        correctIndex: 0,
                        timeLimit: 0,
                        type: 'info-slide',
                        acceptedAnswers: []
                    });
                }
            }
        });

        flushQuestion(); // Flush last one

        setQuestions([...questions, ...newQuestions]);
        setShowImport(false);
        setImportText('');
    };

    return (
        <div className="min-h-screen p-8 relative overflow-hidden bg-transparent">
            {/* Import Modal */}
            {showImport && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2rem] w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                            <h2 className="text-2xl font-black text-slate-900">Bulk Import Questions</h2>
                            <button onClick={() => setShowImport(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                                <X size={24} className="text-slate-400" />
                            </button>
                        </div>
                        <div className="p-6 flex-1 overflow-hidden flex flex-col gap-4">
                            <div className="bg-blue-50 text-blue-800 p-4 rounded-xl text-sm leading-relaxed">
                                <strong>Format Guide:</strong><br />
                                • Paste text OR <strong>Upload PDF</strong> (text will be extracted below).<br />
                                • Lines starting with numbers (e.g. <code>1. </code>) will be created as questions.<br />
                                • Other lines will be treated as <strong>Section Headers</strong> (Info Slides).<br />
                                • Use <code>______</code> (6 underscores) to automatically create <strong>Fill-in-the-blank</strong> questions with gaps.<br />
                                • After importing, don't forget to <strong>add the correct answers</strong> for each question!
                            </div>

                            <div className="flex gap-2">
                                <label className={`
                                    flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold cursor-pointer transition-all border border-dashed border-indigo-300 text-indigo-600 bg-indigo-50 hover:bg-indigo-100
                                    ${isPdfLoading ? 'opacity-50 cursor-wait' : ''}
                                `}>
                                    {isPdfLoading ? (
                                        <>Loading PDF...</>
                                    ) : (
                                        <>
                                            <FileQuestion size={18} /> Upload PDF
                                            <input
                                                type="file"
                                                accept=".pdf"
                                                className="hidden"
                                                onChange={handleFileUpload}
                                                disabled={isPdfLoading}
                                            />
                                        </>
                                    )}
                                </label>
                            </div>

                            <textarea
                                value={importText}
                                onChange={e => setImportText(e.target.value)}
                                className="flex-1 w-full bg-slate-50 border-2 border-slate-200 rounded-2xl p-6 font-mono text-sm focus:outline-none focus:border-indigo-500 transition-all resize-none"
                                placeholder="Paste your questions here or upload a PDF..."
                            />
                        </div>
                        <div className="p-6 border-t border-slate-100 flex justify-end gap-3">
                            <button
                                className="px-6 py-3 font-bold text-slate-500 hover:bg-slate-50 rounded-xl transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleBulkImport}
                                disabled={!importText.trim()}
                                className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-200 disabled:text-slate-400 text-white font-black rounded-xl transition-all shadow-lg shadow-indigo-500/20 active:scale-95 flex items-center gap-2"
                            >
                                <PlusCircle size={20} />
                                IMPORT QUESTIONS
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="max-w-6xl mx-auto">
                <header className="flex justify-between items-center mb-12">
                    <button
                        onClick={() => navigate('/')}
                        className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 transition-all hover:translate-x-[-4px]"
                    >
                        <ArrowLeft size={20} /> Admin Panelga Qaytish
                    </button>

                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setShowImport(true)}
                            className="bg-white hover:bg-indigo-50 text-indigo-600 px-5 py-2.5 rounded-xl font-black border border-indigo-100 shadow-sm transition-all flex items-center gap-2 active:scale-95"
                        >
                            <FileQuestion size={18} />
                            BULK IMPORT
                        </button>
                        <div className="bg-white px-6 py-2 rounded-2xl border border-slate-200 shadow-sm">
                            <span className="text-xs font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2">
                                <FileQuestion size={16} /> {id ? 'Unit Quiz Tahrirlash' : 'Unit Quiz Yaratish'}
                            </span>
                        </div>
                    </div>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Left: Editor */}
                    <div className="lg:col-span-7 space-y-8">
                        <section className="bg-white rounded-[2.5rem] p-8 border border-slate-200 shadow-xl shadow-slate-200/50">
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Quiz Sarlavhasi</label>
                                    <input
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-slate-900 font-bold text-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all placeholder:text-slate-400"
                                        placeholder="Masalan: General English Unit 1"
                                        value={title}
                                        onChange={e => setTitle(e.target.value)}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Level</label>
                                        <select
                                            value={level}
                                            onChange={(e) => setLevel(e.target.value)}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-slate-900 font-bold outline-none cursor-pointer"
                                        >
                                            <option value="Beginner">Beginner</option>
                                            <option value="Elementary">Elementary</option>
                                            <option value="Pre-Intermediate">Pre-Intermediate</option>
                                            <option value="Intermediate">Intermediate</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Unit</label>
                                        <input
                                            value={unit}
                                            onChange={(e) => setUnit(e.target.value)}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-slate-900 font-bold outline-none"
                                            placeholder="1"
                                        />
                                    </div>
                                </div>

                                <div className="bg-indigo-50/50 border border-indigo-100 p-6 rounded-[2rem] space-y-6">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="bg-indigo-100 p-2 rounded-xl">
                                                <PlusCircle className="text-indigo-600" size={24} />
                                            </div>
                                            <h3 className="text-xl font-black text-slate-900 tracking-tight">Add Question</h3>
                                        </div>

                                        <div className="flex bg-white rounded-xl p-1 border border-slate-200">
                                            <button
                                                onClick={() => setQType('multiple-choice')}
                                                className={`p-2 rounded-lg transition-all ${qType === 'multiple-choice' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                                                title="Multiple Choice"
                                            >
                                                <List size={20} />
                                            </button>
                                            <button
                                                onClick={() => setQType('true-false')}
                                                className={`p-2 rounded-lg transition-all ${qType === 'true-false' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                                                title="True/False"
                                            >
                                                <CheckCircle2 size={20} />
                                            </button>
                                            <button
                                                onClick={() => setQType('text-input')}
                                                className={`p-2 rounded-lg transition-all ${qType === 'text-input' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                                                title="Type Answer"
                                            >
                                                <Type size={20} />
                                            </button>
                                            <button
                                                onClick={() => setQType('fill-blank')}
                                                className={`p-2 rounded-lg transition-all ${qType === 'fill-blank' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                                                title="Fill in the Blank"
                                            >
                                                <span className="font-bold text-xs">...</span>
                                            </button>
                                            <button
                                                onClick={() => setQType('find-mistake')}
                                                className={`p-2 rounded-lg transition-all ${qType === 'find-mistake' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                                                title="Find Mistake"
                                            >
                                                <AlertCircle size={20} />
                                            </button>
                                            <button
                                                onClick={() => setQType('rewrite')}
                                                className={`p-2 rounded-lg transition-all ${qType === 'rewrite' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                                                title="Rewrite Sentence"
                                            >
                                                <PenTool size={20} />
                                            </button>
                                            <button
                                                onClick={() => setQType('word-box')}
                                                className={`p-2 rounded-lg transition-all ${qType === 'word-box' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                                                title="Word Box (Fill-in-gap)"
                                            >
                                                <X size={20} />
                                            </button>
                                            <button
                                                onClick={() => setQType('info-slide')}
                                                className={`p-2 rounded-lg transition-all ${qType === 'info-slide' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                                                title="Info Slide (Topic Heading)"
                                            >
                                                <Info size={20} />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        {qType !== 'info-slide' && (
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-4">Savol Ma'lumoti (Info)</label>
                                                <input
                                                    className="w-full bg-white border border-slate-200 rounded-2xl px-6 py-4 text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all placeholder:text-slate-400"
                                                    placeholder="Masalan: WORD & TRANSLATE yoki Grammar"
                                                    value={qInfo}
                                                    onChange={e => setQInfo(e.target.value)}
                                                />
                                            </div>
                                        )}

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Savol Matni</label>
                                            <textarea
                                                className="w-full bg-white border border-slate-200 rounded-2xl px-6 py-4 text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all placeholder:text-slate-400 min-h-[100px] resize-none"
                                                placeholder="Enter question text..."
                                                value={qText}
                                                onChange={e => setQText(e.target.value)}
                                            />
                                        </div>

                                        {qType === 'multiple-choice' && (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {opts.map((opt, i) => (
                                                    <div key={i} className={`relative flex items-center group transition-all`}>
                                                        <input
                                                            className={`w-full bg-white border-2 rounded-2xl px-6 py-4 text-slate-900 font-medium focus:outline-none transition-all placeholder:text-slate-400 pr-14
                                                                ${correctIdx === i ? 'border-emerald-500/50 bg-emerald-50' : 'border-slate-200 hover:border-slate-300'}
                                                            `}
                                                            placeholder={`Option ${i + 1}`}
                                                            value={opt}
                                                            onChange={e => {
                                                                const newOpts = [...opts];
                                                                newOpts[i] = e.target.value;
                                                                setOpts(newOpts);
                                                            }}
                                                        />
                                                        <button
                                                            onClick={() => setCorrectIdx(i)}
                                                            className={`absolute right-4 p-2 rounded-lg transition-all ${correctIdx === i ? 'text-emerald-500 bg-emerald-100' : 'text-slate-400 hover:text-slate-600'}`}
                                                        >
                                                            <CheckCircle2 size={24} />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {qType === 'true-false' && (
                                            <div className="grid grid-cols-2 gap-4">
                                                {["True", "False"].map((opt, i) => (
                                                    <div
                                                        key={i}
                                                        onClick={() => setCorrectIdx(i)}
                                                        className={`
                                                            cursor-pointer rounded-2xl px-6 py-6 text-center font-bold text-lg border-2 transition-all flex items-center justify-center gap-3
                                                            ${correctIdx === i
                                                                ? (i === 0 ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-red-500 bg-red-50 text-red-600')
                                                                : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'}
                                                        `}
                                                    >
                                                        {i === 0 ? <CheckCircle2 /> : <XCircle />}
                                                        {opt}
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {['text-input', 'fill-blank', 'find-mistake', 'rewrite'].includes(qType) && (
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">
                                                    {qType === 'fill-blank' ? "Correct Answer (missing word)" :
                                                        qType === 'find-mistake' ? "Mistake Word (or corrected version)" :
                                                            qType === 'rewrite' ? "Full Correct Sentence" :
                                                                "Correct Answers (comma separated)"}
                                                </label>
                                                <textarea
                                                    className="w-full bg-white border border-slate-200 rounded-2xl px-6 py-4 text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all placeholder:text-slate-400 min-h-[80px]"
                                                    placeholder="Masalan: apple, an apple, the apple"
                                                    value={acceptedAnswers}
                                                    onChange={e => setAcceptedAnswers(e.target.value)}
                                                />
                                                <p className="text-xs text-slate-400 ml-4">Student answer matching any of these will be correct.</p>
                                            </div>
                                        )}

                                        {qType === 'info-slide' && (
                                            <div className="space-y-4">
                                                <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl text-xs text-blue-800">
                                                    <strong>Info Slide:</strong> Bu yerda savol bo'lmaydi. Shunchaki mavzu nomini yoki keyingi savollar uchun kerakli ma'lumotni kiriting.
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Mavzu yoki Ma'lumot matni</label>
                                                    <textarea
                                                        className="w-full bg-white border border-slate-200 rounded-2xl px-6 py-4 text-slate-900 font-bold text-center text-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-slate-300 min-h-[120px]"
                                                        placeholder="Masalan: Present Simple"
                                                        value={qText}
                                                        onChange={e => setQText(e.target.value)}
                                                    />
                                                </div>
                                            </div>
                                        )}
                                        {qType === 'word-box' && (
                                            <div className="space-y-4">
                                                <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl text-xs text-amber-800">
                                                    <strong>Qanday to'ldirish kerak:</strong><br />
                                                    1. Savol matniga [1], [2] ko'rinishida bo'sh joylarni qo'ying.<br />
                                                    2. "Word Box" - bu o'quvchi ko'radigan barcha so'zlar (vergul bilan ajrating).<br />
                                                    3. "To'g'ri javoblar" - bo'sh joylarga tartib bilan mos keladigan so'zlar.
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Word Box (Barcha so'zlar)</label>
                                                    <input
                                                        className="w-full bg-white border border-slate-200 rounded-2xl px-6 py-4 text-slate-900 font-medium"
                                                        placeholder="unhealthy, on a diet, healthy, delicious"
                                                        value={opts.join(', ')}
                                                        onChange={e => setOpts(e.target.value.split(',').map(s => s.trim()))}
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">To'g'ri javoblar (Tartib bilan)</label>
                                                    <input
                                                        className="w-full bg-white border border-slate-200 rounded-2xl px-6 py-4 text-slate-900 font-medium"
                                                        placeholder="unhealthy, on a diet"
                                                        value={acceptedAnswers}
                                                        onChange={e => setAcceptedAnswers(e.target.value)}
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        <div className="flex items-center justify-between gap-4 pt-4">
                                            <div className="flex items-center gap-4">
                                                {/* Time input removed */}
                                            </div>

                                            <button
                                                onClick={addQuestion}
                                                className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3 rounded-xl font-black transition-all btn-premium shadow-lg shadow-indigo-500/20"
                                            >
                                                SAVOLNI QO'SHISH
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>
                    </div>

                    {/* Right: Summary & Save */}
                    <div className="lg:col-span-5 space-y-8">
                        <section className="bg-white rounded-[2.5rem] p-8 border border-slate-200 shadow-xl shadow-slate-200/50 flex flex-col h-full max-h-[700px]">
                            <div className="flex items-center justify-between mb-8">
                                <div className="flex items-center gap-3">
                                    <div className="bg-emerald-50 p-2 rounded-xl">
                                        <HelpCircle className="text-emerald-500" size={24} />
                                    </div>
                                    <h3 className="text-xl font-black text-slate-900 tracking-tight">Savollar Ro'yxati</h3>
                                </div>
                                <div className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-xl text-xs font-black">
                                    {questions.length}
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar mb-8">
                                {questions.map((q, i) => (
                                    q.type === 'info-slide' ? (
                                        <div key={i} className="bg-blue-600 border border-blue-700 p-4 rounded-2xl flex items-center justify-between group shadow-lg shadow-blue-500/20">
                                            <div className="flex items-center gap-4 truncate">
                                                <div className="bg-white/20 p-2 rounded-lg">
                                                    <Info className="text-white" size={16} />
                                                </div>
                                                <div className="truncate text-left">
                                                    <p className="text-white font-black text-sm truncate uppercase tracking-wider">{q.text}</p>
                                                    <span className="text-[10px] text-blue-100 font-bold uppercase tracking-[0.2em]">SECTION HEADER</span>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => removeQuestion(i)}
                                                className="text-white/60 hover:text-white transition-colors p-2"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    ) : (
                                        <div key={i} className="bg-slate-50 border border-slate-100 p-4 rounded-2xl flex items-center justify-between group hover:border-slate-200 transition-all">
                                            <div className="flex items-center gap-4 truncate text-left">
                                                <span className="text-indigo-500 font-black text-xs">#{i + 1}</span>
                                                <div className="truncate">
                                                    {q.info && <p className="text-[10px] text-indigo-500 font-black uppercase tracking-widest mb-0.5">{q.info}</p>}
                                                    <p className="text-slate-700 font-bold text-sm truncate">{q.text}</p>
                                                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                                        {q.type}
                                                    </span>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => removeQuestion(i)}
                                                className="text-slate-400 hover:text-red-500 transition-colors p-2"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    )
                                ))}

                                {questions.length === 0 && (
                                    <div className="h-40 flex flex-col items-center justify-center text-slate-400 text-center gap-4">
                                        <PlusCircle size={32} className="opacity-20" />
                                        <p className="text-xs font-bold uppercase tracking-widest">Hali savollar yo'q</p>
                                    </div>
                                )}
                            </div>

                            <button
                                onClick={saveQuiz}
                                disabled={!title || questions.length === 0}
                                className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-200 disabled:text-slate-400 text-white text-xl font-black py-5 rounded-2xl transition-all shadow-xl shadow-emerald-500/10 btn-premium flex items-center justify-center gap-3"
                            >
                                <Save size={24} />
                                SAQLASH
                            </button>
                        </section>
                    </div>
                </div>
            </div >
        </div >
    );
}
