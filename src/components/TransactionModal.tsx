import { useState, useEffect } from 'react';
import { X, ChevronLeft, Calendar, Tag, FileText, CreditCard, Banknote, Landmark, Smartphone } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { CATEGORIES, type CategoryConfig, getCategoryConfig } from '../types';
import type { Transaction } from '../types';
import './TransactionModal.css';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialType?: 'income' | 'expense';
  editingTransaction?: Transaction | null;
}

export default function TransactionModal({ 
  isOpen, 
  onClose, 
  initialType = 'expense',
  editingTransaction = null
}: TransactionModalProps) {
  const { addTransaction, updateTransaction } = useApp();
  const [step, setStep] = useState<'amount' | 'category' | 'description'>('amount');
  const [type, setType] = useState<'income' | 'expense'>(initialType);
  const [currency, setCurrency] = useState<'ARS' | 'USD'>('ARS');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState<'credit' | 'debit' | 'cash' | 'transfer'>('cash');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (editingTransaction) {
        setStep('amount');
        setType(editingTransaction.type);
        setCurrency(editingTransaction.currency);
        setAmount(editingTransaction.amount.toString());
        setCategory(editingTransaction.category);
        setDescription(editingTransaction.description);
        setDate(new Date(editingTransaction.date).toISOString().split('T')[0]);
        setPaymentMethod(editingTransaction.paymentMethod || 'cash');
        setNotes(editingTransaction.notes || '');
      } else {
        setStep('amount');
        setType(initialType);
        setCurrency('ARS');
        setAmount('');
        setCategory('');
        setDescription('');
        setDate(new Date().toISOString().split('T')[0]);
        setPaymentMethod('cash');
        setNotes('');
      }
    }
  }, [isOpen, initialType, editingTransaction]);

  const filteredCategories = CATEGORIES.filter(c => c.type === type || c.type === 'both');

  const handleKeyPress = (key: string) => {
    if (key === 'backspace') {
      setAmount(prev => prev.slice(0, -1));
    } else if (key === '.' && !amount.includes('.')) {
      setAmount(prev => prev + '.');
    } else if (key !== '.' && amount.length < 12) {
      setAmount(prev => prev + key);
    }
  };

  const handleNext = () => {
    if (step === 'amount' && parseFloat(amount) > 0) {
      setStep('category');
    } else if (step === 'category' && category) {
      setStep('description');
    }
  };

  const handleSubmit = () => {
    if (!amount || !category) return;
    
    const transactionData: any = {
      amount: parseFloat(amount),
      category,
      description: description || getCategoryLabel(category),
      date: new Date(date + 'T12:00:00').toISOString(),
      type,
      currency,
      notes: notes.trim() || undefined,
    };

    if (type === 'expense') {
      transactionData.paymentMethod = paymentMethod;
    } else if (editingTransaction && 'paymentMethod' in editingTransaction) {
      // In case we are changing an expense to income, we might want to drop it 
      // but firestore updates might require deleting the field. 
      // Actually we are sending the whole object to updateTransaction? 
      // Yes, updateTransaction handles it.
    }

    if (editingTransaction) {
      updateTransaction({
        ...editingTransaction,
        ...transactionData,
      });
    } else {
      addTransaction(transactionData);
    }
    onClose();
  };

  const getCategoryLabel = (catId: string) => {
    return CATEGORIES.find(c => c.id === catId)?.label || catId;
  };

  const handleBack = () => {
    if (step === 'category') setStep('amount');
    else if (step === 'description') setStep('category');
  };

  if (!isOpen) return null;

  const displayAmount = amount || '0';

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          {step !== 'amount' ? (
            <button className="modal-header__back bounce-effect" onClick={handleBack} aria-label="Volver">
              <ChevronLeft size={24} />
            </button>
          ) : (
            <div style={{ width: 40 }} />
          )}
          <div className="modal-header__type-toggle">
            <button
              className={`type-btn bounce-effect ${type === 'expense' ? 'type-btn--active type-btn--expense' : ''}`}
              onClick={() => setType('expense')}
            >
              Gasto
            </button>
            <button
              className={`type-btn bounce-effect ${type === 'income' ? 'type-btn--active type-btn--income' : ''}`}
              onClick={() => setType('income')}
            >
              Ingreso
            </button>
          </div>
          <button className="modal-header__close bounce-effect" onClick={onClose} aria-label="Cerrar">
            <X size={22} />
          </button>
        </div>

        {/* Content based on step */}
        {step === 'amount' && (
          <div className="modal-content animate-slide-up">
            <div className="currency-premium-selector">
              <button 
                type="button"
                className={`currency-pill ${currency === 'ARS' ? 'active' : ''}`}
                onClick={() => setCurrency('ARS')}
              >
                <span>🇦🇷</span> PESOS
              </button>
              <button 
                type="button"
                className={`currency-pill ${currency === 'USD' ? 'active' : ''}`}
                onClick={() => setCurrency('USD')}
              >
                <span>🇺🇸</span> DÓLARES
              </button>
            </div>

            <div className="amount-display-container">
              <div className="amount-display">
                <span className="amount-currency">{currency === 'ARS' ? '$' : 'u$s'}</span>
                <span className="amount-value">{parseFloat(displayAmount).toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: (displayAmount.includes('.') ? 2 : 0) })}</span>
              </div>
            </div>

            <div className="numpad">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'backspace'].map(key => (
                <button
                  key={key}
                  className={`numpad__key bounce-effect ${key === 'backspace' ? 'numpad__key--action' : ''}`}
                  onClick={() => handleKeyPress(key)}
                >
                  {key === 'backspace' ? (
                    <ChevronLeft size={24} />
                  ) : key}
                </button>
              ))}
            </div>
            <button
              className="modal-submit bounce-effect"
              onClick={handleNext}
              disabled={!amount || parseFloat(amount) === 0}
            >
              Siguiente
            </button>
          </div>
        )}

        {step === 'category' && (
          <div className="modal-content animate-slide-up">
            <div className="step-header">
              <Tag size={20} className="step-icon" />
              <h3 className="modal-content__title">¿En qué categoría?</h3>
            </div>
            <div className="category-grid">
              {filteredCategories.map((cat: CategoryConfig) => (
                <button
                  key={cat.id}
                  className={`category-chip bounce-effect ${category === cat.id ? 'category-chip--active' : ''}`}
                  onClick={() => setCategory(cat.id)}
                  style={{
                    '--chip-color': cat.color,
                  } as React.CSSProperties}
                >
                  <span className="category-chip__emoji">{cat.emoji}</span>
                  <span className="category-chip__label">{cat.label}</span>
                </button>
              ))}
            </div>
            <button
              className="modal-submit bounce-effect"
              onClick={handleNext}
              disabled={!category}
            >
              Siguiente
            </button>
          </div>
        )}

        {step === 'description' && (
          <div className="modal-content animate-slide-up">
            <div className="step-header">
              <FileText size={20} className="step-icon" />
              <h3 className="modal-content__title">Detalles finales</h3>
            </div>
            
            <div className="input-group-premium">
              <label className="input-label-premium">Nota opcional</label>
              <input
                type="text"
                className="description-input-premium"
                placeholder="Ej: Supermercado, almuerzo..."
                value={description}
                onChange={e => setDescription(e.target.value)}
                autoFocus
                maxLength={60}
              />
            </div>

            <div className="input-group-premium">
              <label className="input-label-premium">Notas adicionales (opcional)</label>
              <textarea
                className="notes-textarea-premium"
                placeholder="Ej: Compré ropa para las vacaciones, pagué en 3 cuotas..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
                maxLength={200}
                rows={3}
              />
            </div>

            <div className="modal-content__options">
              <div className="option-group">
                <div className="option-label-with-icon">
                  <Calendar size={14} />
                  <label className="option-label">Fecha del movimiento</label>
                </div>
                <input 
                  type="date" 
                  className="date-input-premium" 
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>

              {type === 'expense' && (
                <div className="option-group">
                  <div className="option-label-with-icon">
                    <CreditCard size={14} />
                    <label className="option-label">Método de pago</label>
                  </div>
                  <div className="payment-methods-premium">
                    {[
                      { id: 'cash', label: 'Efectivo', icon: <Banknote size={18} /> },
                      { id: 'debit', label: 'Débito', icon: <Landmark size={18} /> },
                      { id: 'credit', label: 'Crédito', icon: <CreditCard size={18} /> },
                      { id: 'transfer', label: 'Transferencia', icon: <Smartphone size={18} /> },
                    ].map(pm => (
                      <button
                        key={pm.id}
                        className={`pm-btn-premium bounce-effect ${paymentMethod === pm.id ? 'active' : ''}`}
                        onClick={() => setPaymentMethod(pm.id as any)}
                        type="button"
                      >
                        <span className="pm-icon-premium">{pm.icon}</span>
                        <span className="pm-label-premium">{pm.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="transaction-summary-card">
              <div className="summary-main">
                <div className="summary-amount">
                  <span className="summary-currency">{currency === 'ARS' ? '$' : 'u$s'}</span>
                  <span className="summary-value">{parseFloat(amount).toLocaleString('es-AR')}</span>
                </div>
                <div className="summary-meta">
                  <span className="summary-cat">{getCategoryConfig(category).emoji} {getCategoryLabel(category)}</span>
                  <span className="summary-dot">·</span>
                  <span className={`summary-type type--${type}`}>
                    {type === 'income' ? 'Ingreso' : 'Gasto'}
                  </span>
                </div>
              </div>
            </div>

            <button
              className="modal-submit modal-submit--confirm bounce-effect"
              onClick={handleSubmit}
            >
              Confirmar {type === 'income' ? 'Ingreso' : 'Gasto'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
