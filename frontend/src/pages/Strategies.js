import React, { useState, useEffect } from 'react';
import api from '../utils/api';

const INDICATORS = ['Moving Average', 'RSI', 'Price', 'Volume', 'Open', 'High', 'Low'];
const OPERATORS = ['>', '<', '>=', '<=', '='];

const EMPTY_RULE = {
  action: 'BUY', group: 0, logic: 'AND',
  left_indicator: 'Moving Average', left_period: '50',
  operator: '>',
  right_indicator: 'Moving Average', right_period: '200',
  right_value: '',
  use_value: false,
};

export default function Strategies() {
  const [strategies, setStrategies] = useState([]);
  const [showBuilder, setShowBuilder] = useState(false);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [rules, setRules] = useState([{ ...EMPTY_RULE }]);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const loadStrategies = () => {
    api.get('/strategy/list').then(r => setStrategies(r.data)).catch(() => {});
  };

  useEffect(() => { loadStrategies(); }, []);

  const addRule = (action) => {
    setRules([...rules, { ...EMPTY_RULE, action }]);
  };

  const updateRule = (idx, field, val) => {
    const updated = [...rules];
    updated[idx] = { ...updated[idx], [field]: val };
    setRules(updated);
  };

  const removeRule = (idx) => {
    setRules(rules.filter((_, i) => i !== idx));
  };

  const saveStrategy = async () => {
    if (!name.trim()) return setMsg('Strategy name required');
    setSaving(true); setMsg('');
    try {
      await api.post('/strategy/create', {
        strategy_name: name, strategy_type: 'custom',
        rules_json: rules, description: desc,
      });
      setMsg('Strategy saved!');
      setShowBuilder(false); setName(''); setDesc(''); setRules([{ ...EMPTY_RULE }]);
      loadStrategies();
    } catch (e) {
      setMsg(e.response?.data?.error || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const deleteStrategy = async (id) => {
    if (!window.confirm('Delete this strategy?')) return;
    await api.delete(`/strategy/${id}`);
    loadStrategies();
  };

  const RuleRow = ({ rule, idx }) => (
    <div style={{ background: 'var(--bg)', borderRadius: 8, padding: '1rem', marginBottom: '0.5rem', border: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
        {/* Action badge */}
        <span className="tag" style={{
          background: rule.action === 'BUY' ? 'rgba(0,230,118,0.15)' : 'rgba(255,23,68,0.15)',
          color: rule.action === 'BUY' ? 'var(--green)' : 'var(--red)',
          minWidth: 48, textAlign: 'center',
        }}>{rule.action}</span>

        <select value={rule.action} onChange={e => updateRule(idx, 'action', e.target.value)} style={{ width: 80 }}>
          <option>BUY</option><option>SELL</option>
        </select>

        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>IF</span>

        {/* Left side */}
        <select value={rule.left_indicator} onChange={e => updateRule(idx, 'left_indicator', e.target.value)} style={{ width: 140 }}>
          {INDICATORS.map(i => <option key={i}>{i}</option>)}
        </select>
        {(rule.left_indicator === 'Moving Average' || rule.left_indicator === 'RSI') && (
          <input type="number" value={rule.left_period} onChange={e => updateRule(idx, 'left_period', e.target.value)}
            placeholder="period" style={{ width: 70 }} />
        )}

        {/* Operator */}
        <select value={rule.operator} onChange={e => updateRule(idx, 'operator', e.target.value)} style={{ width: 60 }}>
          {OPERATORS.map(o => <option key={o}>{o}</option>)}
        </select>

        {/* Right side - value or indicator */}
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', textTransform: 'none', marginBottom: 0 }}>
          <input type="checkbox" checked={rule.use_value} onChange={e => updateRule(idx, 'use_value', e.target.checked)} style={{ width: 'auto' }} />
          Fixed value
        </label>
        {rule.use_value ? (
          <input type="number" value={rule.right_value} onChange={e => updateRule(idx, 'right_value', e.target.value)}
            placeholder="value" style={{ width: 90 }} />
        ) : (
          <>
            <select value={rule.right_indicator} onChange={e => updateRule(idx, 'right_indicator', e.target.value)} style={{ width: 140 }}>
              {INDICATORS.map(i => <option key={i}>{i}</option>)}
            </select>
            {(rule.right_indicator === 'Moving Average' || rule.right_indicator === 'RSI') && (
              <input type="number" value={rule.right_period} onChange={e => updateRule(idx, 'right_period', e.target.value)}
                placeholder="period" style={{ width: 70 }} />
            )}
          </>
        )}

        <select value={rule.logic} onChange={e => updateRule(idx, 'logic', e.target.value)} style={{ width: 70 }}>
          <option>AND</option><option>OR</option>
        </select>

        <button onClick={() => removeRule(idx)} className="btn-danger" style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}>✕</button>
      </div>
    </div>
  );

  return (
    <div style={{ padding: '2rem' }} className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.3rem' }}>Strategies</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Build and manage your custom trading strategies</p>
        </div>
        <button className="btn-primary" onClick={() => setShowBuilder(!showBuilder)}>
          {showBuilder ? '✕ Cancel' : '+ New Strategy'}
        </button>
      </div>

      {/* Strategy Builder */}
      {showBuilder && (
        <div className="card fade-in" style={{ marginBottom: '1.5rem', border: '1px solid rgba(0,229,255,0.2)' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1.2rem', color: 'var(--accent)' }}>
            ◇ Strategy Builder
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.2rem' }}>
            <div>
              <label>Strategy Name</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="My Golden Cross" />
            </div>
            <div>
              <label>Description</label>
              <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Optional description" />
            </div>
          </div>

          {/* Rules */}
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.6rem' }}>
              Conditions
            </div>
            {rules.map((rule, idx) => <RuleRow key={idx} rule={rule} idx={idx} />)}
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
            <button className="btn-secondary" onClick={() => addRule('BUY')} style={{ fontSize: '0.8rem' }}>+ BUY Condition</button>
            <button className="btn-secondary" onClick={() => addRule('SELL')} style={{ fontSize: '0.8rem' }}>+ SELL Condition</button>
          </div>

          {/* Example preview */}
          <div style={{ padding: '0.8rem', background: 'var(--bg)', borderRadius: 8, marginBottom: '1rem', fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            {rules.map((r, i) => (
              <div key={i} style={{ marginBottom: '0.2rem' }}>
                <span style={{ color: r.action === 'BUY' ? 'var(--green)' : 'var(--red)' }}>{r.action}</span>{' '}
                <span style={{ color: 'var(--accent)' }}>IF</span>{' '}
                {r.left_indicator}{r.left_period ? `(${r.left_period})` : ''} {r.operator}{' '}
                {r.use_value ? r.right_value : `${r.right_indicator}${r.right_period ? `(${r.right_period})` : ''}`}
                {i < rules.length - 1 && <span style={{ color: 'var(--yellow)' }}> {r.logic}</span>}
              </div>
            ))}
          </div>

          {msg && <div style={{ color: msg.includes('saved') ? 'var(--green)' : 'var(--red)', fontSize: '0.85rem', marginBottom: '0.8rem' }}>{msg}</div>}
          <button className="btn-primary" onClick={saveStrategy} disabled={saving}>
            {saving ? 'Saving...' : 'Save Strategy'}
          </button>
        </div>
      )}

      {/* Strategy list */}
      {strategies.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          No strategies yet. Create your first one above.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
          {strategies.map(s => (
            <div key={s.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{s.strategy_name}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: '0.2rem' }}>{s.description || 'No description'}</div>
                </div>
                <button onClick={() => deleteStrategy(s.id)} className="btn-danger" style={{ padding: '0.3rem 0.5rem', fontSize: '0.75rem' }}>✕</button>
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                {s.rules_json?.length || 0} conditions • {new Date(s.created_at).toLocaleDateString()}
              </div>
              {s.rules_json?.slice(0, 3).map((r, i) => (
                <div key={i} style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', background: 'var(--bg)', padding: '0.3rem 0.5rem', borderRadius: 4 }}>
                  <span style={{ color: r.action === 'BUY' ? 'var(--green)' : 'var(--red)' }}>{r.action}</span>: {r.left_indicator} {r.operator} {r.use_value ? r.right_value : r.right_indicator}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
