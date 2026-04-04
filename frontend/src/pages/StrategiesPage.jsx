import React, { useState, useEffect } from 'react';
import { strategy } from '../utils/api';

const INDICATORS = [
  { value: 'sma', label: 'SMA (Moving Avg)', hasParam: true, paramLabel: 'Period', paramDefault: 50 },
  { value: 'ema', label: 'EMA (Exp. Moving Avg)', hasParam: true, paramLabel: 'Period', paramDefault: 20 },
  { value: 'rsi', label: 'RSI', hasParam: true, paramLabel: 'Period', paramDefault: 14 },
  { value: 'price', label: 'Price (Close)', hasParam: false },
  { value: 'volume', label: 'Volume', hasParam: false },
  { value: 'value', label: 'Fixed Value', hasParam: true, paramLabel: 'Value', paramDefault: 0 },
];

const OPERATORS = ['>', '<', '>=', '<=', '='];

function IndicatorSelect({ value, onChange }) {
  const ind = INDICATORS.find(i => i.value === value?.type) || INDICATORS[0];
  return (
    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
      <select className="input-field" style={{ padding: '6px 10px', fontSize: '12px', width: '160px' }}
        value={value?.type || 'sma'}
        onChange={e => {
          const ind = INDICATORS.find(i => i.value === e.target.value);
          onChange({ type: e.target.value, params: ind?.hasParam ? { period: ind.paramDefault, value: ind.paramDefault } : {} });
        }}>
        {INDICATORS.map(i => <option key={i.value} value={i.value}>{i.label}</option>)}
      </select>
      {ind?.hasParam && (
        <input className="input-field" type="number" style={{ padding: '6px 10px', fontSize: '12px', width: '70px' }}
          value={value?.params?.period || value?.params?.value || ind.paramDefault}
          onChange={e => onChange({ ...value, params: { ...value?.params, period: Number(e.target.value), value: Number(e.target.value) } })}
          placeholder={ind.paramLabel} />
      )}
    </div>
  );
}

