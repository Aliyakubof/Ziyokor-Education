import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import CreateQuiz from './pages/CreateQuiz';
import HostLobby from './pages/HostLobby';
import PlayerJoin from './pages/PlayerJoin';
import PlayerGame from './pages/PlayerGame';
import HostGame from './pages/HostGame';
import AdminPanel from './pages/AdminPanel';
import TeacherDashboard from './pages/TeacherDashboard';
import ManagerDashboard from './pages/ManagerDashboard';
import StudentLogin from './pages/StudentLogin';

import StudentDashboard from './pages/StudentDashboard';
import Leaderboard from './pages/Leaderboard';
import Shop from './pages/Shop';
import SoloQuiz from './pages/SoloQuiz';
import DuelLobby from './pages/DuelLobby';
import UnitLobby from './pages/UnitLobby';
import UnitJoin from './pages/UnitJoin';
import Login from './pages/Login';
import GroupDetails from './pages/GroupDetails';
import BattleDetails from './pages/BattleDetails';
import { AuthProvider, useAuth } from './AuthContext';
import AppMonitor from './AppMonitor';

const ProtectedRoute = ({ children, requiredRole }: { children: React.ReactNode, requiredRole?: 'admin' | 'teacher' | 'student' | 'manager' | ('admin' | 'teacher' | 'student' | 'manager')[] }) => {
  const { isAuthenticated, role } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole) {
    const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    if (!roles.includes(role as any) && role !== 'admin') {
      return <Navigate to="/" replace />;
    }
  }

  return <>{children}</>;
};

const RootRoute = () => {
  const { isAuthenticated, role } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  if (role === 'student') return <Navigate to="/student/dashboard" replace />;
  if (role === 'manager') return <Navigate to="/manager" replace />;

  return <Home />;
};

function App() {
  return (
    <AuthProvider>
      <AppMonitor>
        <BrowserRouter>
          <div className="min-h-[100dvh] w-full overflow-x-hidden font-sans flex flex-col"
            style={{
              paddingTop: 'env(safe-area-inset-top)',
              paddingBottom: 'env(safe-area-inset-bottom)',
              paddingLeft: 'env(safe-area-inset-left)',
              paddingRight: 'env(safe-area-inset-right)'
            }}>
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
                path="/student/battle/:id"
                element={
                  <ProtectedRoute>
                    <BattleDetails />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/create"
                element={
                  <ProtectedRoute requiredRole={['teacher', 'manager']}>
                    <CreateQuiz />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/edit-quiz/:id"
                element={
                  <ProtectedRoute requiredRole={['teacher', 'manager']}>
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
                path="/manager"
                element={
                  <ProtectedRoute requiredRole="manager">
                    <ManagerDashboard />
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
      </AppMonitor>
    </AuthProvider >
  );
}

export default App;
