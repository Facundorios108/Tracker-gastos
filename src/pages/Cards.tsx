import { useState, useMemo } from 'react';
import { CreditCard as CreditCardIcon, ChevronLeft } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getCategoryConfig } from '../types';
import { formatDate } from '../utils';
import './Cards.css';

interface CardsProps {
  onEdit?: (transaction: any) => void;
  onAddExpense?: (cardId: string) => void;
}

function getStatementKey(dateStr: string, closingDay: number) {
  // Use local time for correct day extraction
  const dateParts = dateStr.split('T')[0].split('-');
  const year = parseInt(dateParts[0], 10);
  const month = parseInt(dateParts[1], 10) - 1; // 0-indexed
  const day = parseInt(dateParts[2], 10);
  
  let sMonth = month;
  let sYear = year;

  if (day > closingDay) {
    sMonth += 1;
    if (sMonth > 11) {
      sMonth = 0;
      sYear += 1;
    }
  }

  return `${sYear}-${sMonth.toString().padStart(2, '0')}`;
}

function formatStatementKey(key: string) {
  const [year, month] = key.split('-');
  const date = new Date(parseInt(year), parseInt(month), 1);
  const monthName = date.toLocaleDateString('es-AR', { month: 'long' });
  return `Resumen - ${monthName.charAt(0).toUpperCase() + monthName.slice(1)} ${year}`;
}

