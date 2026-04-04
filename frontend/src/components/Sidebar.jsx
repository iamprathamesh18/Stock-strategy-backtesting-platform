import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const NAV_ITEMS = [
  { path: '/dashboard', icon: '◈', label: 'Dashboard' },
  { path: '/backtest', icon: '⚡', label: 'Run Backtest' },
  { path: '/strategies', icon: '⊞', label: 'Strategies' },
  { path: '/history', icon: '⊟', label: 'History' },
  { path: '/stocks', icon: '◎', label: 'Stocks' },
];

const ADMIN_ITEMS = [
  { path: '/admin', icon: '⊕', label: 'Admin Panel' },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/login'); };

  const NavLink = ({ item }) => {
    const active = location.pathname === item.path;
    return (
      <Link to={item.path} style={{ textDecoration: 'none' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 16px', borderRadius: '8px', margin: '2px 8px',
          background: active ? 'var(--accent-dim)' : 'transparent',
          color: active ? 'var(--accent)' : 'var(--text-secondary)',
          transition: 'all 0.15s', fontSize: '14px', fontWeight: active ? '600' : '400',
          cursor: 'pointer', borderLeft: active ? '2px solid var(--accent)' : '2px solid transparent',
        }}
        onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
        onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; }}}
        >
          <span style={{ fontSize: '16px', width: '20px', textAlign: 'center' }}>{item.icon}</span>
          {item.label}
        </div>
      </Link>
    );
  };

  return (
    <div className="sidebar" style={{ display: 'flex', flexDirection: 'column', position: 'fixed', top: 0, left: 0, zIndex: 100 }}>
      {/* Logo */}
      <div style={{ padding: '24px 16px 16px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '32px', height: '32px', background: 'var(--accent)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ fontSize: '16px', color: '#0a0e1a' }}>◈</span>
          </div>
          <div>
            <div className="font-mono" style={{ fontSize: '14px', fontWeight: '700', color: 'var(--accent)', letterSpacing: '1px' }}>BACKTEST</div>
            <div style={{ fontSize: '10px', color: 'var(--text-secondary)', letterSpacing: '0.5px' }}>STRATEGY PLATFORM</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '12px 0' }}>
        <div style={{ fontSize: '10px', color: 'var(--text-secondary)', padding: '8px 24px', letterSpacing: '1.5px', fontWeight: '600' }}>MAIN</div>
        {NAV_ITEMS.map(item => <NavLink key={item.path} item={item} />)}

        {user?.role === 'admin' && (
          <>
            <div style={{ fontSize: '10px', color: 'var(--text-secondary)', padding: '16px 24px 8px', letterSpacing: '1.5px', fontWeight: '600' }}>ADMIN</div>
            {ADMIN_ITEMS.map(item => <NavLink key={item.path} item={item} />)}
          </>
        )}
      </nav>

      {/* User */}
      <div style={{ borderTop: '1px solid var(--border)', padding: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--accent-dim)', border: '1px solid var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)', fontSize: '13px', fontWeight: '700', flexShrink: 0 }}>
            {user?.username?.[0]?.toUpperCase()}
          </div>
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontSize: '13px', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.username}</div>
            <span className="badge badge-accent" style={{ fontSize: '10px' }}>{user?.role}</span>
          </div>
        </div>
        <button onClick={handleLogout} className="btn-secondary" style={{ width: '100%', padding: '8px', fontSize: '13px' }}>Sign Out</button>
      </div>
    </div>
  );
}
