import { useState, useMemo, useEffect } from 'react';
import { Trash2, Search, Pencil, Calendar, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getCategoryConfig } from '../types';
import { formatDate, getMonthName, getUniqueMonths, isDateInRange } from '../utils';
import './Income.css';

interface IncomeProps {
  onEdit?: (transaction: any) => void;
  initialFilters?: { month?: string; start?: string; end?: string };
}

export default function Income({ onEdit, initialFilters }: IncomeProps) {
  const { state, convertToDisplay, formatCurrency: appFormatCurrency, deleteTransaction } = useApp();
  const [search, setSearch] = useState('');
  const [isCustomRange, setIsCustomRange] = useState(false);
  
  const [filterMonth, setFilterMonth] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
  });

  const [dateRange, setDateRange] = useState({
    start: new Date().toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });

  // Handle initial filters from navigation
  useEffect(() => {
    if (initialFilters) {
      if (initialFilters.month) {
        setFilterMonth(initialFilters.month);
        setIsCustomRange(false);
      } else if (initialFilters.start && initialFilters.end) {
        setDateRange({ start: initialFilters.start, end: initialFilters.end });
        setIsCustomRange(true);
      }
    }
  }, [initialFilters]);

  const incomes = useMemo(() => {
    let filtered = state.transactions.filter(t => t.type === 'income');
    
    if (isCustomRange) {
      filtered = filtered.filter(t => isDateInRange(t.date, dateRange.start, dateRange.end));
    } else if (filterMonth) {
      filtered = filtered.filter(t => t.date.startsWith(filterMonth));
    }

    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(t =>
        t.description.toLowerCase().includes(q) ||
        getCategoryConfig(t.category).label.toLowerCase().includes(q)
      );
    }

    return filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [state.transactions, filterMonth, search, isCustomRange, dateRange]);

  // Group incomes by date for better readability
  const groupedIncomes = useMemo(() => {
    const groups: { [date: string]: any[] } = {};
    incomes.forEach(income => {
      const date = income.date;
      if (!groups[date]) groups[date] = [];
      groups[date].push(income);
    });
    return Object.entries(groups).sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime());
  }, [incomes]);

  const monthOptions = useMemo(() => {
    return getUniqueMonths(state.transactions.filter(t => t.type === 'income'));
  }, [state.transactions]);

  const filteredTotalIncome = useMemo(() => {
    return incomes.reduce((sum, t) => sum + convertToDisplay(t.amount, t.currency), 0);
  }, [incomes, convertToDisplay]);

  const handleDelete = (id: string) => {
    deleteTransaction(id);
  };

  const resetFilters = () => {
    setSearch('');
    setIsCustomRange(false);
    const d = new Date();
    setFilterMonth(`${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`);
  };

  const hasActiveFilters = search !== '' || isCustomRange;

  const getSummaryLabel = () => {
    if (isCustomRange) {
      return `Ingresos del período`;
    }
    return `Ingresos de ${getMonthName(filterMonth)}`;
  };

  return (
    <div className="income-page">
      <header className="income-page__header animate-slide-up">
        <div className="header-top-row">
          <h1>Ingresos</h1>
          {hasActiveFilters && (
            <button className="clear-filters-btn bounce-effect" onClick={resetFilters}>
              <X size={12} style={{ marginRight: '4px' }} />
              Limpiar
            </button>
          )}
        </div>
        <p className="body-sm" style={{ color: 'var(--color-text-tertiary)', fontWeight: 600 }}>
          {incomes.length} registro{incomes.length !== 1 ? 's' : ''}
        </p>
      </header>

      <section className="filters-section">
        {/* Date Range Glass Filter */}
        <div className="glass-filter-card animate-slide-up stagger-1">
          <div className="range-filter-toggle">
            <button 
              className={`range-toggle-btn bounce-effect ${!isCustomRange ? 'range-toggle-btn--active' : ''}`}
              onClick={() => setIsCustomRange(false)}
            >
              Mensual
            </button>
            <button 
              className={`range-toggle-btn bounce-effect ${isCustomRange ? 'range-toggle-btn--active' : ''}`}
              onClick={() => setIsCustomRange(true)}
            >
              Personalizado
            </button>
          </div>

          {!isCustomRange ? (
            <div className="month-selector-wrapper">
              <select 
                className="month-filter--full bounce-effect"
                value={filterMonth}
                onChange={e => setFilterMonth(e.target.value)}
              >
                {monthOptions.length > 0 ? (
                  monthOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))
                ) : (
                  <option value="">No hay registros</option>
                )}
              </select>
            </div>
          ) : (
            <div className="custom-range-inputs">
              <div className="range-input-wrapper">
                <label>Desde</label>
                <input 
                  type="date" 
                  className="range-input"
                  value={dateRange.start}
                  onChange={e => setDateRange({ ...dateRange, start: e.target.value })}
                />
              </div>
              <div className="range-separator">-</div>
              <div className="range-input-wrapper">
                <label>Hasta</label>
                <input 
                  type="date" 
                  className="range-input"
                  value={dateRange.end}
                  onChange={e => setDateRange({ ...dateRange, end: e.target.value })}
                />
              </div>
            </div>
          )}
        </div>

        {/* Glass Search Bar */}
        <div className="search-container-glass animate-slide-up stagger-2">
          <Search size={18} style={{ color: 'var(--color-primary)' }} />
          <input
            type="text"
            className="search-input-glass"
            placeholder="Buscar ingresos por descripción..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </section>

      {/* Summary Card with Income Gradient */}
      <div className="income-summary-card animate-slide-up stagger-3">
        <div className="income-summary-card__label">{getSummaryLabel()}</div>
        <div className="income-summary-card__amount">
          {appFormatCurrency(filteredTotalIncome)}
        </div>
      </div>

      {/* Grouped Income List */}
      <div className="income-list-container">
        {groupedIncomes.map(([date, items], groupIndex) => (
          <div key={date} className={`income-group animate-slide-up stagger-${Math.min(groupIndex + 4, 6)}`}>
            <div className="income-group__date">
              <Calendar size={12} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
              {formatDate(date)}
            </div>
            <div className="income-items-container">
              {items.map((t) => {
                const cat = getCategoryConfig(t.category);
                return (
                  <div key={t.id} className="income-item-glass bounce-effect">
                    <div className="income-item__icon" style={{ backgroundColor: `${cat.color}20` }}>
                      <span>{cat.emoji}</span>
                    </div>
                    <div className="income-item__info">
                      <div className="income-item__desc">{t.description}</div>
                      <div className="income-item__meta">
                        <span className="income-item__category">{cat.label}</span>
                        <span className="income-item__dot">·</span>
                        <span className="income-item__method">
                          {t.paymentMethod === 'credit' ? 'Crédito' : 
                           t.paymentMethod === 'debit' ? 'Débito' : 
                           t.paymentMethod === 'cash' ? 'Efectivo' : 
                           t.paymentMethod === 'transfer' ? 'Transferencia' : 'Efectivo'}
                        </span>
                      </div>
                    </div>
                    <div className="income-amount-section">
                      <div className="income-item__amount">
                        +{appFormatCurrency(t.amount, t.currency)}
                      </div>
                      {t.currency === 'USD' && <span className="currency-badge-glass">USD</span>}
                    </div>
                    <div className="income-item__actions">
                      <button
                        className="income-action-btn bounce-effect"
                        onClick={() => onEdit?.(t)}
                        aria-label="Editar"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        className="income-action-btn income-action-btn--delete bounce-effect"
                        onClick={() => handleDelete(t.id)}
                        aria-label="Eliminar"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {incomes.length === 0 && (
          <div className="empty-state animate-fade-in">
            <span className="empty-state__emoji">💰</span>
            <p>No se encontraron ingresos</p>
            <p className="body-sm" style={{ marginTop: '4px', opacity: 0.7 }}>
              Probá ajustando los filtros o agregá uno nuevo.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
