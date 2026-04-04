import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function AuthPage({ mode = 'login' }) {
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const isLogin = mode === 'login';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isLogin) {
        await login(form.email, form.password);
      } else {
        await register(form.username, form.email, form.password);
      }
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ width: '100%', maxWidth: '420px' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <div style={{ width: '36px', height: '36px', background: 'var(--accent)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: '18px', color: '#0a0e1a' }}>◈</span>
            </div>
            <span className="font-mono" style={{ fontSize: '18px', fontWeight: '700', letterSpacing: '1px', color: 'var(--accent)' }}>BACKTEST.IO</span>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: 0 }}>Stock Strategy Backtesting Platform</p>
        </div>

        <div className="card accent-glow">
          <h2 style={{ fontSize: '20px', fontWeight: '700', marginTop: 0, marginBottom: '4px' }}>
            {isLogin ? 'Welcome back' : 'Create account'}
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: 0, marginBottom: '24px' }}>
            {isLogin ? 'Sign in to your account' : 'Start backtesting your strategies'}
          </p>

          {error && (
            <div style={{ background: 'rgba(244, 63, 94, 0.1)', border: '1px solid rgba(244, 63, 94, 0.3)', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px', fontSize: '13px', color: '#f43f5e' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {!isLogin && (
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px', fontWeight: '500' }}>USERNAME</label>
                  <input className="input-field" placeholder="johndoe" value={form.username} onChange={e => setForm({...form, username: e.target.value})} required />
                </div>
              )}
              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px', fontWeight: '500' }}>EMAIL</label>
                <input className="input-field" type="email" placeholder="you@example.com" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px', fontWeight: '500' }}>PASSWORD</label>
                <input className="input-field" type="password" placeholder="••••••••" value={form.password} onChange={e => setForm({...form, password: e.target.value})} required />
              </div>
              <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: '4px', width: '100%', padding: '12px' }}>
                {loading ? 'Please wait...' : (isLogin ? 'Sign In' : 'Create Account')}
              </button>
            </div>
          </form>

          <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '13px', color: 'var(--text-secondary)' }}>
            {isLogin ? (
              <>Don't have an account? <Link to="/register" style={{ color: 'var(--accent)', textDecoration: 'none' }}>Register</Link></>
            ) : (
              <>Already have an account? <Link to="/login" style={{ color: 'var(--accent)', textDecoration: 'none' }}>Sign In</Link></>
            )}
          </div>

          {isLogin && (
            <div style={{ marginTop: '20px', padding: '12px', background: 'rgba(0,212,170,0.05)', borderRadius: '8px', border: '1px solid rgba(0,212,170,0.15)', fontSize: '12px', color: 'var(--text-secondary)' }}>
              <strong style={{ color: 'var(--accent)' }}>Demo Admin:</strong> admin@stockbacktest.com / admin123
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
