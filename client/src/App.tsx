import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import CreateQuiz from './pages/CreateQuiz';
import HostLobby from './pages/HostLobby';
import PlayerJoin from './pages/PlayerJoin';
import PlayerGame from './pages/PlayerGame';
import HostGame from './pages/HostGame';
import AdminPanel from './pages/AdminPanel';
import TeacherDashboard from './pages/TeacherDashboard';
import UnitLobby from './pages/UnitLobby';
import UnitJoin from './pages/UnitJoin';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-900 text-white font-sans">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/create" element={<CreateQuiz />} />
          <Route path="/host/:quizId" element={<HostLobby />} />
          <Route path="/host-game/:pin" element={<HostGame />} />
          <Route path="/join" element={<PlayerJoin />} />
          <Route path="/play" element={<PlayerGame />} />

          {/* New Unit Quiz Routes */}
          <Route path="/admin" element={<AdminPanel />} />
          <Route path="/teacher" element={<TeacherDashboard />} />
          <Route path="/unit-lobby/:quizId/:groupId" element={<UnitLobby />} />
          <Route path="/unit-join/:pin" element={<UnitJoin />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
