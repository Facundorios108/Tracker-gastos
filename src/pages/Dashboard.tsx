import { useState, useMemo } from 'react';
import { TrendingUp, TrendingDown, ArrowRight, Pencil, ChevronRight } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getCategoryConfig } from '../types';
import { formatDate } from '../utils';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import './Dashboard.css';

ChartJS.register(ArcElement, Tooltip, Legend);

interface DashboardProps {
  onNavigate: (tab: any, filters?: any) => void;
  onEdit?: (transaction: any) => void;
}

export default function Dashboard({ onNavigate, onEdit }: DashboardProps) {
  const { state, monthlyIncome, monthlyExpenses, monthlyBalance, formatCurrency, convertToDisplay, updateSettings } = useApp();

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

  const categoryBreakdown = useMemo(() => {
    const now = new Date();
    const monthExpenses = state.transactions.filter(t => {
      const d = new Date(t.date);
      return t.type === 'expense' && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });

    const byCategory = new Map<string, number>();
    monthExpenses.forEach(t => {
      const displayAmount = convertToDisplay(t.amount, t.currency);
      byCategory.set(t.category, (byCategory.get(t.category) || 0) + displayAmount);
    });

    const total = Array.from(byCategory.values()).reduce((sum, val) => sum + val, 0);
    return Array.from(byCategory.entries())
      .map(([catId, amount]) => ({
        ...getCategoryConfig(catId),
        amount,
        percentage: total > 0 ? Math.round((amount / total) * 100) : 0,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [state.transactions]);

  const chartData = useMemo(() => ({
    labels: categoryBreakdown.map(c => c.label),
    datasets: [{
      data: categoryBreakdown.map(c => c.amount),
      backgroundColor: categoryBreakdown.map(c => c.color),
      hoverBackgroundColor: categoryBreakdown.map(c => c.color),
      borderWidth: 0,
      borderRadius: 12,
      spacing: 6,
      cutout: '82%',
    }],
  }), [categoryBreakdown]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        enabled: true,
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        titleFont: { size: 14, weight: 'bold' as const, family: 'Outfit' },
        bodyFont: { size: 13, family: 'Outfit' },
        padding: 12,
        displayColors: true,
        boxPadding: 6,
        cornerRadius: 12,
        callbacks: {
          label: (ctx: any) => ` ${formatCurrency(ctx.parsed)}`,
        },
      },
    },
    animation: {
      animateRotate: true,
      animateScale: true,
      duration: 2000,
      easing: 'easeOutQuart' as const,
    },
  };

  const budgetUsed = state.settings.monthlyBudget > 0
    ? Math.min((monthlyExpenses / state.settings.monthlyBudget) * 100, 100)
    : 0;
  
  const remainingBudget = Math.max(state.settings.monthlyBudget - monthlyExpenses, 0);

  const navigateWithMonth = (tab: 'expenses' | 'income', categoryId?: string) => {
    const d = new Date();
    const month = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
    onNavigate(tab, { month, category: categoryId });
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
      <header className="dashboard__header animate-slide-up" style={{ justifyContent: 'center' }}>
        <div className="dashboard__logo-header" style={{ display: 'flex', alignItems: 'center' }}>
          <div className="brand-logo bounce-effect" style={{ width: '48px', height: '48px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', boxShadow: '0 8px 16px rgba(0,0,0,0.2)' }}>
            <img src="/logo.svg" alt="My Wallet" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        </div>
      </header>
  
      {/* ── Balance Card ── */}
      <div className="balance-card animate-slide-up stagger-1">
        <div>
          <div className="balance-card__amount">
            {formatCurrency(monthlyBalance)}
          </div>
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
          <button className="section-header__link bounce-effect" onClick={() => onNavigate('expenses')}>
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

      {/* ── Monthly Summary ── */}
      {categoryBreakdown.length > 0 && (
        <section className="dashboard__section animate-slide-up stagger-3">
          <div className="section-header">
            <h3>Distribución</h3>
          </div>
          <div className="glass-container">
            <div className="summary-card-premium">
              <div className="chart-wrapper-premium">
                {categoryBreakdown.length > 0 ? (
                  <Doughnut data={chartData} options={chartOptions} />
                ) : (
                  <div className="empty-chart-placeholder">No hay datos</div>
                )}
                <div className="chart-inner-data">
                  <span className="chart-inner-label">Egresos</span>
                  <span className="chart-inner-value">{formatCurrency(monthlyExpenses)}</span>
                </div>
              </div>
              <div className="breakdown-list" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                {categoryBreakdown.map(cat => (
                  <div 
                    key={cat.id} 
                    className="breakdown-item bounce-effect" 
                    onClick={() => navigateWithMonth('expenses', cat.id)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="breakdown-color" style={{ backgroundColor: cat.color }} />
                    <div className="breakdown-info">
                      <span className="breakdown-name">{cat.emoji} {cat.label}</span>
                      <div className="breakdown-meta">
                        <span className="breakdown-percent">{cat.percentage}%</span>
                        <span className="breakdown-amount">{formatCurrency(cat.amount)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── Savings Goals ── */}
      {state.goals.length > 0 && (
        <section className="dashboard__section animate-slide-up stagger-4">
          <div className="section-header">
            <h3>Tus Metas</h3>
            <button className="section-header__link bounce-effect" onClick={() => onNavigate('goals')}>
              Explorar <ChevronRight size={14} />
            </button>
          </div>
          <div className="goals-preview-row">
            {state.goals.map(goal => {
              const progress = Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);
              return (
                <div key={goal.id} className="goal-card-premium" style={{ '--goal-color': goal.color } as React.CSSProperties}>
                  <div className="goal-header-premium">
                    <div className="goal-emoji-box">
                      <span>{goal.emoji}</span>
                    </div>
                    <span className="goal-title-premium">{goal.title}</span>
                  </div>
                  <div className="goal-progress-box">
                    <div className="goal-progress-track">
                      <div
                        className="goal-progress-fill"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <div className="goal-footer-premium">
                      <span className="goal-current-amount">{formatCurrency(goal.currentAmount)}</span>
                      <span className="goal-target-amount">Objetivo: {formatCurrency(goal.targetAmount)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
