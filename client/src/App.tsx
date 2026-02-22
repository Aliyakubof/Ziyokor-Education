import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import CreateQuiz from './pages/CreateQuiz';
import HostLobby from './pages/HostLobby';
import PlayerJoin from './pages/PlayerJoin';
import PlayerGame from './pages/PlayerGame';
import HostGame from './pages/HostGame';
import AdminPanel from './pages/AdminPanel';
import TeacherDashboard from './pages/TeacherDashboard';
import StudentLogin from './pages/StudentLogin';

import StudentDashboard from './pages/StudentDashboard';
import Leaderboard from './pages/Leaderboard.tsx';
import Shop from './pages/Shop';
import SoloQuiz from './pages/SoloQuiz.tsx';
import DuelLobby from './pages/DuelLobby';
import UnitLobby from './pages/UnitLobby';
import UnitJoin from './pages/UnitJoin';
import Login from './pages/Login';
import GroupDetails from './pages/GroupDetails';
import { AuthProvider, useAuth } from './AuthContext';

const ProtectedRoute = ({ children, requiredRole }: { children: React.ReactNode, requiredRole?: 'admin' | 'teacher' | 'student' }) => {
  const { isAuthenticated, role } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && role !== requiredRole && role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

const RootRoute = () => {
  const { isAuthenticated, role } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  if (role === 'student') return <Navigate to="/student/dashboard" replace />;

  return <Home />;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="min-h-screen w-full overflow-x-hidden font-sans">
          <Routes>
            <Route path="/" element={<RootRoute />} />
            <Route path="/login" element={<Login />} />
            <Route path="/student/login" element={<StudentLogin />} />
            <Route
              path="/student/dashboard"
              element={
                <ProtectedRoute requiredRole="student">
                  <StudentDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/student/leaderboard"
              element={
                <ProtectedRoute requiredRole="student">
                  <Leaderboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/student/shop"
              element={
                <ProtectedRoute requiredRole="student">
                  <Shop />
                </ProtectedRoute>
              }
            />
            <Route
              path="/student/practice"
              element={
                <ProtectedRoute requiredRole="student">
                  <SoloQuiz />
                </ProtectedRoute>
              }
            />
            <Route
              path="/student/duels"
              element={
                <ProtectedRoute requiredRole="student">
                  <DuelLobby />
                </ProtectedRoute>
              }
            />
            <Route
              path="/create"
              element={
                <ProtectedRoute requiredRole="admin">
                  <CreateQuiz />
                </ProtectedRoute>
              }
            />
            <Route
              path="/edit-quiz/:id"
              element={
                <ProtectedRoute requiredRole="admin">
                  <CreateQuiz />
                </ProtectedRoute>
              }
            />
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
              path="/admin/group/:groupId"
              element={
                <ProtectedRoute requiredRole="admin">
                  <GroupDetails />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/groups"
              element={
                <ProtectedRoute requiredRole="admin">
                  <TeacherDashboard />
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
              path="/teacher/group/:groupId"
              element={
                <ProtectedRoute requiredRole="teacher">
                  <GroupDetails />
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
    </AuthProvider >
  );
}

export default App;
