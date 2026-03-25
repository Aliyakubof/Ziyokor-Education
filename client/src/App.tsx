import { Routes, Route, Navigate } from 'react-router-dom';
import React, { lazy, Suspense, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';
import AppMonitor from './AppMonitor';
import { ThemeEngine } from './components/ThemeEngine';
import { App as CapacitorApp } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Capacitor } from '@capacitor/core';

// Lazy load pages
const Home = lazy(() => import('./pages/Home'));
const CreateQuiz = lazy(() => import('./pages/CreateQuiz'));
const HostLobby = lazy(() => import('./pages/HostLobby'));
const PlayerJoin = lazy(() => import('./pages/PlayerJoin'));
const PlayerGame = lazy(() => import('./pages/PlayerGame'));
const HostGame = lazy(() => import('./pages/HostGame'));
const AdminPanel = lazy(() => import('./pages/AdminPanel'));
const TeacherDashboard = lazy(() => import('./pages/TeacherDashboard'));
const ManagerDashboard = lazy(() => import('./pages/ManagerDashboard'));
const StudentLogin = lazy(() => import('./pages/StudentLogin'));
const AdminVocabBattles = lazy(() => import('./pages/AdminVocabBattles'));
const CreateVocabBattle = lazy(() => import('./pages/CreateVocabBattle'));
const ManageTelegramQuestions = lazy(() => import('./pages/ManageTelegramQuestions'));
const ManageDuels = lazy(() => import('./pages/ManageDuels'));
const AdminSlots = lazy(() => import('./pages/AdminSlots'));
const StudentDashboard = lazy(() => import('./pages/StudentDashboard'));
const Leaderboard = lazy(() => import('./pages/Leaderboard'));
const Shop = lazy(() => import('./pages/Shop'));
const SoloQuiz = lazy(() => import('./pages/SoloQuiz'));
const DuelLobby = lazy(() => import('./pages/DuelLobby'));
const UnitLobby = lazy(() => import('./pages/UnitLobby'));
const UnitJoin = lazy(() => import('./pages/UnitJoin'));
const Login = lazy(() => import('./pages/Login'));
const GroupDetails = lazy(() => import('./pages/GroupDetails'));
const BattleDetails = lazy(() => import('./pages/BattleDetails'));
const VocabularyBattleLevels = lazy(() => import('./pages/VocabularyBattleLevels'));
const VocabularyBattleGame = lazy(() => import('./pages/VocabularyBattleGame'));
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
  const location = useLocation();

  useEffect(() => {
    // Configure StatusBar
    if (Capacitor.isNativePlatform()) {
      StatusBar.setStyle({ style: Style.Light });
      StatusBar.setBackgroundColor({ color: '#ffffff' });
    }

    // Handle Hardware Back Button
    const backListener = CapacitorApp.addListener('backButton', ({ canGoBack }: { canGoBack: boolean }) => {
      if (location.pathname === '/' || location.pathname === '/login' || location.pathname === '/student/dashboard') {
        CapacitorApp.exitApp();
      } else if (canGoBack) {
        window.history.back();
      } else {
        CapacitorApp.exitApp();
      }
    });

    return () => {
      backListener.then((l: any) => l.remove());
    };
  }, [location.pathname]);

  return (
    <AuthProvider>
      <ThemeEngine>
        <AppMonitor>
        <div className="min-h-[100dvh] w-full overflow-x-hidden font-sans flex flex-col"
          style={{
            paddingTop: 'env(safe-area-inset-top)',
            paddingBottom: 'env(safe-area-inset-bottom)',
            paddingLeft: 'env(safe-area-inset-left)',
            paddingRight: 'env(safe-area-inset-right)'
          }}>
          <Suspense fallback={
            <div className="flex-1 flex items-center justify-center bg-white dark:bg-[#0a0a0a]">
              <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          }>
            <Routes>
            <Route path="/" element={<RootRoute />} />
            <Route path="/login" element={<Login />} />
            <Route path="/student" element={<Navigate to="/student/dashboard" replace />} />
            <Route path="/student/" element={<Navigate to="/student/dashboard" replace />} />
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
              path="/student/vocab-battles"
              element={
                <ProtectedRoute requiredRole="student">
                  <VocabularyBattleLevels />
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
              path="/student/vocab-battle/play/:id"
              element={
                <ProtectedRoute requiredRole="student">
                  <VocabularyBattleGame />
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
              path="/admin/slots"
              element={
                <ProtectedRoute requiredRole="admin">
                  <AdminSlots />
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
              path="/admin/vocab-battles"
              element={
                <ProtectedRoute requiredRole={['admin', 'manager', 'teacher']}>
                  <AdminVocabBattles />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/vocab-battles/create"
              element={
                <ProtectedRoute requiredRole={['admin', 'teacher', 'manager']}>
                  <CreateVocabBattle />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/vocab-battles/edit/:id"
              element={
                <ProtectedRoute requiredRole={['admin', 'teacher', 'manager']}>
                  <CreateVocabBattle />
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
              path="/admin/telegram-questions"
              element={
                <ProtectedRoute requiredRole={['admin', 'teacher']}>
                  <ManageTelegramQuestions />
                </ProtectedRoute>
              }
            />
            <Route
              path="/manage-duels"
              element={
                <ProtectedRoute requiredRole={['admin', 'teacher']}>
                  <ManageDuels />
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
              path="/manager/group/:groupId"
              element={
                <ProtectedRoute requiredRole="manager">
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
            <Route
              path="/unit-join/:pin"
              element={
                <ProtectedRoute requiredRole="student">
                  <UnitJoin />
                </ProtectedRoute>
              }
            />
          </Routes>
          </Suspense>
        </div>
      </AppMonitor>
      </ThemeEngine>
    </AuthProvider>
  );
}

export default App;
