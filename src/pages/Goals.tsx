import { useState, useMemo } from 'react';
import { Plus, Trash2, PiggyBank, Target, X, Pencil, Wallet, TrendingUp } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { generateId } from '../utils';
import type { FundAllocation } from '../types';
import ConfirmModal from '../components/ConfirmModal';
import './Goals.css';

const GOAL_EMOJIS = ['✈️', '🏠', '💻', '🚗', '🎓', '💍', '📱', '🎸', '🏖️', '🎮'];
const GOAL_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#6366f1', '#14b8a6', '#ec4899'];

const FUND_EMOJIS = ['💼', '🏦', '📊', '💵', '🪙', '📈', '💎', '🔒', '🏧', '💰'];
const FUND_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#f97316', '#6366f1', '#ef4444', '#14b8a6', '#ec4899'];

type Tab = 'goals' | 'funds';

export default function Goals() {
  const { state, addGoal, updateGoal, deleteGoal, addToGoal, formatCurrency, addFund, updateFund, deleteFund } = useApp();

  const [activeTab, setActiveTab] = useState<Tab>('goals');

  // ── Goals state ──
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [goalTitle, setGoalTitle] = useState('');
  const [goalTarget, setGoalTarget] = useState('');
  const [goalCurrency, setGoalCurrency] = useState<'ARS' | 'USD' | 'EUR'>('ARS');
  const [goalEmoji, setGoalEmoji] = useState(0);
  const [goalColor, setGoalColor] = useState(0);
  const [goalDeadline, setGoalDeadline] = useState('');
  const [addAmountGoalId, setAddAmountGoalId] = useState<string | null>(null);
  const [addAmount, setAddAmount] = useState('');
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);



  // ── Expanded fund & deposits state ──
  const [expandedFundId, setExpandedFundId] = useState<string | null>(null);
  const [depositAmount, setDepositAmount] = useState('');
  const [depositDate, setDepositDate] = useState(new Date().toISOString().split('T')[0]);
  const [depositNotes, setDepositNotes] = useState('');

  // ── Funds state ──
  const [showFundForm, setShowFundForm] = useState(false);
  const [fundTitle, setFundTitle] = useState('');
  const [fundAmount, setFundAmount] = useState('');
  const [fundCurrency, setFundCurrency] = useState<'ARS' | 'USD' | 'EUR'>('ARS');
  const [fundEmoji, setFundEmoji] = useState(0);
  const [fundColor, setFundColor] = useState(0);
  const [editingFundId, setEditingFundId] = useState<string | null>(null);

  // ── Delete confirmation state ──
  const [pendingDelete, setPendingDelete] = useState<{ type: 'goal' | 'fund'; id: string } | null>(null);

  // ── Goal handlers ──
  const resetGoalForm = () => {
    setGoalTitle(''); setGoalTarget(''); setGoalCurrency('ARS');
    setGoalEmoji(0); setGoalColor(0); setGoalDeadline(''); setEditingGoalId(null); setShowGoalForm(false);
  };

  const handleEditGoal = (goal: any) => {
    setEditingGoalId(goal.id);
    setGoalTitle(goal.title);
    setGoalTarget(goal.targetAmount.toString());
    setGoalCurrency(goal.currency || 'ARS');
    setGoalEmoji(Math.max(0, GOAL_EMOJIS.indexOf(goal.emoji)));
    setGoalColor(Math.max(0, GOAL_COLORS.indexOf(goal.color)));
    setGoalDeadline(goal.deadline || '');
    setShowGoalForm(true);
  };

  const handleSaveGoal = () => {
    if (!goalTitle || !goalTarget || parseFloat(goalTarget) <= 0) return;
    if (editingGoalId) {
      const goal = state.goals.find(g => g.id === editingGoalId);
      if (goal) {
        updateGoal({ ...goal, title: goalTitle, targetAmount: parseFloat(goalTarget),
          emoji: GOAL_EMOJIS[goalEmoji], color: GOAL_COLORS[goalColor], currency: goalCurrency,
          deadline: goalDeadline || undefined });
      }
    } else {
      addGoal({ id: generateId(), title: goalTitle, targetAmount: parseFloat(goalTarget),
        currentAmount: 0, emoji: GOAL_EMOJIS[goalEmoji], color: GOAL_COLORS[goalColor],
        currency: goalCurrency, deadline: goalDeadline || undefined });
    }
    resetGoalForm();
  };

  const getDaysRemaining = (deadline: string): { days: number; label: string; urgent: boolean } => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(deadline + 'T00:00:00');
    const diff = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diff < 0) return { days: Math.abs(diff), label: `Vencida hace ${Math.abs(diff)}d`, urgent: true };
    if (diff === 0) return { days: 0, label: '¡Hoy!', urgent: true };
    if (diff === 1) return { days: 1, label: 'Mañana', urgent: true };
    if (diff <= 7) return { days: diff, label: `${diff} días`, urgent: true };
    if (diff <= 30) return { days: diff, label: `${diff} días`, urgent: false };
    const months = Math.floor(diff / 30);
    const rem = diff % 30;
    return { days: diff, label: rem > 0 ? `${months}m ${rem}d` : `${months} meses`, urgent: false };
  };

  const handleAddToGoal = (goalId: string) => {
    const val = parseFloat(addAmount);
    if (!addAmount || isNaN(val) || val === 0) return;
    addToGoal(goalId, val);
    setAddAmount(''); setAddAmountGoalId(null);
  };



  const formatNumberWithSeparators = (inputValue: string) => {
    const isNegative = inputValue.startsWith('-');
    let absoluteVal = isNegative ? inputValue.substring(1) : inputValue;

    // Convert trailing dot to comma for decimal separator entry
    if (absoluteVal.endsWith('.')) {
      absoluteVal = absoluteVal.slice(0, -1) + ',';
    }

    const cleanInput = absoluteVal.replace(/\./g, '');
    const parts = cleanInput.split(',');
    const integerClean = parts[0].replace(/\D/g, '');
    if (!integerClean && parts.length === 1) return isNegative ? '-' : '';

    const integerFormatted = integerClean ? parseInt(integerClean, 10).toLocaleString('es-AR') : '0';

    if (parts.length > 1) {
      const decimalClean = parts[1].replace(/\D/g, '').substring(0, 2);
      return `${isNegative ? '-' : ''}${integerFormatted},${decimalClean}`;
    }

    return `${isNegative ? '-' : ''}${integerFormatted}`;
  };

  const handleAddDeposit = (fundId: string) => {
    const cleanAmountStr = depositAmount.replace(/\./g, '').replace(',', '.');
    const val = parseFloat(cleanAmountStr);
    if (!depositAmount || isNaN(val) || val === 0) return;
    const fund = state.funds.find(f => f.id === fundId);
    if (!fund) return;

    const currentDeposits = fund.deposits || [{
      id: generateId(),
      amount: fund.amount,
      date: new Date().toISOString().split('T')[0],
      notes: 'Monto inicial'
    }];

    const newDeposit = {
      id: generateId(),
      amount: val,
      date: depositDate,
      notes: depositNotes.trim() || undefined
    };

    const updatedDeposits = [...currentDeposits, newDeposit];
    const newAmount = Math.max(0, updatedDeposits.reduce((sum, d) => sum + d.amount, 0));

    updateFund({
      ...fund,
      amount: newAmount,
      deposits: updatedDeposits
    });

    setDepositAmount('');
    setDepositNotes('');
    setDepositDate(new Date().toISOString().split('T')[0]);
  };

  const handleDeleteDeposit = (fundId: string, depositId: string) => {
    const fund = state.funds.find(f => f.id === fundId);
    if (!fund) return;

    const currentDeposits = fund.deposits || [{
      id: generateId(),
      amount: fund.amount,
      date: new Date().toISOString().split('T')[0],
      notes: 'Monto inicial'
    }];

    const updatedDeposits = currentDeposits.filter(d => d.id !== depositId);
    const newAmount = Math.max(0, updatedDeposits.reduce((sum, d) => sum + d.amount, 0));

    updateFund({
      ...fund,
      amount: newAmount,
      deposits: updatedDeposits
    });
  };

  // ── Fund handlers ──
  const resetFundForm = () => {
    setFundTitle(''); setFundAmount(''); setFundCurrency('ARS');
    setFundEmoji(0); setFundColor(0); setEditingFundId(null); setShowFundForm(false);
  };

  const handleEditFund = (fund: FundAllocation) => {
    setEditingFundId(fund.id);
    setFundTitle(fund.title);
    setFundAmount(fund.amount.toLocaleString('es-AR'));
    setFundCurrency(fund.currency || 'ARS');
    setFundEmoji(Math.max(0, FUND_EMOJIS.indexOf(fund.emoji)));
    setFundColor(Math.max(0, FUND_COLORS.indexOf(fund.color)));
    setShowFundForm(true);
  };

  const handleSaveFund = () => {
    const cleanAmountStr = fundAmount.replace(/\./g, '').replace(',', '.');
    if (!fundTitle || !fundAmount || isNaN(parseFloat(cleanAmountStr))) return;
    const amountVal = parseFloat(cleanAmountStr);
    
    if (editingFundId) {
      const existingFund = state.funds.find(f => f.id === editingFundId);
      if (existingFund) {
        const currentDeposits = existingFund.deposits || [{
          id: generateId(),
          amount: existingFund.amount,
          date: new Date().toISOString().split('T')[0],
          notes: 'Monto inicial'
        }];
        
        const totalDepositsSum = currentDeposits.reduce((sum, d) => sum + d.amount, 0);
        let finalDeposits = [...currentDeposits];
        
        if (amountVal !== totalDepositsSum) {
          const diff = amountVal - totalDepositsSum;
          finalDeposits.push({
            id: generateId(),
            amount: diff,
            date: new Date().toISOString().split('T')[0],
            notes: 'Ajuste de saldo manual'
          });
        }
        
        const fundData: FundAllocation = {
          ...existingFund,
          title: fundTitle,
          amount: amountVal,
          emoji: FUND_EMOJIS[fundEmoji],
          color: FUND_COLORS[fundColor],
          currency: fundCurrency,
          deposits: finalDeposits
        };
        updateFund(fundData);
      }
    } else {
      const deposits = amountVal > 0 ? [{
        id: generateId(),
        amount: amountVal,
        date: new Date().toISOString().split('T')[0],
        notes: 'Monto inicial'
      }] : [];
      
      const fundData: FundAllocation = {
        id: generateId(),
        title: fundTitle,
        amount: amountVal,
        emoji: FUND_EMOJIS[fundEmoji],
        color: FUND_COLORS[fundColor],
        currency: fundCurrency,
        deposits
      };
      addFund(fundData);
    }
    resetFundForm();
  };

  // ── Fund totals ──
  const fundTotals = useMemo(() => {
    const ars = state.funds.filter(f => f.currency === 'ARS').reduce((s, f) => s + f.amount, 0);
    const usd = state.funds.filter(f => f.currency === 'USD').reduce((s, f) => s + f.amount, 0);
    const eur = state.funds.filter(f => f.currency === 'EUR').reduce((s, f) => s + f.amount, 0);
    return { ars, usd, eur };
  }, [state.funds]);

  return (
    <div className="goals-page">
      {/* ── Header ── */}
      <header className="goals-page__header animate-slide-up">
        <div>
          <h1>{activeTab === 'goals' ? 'Metas de Ahorro' : 'Mis Fondos'}</h1>
          <p className="body-sm" style={{ color: 'var(--color-text-tertiary)', fontWeight: 600 }}>
            {activeTab === 'goals'
              ? `${state.goals.length} meta${state.goals.length !== 1 ? 's' : ''} activa${state.goals.length !== 1 ? 's' : ''}`
              : `${state.funds.length} fondo${state.funds.length !== 1 ? 's' : ''} registrado${state.funds.length !== 1 ? 's' : ''}`
            }
          </p>
        </div>
        <div className="goals-header-actions">
          <button
            className="goals-page__add-btn bounce-effect"
            onClick={() => {
              if (activeTab === 'goals') {
                if (showGoalForm) resetGoalForm(); else setShowGoalForm(true);
              } else {
                if (showFundForm) resetFundForm(); else setShowFundForm(true);
              }
            }}
            style={{
              transform: (activeTab === 'goals' ? showGoalForm : showFundForm) ? 'rotate(45deg)' : 'none',
              background: (activeTab === 'goals' ? showGoalForm : showFundForm) ? 'var(--color-error)' : 'var(--color-primary)',
            }}
            aria-label="Agregar"
          >
            <Plus size={24} />
          </button>
        </div>
      </header>

      {/* ── Tab Toggle ── */}
      <div className="goals-tab-toggle animate-slide-up">
        <button
          className={`goals-tab-btn bounce-effect ${activeTab === 'goals' ? 'goals-tab-btn--active' : ''}`}
          onClick={() => { setActiveTab('goals'); resetFundForm(); }}
        >
          <Target size={16} />
          Metas
        </button>
        <button
          className={`goals-tab-btn bounce-effect ${activeTab === 'funds' ? 'goals-tab-btn--active' : ''}`}
          onClick={() => { setActiveTab('funds'); resetGoalForm(); }}
        >
          <Wallet size={16} />
          Fondos
        </button>
      </div>

      {/* ════════════════════════════════
          GOALS TAB
      ════════════════════════════════ */}
      {activeTab === 'goals' && (
        <>
          {/* Goal Form */}
          {showGoalForm && (
            <div className="goal-form-glass animate-scale-in">
              <h3>{editingGoalId ? 'Editar Meta' : 'Nueva Meta'}</h3>
              <div className="goal-form__section">
                <label className="goal-form__label">¿Qué estás ahorrando?</label>
                <input
                  type="text" className="goal-form__input"
                  placeholder="Ej: Viaje a Japón, Auto nuevo..."
                  value={goalTitle} onChange={e => setGoalTitle(e.target.value)} maxLength={30}
                />
              </div>
              <div className="goal-form__section">
                <label className="goal-form__label">Monto Objetivo</label>
                <div className="goal-form__row">
                  <input
                    type="number" className="goal-form__input"
                    placeholder="0.00" value={goalTarget}
                    onChange={e => setGoalTarget(e.target.value)}
                  />
                  <select className="goal-form__select bounce-effect" value={goalCurrency}
                    onChange={e => setGoalCurrency(e.target.value as 'ARS' | 'USD' | 'EUR')}>
                    <option value="ARS">ARS</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                  </select>
                </div>
              </div>
              <div className="goal-form__section">
                <label className="goal-form__label">Elegí un ícono</label>
                <div className="goal-form__emojis">
                  {GOAL_EMOJIS.map((emoji, i) => (
                    <button key={emoji}
                      className={`goal-form__emoji-btn bounce-effect ${goalEmoji === i ? 'goal-form__emoji-btn--active' : ''}`}
                      onClick={() => setGoalEmoji(i)}>{emoji}</button>
                  ))}
                </div>
              </div>
              <div className="goal-form__section">
                <label className="goal-form__label">Color de la meta</label>
                <div className="goal-form__colors">
                  {GOAL_COLORS.map((color, i) => (
                    <button key={color}
                      className={`goal-form__color-btn bounce-effect ${goalColor === i ? 'goal-form__color-btn--active' : ''}`}
                      style={{ backgroundColor: color }} onClick={() => setGoalColor(i)} />
                  ))}
                </div>
              </div>
              <div className="goal-form__section">
                <label className="goal-form__label">📅 Fecha límite (opcional)</label>
                <input
                  type="date"
                  className="goal-form__input"
                  value={goalDeadline}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={e => setGoalDeadline(e.target.value)}
                />
              </div>
              <div className="goal-form__actions">
                <button className="goal-form__cancel bounce-effect" onClick={resetGoalForm}>Cancelar</button>
                <button className="goal-form__submit bounce-effect" onClick={handleSaveGoal}
                  disabled={!goalTitle || !goalTarget}>
                  {editingGoalId ? 'Guardar Cambios' : 'Crear Meta'}
                </button>
              </div>
            </div>
          )}

          {/* Goals List */}
          <div className="goals-list">
            {state.goals.map((goal, i) => {
              const progress = Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);
              const isComplete = progress >= 100;
              const displayCurrency = goal.currency || 'ARS';
              return (
                <div key={goal.id}
                  className={`goal-card-glass animate-slide-up stagger-${Math.min(i + 1, 5)}`}
                  style={{ '--goal-color': goal.color } as React.CSSProperties}>
                  <div className="goal-card__header">
                    <div className="goal-card__emoji-container">
                      <span className="goal-card__emoji">{goal.emoji}</span>
                    </div>
                    <div className="goal-card__info">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <h3 className="goal-card__title">{goal.title}</h3>
                        {isComplete && (
                          <span className="goal-complete-pill animate-scale-in">
                            🎯 ¡Meta cumplida!
                          </span>
                        )}
                      </div>
                      <div className="goal-card__amounts">
                        <span className="goal-card__current">{formatCurrency(goal.currentAmount, displayCurrency)}</span>
                        <span className="goal-card__target"> de {formatCurrency(goal.targetAmount, displayCurrency)}</span>
                      </div>
                    </div>
                    <div className="goal-card__percent">{isComplete ? '🎉' : `${Math.round(progress)}%`}</div>
                  </div>

                  <div className="goal-card__progress-container">
                    <div className="goal-card__progress-track">
                      <div className="goal-card__progress-fill" style={{ width: `${progress}%` }} />
                    </div>
                    {goal.deadline && (() => {
                      const dr = getDaysRemaining(goal.deadline);
                      return (
                        <div
                          className="goal-deadline-badge"
                          style={{
                            color: dr.urgent ? '#ef4444' : 'var(--color-text-secondary)',
                            background: dr.urgent ? 'rgba(239,68,68,0.1)' : 'var(--color-surface-container)',
                          }}
                        >
                          ⏱ {dr.label}
                        </div>
                      );
                    })()}
                  </div>

                  <div className="goal-card__actions">
                    {addAmountGoalId === goal.id ? (
                      <div className="goal-add-inline animate-scale-in">
                        <input type="number" className="goal-add-input" placeholder="Monto (negativo = retirar)"
                          value={addAmount} onChange={e => setAddAmount(e.target.value)} autoFocus />
                        <button className={`goal-add-confirm bounce-effect ${addAmount && parseFloat(addAmount) < 0 ? 'goal-add-confirm--withdraw' : ''}`}
                          onClick={() => handleAddToGoal(goal.id)} disabled={!addAmount || parseFloat(addAmount) === 0}>
                          {addAmount && parseFloat(addAmount) < 0 ? 'Retirar' : 'Sumar'}
                        </button>
                        <button className="goal-add-cancel bounce-effect"
                          onClick={() => { setAddAmountGoalId(null); setAddAmount(''); }}>
                          <X size={18} />
                        </button>
                      </div>
                    ) : (
                      <>
                        <button className="goal-card__add-btn bounce-effect"
                          onClick={() => setAddAmountGoalId(goal.id)}>
                          <PiggyBank size={18} style={{ color: goal.color }} />
                          {isComplete ? 'Ajustar saldo' : 'Ahorrar ahora'}
                        </button>
                        <button className="goal-card__delete-btn bounce-effect"
                          onClick={() => handleEditGoal(goal)} aria-label="Editar"
                          style={{ marginRight: '8px', color: 'var(--color-text-secondary)' }}>
                          <Pencil size={18} />
                        </button>
                        <button className="goal-card__delete-btn bounce-effect"
                          onClick={() => setPendingDelete({ type: 'goal', id: goal.id })} aria-label="Eliminar">
                          <Trash2 size={18} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}

            {state.goals.length === 0 && !showGoalForm && (
              <div className="empty-state animate-fade-in">
                <span className="empty-state__emoji">🎯</span>
                <p>Aún no tenés metas</p>
                <p className="body-sm" style={{ marginTop: '4px', opacity: 0.7 }}>
                  Definí un objetivo y empezá a ahorrar para cumplirlo.
                </p>
                <button className="goal-form__submit bounce-effect"
                  style={{ marginTop: '20px', width: 'auto', padding: '10px 24px' }}
                  onClick={() => setShowGoalForm(true)}>
                  Crear mi primera meta
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {/* ════════════════════════════════
          FUNDS TAB
      ════════════════════════════════ */}
      {activeTab === 'funds' && (
        <>
          {/* Fund totals summary card */}
          {state.funds.length > 0 && (
            <div className="fund-summary-card animate-scale-in">
              <div className="fund-summary__icon">
                <TrendingUp size={22} color="white" />
              </div>
              <div className="fund-summary__content">
                <p className="fund-summary__label">Total distribuido</p>
                <div className="fund-summary__amounts">
                  {fundTotals.ars > 0 && (
                    <span className="fund-summary__value">{formatCurrency(fundTotals.ars, 'ARS')}</span>
                  )}
                  {fundTotals.usd > 0 && (
                    <span className="fund-summary__value fund-summary__value--usd">
                      {formatCurrency(fundTotals.usd, 'USD')}
                    </span>
                  )}
                  {fundTotals.eur > 0 && (
                    <span className="fund-summary__value fund-summary__value--usd" style={{ color: '#6366f1', borderColor: '#6366f1' }}>
                      {formatCurrency(fundTotals.eur, 'EUR')}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Fund Form */}
          {showFundForm && (
            <div className="goal-form-glass animate-scale-in">
              <h3>{editingFundId ? 'Editar Fondo' : 'Nuevo Fondo'}</h3>
              <div className="goal-form__section">
                <label className="goal-form__label">Nombre del fondo</label>
                <input type="text" className="goal-form__input"
                  placeholder="Ej: Cocos Capital, Tarjeta Visa..."
                  value={fundTitle} onChange={e => setFundTitle(e.target.value)} maxLength={30} />
              </div>
              <div className="goal-form__section">
                <label className="goal-form__label">Monto asignado</label>
                <div className="goal-form__row">
                  <input type="text" inputMode="numeric" className="goal-form__input"
                    placeholder="0" value={fundAmount}
                    onChange={e => setFundAmount(formatNumberWithSeparators(e.target.value))} />
                  <select className="goal-form__select bounce-effect" value={fundCurrency}
                    onChange={e => setFundCurrency(e.target.value as 'ARS' | 'USD' | 'EUR')}>
                    <option value="ARS">ARS</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                  </select>
                </div>
              </div>
              <div className="goal-form__section">
                <label className="goal-form__label">Elegí un ícono</label>
                <div className="goal-form__emojis">
                  {FUND_EMOJIS.map((emoji, i) => (
                    <button key={emoji}
                      className={`goal-form__emoji-btn bounce-effect ${fundEmoji === i ? 'goal-form__emoji-btn--active' : ''}`}
                      onClick={() => setFundEmoji(i)}>{emoji}</button>
                  ))}
                </div>
              </div>
              <div className="goal-form__section">
                <label className="goal-form__label">Color del fondo</label>
                <div className="goal-form__colors">
                  {FUND_COLORS.map((color, i) => (
                    <button key={color}
                      className={`goal-form__color-btn bounce-effect ${fundColor === i ? 'goal-form__color-btn--active' : ''}`}
                      style={{ backgroundColor: color }} onClick={() => setFundColor(i)} />
                  ))}
                </div>
              </div>
              <div className="goal-form__actions">
                <button className="goal-form__cancel bounce-effect" onClick={resetFundForm}>Cancelar</button>
                <button className="goal-form__submit bounce-effect" onClick={handleSaveFund}
                  disabled={!fundTitle || !fundAmount}>
                  {editingFundId ? 'Guardar Cambios' : 'Crear Fondo'}
                </button>
              </div>
            </div>
          )}

          {/* Funds List */}
          <div className="goals-list">
            {state.funds.map((fund, i) => (
              <div key={fund.id}
                className={`fund-card animate-slide-up ${expandedFundId === fund.id ? 'fund-card--expanded' : ''} stagger-${Math.min(i + 1, 5)}`}
                onClick={(e) => {
                  const target = e.target as HTMLElement;
                  if (target.closest('button') || target.closest('input') || target.closest('select')) return;
                  setExpandedFundId(expandedFundId === fund.id ? null : fund.id);
                }}
                style={{ 
                  '--fund-color': fund.color,
                  cursor: 'pointer'
                } as React.CSSProperties}>
                <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                  <div className="fund-card__left">
                    <div className="fund-card__emoji-container">
                      <span>{fund.emoji}</span>
                    </div>
                    <div className="fund-card__info">
                      <h3 className="fund-card__title">{fund.title}</h3>
                      <p className="fund-card__currency">{fund.currency}</p>
                    </div>
                  </div>
                  <div className="fund-card__right">
                    <span className="fund-card__amount">
                      {formatCurrency(fund.amount, fund.currency)}
                    </span>
                    <div className="fund-card__actions">
                      <button className="goal-card__delete-btn bounce-effect"
                        onClick={() => {
                          setExpandedFundId(expandedFundId === fund.id ? null : fund.id);
                        }} aria-label="Ver detalles"
                        style={{ color: 'var(--color-text-secondary)', transform: expandedFundId === fund.id ? 'rotate(180deg)' : 'none', transition: 'all 0.2s' }}>
                        <PiggyBank size={16} />
                      </button>
                      <button className="goal-card__delete-btn bounce-effect"
                        onClick={() => handleEditFund(fund)} aria-label="Editar"
                        style={{ color: 'var(--color-text-secondary)' }}>
                        <Pencil size={16} />
                      </button>
                      <button className="goal-card__delete-btn bounce-effect"
                        onClick={() => setPendingDelete({ type: 'fund', id: fund.id })} aria-label="Eliminar">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>

                {expandedFundId === fund.id && (
                  <div className="fund-details animate-scale-in" style={{ width: '100%', marginTop: '16px', borderTop: '1px solid var(--color-glass-border)', paddingTop: '16px' }} onClick={e => e.stopPropagation()}>
                    <h4 style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-secondary)', marginBottom: '10px' }}>
                      Historial de Asignaciones
                    </h4>
                    
                    <div className="fund-deposits-list" style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px', width: '100%' }}>
                      {(fund.deposits || (fund.amount > 0 ? [{ id: 'initial', amount: fund.amount, date: new Date().toISOString().split('T')[0], notes: 'Monto inicial' }] : [])).map((dep) => (
                        <div key={dep.id} className="fund-deposit-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--color-surface-container-low)', padding: '8px 12px', borderRadius: '10px', fontSize: '13px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                            <span style={{ fontWeight: 600, color: 'var(--color-text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{dep.notes || 'Asignación'}</span>
                            <span style={{ fontSize: '11px', color: 'var(--color-text-tertiary)' }}>{dep.date}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                            <span style={{ fontWeight: 700, color: dep.amount >= 0 ? '#10b981' : '#ef4444' }}>
                              {dep.amount >= 0 ? '+' : ''}{formatCurrency(dep.amount, fund.currency)}
                            </span>
                            <button 
                              className="goal-card__delete-btn bounce-effect"
                              onClick={() => handleDeleteDeposit(fund.id, dep.id)}
                              style={{ padding: '2px', color: 'var(--color-text-tertiary)' }}
                              aria-label="Eliminar asignación"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                      {(!fund.deposits || fund.deposits.length === 0) && fund.amount === 0 && (
                        <p style={{ fontSize: '13px', color: 'var(--color-text-tertiary)', fontStyle: 'italic', textAlign: 'center', margin: '8px 0' }}>
                          No hay asignaciones de dinero registradas.
                        </p>
                      )}
                    </div>

                    <div className="fund-add-deposit-form" style={{ background: 'var(--color-surface-container)', padding: '12px', borderRadius: '14px', display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', boxSizing: 'border-box' }}>
                      <h5 style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-secondary)', marginBottom: '2px' }}>
                        Asignar Dinero
                      </h5>
                      <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                        <input 
                          type="text" 
                          inputMode="numeric"
                          className="goal-form__input" 
                          placeholder="Monto (+ o -)"
                          value={depositAmount}
                          onChange={e => setDepositAmount(formatNumberWithSeparators(e.target.value))}
                          style={{ flex: 1, padding: '8px 10px', fontSize: '13px' }}
                        />
                        <input 
                          type="date" 
                          className="goal-form__input" 
                          value={depositDate}
                          onChange={e => setDepositDate(e.target.value)}
                          style={{ width: '130px', padding: '8px 10px', fontSize: '13px' }}
                        />
                      </div>
                      <div style={{ display: 'flex', gap: '8px', width: '100%', alignItems: 'center' }}>
                        <input 
                          type="text" 
                          className="goal-form__input" 
                          placeholder="Notas (ej: Ingreso, Pilates...)"
                          value={depositNotes}
                          onChange={e => setDepositNotes(e.target.value)}
                          maxLength={40}
                          style={{ flex: 1, padding: '8px 10px', fontSize: '13px' }}
                        />
                        <button 
                          className="goal-form__submit bounce-effect"
                          onClick={() => handleAddDeposit(fund.id)}
                          disabled={!depositAmount || parseFloat(depositAmount) === 0}
                          style={{ width: 'auto', padding: '8px 16px', fontSize: '13px', borderRadius: '10px', margin: 0 }}
                        >
                          Asignar
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {state.funds.length === 0 && !showFundForm && (
              <div className="empty-state animate-fade-in">
                <span className="empty-state__emoji">💼</span>
                <p>Sin fondos registrados</p>
                <p className="body-sm" style={{ marginTop: '4px', opacity: 0.7 }}>
                  Registrá a qué destino pertenece cada monto de dinero.
                </p>
                <button className="goal-form__submit bounce-effect"
                  style={{ marginTop: '20px', width: 'auto', padding: '10px 24px' }}
                  onClick={() => setShowFundForm(true)}>
                  Registrar mi primer fondo
                </button>
              </div>
            )}
          </div>
        </>
      )}

      <ConfirmModal
        isOpen={pendingDelete !== null}
        title={pendingDelete?.type === 'goal' ? 'Eliminar meta' : 'Eliminar fondo'}
        message={pendingDelete?.type === 'goal'
          ? '¿Estás seguro de que querés eliminar esta meta? Todo el progreso se perderá.'
          : '¿Estás seguro de que querés eliminar este fondo?'}
        confirmLabel="Sí, eliminar"
        onConfirm={() => {
          if (pendingDelete?.type === 'goal') deleteGoal(pendingDelete.id);
          else if (pendingDelete?.type === 'fund') deleteFund(pendingDelete.id);
          setPendingDelete(null);
        }}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