function ConditionRow({ condition, onChange, onRemove }) {
  return (
    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', padding: '10px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid var(--border)' }}>
      <span style={{ fontSize: '11px', color: 'var(--text-secondary)', width: '30px', textAlign: 'center' }}>IF</span>
      <IndicatorSelect value={condition.left} onChange={v => onChange({ ...condition, left: v })} />
      <select className="input-field" style={{ padding: '6px 10px', fontSize: '12px', width: '60px' }}
        value={condition.operator || '>'}
        onChange={e => onChange({ ...condition, operator: e.target.value })}>
        {OPERATORS.map(op => <option key={op} value={op}>{op}</option>)}
      </select>
      <IndicatorSelect value={condition.right} onChange={v => onChange({ ...condition, right: v })} />
      <button onClick={onRemove} style={{ background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.3)', color: '#f43f5e', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer', fontSize: '12px', flexShrink: 0 }}>×</button>
    </div>
  );
}

function ConditionGroup({ conditions, logic, onChange, onLogicChange, title, color }) {
  const addCondition = () => onChange([...conditions, {
    type: 'condition',
    left: { type: 'sma', params: { period: 50 } },
    operator: '>',
    right: { type: 'sma', params: { period: 200 } }
  }]);

  return (
    <div style={{ border: `1px solid ${color}30`, borderRadius: '10px', padding: '16px', background: `${color}08` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <span style={{ fontSize: '13px', fontWeight: '700', color }}>THEN {title}</span>
        <div style={{ display: 'flex', gap: '6px' }}>
          {['AND', 'OR'].map(l => (
            <button key={l} onClick={() => onLogicChange(l)}
              style={{ padding: '4px 12px', borderRadius: '4px', border: '1px solid', fontSize: '11px', cursor: 'pointer',
                borderColor: logic === l ? color : 'var(--border)',
                background: logic === l ? `${color}20` : 'transparent',
                color: logic === l ? color : 'var(--text-secondary)' }}>
              {l}
            </button>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '10px' }}>
        {conditions.map((cond, i) => (
          <div key={i}>
            {i > 0 && <div style={{ textAlign: 'center', padding: '4px', fontSize: '11px', color: color, fontWeight: '700' }}>{logic}</div>}
            <ConditionRow condition={cond}
              onChange={v => { const c = [...conditions]; c[i] = v; onChange(c); }}
              onRemove={() => onChange(conditions.filter((_, j) => j !== i))} />
          </div>
        ))}
        {conditions.length === 0 && <div style={{ textAlign: 'center', padding: '16px', color: 'var(--text-secondary)', fontSize: '13px' }}>No conditions. Add one below.</div>}
      </div>
      <button onClick={addCondition} style={{ background: `${color}15`, border: `1px solid ${color}40`, color, borderRadius: '6px', padding: '6px 14px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}>+ Add Condition</button>
    </div>
  );
}

export default function StrategiesPage() {
  const [strategies, setStrategies] = useState([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [buyConditions, setBuyConditions] = useState([{ type: 'condition', left: { type: 'sma', params: { period: 50 } }, operator: '>', right: { type: 'sma', params: { period: 200 } } }]);
  const [sellConditions, setSellConditions] = useState([{ type: 'condition', left: { type: 'rsi', params: { period: 14 } }, operator: '>', right: { type: 'value', params: { value: 70 } } }]);
  const [buyLogic, setBuyLogic] = useState('AND');
  const [sellLogic, setSellLogic] = useState('OR');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const loadStrategies = () => strategy.list().then(r => setStrategies(r.data));
  useEffect(() => { loadStrategies(); }, []);

  const handleSave = async () => {
    if (!name.trim()) { setError('Strategy name required'); return; }
    setError(''); setSaving(true);
    try {
      const buildGroup = (conds, logic) => {
        if (conds.length === 0) return null;
        if (conds.length === 1) return { type: 'condition', ...conds[0] };
        return { type: logic.toLowerCase(), conditions: conds.map(c => ({ type: 'condition', ...c })) };
      };
      const rules_json = {
        buyCondition: buildGroup(buyConditions, buyLogic),
        sellCondition: buildGroup(sellConditions, sellLogic),
        buyLogic, sellLogic
      };
      await strategy.create({ strategy_name: name, strategy_type: 'custom', rules_json, description });
      setSuccess('Strategy saved!');
      setName(''); setDescription('');
      loadStrategies();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    await strategy.delete(id);
    loadStrategies();
  };

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '700', margin: '0 0 4px' }}>⊞ Strategies</h1>
        <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '14px' }}>Build custom strategies with visual rule builder</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '20px' }}>
        {/* Builder */}
        <div className="card">
          <h3 style={{ margin: '0 0 20px', fontSize: '14px', color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '1px' }}>Strategy Builder</h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>STRATEGY NAME</label>
              <input className="input-field" placeholder="My Golden Cross Strategy" value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>DESCRIPTION</label>
              <input className="input-field" placeholder="Optional description..." value={description} onChange={e => setDescription(e.target.value)} />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '20px' }}>
            <ConditionGroup conditions={buyConditions} logic={buyLogic} onChange={setBuyConditions} onLogicChange={setBuyLogic} title="BUY" color="var(--green)" />
            <ConditionGroup conditions={sellConditions} logic={sellLogic} onChange={setSellConditions} onLogicChange={setSellLogic} title="SELL" color="var(--red)" />
          </div>

          {/* Preview */}
          <div style={{ background: 'var(--bg-secondary)', borderRadius: '8px', padding: '16px', marginBottom: '16px' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '8px', letterSpacing: '1px' }}>STRATEGY PREVIEW</div>
            <div style={{ fontFamily: 'Space Mono', fontSize: '12px', lineHeight: '1.8', color: 'var(--text-primary)' }}>
              <span style={{ color: 'var(--green)' }}>BUY </span> when {buyConditions.map((c, i) => (
                <span key={i}>{i > 0 && <span style={{ color: 'var(--accent)' }}> {buyLogic} </span>}<span style={{ color: '#60a5fa' }}>{c.left?.type?.toUpperCase()}({c.left?.params?.period || ''})</span> {c.operator} <span style={{ color: '#a78bfa' }}>{c.right?.type?.toUpperCase()}({c.right?.params?.period || c.right?.params?.value || ''})</span></span>
              ))}<br/>
              <span style={{ color: 'var(--red)' }}>SELL </span> when {sellConditions.map((c, i) => (
                <span key={i}>{i > 0 && <span style={{ color: 'var(--accent)' }}> {sellLogic} </span>}<span style={{ color: '#60a5fa' }}>{c.left?.type?.toUpperCase()}({c.left?.params?.period || ''})</span> {c.operator} <span style={{ color: '#a78bfa' }}>{c.right?.type?.toUpperCase()}({c.right?.params?.period || c.right?.params?.value || ''})</span></span>
              ))}
            </div>
          </div>

          {error && <div style={{ padding: '10px', background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.3)', borderRadius: '6px', fontSize: '13px', color: '#f43f5e', marginBottom: '12px' }}>{error}</div>}
          {success && <div style={{ padding: '10px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '6px', fontSize: '13px', color: 'var(--green)', marginBottom: '12px' }}>{success}</div>}

          <button className="btn-primary" onClick={handleSave} disabled={saving} style={{ width: '100%', padding: '12px' }}>
            {saving ? 'Saving...' : '⊞ Save Strategy'}
          </button>
        </div>

        {/* Saved Strategies */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <h3 style={{ margin: '0 0 4px', fontSize: '14px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>Saved Strategies ({strategies.length})</h3>
          {strategies.length === 0 && <div className="card" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)', fontSize: '13px' }}>No strategies yet</div>}
          {strategies.map(s => (
            <div key={s.id} className="card" style={{ padding: '14px 16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.strategy_name}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{new Date(s.created_at).toLocaleDateString()}</div>
                  {s.description && <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.description}</div>}
                </div>
                <button onClick={() => handleDelete(s.id)} style={{ background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.3)', color: '#f43f5e', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer', fontSize: '12px', marginLeft: '8px', flexShrink: 0 }}>Delete</button>
              </div>
              <span className="badge badge-accent" style={{ marginTop: '8px' }}>{s.strategy_type}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
