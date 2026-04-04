import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function Login() {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ username: '', email: '', password: '', role: 'user' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      if (mode === 'login') {
        await login(form.email, form.password);
      } else {
        await register(form.username, form.email, form.password, form.role);
      }
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)',
      backgroundImage: 'radial-gradient(ellipse 80% 80% at 50% -20%, rgba(0,229,255,0.06) 0%, transparent 60%)',
    }}>
      <div style={{ width: '100%', maxWidth: 400, padding: '0 1rem' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.8rem', color: 'var(--accent)', fontWeight: 700, letterSpacing: '0.1em' }}>
            ALGOFORGE
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.4rem' }}>
            Stock Strategy Backtesting Platform
          </div>
        </div>

        <div className="card" style={{ border: '1px solid var(--border)', padding: '2rem' }}>
          {/* Tab switcher */}
          <div style={{ display: 'flex', background: 'var(--bg)', borderRadius: 8, padding: 4, marginBottom: '1.5rem' }}>
            {['login','register'].map(m => (
              <button key={m} onClick={() => setMode(m)} style={{
                flex: 1, padding: '0.5rem', borderRadius: 6, fontWeight: 600,
                background: mode === m ? 'var(--accent)' : 'transparent',
                color: mode === m ? '#000' : 'var(--text-muted)',
                border: 'none', cursor: 'pointer', textTransform: 'capitalize', transition: 'all 0.2s',
              }}>{m}</button>
            ))}
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {mode === 'register' && (
              <div>
                <label>Username</label>
                <input value={form.username} onChange={e => setForm({...form, username: e.target.value})} placeholder="trader_pro" required />
              </div>
            )}
            <div>
              <label>Email</label>
              <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="you@example.com" required />
            </div>
            <div>
              <label>Password</label>
              <input type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} placeholder="••••••••" required />
            </div>
            {mode === 'register' && (
              <div>
                <label>Role</label>
                <select value={form.role} onChange={e => setForm({...form, role: e.target.value})}>
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            )}
            {error && (
              <div style={{ padding: '0.6rem 0.8rem', background: 'rgba(255,23,68,0.1)', border: '1px solid rgba(255,23,68,0.3)', borderRadius: 6, color: 'var(--red)', fontSize: '0.85rem' }}>
                {error}
              </div>
            )}
            <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: '0.5rem', padding: '0.75rem', fontSize: '0.95rem' }}>
              {loading ? 'Processing...' : mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>
        </div>

        <div style={{ textAlign: 'center', marginTop: '1.5rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
          Demo: admin@test.com / password123 (after seeding)
        </div>
      </div>
    </div>
  );
}