export default function Cards({ onEdit, onAddExpense }: CardsProps) {
  const { state, formatCurrency } = useApp();
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [selectedStatementKey, setSelectedStatementKey] = useState<string | null>(null);

  const getBrandInfo = (brandId: string) => {
    const brands = {
      visa: { label: 'Visa', color: '#1a1f71' },
      mastercard: { label: 'Mastercard', color: '#eb001b' },
      amex: { label: 'American Express', color: '#002663' },
      naranja: { label: 'Naranja', color: '#ff5900' },
      otro: { label: 'Otra', color: '#475569' }
    };
    return brands[brandId as keyof typeof brands] || brands.otro;
  };

  const cardsWithStats = useMemo(() => {
    if (!state.settings.creditCards) return [];
    
    return state.settings.creditCards.map(card => {
      const cardTransactions = state.transactions.filter(t => t.creditCardId === card.id && t.type === 'expense');
      
      const closingDay = Number(card.closingDate) || 21;
      // Get current date string in local timezone YYYY-MM-DD
      const now = new Date();
      const localDateStr = `${now.getFullYear()}-${(now.getMonth()+1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;
      const currentStatementKey = getStatementKey(localDateStr, closingDay);

      let totalARS = 0;
      let totalUSD = 0;
      
      cardTransactions.forEach(t => {
        if (getStatementKey(t.date, closingDay) === currentStatementKey) {
          if (t.currency === 'ARS') totalARS += t.amount;
          if (t.currency === 'USD') totalUSD += t.amount;
        }
      });
      
      return {
        ...card,
        totalARS,
        totalUSD,
        transactions: cardTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
        currentStatementKey,
        closingDay
      };
    });
  }, [state.settings.creditCards, state.transactions]);

  const selectedCard = cardsWithStats.find(c => c.id === selectedCardId);
  const activeStatementKey = selectedStatementKey || selectedCard?.currentStatementKey;

  const availableStatements = useMemo(() => {
    if (!selectedCard) return [];
    const keys = new Set<string>();
    keys.add(selectedCard.currentStatementKey);
    selectedCard.transactions.forEach(t => {
      keys.add(getStatementKey(t.date, selectedCard.closingDay));
    });
    return Array.from(keys).sort((a, b) => b.localeCompare(a));
  }, [selectedCard]);

  const statementTransactions = useMemo(() => {
    if (!selectedCard || !activeStatementKey) return [];
    return selectedCard.transactions.filter(t => getStatementKey(t.date, selectedCard.closingDay) === activeStatementKey);
  }, [selectedCard, activeStatementKey]);

  let statementTotalARS = 0;
  let statementTotalUSD = 0;
  statementTransactions.forEach(t => {
    if (t.currency === 'ARS') statementTotalARS += t.amount;
    if (t.currency === 'USD') statementTotalUSD += t.amount;
  });

  if (selectedCard) {
    const brand = getBrandInfo(selectedCard.brand);
    return (
      <div className="cards-page animate-fade-in">
        <style>{`.fab-fixed { display: none !important; }`}</style>
        <header className="cards-header">
          <button className="back-button bounce-effect" onClick={() => { setSelectedCardId(null); setSelectedStatementKey(null); }}>
            <ChevronLeft size={24} />
          </button>
          <h2>Movimientos</h2>
          <div style={{ width: 24 }} />
        </header>

        <div className="selected-card-display" style={{ background: `linear-gradient(135deg, ${selectedCard.color || brand.color}dd, ${selectedCard.color || brand.color}99)` }}>
          <div className="selected-card-bg-circle-1" />
          <div className="selected-card-bg-circle-2" />
          <div className="selected-card-top">
            <span className="selected-card-brand">{brand.label}</span>
            <span className="selected-card-bank">{selectedCard.bank}</span>
          </div>
          <div className="selected-card-middle">
            <span className="selected-card-number">•••• •••• •••• {selectedCard.last4}</span>
          </div>
          <div className="selected-card-bottom">
            <span>Cierre: <strong>{selectedCard.closingDate}</strong></span>
            <span>Vto: <strong>{selectedCard.dueDate}</strong></span>
          </div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <select 
            value={activeStatementKey || ''}
            onChange={(e) => setSelectedStatementKey(e.target.value)}
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: '12px',
              background: 'var(--color-glass)',
              border: '1px solid var(--color-glass-border)',
              color: 'var(--color-text-primary)',
              fontSize: '16px',
              fontWeight: 600,
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            {availableStatements.map(key => (
              <option key={key} value={key}>{formatStatementKey(key)} {key === selectedCard.currentStatementKey ? '(Actual)' : ''}</option>
            ))}
          </select>
        </div>

        <div className="cards-totals-summary">
          <div className="cards-total-box ars">
            <span className="cards-total-label">Total ARS</span>
            <span className="cards-total-value">
              {new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(statementTotalARS)}
            </span>
          </div>
          <div className="cards-total-box usd">
            <span className="cards-total-label">Total USD</span>
            <span className="cards-total-value">
              {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(statementTotalUSD)}
            </span>
          </div>
        </div>

        <div className="cards-transaction-list">
          <div className="expense-group__items" style={{ marginBottom: '24px' }}>
            {statementTransactions.length === 0 ? (
              <div className="empty-state">
                <CreditCardIcon size={48} style={{ opacity: 0.3 }} />
                <p>No hay gastos registrados en este resumen.</p>
              </div>
            ) : (
              statementTransactions.map((t, idx) => {
                const cat = getCategoryConfig(t.category);
                return (
                  <div key={t.id} className="expense-item animate-slide-up" style={{ animationDelay: `${(idx % 5) * 0.1}s` }} onClick={() => onEdit?.(t)}>
                    <div className="transaction-item__icon bounce-effect" style={{ backgroundColor: `${cat.color}15` }}>
                      <span>{cat.emoji}</span>
                    </div>
                    <div className="transaction-item__info">
                      <div className="transaction-item__desc">{t.description}</div>
                      <div className="transaction-item__meta">
                        <span className="transaction-item__category">{cat.label}</span>
                        <span className="transaction-item__dot">·</span>
                        <span>{formatDate(t.date)}</span>
                      </div>
                    </div>
                    <div className="transaction-amount-wrapper">
                      {t.currency === 'USD' && <span className="currency-badge-premium">USD</span>}
                      <div className="transaction-item__amount" style={{ color: 'var(--color-on-surface)' }}>
                        {formatCurrency(t.amount, t.currency)}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          
          <button 
            className="bounce-effect"
            style={{ 
              width: '100%', padding: '16px', borderRadius: '16px', 
              background: 'var(--color-primary)', color: 'white', 
              display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', 
              fontWeight: 700, fontSize: '15px',
              boxShadow: '0 4px 14px rgba(27, 107, 79, 0.3)',
              border: 'none', cursor: 'pointer'
            }}
            onClick={() => onAddExpense?.(selectedCard.id)}
          >
            <CreditCardIcon size={20} />
            <span>Añadir gasto a esta tarjeta</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="cards-page animate-fade-in">
      <header className="cards-header">
        <h2>Tus Tarjetas</h2>
      </header>

      {cardsWithStats.length === 0 ? (
        <div className="empty-state">
          <CreditCardIcon size={48} style={{ opacity: 0.3 }} />
          <p>No tienes tarjetas configuradas.</p>
          <span style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginTop: '8px' }}>
            Ve a Perfil &gt; Mis Tarjetas para agregar una.
          </span>
        </div>
      ) : (
        <div className="cards-grid">
          {cardsWithStats.map((card, idx) => {
            const brand = getBrandInfo(card.brand);
            return (
              <div key={card.id} className={`card-overview-item bounce-effect animate-slide-up stagger-${(idx % 5) + 1}`} onClick={() => setSelectedCardId(card.id)}>
                <div className="card-overview-visual" style={{ background: `linear-gradient(135deg, ${card.color || brand.color}dd, ${card.color || brand.color}99)` }}>
                  <div className="card-overview-bg-1" />
                  <div className="card-overview-bg-2" />
                  <div className="card-overview-top">
                    <span>{brand.label}</span>
                    <span className="card-overview-last4">•••• {card.last4}</span>
                  </div>
                  <div className="card-overview-bottom">
                    <span className="card-overview-bank">{card.bank}</span>
                  </div>
                </div>
                
                <div className="card-overview-data">
                  <div className="card-data-row">
                    <span className="card-data-label">Total ARS (Resumen actual)</span>
                    <span className="card-data-value ars">{new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(card.totalARS)}</span>
                  </div>
                  {card.totalUSD > 0 && (
                    <div className="card-data-row">
                      <span className="card-data-label">Total USD</span>
                      <span className="card-data-value usd">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(card.totalUSD)}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
