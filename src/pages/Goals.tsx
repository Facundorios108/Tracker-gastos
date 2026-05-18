import { useState, useMemo } from 'react';
import { Plus, Minus, Trash2, PiggyBank, Target, X, Pencil, Wallet, TrendingUp } from 'lucide-react';
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
  const { state, addGoal, updateGoal, deleteGoal, addToGoal, formatCurrency, addFund, updateFund, deleteFund, updateSettings } = useApp();

  const [activeTab, setActiveTab] = useState<Tab>('goals');

  // ── Goals state ──
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [goalTitle, setGoalTitle] = useState('');
  const [goalTarget, setGoalTarget] = useState('');
  const [goalCurrency, setGoalCurrency] = useState<'ARS' | 'USD'>('ARS');
  const [goalEmoji, setGoalEmoji] = useState(0);
  const [goalColor, setGoalColor] = useState(0);
  const [goalDeadline, setGoalDeadline] = useState('');
  const [addAmountGoalId, setAddAmountGoalId] = useState<string | null>(null);
  const [addAmount, setAddAmount] = useState('');
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);

  // ── Fund inline add/subtract state ──
  const [addAmountFundId, setAddAmountFundId] = useState<string | null>(null);
  const [addFundAmount, setAddFundAmount] = useState('');

  // ── Funds state ──
  const [showFundForm, setShowFundForm] = useState(false);
  const [fundTitle, setFundTitle] = useState('');
  const [fundAmount, setFundAmount] = useState('');
  const [fundCurrency, setFundCurrency] = useState<'ARS' | 'USD'>('ARS');
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
    const diff = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
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

  const handleAddToFund = (fundId: string) => {
    const val = parseFloat(addFundAmount);
    if (!addFundAmount || isNaN(val) || val === 0) return;
    const fund = state.funds.find(f => f.id === fundId);
    if (!fund) return;
    const newAmount = Math.max(0, fund.amount + val);
    updateFund({ ...fund, amount: newAmount });
    setAddFundAmount(''); setAddAmountFundId(null);
  };

  // ── Fund handlers ──
  const resetFundForm = () => {
    setFundTitle(''); setFundAmount(''); setFundCurrency('ARS');
    setFundEmoji(0); setFundColor(0); setEditingFundId(null); setShowFundForm(false);
  };

  const handleEditFund = (fund: FundAllocation) => {
    setEditingFundId(fund.id);
    setFundTitle(fund.title);
    setFundAmount(fund.amount.toString());
    setFundCurrency(fund.currency || 'ARS');
    setFundEmoji(Math.max(0, FUND_EMOJIS.indexOf(fund.emoji)));
    setFundColor(Math.max(0, FUND_COLORS.indexOf(fund.color)));
    setShowFundForm(true);
  };

  const handleSaveFund = () => {
    if (!fundTitle || !fundAmount || isNaN(parseFloat(fundAmount))) return;
    const fundData: FundAllocation = {
      id: editingFundId || generateId(),
      title: fundTitle,
      amount: parseFloat(fundAmount),
      emoji: FUND_EMOJIS[fundEmoji],
      color: FUND_COLORS[fundColor],
      currency: fundCurrency,
    };
    if (editingFundId) {
      updateFund(fundData);
    } else {
      addFund(fundData);
    }
    resetFundForm();
  };

  // ── Fund totals ──
  const fundTotals = useMemo(() => {
    const ars = state.funds.filter(f => f.currency === 'ARS').reduce((s, f) => s + f.amount, 0);
    const usd = state.funds.filter(f => f.currency === 'USD').reduce((s, f) => s + f.amount, 0);
    return { ars, usd };
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
                    onChange={e => setGoalCurrency(e.target.value as 'ARS' | 'USD')}>
                    <option value="ARS">ARS</option>
                    <option value="USD">USD</option>
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
                      <h3 className="goal-card__title">{goal.title}</h3>
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
                        {isComplete && (
                          <div className="goal-complete-badge"
                            style={{ color: 'var(--color-primary)', fontWeight: 700, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Target size={16} /> ¡Meta cumplida!
                          </div>
                        )}
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
                  <input type="number" className="goal-form__input"
                    placeholder="0.00" value={fundAmount}
                    onChange={e => setFundAmount(e.target.value)} />
                  <select className="goal-form__select bounce-effect" value={fundCurrency}
                    onChange={e => setFundCurrency(e.target.value as 'ARS' | 'USD')}>
                    <option value="ARS">ARS</option>
                    <option value="USD">USD</option>
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
                className={`fund-card animate-slide-up stagger-${Math.min(i + 1, 5)}`}
                style={{ '--fund-color': fund.color } as React.CSSProperties}>
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
                        setAddAmountFundId(addAmountFundId === fund.id ? null : fund.id);
                        setAddFundAmount('');
                      }} aria-label="Ajustar monto"
                      style={{ color: 'var(--color-text-secondary)' }}>
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
                {addAmountFundId === fund.id && (
                  <div className="goal-add-inline animate-scale-in" style={{ marginTop: '12px' }}>
                    <input type="number" className="goal-add-input" placeholder="Monto (negativo = retirar)"
                      value={addFundAmount} onChange={e => setAddFundAmount(e.target.value)} autoFocus />
                    <button className={`goal-add-confirm bounce-effect ${addFundAmount && parseFloat(addFundAmount) < 0 ? 'goal-add-confirm--withdraw' : ''}`}
                      onClick={() => handleAddToFund(fund.id)} disabled={!addFundAmount || parseFloat(addFundAmount) === 0}>
                      {addFundAmount && parseFloat(addFundAmount) < 0 ? 'Retirar' : 'Sumar'}
                    </button>
                    <button className="goal-add-cancel bounce-effect"
                      onClick={() => { setAddAmountFundId(null); setAddFundAmount(''); }}>
                      <X size={18} />
                    </button>
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
