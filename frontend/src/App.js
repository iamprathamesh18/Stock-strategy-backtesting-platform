import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Backtest from './pages/Backtest';
import Stocks from './pages/Stocks';
import Strategies from './pages/Strategies';
import History from './pages/History';
import Admin from './pages/Admin';
import DataExplorer from './pages/DataExplorer';

function ProtectedRoute({ children, adminOnly }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && user.role !== 'admin') return <Navigate to="/dashboard" replace />;
  return <Layout>{children}</Layout>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login"    element={<Login />} />
          <Route path="/"         element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard"  element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/backtest"   element={<ProtectedRoute><Backtest /></ProtectedRoute>} />
          <Route path="/stocks"     element={<ProtectedRoute><Stocks /></ProtectedRoute>} />
          <Route path="/explorer"   element={<ProtectedRoute><DataExplorer /></ProtectedRoute>} />
          <Route path="/strategies" element={<ProtectedRoute><Strategies /></ProtectedRoute>} />
          <Route path="/history"    element={<ProtectedRoute><History /></ProtectedRoute>} />
          <Route path="/admin"      element={<ProtectedRoute adminOnly><Admin /></ProtectedRoute>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
