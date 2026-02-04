import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
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
import Login from './pages/Login';
import { AuthProvider, useAuth } from './AuthContext';

const ProtectedRoute = ({ children, requiredRole }: { children: React.ReactNode, requiredRole?: 'admin' | 'teacher' }) => {
  const { isAuthenticated, role } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && role !== requiredRole) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-slate-900 text-white font-sans">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/create" element={<CreateQuiz />} />
            <Route path="/host/:quizId" element={<HostLobby />} />
            <Route path="/host-game/:pin" element={<HostGame />} />
            <Route path="/join" element={<PlayerJoin />} />
            <Route path="/play" element={<PlayerGame />} />

            {/* Restricted Unit Quiz Routes */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute requiredRole="admin">
                  <AdminPanel />
                </ProtectedRoute>
              }
            />
            <Route
              path="/teacher"
              element={
                <ProtectedRoute requiredRole="teacher">
                  <TeacherDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/unit-lobby/:quizId/:groupId"
              element={
                <ProtectedRoute>
                  <UnitLobby />
                </ProtectedRoute>
              }
            />
            <Route path="/unit-join/:pin" element={<UnitJoin />} />
          </Routes>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
