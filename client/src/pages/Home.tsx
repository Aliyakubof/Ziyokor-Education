import { Link } from 'react-router-dom';

export default function Home() {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 p-8 text-white">
            <h1 className="text-7xl font-black mb-16 bg-gradient-to-r from-blue-400 via-indigo-500 to-purple-600 bg-clip-text text-transparent">
                Ziyokor Education
            </h1>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full max-w-6xl">
                <Link
                    to="/admin"
                    className="bg-blue-600 hover:bg-blue-500 p-8 rounded-3xl flex flex-col items-center justify-center gap-4 transition-all hover:scale-105 shadow-xl shadow-blue-900/20 group"
                >
                    <div className="text-4xl">🛠️</div>
                    <span className="font-bold text-xl">Admin Panel</span>
                </Link>

                <Link
                    to="/teacher"
                    className="bg-emerald-600 hover:bg-emerald-500 p-8 rounded-3xl flex flex-col items-center justify-center gap-4 transition-all hover:scale-105 shadow-xl shadow-emerald-900/20 group"
                >
                    <div className="text-4xl">👨‍🏫</div>
                    <span className="font-bold text-xl">O'qituvchi</span>
                </Link>

                <Link
                    to="/create"
                    className="bg-indigo-600 hover:bg-indigo-500 p-8 rounded-3xl flex flex-col items-center justify-center gap-4 transition-all hover:scale-105 shadow-xl shadow-indigo-900/20 group"
                >
                    <div className="text-4xl">📝</div>
                    <span className="font-bold text-xl">Quiz yaratish</span>
                </Link>

                <Link
                    to="/join"
                    className="bg-slate-800 hover:bg-slate-700 p-8 rounded-3xl border border-slate-700 flex flex-col items-center justify-center gap-4 transition-all hover:scale-105 group"
                >
                    <div className="text-4xl">🎮</div>
                    <span className="font-bold text-xl">O'yinga kirish</span>
                </Link>
            </div>

            <p className="mt-16 text-slate-500 italic text-sm">
                Unit Quiz o'quvchilar uchun ID orqali kirish QR-kod yoki linkda bo'ladi
            </p>
        </div>
    );
}
