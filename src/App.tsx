import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, testConnection } from './firebase';
import Layout from './components/Layout';
import PublicView from './components/PublicView';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Registration from './components/Registration';
import GroupManagement from './components/GroupManagement';
import MatchEntry from './components/MatchEntry';
import Stats from './components/Stats';
import TournamentInfo from './components/TournamentInfo';
import TournamentManagement from './components/TournamentManagement';
import AutoScheduler from './components/AutoScheduler';
import Top8 from './components/Top8';
import ErrorBoundary from './components/ErrorBoundary';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    testConnection();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-pink-soft">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-matcha"></div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <Router>
        <Routes>
          <Route path="/" element={<Layout user={user} />}>
            <Route index element={<PublicView />} />
            <Route path="stats" element={<Stats />} />
            <Route path="info" element={<TournamentInfo />} />
            <Route path="login" element={user ? <Navigate to="/admin" /> : <Login />} />
            
            {/* Admin Routes */}
            <Route path="admin" element={user ? <Dashboard /> : <Navigate to="/login" />}>
              <Route index element={<Navigate to="registration" />} />
              <Route path="registration" element={<Registration />} />
              <Route path="groups" element={<GroupManagement />} />
              <Route path="auto-schedule" element={<AutoScheduler />} />
              <Route path="matches" element={<MatchEntry />} />
              <Route path="top8" element={<Top8 />} />
              <Route path="tournament-info" element={<TournamentManagement />} />
            </Route>
          </Route>
        </Routes>
      </Router>
    </ErrorBoundary>
  );
}
