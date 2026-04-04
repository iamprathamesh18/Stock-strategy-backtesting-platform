import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import Sidebar from './components/Sidebar';
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';
import BacktestPage from './pages/BacktestPage';
import StrategiesPage from './pages/StrategiesPage';
import HistoryPage from './pages/HistoryPage';
import StocksPage from './pages/StocksPage';
import AdminPage from './pages/AdminPage';
import './index.css';

function ProtectedLayout({ children, adminOnly }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && user.role !== 'admin') return <Navigate to="/dashboard" replace />;
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <main style={{ flex: 1, marginLeft: '240px', padding: '32px', minHeight: '100vh', background: 'var(--bg-primary)' }}>
        {children}
      </main>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<AuthPage mode="login" />} />
          <Route path="/register" element={<AuthPage mode="register" />} />
          <Route path="/dashboard" element={<ProtectedLayout><Dashboard /></ProtectedLayout>} />
          <Route path="/backtest" element={<ProtectedLayout><BacktestPage /></ProtectedLayout>} />
          <Route path="/strategies" element={<ProtectedLayout><StrategiesPage /></ProtectedLayout>} />
          <Route path="/history" element={<ProtectedLayout><HistoryPage /></ProtectedLayout>} />
          <Route path="/stocks" element={<ProtectedLayout><StocksPage /></ProtectedLayout>} />
          <Route path="/admin" element={<ProtectedLayout adminOnly><AdminPage /></ProtectedLayout>} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
