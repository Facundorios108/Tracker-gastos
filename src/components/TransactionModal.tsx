import { useState, useEffect } from 'react';
import { X, ChevronLeft, Calendar, Tag, FileText, CreditCard, Banknote, Landmark, Smartphone } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { CATEGORIES, type CategoryConfig, getCategoryConfig } from '../types';
import type { Transaction } from '../types';
import { getTodayLocalDateStr } from '../utils';
import './TransactionModal.css';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialType?: 'income' | 'expense';
  editingTransaction?: Transaction | null;
  prefilledData?: Partial<Transaction> | null;
}

export default function TransactionModal({ 
  isOpen, 
  onClose, 
  initialType = 'expense',
  editingTransaction = null,
  prefilledData = null
}: TransactionModalProps) {
  const { state, addTransaction, updateTransaction } = useApp();
  const settings = state?.settings;

  const [step, setStep] = useState<'amount' | 'category' | 'description'>('amount');
  const [type, setType] = useState<'income' | 'expense'>(initialType);
  const [currency, setCurrency] = useState<'ARS' | 'USD' | 'EUR'>('ARS');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(getTodayLocalDateStr());
  const [paymentMethod, setPaymentMethod] = useState<'credit' | 'debit' | 'cash' | 'transfer'>('cash');
  const [creditCardId, setCreditCardId] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [installments, setInstallments] = useState<number | ''>(''); // Número de cuotas
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (editingTransaction) {
        setStep('amount');
        setType(editingTransaction.type);
        setCurrency(editingTransaction.currency);
        setAmount(editingTransaction.amount.toString());
        setCategory(editingTransaction.category);
        setDescription(editingTransaction.description);
        setDate(editingTransaction.date.split('T')[0]);
        setPaymentMethod(editingTransaction.paymentMethod || 'cash');
        setCreditCardId(editingTransaction.creditCardId || '');
        setNotes(editingTransaction.notes || '');
      } else {
        setStep('amount');
        setType(initialType);
        setCurrency('ARS');
        setAmount('');
        setCategory('');
        setDescription('');
        setDate(getTodayLocalDateStr());
        setPaymentMethod(prefilledData?.paymentMethod || 'cash');
        setCreditCardId(prefilledData?.creditCardId || '');
        setNotes('');
        setInstallments('');
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

  const handleSubmit = async () => {
    if (!amount || !category) return;

    const now = new Date();
    const timeSuffix = `T${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    
    // Construir objeto base sin campos undefined
    const transactionData: any = {
      amount: parseFloat(amount),
      category,
      description: description || getCategoryLabel(category),
      date: new Date(date + timeSuffix).toISOString(),
      type,
      currency,
      exchangeRate: settings?.exchangeRate || 1000,
    };

    // Solo agregar campos opcionales si tienen valor
    if (notes.trim()) {
      transactionData.notes = notes.trim();
    }

    if (type === 'expense') {
      transactionData.paymentMethod = paymentMethod;
      if (paymentMethod === 'credit' && creditCardId) {
        transactionData.creditCardId = creditCardId;
        const card = settings?.creditCards?.find(c => c.id === creditCardId);
        if (card) {
          const tDate = new Date(date + timeSuffix);
          let bYear = tDate.getFullYear();
          let bMonth = tDate.getMonth() + 1;
          
          if (tDate.getDate() > card.closingDate) {
            bMonth += 1;
            if (bMonth > 12) {
              bMonth = 1;
              bYear += 1;
            }
          }
          transactionData.billingMonth = `${bYear}-${String(bMonth).padStart(2, '0')}`;
        }
      }
    }

    console.log('📋 Modal - Enviando transacción:', {
      isEditing: !!editingTransaction,
      data: transactionData,
      installments: installments,
      category: category
    });

    try {
      setIsLoading(true);
      
      if (editingTransaction) {
        updateTransaction({
          ...editingTransaction,
          ...transactionData,
        });
        onClose();
      } else {
        // Verificar si es suscripción (categoría subscriptions)
        const isSubscription = category === 'subscriptions';
        
        // Verificar si tiene cuotas
        const hasInstallments = installments && installments > 1;

        if (isSubscription) {
          // Crear suscripción con la fecha seleccionada por el usuario
          const selectedDate = new Date(date + timeSuffix);
          const dayOfMonth = selectedDate.getDate();
          
          const subscriptionData = {
            ...transactionData,
            date: selectedDate.toISOString(),
            isRecurring: true,
            recurringDay: dayOfMonth,
          };
          
          console.log('🔄 Creando suscripción:', selectedDate.toLocaleDateString(), 'Día:', dayOfMonth);
          await addTransaction(subscriptionData);
          
        } else if (hasInstallments) {
          // Crear primera cuota con la fecha seleccionada (monto dividido)
          const selectedDate = new Date(date + timeSuffix);
          const dayOfMonth = selectedDate.getDate();
          const installmentAmount = parseFloat(amount) / (installments as number);
          
          const installmentData = {
            ...transactionData,
            amount: Math.round(installmentAmount * 100) / 100, // Redondear a 2 decimales
            date: selectedDate.toISOString(),
            isInstallment: true,
            installmentTotal: parseFloat(amount),
            installmentNumber: 1,
            totalInstallments: installments as number,
            installmentDay: dayOfMonth,
            description: `${transactionData.description} (Cuota 1/${installments})`
          };
          
          console.log(`💳 Creando primera cuota de ${installments}:`, {
            montoTotal: amount,
            montoPorCuota: installmentAmount,
            fecha: selectedDate.toLocaleDateString(),
            dia: dayOfMonth
          });
          await addTransaction(installmentData);
          
        } else {
          // Transacción simple
          await addTransaction(transactionData);
        }
        onClose();
      }
    } catch (err) {
      console.error('Error en handleSubmit:', err);
      // El error ya se muestra en el contexto con alert integrado
    } finally {
      setIsLoading(false);
    }
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
              <button 
                type="button"
                className={`currency-pill ${currency === 'EUR' ? 'active' : ''}`}
                onClick={() => setCurrency('EUR')}
              >
                <span>🇪🇺</span> EUROS
              </button>
            </div>

            <div className="amount-display-container">
              <div className="amount-display">
                <span className="amount-currency">{currency === 'EUR' ? '€' : currency === 'USD' ? 'u$s' : '$'}</span>
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

            {/* Campo de Cuotas - solo para gastos y no para suscripciones */}
            {type === 'expense' && category !== 'subscriptions' && (
              <div className="input-group-premium">
                <label className="input-label-premium">¿Es una compra en cuotas?</label>
                <input
                  type="number"
                  className="description-input-premium"
                  placeholder="Número de cuotas (ej: 3, 6, 12...)"
                  value={installments}
                  onChange={e => {
                    const value = e.target.value;
                    if (value === '' || (parseInt(value) > 0 && parseInt(value) <= 60)) {
                      setInstallments(value === '' ? '' : parseInt(value));
                    }
                  }}
                  min="2"
                  max="60"
                />
                {installments && installments > 1 && (
                  <p className="helper-text" style={{ 
                    fontSize: 'calc(12px + var(--font-size-offset, 0px))',
                    color: 'var(--color-primary)',
                    marginTop: '6px',
                    fontWeight: 600
                  }}>
                    ✓ Se creará la primera cuota de ${Math.round((parseFloat(amount) / installments) * 100) / 100}. Las siguientes se generarán automáticamente cada mes.
                  </p>
                )}
              </div>
            )}

            {/* Mensaje informativo para suscripciones */}
            {category === 'subscriptions' && (
              <div className="info-card animate-scale-in" style={{
                background: 'rgba(99, 102, 241, 0.05)',
                border: '1px solid rgba(99, 102, 241, 0.2)',
                borderRadius: '12px',
                padding: '10px 12px',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span style={{ fontSize: '14px', flexShrink: 0 }}>🔄</span>
                <span style={{ 
                  fontSize: 'calc(11.5px + var(--font-size-offset, 0px))',
                  fontWeight: 600,
                  color: 'var(--color-text-primary)',
                  lineHeight: 1.3
                }}>
                  Se registrará como gasto recurrente todos los meses.
                </span>
              </div>
            )}

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
                        onClick={() => { setPaymentMethod(pm.id as any); if(pm.id !== 'credit') setCreditCardId(''); }}
                        type="button"
                        disabled={!!prefilledData?.creditCardId}
                        style={{ opacity: !!prefilledData?.creditCardId && paymentMethod !== pm.id ? 0.3 : 1 }}
                      >
                        <span className="pm-icon-premium">{pm.icon}</span>
                        <span className="pm-label-premium">{pm.label}</span>
                      </button>
                    ))}
                  </div>
                  
                  {paymentMethod === 'credit' && settings?.creditCards && settings.creditCards.length > 0 && (
                    <div style={{ marginTop: '12px' }}>
                      <select 
                        value={creditCardId} 
                        onChange={e => setCreditCardId(e.target.value)}
                        className="description-input-premium"
                        style={{ width: '100%', padding: '12px', borderRadius: '12px', background: 'var(--color-surface)', color: 'var(--text-primary)', border: '1px solid rgba(255,255,255,0.1)' }}
                        disabled={!!prefilledData?.creditCardId}
                      >
                        <option value="">Selecciona tu tarjeta...</option>
                        {settings.creditCards.map(c => (
                          <option key={c.id} value={c.id}>{c.bank} {c.brand.toUpperCase()} ····{c.last4}</option>
                        ))}
                      </select>
                      {creditCardId && (
                        <p style={{ fontSize: '11px', opacity: 0.6, marginTop: '8px' }}>
                          Cierra el día {settings.creditCards.find(c => c.id === creditCardId)?.closingDate}. El gasto se asignará al mes correspondiente.
                        </p>
                      )}
                    </div>
                  )}
                  {paymentMethod === 'credit' && (!settings?.creditCards || settings.creditCards.length === 0) && (
                    <p style={{ fontSize: '12px', color: 'var(--color-error)', marginTop: '8px' }}>
                      No tienes tarjetas configuradas. Agrégalas en Configuración.
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="transaction-summary-card">
              <div className="summary-main">
                <div className="summary-amount">
                  <span className="summary-currency">{currency === 'EUR' ? '€' : currency === 'USD' ? 'u$s' : '$'}</span>
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
              disabled={isLoading}
              style={{
                opacity: isLoading ? 0.7 : 1,
                cursor: isLoading ? 'wait' : 'pointer'
              }}
            >
              {isLoading ? (
                <>
                  <span className="spinner" style={{
                    display: 'inline-block',
                    width: '16px',
                    height: '16px',
                    border: '2px solid rgba(255, 255, 255, 0.3)',
                    borderTop: '2px solid white',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite',
                    marginRight: '8px',
                    verticalAlign: 'middle'
                  }}></span>
                  Guardando...
                </>
              ) : (
                `Confirmar ${type === 'income' ? 'Ingreso' : 'Gasto'}`
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
