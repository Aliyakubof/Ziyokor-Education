import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../api';

interface QuestionDraft {
    text: string;
    options: [string, string, string, string];
    correctIndex: number;
    timeLimit: number;
}

export default function CreateQuiz() {
    const navigate = useNavigate();
    const [title, setTitle] = useState('');
    const [questions, setQuestions] = useState<QuestionDraft[]>([]);

    // Current editing question state
    const [qText, setQText] = useState('');
    const [opts, setOpts] = useState(['', '', '', '']);
    const [correctIdx, setCorrectIdx] = useState(0);
    const [time, setTime] = useState(20);

    const addQuestion = () => {
        if (!qText || opts.some(o => !o)) return alert("Please fill all fields");
        setQuestions([...questions, {
            text: qText,
            options: [opts[0], opts[1], opts[2], opts[3]],
            correctIndex: correctIdx,
            timeLimit: time
        }]);
        // Reset form
        setQText('');
        setOpts(['', '', '', '']);
        setCorrectIdx(0);
        setTime(20);
    };

    const saveQuiz = async () => {
        if (!title || questions.length === 0) return alert("Add title and at least one question");
        try {
            const res = await apiFetch('/api/quizzes', {
                method: 'POST',
                body: JSON.stringify({
                    title,
                    questions
                })
            });
            const data = await res.json();
            navigate(`/host/${data.id}`);
        } catch (err) {
            console.error(err);
            alert("Failed to save quiz");
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 p-8 text-black">
            <div className="max-w-4xl mx-auto bg-white p-8 rounded-2xl shadow-xl">
                <h2 className="text-3xl font-bold mb-6">Create a New Quiz</h2>

                <input
                    className="w-full text-2xl font-bold p-4 border-2 border-gray-300 rounded-lg mb-8 focus:border-brand-purple outline-none"
                    placeholder="Enter Quiz Title..."
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                />

                <div className="mb-8 p-6 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
                    <h3 className="text-xl font-bold mb-4">Add Question</h3>

                    <input
                        className="w-full p-3 border border-gray-300 rounded mb-4"
                        placeholder="Question Text"
                        value={qText}
                        onChange={e => setQText(e.target.value)}
                    />

                    <div className="grid grid-cols-2 gap-4 mb-4">
                        {opts.map((opt, i) => (
                            <div key={i} className={`flex items-center p-2 rounded border-2 ${correctIdx === i ? 'border-green-500 bg-green-50' : 'border-gray-200'}`}>
                                <input
                                    type="radio"
                                    name="correct"
                                    checked={correctIdx === i}
                                    onChange={() => setCorrectIdx(i)}
                                    className="mr-2 h-5 w-5"
                                />
                                <input
                                    className="w-full p-2 bg-transparent outline-none"
                                    placeholder={`Option ${i + 1}`}
                                    value={opt}
                                    onChange={e => {
                                        const newOpts = [...opts];
                                        newOpts[i] = e.target.value;
                                        setOpts(newOpts);
                                    }}
                                />
                            </div>
                        ))}
                    </div>

                    <button onClick={addQuestion} className="bg-brand-purple text-white px-6 py-2 rounded-lg font-bold hover:opacity-90">
                        Add Question
                    </button>
                </div>

                <div className="mb-8">
                    <h3 className="text-xl font-bold mb-4">Questions ({questions.length})</h3>
                    {questions.map((q, i) => (
                        <div key={i} className="bg-white border p-4 rounded mb-2 shadow-sm">
                            <div className="font-bold">Q{i + 1}: {q.text}</div>
                            <div className="text-sm text-gray-500">{q.options.length} options, Correct: {q.options[q.correctIndex]}</div>
                        </div>
                    ))}
                </div>

                <button onClick={saveQuiz} className="w-full bg-green-600 text-white text-xl font-bold p-4 rounded-xl shadow hover:bg-green-700 transition">
                    Save & Play
                </button>
            </div>
        </div>
    );
}
