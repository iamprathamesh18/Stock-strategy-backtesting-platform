import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const NavItem = ({ to, icon, label, active }) => (
  <Link to={to} style={{
    display: 'flex', alignItems: 'center', gap: '0.6rem',
    padding: '0.6rem 0.8rem', borderRadius: '8px', textDecoration: 'none',
    color: active ? 'var(--accent)' : 'var(--text-muted)',
    background: active ? 'rgba(0,229,255,0.08)' : 'transparent',
    fontSize: '0.85rem', fontWeight: active ? 600 : 400,
    transition: 'all 0.15s',
    borderLeft: active ? '2px solid var(--accent)' : '2px solid transparent',
  }}>
    <span style={{ fontSize: '1rem' }}>{icon}</span>
    <span>{label}</span>
  </Link>
);

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate  = useNavigate();

  const navItems = [
    { to: '/dashboard', icon: '⬡',  label: 'Dashboard'     },
    { to: '/stocks',    icon: '◈',  label: 'Market Data'   },
    { to: '/explorer',  icon: '🗄', label: 'Data Explorer' },
    { to: '/backtest',  icon: '▶',  label: 'Run Backtest'  },
    { to: '/strategies',icon: '◇',  label: 'Strategies'    },
    { to: '/history',   icon: '◎',  label: 'History'       },
  ];
  if (user?.role === 'admin') {
    navItems.push({ to: '/admin', icon: '⚙', label: 'Admin' });
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <aside style={{
        width: 220, background: 'var(--surface)', borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 100,
      }}>
        <div style={{ padding: '1.5rem 1rem', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent)', fontSize: '1rem', fontWeight: 700, letterSpacing: '0.05em' }}>
            ALGOFORGE
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem', fontFamily: 'var(--font-mono)' }}>
            BACKTEST PLATFORM
          </div>
        </div>

        <nav style={{ padding: '1rem 0.75rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
          {navItems.map(item => (
            <NavItem key={item.to} {...item} active={location.pathname === item.to} />
          ))}
        </nav>

        <div style={{ padding: '1rem', borderTop: '1px solid var(--border)' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
            <span style={{ display: 'block', fontWeight: 600, color: 'var(--text)' }}>{user?.username}</span>
            <span style={{
              display: 'inline-block', padding: '0.1rem 0.4rem', borderRadius: 4, marginTop: '0.2rem',
              background: user?.role === 'admin' ? 'rgba(124,58,237,0.2)' : 'rgba(0,229,255,0.1)',
              color: user?.role === 'admin' ? '#a78bfa' : 'var(--accent)',
              fontFamily: 'var(--font-mono)', fontSize: '0.65rem', fontWeight: 700,
            }}>{user?.role?.toUpperCase()}</span>
          </div>
          <button onClick={() => { logout(); navigate('/login'); }}
            className="btn-secondary"
            style={{ width: '100%', fontSize: '0.8rem', padding: '0.4rem' }}>
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ marginLeft: 220, flex: 1, minHeight: '100vh', background: 'var(--bg)' }}>
        {children}
      </main>
    </div>
  );
}
