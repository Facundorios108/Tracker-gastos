import { useState } from 'react';
import { TrendingUp, TrendingDown, ArrowRight, Pencil, ChevronRight, PieChart } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getCategoryConfig } from '../types';
import { formatDate } from '../utils';
import './Dashboard.css';

interface DashboardProps {
  onNavigate: (tab: any, filters?: any) => void;
  onEdit?: (transaction: any) => void;
}

export default function Dashboard({ onNavigate, onEdit }: DashboardProps) {
  const { state, monthlyIncome, monthlyExpenses, monthlyBalance, formatCurrency, updateSettings } = useApp();

  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [tempBudget, setTempBudget] = useState(state.settings.monthlyBudget ? state.settings.monthlyBudget.toLocaleString('es-AR') : '0');

  const handleEditBudget = () => {
    setTempBudget(state.settings.monthlyBudget ? state.settings.monthlyBudget.toLocaleString('es-AR') : '0');
    setIsEditingBudget(true);
  };

  const saveBudget = () => {
    const val = parseFloat(tempBudget.replace(/\./g, ''));
    if (!isNaN(val) && val >= 0) {
      updateSettings({ monthlyBudget: val });
      setIsEditingBudget(false);
    }
  };

  const recentTransactions = state.transactions.slice(0, 5);



  const budgetUsed = state.settings.monthlyBudget > 0
    ? Math.min((monthlyExpenses / state.settings.monthlyBudget) * 100, 100)
    : 0;
  
  const remainingBudget = Math.max(state.settings.monthlyBudget - monthlyExpenses, 0);

  const navigateWithMonth = (tab: 'expenses' | 'income', categoryId?: string) => {
    const d = new Date();
    const month = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
    onNavigate('transactions', { type: tab, month, category: categoryId });
  };

  return (
    <div className="dashboard">
      {/* Quick Budget Edit Modal */}
      {isEditingBudget && (
        <div className="modal-backdrop" onClick={() => setIsEditingBudget(false)}>
          <div className="modal-sheet animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ width: 40 }} />
              <h3 className="modal-content__title">Presupuesto Mensual</h3>
              <button className="modal-header__close bounce-effect" onClick={() => setIsEditingBudget(false)}>
                <ChevronRight size={24} style={{ transform: 'rotate(90deg)' }} />
              </button>
            </div>
            <div className="modal-content">
              <div className="budget-input-container">
                <span className="budget-currency-symbol">{state.settings.displayCurrency === 'ARS' ? '$' : 'u$s'}</span>
                <input 
                  type="text" 
                  inputMode="numeric"
                  className="budget-input-field"
                  value={tempBudget}
                  onChange={e => {
                    const val = e.target.value.replace(/\D/g, '');
                    setTempBudget(val ? parseInt(val, 10).toLocaleString('es-AR') : '');
                  }}
                  autoFocus
                />
              </div>
              <button className="modal-submit--confirm bounce-effect" onClick={saveBudget}>
                Confirmar Presupuesto
              </button>
            </div>
          </div>
        </div>
      )}
  
      {/* ── Header ── */}
      <header className="dashboard__header animate-slide-up" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="dashboard__logo-header" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="brand-logo bounce-effect" style={{ width: '48px', height: '48px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', boxShadow: '0 8px 16px rgba(0,0,0,0.2)' }}>
            <img src="/logo.svg" alt="My Wallet" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '48px' }}>
            <span style={{ fontSize: '14px', color: 'var(--color-text-secondary)', fontWeight: 500, lineHeight: '1.2' }}>Bienvenido,</span>
            <span style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--color-text)', lineHeight: '1.2', marginTop: '2px' }}>
              {state.settings.name && state.settings.name !== 'Invitado' ? state.settings.name : (state.user?.displayName || 'Usuario')}
            </span>
          </div>
        </div>
      </header>
  
      {/* ── Balance Card ── */}
      <div className="balance-card animate-slide-up stagger-1">
        <div 
          style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px' }} 
          onClick={() => onNavigate('analytics')}
          className="bounce-effect"
        >
          <div className="balance-card__amount">
            {formatCurrency(monthlyBalance)}
          </div>
          <PieChart size={24} style={{ opacity: 0.8 }} />
        </div>
        
        <div className="balance-card__row">
          <div className="balance-card__stat bounce-effect" onClick={() => navigateWithMonth('income')}>
            <div className="balance-card__stat-icon">
              <TrendingUp size={20} color="#4ade80" />
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div className="balance-card__stat-label">Ingresos</div>
              <div className="balance-card__stat-value">{formatCurrency(monthlyIncome)}</div>
            </div>
          </div>
          <div className="balance-card__stat bounce-effect" onClick={() => navigateWithMonth('expenses')}>
            <div className="balance-card__stat-icon">
              <TrendingDown size={20} color="#f87171" />
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div className="balance-card__stat-label">Gastos</div>
              <div className="balance-card__stat-value">{formatCurrency(monthlyExpenses)}</div>
            </div>
          </div>
        </div>

        {/* Integrated Budget Widget */}
        <div className="budget-widget-inline">
          <div className="budget-progress__header">
            <span className="budget-progress__label">
              Disponible: {formatCurrency(remainingBudget)}
            </span>
            <button className="budget-progress__edit bounce-effect" onClick={handleEditBudget}>
              <Pencil size={14} />
            </button>
          </div>
          <div className="budget-progress__track">
            <div
              className="budget-progress__fill"
              style={{
                width: `${budgetUsed}%`,
                background: budgetUsed > 90 ? '#f87171' : budgetUsed > 70 ? '#fbbf24' : '#ffffff',
              }}
            />
          </div>
          <div className="budget-info-text" style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
            <span>
              {budgetUsed >= 100 
                ? '⚠️ Has superado tu presupuesto' 
                : `Has utilizado el ${Math.round(budgetUsed)}%`}
            </span>
            <span style={{ opacity: 0.7 }}>
              de {formatCurrency(state.settings.monthlyBudget)}
            </span>
          </div>
        </div>
      </div>

      {/* ── Recent Transactions ── */}
      <section className="dashboard__section animate-slide-up stagger-2">
        <div className="section-header">
          <h3>Movimientos</h3>
          <button className="section-header__link bounce-effect" onClick={() => onNavigate('transactions', { type: 'expenses' })}>
            Ver todos <ArrowRight size={14} />
          </button>
        </div>
        <div className="glass-container">
          <div className="transaction-list-premium">
            {recentTransactions.map((t) => {
              const cat = getCategoryConfig(t.category);
              return (
                <div key={t.id} className="transaction-item-premium bounce-effect" onClick={() => onEdit?.(t)}>
                  <div className="transaction-icon-box" style={{ backgroundColor: `${cat.color}15`, color: cat.color }}>
                    <span>{cat.emoji}</span>
                  </div>
                  <div className="transaction-details">
                    <div className="transaction-title">{t.description}</div>
                    <div className="transaction-subtitle">
                      <span>{cat.label}</span>
                      <span className="dot-separator" />
                      <span>{formatDate(t.date)}</span>
                    </div>
                  </div>
                  <div className="transaction-value-box">
                    <div className={`transaction-amount-premium ${t.type}`}>
                      {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount, t.currency)}
                    </div>
                    {t.currency === 'USD' && <span className="currency-tag">USD</span>}
                  </div>
                </div>
              );
            })}
            {recentTransactions.length === 0 && (
              <div className="empty-state">
                <span className="empty-state__emoji">✨</span>
                <p>No hay movimientos registrados este mes</p>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
