import { useState, useMemo, useEffect } from 'react';
import { Search, Trash2, Pencil, CreditCard, Banknote, Landmark, Smartphone } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getCategoryConfig } from '../types';
import { formatDateFull, getUniqueMonths, isDateInRange } from '../utils';
import './Expenses.css';

interface ExpensesProps {
  onEdit?: (transaction: any) => void;
  initialFilters?: { month?: string; start?: string; end?: string; category?: string };
}

export default function Expenses({ onEdit, initialFilters }: ExpensesProps) {
  const { state, deleteTransaction, convertToDisplay, formatCurrency } = useApp();
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [filterPaymentMethod, setFilterPaymentMethod] = useState<string | null>(null);
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
      if (initialFilters.category) {
        setFilterCategory(initialFilters.category);
      }
      if (initialFilters.month) {
        setFilterMonth(initialFilters.month);
        setIsCustomRange(false);
      } else if (initialFilters.start && initialFilters.end) {
        setDateRange({ start: initialFilters.start, end: initialFilters.end });
        setIsCustomRange(true);
      }
    }
  }, [initialFilters]);

  const expenses = useMemo(() => {
    let filtered = state.transactions.filter(t => t.type === 'expense');
    
    // Filter by Date
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
    if (filterCategory) {
      filtered = filtered.filter(t => t.category === filterCategory);
    }
    if (filterPaymentMethod) {
      filtered = filtered.filter(t => t.paymentMethod === filterPaymentMethod);
    }
    return filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [state.transactions, search, filterCategory, filterPaymentMethod, filterMonth, isCustomRange, dateRange]);

  // Group by date
  const grouped = useMemo(() => {
    const groups: { dateKey: string; dateLabel: string; items: typeof expenses; total: number }[] = [];
    const map = new Map<string, typeof expenses>();
    expenses.forEach(t => {
      const key = new Date(t.date).toDateString();
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    });
    map.forEach((items, dateKey) => {
      groups.push({
        dateKey,
        dateLabel: formatDateFull(items[0].date),
        items,
        total: items.reduce((s, t) => s + convertToDisplay(t.amount, t.currency), 0),
      });
    });
    return groups;
  }, [expenses]);

  // Unique months available in transactions
  const monthOptions = useMemo(() => {
    return getUniqueMonths(state.transactions.filter(t => t.type === 'expense'));
  }, [state.transactions]);

  // Unique categories in expenses
  const activeCategories = useMemo(() => {
    const cats = new Set(state.transactions.filter(t => t.type === 'expense').map(t => t.category));
    return Array.from(cats).map(getCategoryConfig);
  }, [state.transactions]);

  const handleDelete = (id: string) => {
    deleteTransaction(id);
  };

  const resetFilters = () => {
    setSearch('');
    setFilterCategory(null);
    setFilterPaymentMethod(null);
    setIsCustomRange(false);
    const d = new Date();
    setFilterMonth(`${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`);
  };

  const hasActiveFilters = search !== '' || filterCategory !== null || filterPaymentMethod !== null || isCustomRange;

  return (
    <div className="expenses-page">
      <header className="expenses-page__header animate-slide-up">
        <div className="header-top-row">
          <h1>Mis Gastos</h1>
          {hasActiveFilters && (
            <button className="clear-filters-btn bounce-effect" onClick={resetFilters}>
              Limpiar filtros
            </button>
          )}
        </div>
        <p className="expenses-page__subtitle body-sm">
          {expenses.length} movimiento{expenses.length !== 1 ? 's' : ''} registrado{expenses.length !== 1 ? 's' : ''}
        </p>
      </header>

      {/* Date Range Filter */}
      <div className="range-filter-container animate-slide-up stagger-1">
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
            {monthOptions.length > 0 ? (
              <select 
                className="month-filter--full bounce-effect"
                value={filterMonth}
                onChange={e => setFilterMonth(e.target.value)}
              >
                {monthOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            ) : (
              <p className="body-sm" style={{ textAlign: 'center', color: 'var(--color-text-tertiary)', padding: '10px' }}>
                No hay movimientos registrados
              </p>
            )}
          </div>
        ) : (
          <div className="custom-range-inputs">
            <div className="range-input-wrapper">
              <label>Desde</label>
              <input 
                type="date" 
                className="range-input bounce-effect"
                value={dateRange.start}
                onChange={e => setDateRange({ ...dateRange, start: e.target.value })}
              />
            </div>
            <div className="range-separator">-</div>
            <div className="range-input-wrapper">
              <label>Hasta</label>
              <input 
                type="date" 
                className="range-input bounce-effect"
                value={dateRange.end}
                onChange={e => setDateRange({ ...dateRange, end: e.target.value })}
              />
            </div>
          </div>
        )}
      </div>

      {/* Search Bar */}
      <div className="expenses-filters animate-slide-up stagger-2">
        <div className="search-bar">
          <Search size={18} className="search-bar__icon" />
          <input
            type="text"
            className="search-bar__input"
            placeholder="Buscar por descripción..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            id="search-expenses"
          />
        </div>
      </div>

      {/* Payment Method Filters */}
      <div className="filter-chips animate-slide-up stagger-3" style={{ marginBottom: '12px' }}>
        <button
          className={`filter-chip bounce-effect ${filterPaymentMethod === null ? 'filter-chip--active' : ''}`}
          onClick={() => setFilterPaymentMethod(null)}
        >
          Todos
        </button>
        {[
          { id: 'cash', label: 'Efectivo', icon: <Banknote size={14} /> },
          { id: 'debit', label: 'Débito', icon: <Landmark size={14} /> },
          { id: 'credit', label: 'Crédito', icon: <CreditCard size={14} /> },
          { id: 'transfer', label: 'Transferencia', icon: <Smartphone size={14} /> },
        ].map(pm => (
          <button
            key={pm.id}
            className={`filter-chip bounce-effect ${filterPaymentMethod === pm.id ? 'filter-chip--active' : ''}`}
            onClick={() => setFilterPaymentMethod(filterPaymentMethod === pm.id ? null : pm.id)}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px',
              '--chip-color': 'var(--color-primary)'
            } as React.CSSProperties}
          >
            {pm.icon} {pm.label}
          </button>
        ))}
      </div>

      {/* Category Filters */}
      {activeCategories.length > 0 && (
        <div className="filter-chips animate-slide-up stagger-3">
          <button
            className={`filter-chip bounce-effect ${filterCategory === null ? 'filter-chip--active' : ''}`}
            onClick={() => setFilterCategory(null)}
          >
            Todos
          </button>
          {activeCategories.map(cat => (
            <button
              key={cat.id}
              className={`filter-chip bounce-effect ${filterCategory === cat.id ? 'filter-chip--active' : ''}`}
              onClick={() => setFilterCategory(filterCategory === cat.id ? null : cat.id)}
              style={{ '--chip-color': cat.color } as React.CSSProperties}
            >
              {cat.emoji} {cat.label}
            </button>
          ))}
        </div>
      )}

      {/* Grouped List */}
      <div className="expenses-list">
        {grouped.map((group, gi) => (
          <div key={group.dateKey} className={`expense-group animate-slide-up stagger-${Math.min(gi + 3, 5)}`}>
            <div className="expense-group__header">
              <span className="expense-group__date">{group.dateLabel}</span>
              <span className="expense-group__total">-{formatCurrency(group.total, state.settings.displayCurrency)}</span>
            </div>
            <div className="expense-group__items">
              {group.items.map(t => {
                const cat = getCategoryConfig(t.category);
                return (
                  <div key={t.id} className="expense-item">
                    <div className="transaction-item__icon bounce-effect" style={{ backgroundColor: `${cat.color}15` }}>
                      <span>{cat.emoji}</span>
                    </div>
                    <div className="transaction-item__info">
                      <div className="transaction-item__desc">{t.description}</div>
                      <div className="transaction-item__meta">
                        <span className="transaction-item__category">{cat.label}</span>
                        <span className="transaction-item__dot">·</span>
                        <span className="transaction-item__method">
                          {t.paymentMethod === 'credit' ? 'Crédito' : 
                           t.paymentMethod === 'debit' ? 'Débito' : 
                           t.paymentMethod === 'cash' ? 'Efectivo' : 
                           t.paymentMethod === 'transfer' ? 'Transferencia' : 'Efectivo'}
                        </span>
                      </div>
                    </div>
                    <div className="transaction-amount-wrapper">
                      <div className="transaction-item__amount transaction-item__amount--expense">
                        -{formatCurrency(t.amount, t.currency)}
                      </div>
                      {t.currency === 'USD' && <span className="currency-badge-premium">USD</span>}
                    </div>
                    <div className="transaction-item__actions">
                      <button
                        className="transaction-item__action bounce-effect"
                        onClick={() => onEdit?.(t)}
                        aria-label="Editar"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        className="transaction-item__action transaction-item__action--delete bounce-effect"
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
        {expenses.length === 0 && (
          <div className="empty-state animate-fade-in">
            <span className="empty-state__emoji">💸</span>
            <p>No hay gastos registrados</p>
            <p className="body-sm" style={{ color: 'var(--color-text-secondary)' }}>
              {search ? 'Probá con otra búsqueda' : 'Tocá el botón + para agregar uno'}
            </p>
          </div>
        )}
      </div>
    </div>

  );
}
