import { useState, useEffect, useMemo } from 'react';
import { 
  User, Moon, Sun, DollarSign, LogOut, ChevronRight, 
  Calculator, Trash2, Shield, HelpCircle,
  Wallet, Edit2, Check, Palette, Type, Download, CreditCard as CreditCardIcon
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getCategoryConfig } from '../types';
import { formatDate } from '../utils';
import { exportTransactionsToCSV } from '../utils/exportUtils';
import './Profile.css';

export default function Profile() {
  const { state, toggleTheme, signOut, updateSettings, clearAllData, formatCurrency } = useApp();
  
  // Defensive check for state and settings
  const settings = state?.settings;
  const user = state?.user;

  const [exchangeRateInput, setExchangeRateInput] = useState(settings?.exchangeRate ? settings.exchangeRate.toLocaleString('es-AR') : '1.100');
  const [budgetInput, setBudgetInput] = useState(settings?.monthlyBudget ? settings.monthlyBudget.toLocaleString('es-AR') : '500.000');

  const [isEditingName, setIsEditingName] = useState(false);
  const getDisplayName = () => (settings?.name && settings.name !== 'Invitado') ? settings.name : (user?.displayName || user?.email?.split('@')[0] || '');
  const [newName, setNewName] = useState(getDisplayName());

  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showPrivacyInfo, setShowPrivacyInfo] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  
  const [expandedMonth, setExpandedMonth] = useState<string | null>(null);
  const [expandedYear, setExpandedYear] = useState<string | null>(new Date().getFullYear().toString());
  
  const [showCardsModal, setShowCardsModal] = useState(false);
  const [showCardForm, setShowCardForm] = useState(false);
  const [editingCard, setEditingCard] = useState<any | null>(null);
  const [cardBank, setCardBank] = useState('');
  const [cardBrand, setCardBrand] = useState('visa');
  const [cardClosing, setCardClosing] = useState('');
  const [cardDue, setCardDue] = useState('');
  const [cardLast4, setCardLast4] = useState('');
  const [cardColor, setCardColor] = useState('');

  // Group transactions by month for History
  const historyByMonth = useMemo(() => {
    if (!state?.transactions) return [];
    
    const groups: { [month: string]: { income: number, expenses: number, balance: number, transactions: any[] } } = {};
    
    state.transactions.forEach(t => {
      const d = new Date(t.date);
      const monthKey = t.billingMonth || `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      
      if (!groups[monthKey]) {
        groups[monthKey] = { income: 0, expenses: 0, balance: 0, transactions: [] };
      }
      
      let amount = t.amount;
      if (settings?.displayCurrency === 'USD' && t.currency === 'ARS') {
        amount = amount / settings.exchangeRate;
      } else if (settings?.displayCurrency === 'ARS' && t.currency === 'USD') {
        amount = amount * settings.exchangeRate;
      }
      
      if (t.type === 'income') {
        groups[monthKey].income += amount;
        groups[monthKey].balance += amount;
      } else {
        groups[monthKey].expenses += amount;
        groups[monthKey].balance -= amount;
      }
      groups[monthKey].transactions.push(t);
    });
    
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  }, [state?.transactions, settings?.displayCurrency, settings?.exchangeRate]);

  // Group by year for UI display
  const historyByYear = useMemo(() => {
    const years: { [year: string]: typeof historyByMonth } = {};
    historyByMonth.forEach(item => {
      const year = item[0].split('-')[0];
      if (!years[year]) years[year] = [];
      years[year].push(item);
    });
    return Object.entries(years).sort((a, b) => b[0].localeCompare(a[0]));
  }, [historyByMonth]);

  const resetCardForm = () => {
    setEditingCard(null);
    setCardBank('');
    setCardBrand('visa');
    setCardClosing('');
    setCardDue('');
    setCardLast4('');
    setCardColor('');
    setShowCardForm(false);
  };

  const openAddCard = () => {
    setEditingCard(null);
    setCardBank('');
    setCardBrand('visa');
    setCardClosing('');
    setCardDue('');
    setCardLast4('');
    setCardColor('');
    setShowCardForm(true);
  };

  const openEditCard = (card: any) => {
    setEditingCard(card);
    setCardBank(card.bank);
    setCardBrand(card.brand);
    setCardClosing(card.closingDate);
    setCardDue(card.dueDate);
    setCardLast4(card.last4);
    setCardColor(card.color || '');
    setShowCardForm(true);
  };

  const handleSaveCard = () => {
    if (!cardBank || !cardClosing || !cardDue || cardLast4.length !== 4) return;
    
    const newCard = {
      id: editingCard ? editingCard.id : Date.now().toString(),
      bank: cardBank,
      brand: cardBrand as any,
      last4: cardLast4,
      closingDate: Number(cardClosing),
      dueDate: Number(cardDue),
      color: cardColor
    };
    
    const updatedCards = editingCard
      ? (settings?.creditCards || []).map(c => c.id === editingCard.id ? newCard : c)
      : [...(settings?.creditCards || []), newCard];
      
    updateSettings({ creditCards: updatedCards });
    resetCardForm();
  };

  const handleDeleteCard = (id: string) => {
    if (window.confirm('¿Seguro que querés eliminar esta tarjeta?')) {
      updateSettings({ creditCards: (settings?.creditCards || []).filter(c => c.id !== id) });
    }
  };

  // Keep inputs in sync with state updates
  useEffect(() => {
    if (settings?.exchangeRate) {
      setExchangeRateInput(settings.exchangeRate.toLocaleString('es-AR'));
    }
  }, [settings?.exchangeRate]);

  useEffect(() => {
    if (settings?.monthlyBudget !== undefined) {
      setBudgetInput(settings.monthlyBudget.toLocaleString('es-AR'));
    }
  }, [settings?.monthlyBudget]);

  useEffect(() => {
    setNewName(getDisplayName());
  }, [settings?.name, user?.displayName, user?.email]);

  if (!settings || !user) {
    return (
      <div className="profile-page">
        <div className="loading-state animate-fade-in">
          <div className="spinner"></div>
          <p className="body-md" style={{ fontWeight: 600, marginTop: '12px' }}>Cargando perfil premium...</p>
        </div>
      </div>
    );
  }

  const handleSignOut = async () => {
    setShowLogoutModal(false);
    await signOut();
  };

  const handleUpdateExchangeRate = () => {
    const rate = parseFloat(exchangeRateInput.replace(/\./g, ''));
    if (!isNaN(rate) && rate > 0) {
      updateSettings({ exchangeRate: rate });
    }
  };

  const handleUpdateBudget = () => {
    const budget = parseFloat(budgetInput.replace(/\./g, ''));
    if (!isNaN(budget) && budget >= 0) {
      updateSettings({ monthlyBudget: budget });
    }
  };

  const handleUpdateName = () => {
    if (newName.trim()) {
      updateSettings({ name: newName.trim() });
      setIsEditingName(false);
    }
  };

  const handleResetData = async () => {
    try {
      setShowResetModal(false);
      await clearAllData();
      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 3000);
    } catch (err) {
      console.error('Error al borrar datos:', err);
      alert('Error al borrar los datos. Por favor, verifica tu conexión e intenta nuevamente.');
    }
  };

  return (
    <div className="profile-page safe-area-bottom">
      <header className="profile-page__header animate-slide-up">
        <h1 className="profile-page__title">Configuración</h1>
        <p className="profile-page__subtitle">Tu centro de finanzas personalizadas</p>
      </header>

      <div className="profile-page__content">
        {/* User Identity Card Glass */}
        <section className="profile-section animate-slide-up stagger-1">
          <div className="user-identity-card-glass">
            <div className="user-identity-card__avatar-wrapper">
              <div className="user-identity-card__avatar">
                {user.photoURL ? (
                  <img src={user.photoURL} alt={user.displayName || 'User'} />
                ) : (
                  <User size={36} strokeWidth={1.5} />
                )}
              </div>
              <div className="user-identity-card__status-dot" />
            </div>
            <div className="user-identity-card__info">
              {isEditingName ? (
                <div className="name-edit-group animate-scale-in" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input 
                    type="text" 
                    value={newName} 
                    onChange={e => setNewName(e.target.value)}
                    className="name-edit-input"
                    autoFocus
                    onBlur={handleUpdateName}
                    onKeyDown={e => e.key === 'Enter' && handleUpdateName()}
                  />
                  <button className="bounce-effect name-save-btn" onClick={handleUpdateName}>
                    <Check size={18} />
                  </button>
                </div>
              ) : (
                <div className="name-display-row bounce-effect" onClick={() => setIsEditingName(true)}>
                  <h2 className="user-identity-card__name">
                    {getDisplayName() || 'Usuario Premium'}
                  </h2>
                  <Edit2 size={14} className="edit-icon-small" />
                </div>
              )}
              <p className="user-identity-card__email">{user.email}</p>
              <div className="user-identity-card__badge-row">
                {user.email === 'facundomatiasrios108@gmail.com' ? (
                  <span className="user-identity-card__badge">Miembro Fundador</span>
                ) : (
                  <span className="user-identity-card__badge" style={{ background: 'var(--color-primary)', color: '#fff' }}>Level 1</span>
                )}
                <span className="user-identity-card__id">ID: {user.uid.substring(0, 8).toUpperCase()}</span>
              </div>
            </div>
          </div>
        </section>

        {/* Global Settings Glass */}
        <section className="profile-section animate-slide-up stagger-2">
          <h3 className="section-label">Preferencias</h3>
          <div className="settings-list-glass">
            <button className="premium-settings-item bounce-effect" onClick={toggleTheme}>
              <div className="premium-settings-item__icon theme-icon">
                {settings.theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
              </div>
              <div className="premium-settings-item__content">
                <span className="premium-settings-item__label">Tema Visual</span>
                <span className="premium-settings-item__value">Cambiar a modo {settings.theme === 'dark' ? 'Claro' : 'Oscuro'}</span>
              </div>
              <div className="premium-settings-item__action">
                <ChevronRight size={18} style={{ opacity: 0.5 }} />
              </div>
            </button>

            <div className="premium-settings-item">
              <div className="premium-settings-item__icon currency-icon">
                <DollarSign size={20} />
              </div>
              <div className="premium-settings-item__content">
                <span className="premium-settings-item__label">Moneda Principal</span>
                <p className="premium-settings-item__value">Cómo verás tus balances</p>
              </div>
              <div className="currency-premium-toggle">
                <button 
                  className={`currency-premium-btn ${settings.displayCurrency === 'ARS' ? 'active' : ''}`}
                  onClick={() => updateSettings({ displayCurrency: 'ARS' })}
                >
                  <span className="flag">🇦🇷</span>
                  <span className="code">ARS</span>
                </button>
                <button 
                  className={`currency-premium-btn ${settings.displayCurrency === 'USD' ? 'active' : ''}`}
                  onClick={() => updateSettings({ displayCurrency: 'USD' })}
                >
                  <span className="flag">🇺🇸</span>
                  <span className="code">USD</span>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Customization Glass */}
        <section className="profile-section animate-slide-up stagger-2">
          <h3 className="section-label">Apariencia Personalizada</h3>
          <div className="settings-list-glass">
            <div className="premium-settings-item">
              <div className="premium-settings-item__icon" style={{ color: 'var(--color-primary)' }}>
                <Palette size={20} />
              </div>
              <div className="premium-settings-item__content">
                <span className="premium-settings-item__label">Color Principal</span>
                <p className="premium-settings-item__value">El color de botones y acentos</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <input 
                  type="color" 
                  value={settings.customization?.primaryColor || '#10b981'}
                  onChange={(e) => updateSettings({ 
                    customization: { 
                      ...settings.customization, 
                      primaryColor: e.target.value,
                      backgroundColor: settings.customization?.backgroundColor || (settings.theme === 'dark' ? '#0f172a' : '#f8fafc'),
                      fontSizeOffset: settings.customization?.fontSizeOffset || 0
                    } 
                  })}
                  style={{ width: '40px', height: '40px', border: 'none', borderRadius: '8px', cursor: 'pointer', padding: 0, background: 'transparent' }}
                />
              </div>
            </div>

            <div className="premium-settings-item">
              <div className="premium-settings-item__icon" style={{ color: 'var(--color-text-secondary)' }}>
                <Palette size={20} />
              </div>
              <div className="premium-settings-item__content">
                <span className="premium-settings-item__label">Color de Fondo</span>
                <p className="premium-settings-item__value">Fondo de la aplicación</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <input 
                  type="color" 
                  value={settings.customization?.backgroundColor || (settings.theme === 'dark' ? '#0f172a' : '#f8fafc')}
                  onChange={(e) => updateSettings({ 
                    customization: { 
                      ...settings.customization,
                      primaryColor: settings.customization?.primaryColor || '#10b981',
                      backgroundColor: e.target.value,
                      fontSizeOffset: settings.customization?.fontSizeOffset || 0
                    } 
                  })}
                  style={{ width: '40px', height: '40px', border: 'none', borderRadius: '8px', cursor: 'pointer', padding: 0, background: 'transparent' }}
                />
              </div>
            </div>

            <div className="premium-settings-item">
              <div className="premium-settings-item__icon" style={{ color: 'var(--color-text-secondary)' }}>
                <Type size={20} />
              </div>
              <div className="premium-settings-item__content">
                <span className="premium-settings-item__label">Tamaño de Texto</span>
                <p className="premium-settings-item__value">Ajusta el tamaño global de las letras</p>
              </div>
              <div className="currency-premium-toggle">
                <button 
                  className={`currency-premium-btn ${settings.customization?.fontSizeOffset === -2 ? 'active' : ''}`}
                  onClick={() => updateSettings({ 
                    customization: { 
                      ...settings.customization, 
                      primaryColor: settings.customization?.primaryColor || '#10b981',
                      backgroundColor: settings.customization?.backgroundColor || (settings.theme === 'dark' ? '#0f172a' : '#f8fafc'),
                      fontSizeOffset: -2 
                    } 
                  })}
                >
                  <span className="code" style={{ fontSize: '12px' }}>A-</span>
                </button>
                <button 
                  className={`currency-premium-btn ${!settings.customization?.fontSizeOffset || settings.customization?.fontSizeOffset === 0 ? 'active' : ''}`}
                  onClick={() => updateSettings({ 
                    customization: { 
                      ...settings.customization, 
                      primaryColor: settings.customization?.primaryColor || '#10b981',
                      backgroundColor: settings.customization?.backgroundColor || (settings.theme === 'dark' ? '#0f172a' : '#f8fafc'),
                      fontSizeOffset: 0 
                    } 
                  })}
                >
                  <span className="code" style={{ fontSize: '14px' }}>A</span>
                </button>
                <button 
                  className={`currency-premium-btn ${settings.customization?.fontSizeOffset === 2 ? 'active' : ''}`}
                  onClick={() => updateSettings({ 
                    customization: { 
                      ...settings.customization, 
                      primaryColor: settings.customization?.primaryColor || '#10b981',
                      backgroundColor: settings.customization?.backgroundColor || (settings.theme === 'dark' ? '#0f172a' : '#f8fafc'),
                      fontSizeOffset: 2 
                    } 
                  })}
                >
                  <span className="code" style={{ fontSize: '16px' }}>A+</span>
                </button>
              </div>
            </div>
            
            {(settings.customization?.primaryColor !== '#10b981' || settings.customization?.backgroundColor !== (settings.theme === 'dark' ? '#0f172a' : '#f8fafc') || settings.customization?.fontSizeOffset !== 0) && (
               <button 
                 className="premium-settings-item bounce-effect" 
                 onClick={() => updateSettings({ customization: { primaryColor: '#10b981', backgroundColor: settings.theme === 'dark' ? '#0f172a' : '#f8fafc', fontSizeOffset: 0 }})}
               >
                 <div className="premium-settings-item__icon" style={{ color: 'var(--color-error)' }}>
                   <Trash2 size={20} />
                 </div>
                 <div className="premium-settings-item__content">
                   <span className="premium-settings-item__label" style={{ color: 'var(--color-error)' }}>Restablecer Apariencia</span>
                 </div>
               </button>
            )}
          </div>
        </section>

        {/* Financial Setup Glass Grid */}
        <section className="profile-section animate-slide-up stagger-3">
          <h3 className="section-label">Configuración Financiera</h3>
          <div className="financial-grid">
            <div className="setup-card-glass bounce-effect">
              <div className="setup-card__header">
                <Calculator size={14} />
                <span>Valor Dólar</span>
              </div>
              <div className="setup-card__body">
                <div className="input-with-symbol">
                  <span className="symbol">$</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={exchangeRateInput}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      setExchangeRateInput(val ? parseInt(val, 10).toLocaleString('es-AR') : '');
                    }}
                    onBlur={handleUpdateExchangeRate}
                  />
                </div>
              </div>
            </div>

            <div className="setup-card-glass bounce-effect">
              <div className="setup-card__header">
                <Wallet size={14} />
                <span>Presupuesto</span>
              </div>
              <div className="setup-card__body">
                <div className="input-with-symbol">
                  <span className="symbol">{settings.displayCurrency === 'ARS' ? '$' : 'u$s'}</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={budgetInput}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      setBudgetInput(val ? parseInt(val, 10).toLocaleString('es-AR') : '');
                    }}
                    onBlur={handleUpdateBudget}
                  />
                </div>
              </div>
            </div>

            {/* Mis Tarjetas Button */}
            <div className="setup-card-glass bounce-effect" onClick={() => setShowCardsModal(true)} style={{ cursor: 'pointer', marginTop: '16px' }}>
              <div className="setup-card__header">
                <CreditCardIcon size={14} />
                <span>Mis Tarjetas</span>
              </div>
              <div className="setup-card__body">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                  <span style={{ fontSize: '16px', fontWeight: 600 }}>{(settings?.creditCards || []).length} Registradas</span>
                  <ChevronRight size={18} style={{ opacity: 0.5 }} />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Security & Support Glass */}
        <section className="profile-section animate-slide-up stagger-4">
          <h3 className="section-label">Seguridad y Ayuda</h3>
          <div className="settings-list-glass">
            <button 
              className="premium-settings-item bounce-effect" 
              onClick={() => setShowPrivacyInfo(!showPrivacyInfo)}
            >
              <div className="premium-settings-item__icon security-icon">
                <Shield size={20} />
              </div>
              <div className="premium-settings-item__content">
                <span className="premium-settings-item__label">Privacidad y Datos</span>
                <span className="premium-settings-item__value">Gestionar tus datos en la nube</span>
              </div>
              <ChevronRight size={18} style={{ opacity: 0.5, transform: showPrivacyInfo ? 'rotate(90deg)' : 'none', transition: 'transform 0.3s' }} />
            </button>
            {showPrivacyInfo && (
              <div className="privacy-inline-content animate-slide-up" style={{ padding: '16px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '12px', marginTop: '8px', marginBottom: '8px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                <p style={{ opacity: 0.8, lineHeight: '1.5', fontSize: '14px', margin: 0, textAlign: 'left' }}>
                  Todos tus datos financieros están encriptados y almacenados de forma segura en la nube. Solo tú tienes acceso a ellos mediante tu cuenta. No compartimos tu información con terceros.
                </p>
              </div>
            )}
            <a 
              href="mailto:facundomatiasrios108@gmail.com?subject=Soporte%20My%20Wallet&body=Hola%20Facundo,%20te%20escribo%20por%20lo%20siguiente:"
              className="premium-settings-item bounce-effect"
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              <div className="premium-settings-item__icon support-icon">
                <HelpCircle size={20} />
              </div>
              <div className="premium-settings-item__content">
                <span className="premium-settings-item__label">Soporte Técnico</span>
                <span className="premium-settings-item__value">Contactar con Soporte</span>
              </div>
              <ChevronRight size={18} style={{ opacity: 0.5 }} />
            </a>

            <button 
              className="premium-settings-item bounce-effect"
              onClick={() => {
                const now = new Date();
                exportTransactionsToCSV(
                  state.transactions,
                  `my-wallet-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
                );
              }}
            >
              <div className="premium-settings-item__icon" style={{ color: 'var(--color-primary)' }}>
                <Download size={20} />
              </div>
              <div className="premium-settings-item__content">
                <span className="premium-settings-item__label">Exportar Datos</span>
                <span className="premium-settings-item__value">Descargar movimientos en CSV</span>
              </div>
              <ChevronRight size={18} style={{ opacity: 0.5 }} />
            </button>
          </div>
        </section>

        {/* History Section */}
        {historyByYear.length > 0 && (
          <section className="profile-section animate-slide-up stagger-4">
            <h3 className="section-label">Historial por Año</h3>
            <div className="history-list" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {historyByYear.map(([yearKey, monthsData]) => {
                const isYearExpanded = expandedYear === yearKey;
                let yearBalance = 0;
                let yearIncome = 0;
                let yearExpenses = 0;
                monthsData.forEach(([_m, d]) => {
                  yearBalance += d.balance;
                  yearIncome += d.income;
                  yearExpenses += d.expenses;
                });
                
                return (
                  <div key={yearKey} className="settings-list-glass" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }} onClick={() => setExpandedYear(isYearExpanded ? null : yearKey)}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <ChevronRight size={20} style={{ transform: isYearExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.3s' }} />
                        <h4 style={{ fontSize: '18px', margin: 0, fontWeight: 'bold' }}>Año {yearKey}</h4>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '12px', opacity: 0.7 }}>Balance Anual</div>
                        <div style={{ fontSize: '16px', fontWeight: 'bold', color: yearBalance >= 0 ? 'var(--color-primary)' : 'var(--color-expense)' }}>
                          {yearBalance >= 0 ? '+' : ''}{formatCurrency(yearBalance)}
                        </div>
                      </div>
                    </div>
                    
                    {isYearExpanded && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '16px' }}>
                        {monthsData.map(([monthKey, data]) => {
                          
                          let monthName = monthKey;
                          if (monthKey.includes('-')) {
                            const [y, m] = monthKey.split('-');
                            monthName = new Date(parseInt(y), parseInt(m) - 1, 1).toLocaleString('es-ES', { month: 'long', year: 'numeric' });
                          }
                          const isExpanded = expandedMonth === monthKey;
                          
                          return (
                            <div key={monthKey} style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }} onClick={() => setExpandedMonth(isExpanded ? null : monthKey)}>
                                <h5 style={{ textTransform: 'capitalize', fontSize: '15px', margin: 0 }}>{monthName}</h5>
                                <div style={{ fontWeight: 'bold', color: data.balance >= 0 ? 'var(--color-primary)' : 'var(--color-expense)' }}>
                                  {data.balance >= 0 ? '+' : ''}{formatCurrency(data.balance)}
                                </div>
                              </div>
                              
                              {isExpanded && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                    <span style={{ fontSize: '13px', opacity: 0.7 }}>Ingresos: {formatCurrency(data.income)}</span>
                                    <span style={{ fontSize: '13px', opacity: 0.7 }}>Egresos: {formatCurrency(data.expenses)}</span>
                                  </div>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto' }}>
                                    {data.transactions.map(t => {
                                      const cat = getCategoryConfig(t.category);
                                      return (
                                        <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span>{cat.emoji}</span>
                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                              <span style={{ fontSize: '14px' }}>{t.description}</span>
                                              <span style={{ fontSize: '11px', opacity: 0.6 }}>{formatDate(t.date)} {t.paymentMethod === 'credit' && '💳'}</span>
                                            </div>
                                          </div>
                                          <div style={{ fontSize: '14px', fontWeight: 'bold', color: t.type === 'income' ? 'var(--color-primary)' : 'var(--color-expense)' }}>
                                            {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Danger Zone Glass */}
        <section className="profile-section animate-slide-up stagger-5">
          <div className="danger-zone-glass">
            <button className="logout-action-btn bounce-effect" onClick={() => setShowLogoutModal(true)}>
              <LogOut size={18} />
              <span>Cerrar Sesión</span>
            </button>
            <button className="danger-action-btn bounce-effect" onClick={() => setShowResetModal(true)}>
              <Trash2 size={18} />
              <span>Restablecer Aplicación</span>
            </button>
          </div>
        </section>

        <footer className="profile-footer animate-fade-in stagger-5">
          <div className="footer-logo" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <img src="/icon-192.png" alt="My Wallet" style={{ width: 24, height: 24, borderRadius: 6 }} />
            <span>My Wallet</span>
          </div>
          <p>Version 3.0.0 Premium</p>
          <p>© 2026 Antigravity - Premium Financial Tools</p>
        </footer>
      </div>

      {/* Logout Modal */}

      {/* Tarjetas Modal */}
      {showCardsModal && (
        <div className="modal-overlay" onClick={() => setShowCardsModal(false)}>
          <div className="modal-content profile-modal animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Mis Tarjetas de Crédito</h2>
              <button className="close-btn" onClick={() => setShowCardsModal(false)}>×</button>
            </div>
            
            <div className="modal-body">
              {!showCardForm ? (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
                    {(settings?.creditCards || []).length > 0 ? (
                      (settings?.creditCards || []).map((c: any) => (
                        <div key={c.id} style={{
                          background: c.color ? `linear-gradient(135deg, ${c.color}dd, ${c.color}99)` : 'linear-gradient(135deg, #1e293b, #0f172a)',
                          borderRadius: '16px',
                          padding: '20px',
                          color: 'white',
                          position: 'relative',
                          overflow: 'hidden'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                            <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{c.bank}</div>
                            <div style={{ fontSize: '16px', textTransform: 'uppercase', opacity: 0.9 }}>{c.brand}</div>
                          </div>
                          
                          <div style={{ fontSize: '20px', letterSpacing: '2px', marginBottom: '16px', fontFamily: 'monospace' }}>
                            **** **** **** {c.last4}
                          </div>
                          
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', fontSize: '12px', opacity: 0.8 }}>
                            <div>
                              <div>Cierre: Día {c.closingDate}</div>
                              <div>Vto: Día {c.dueDate}</div>
                            </div>
                            <div style={{ display: 'flex', gap: '12px' }}>
                              <button onClick={() => openEditCard(c)} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', padding: '4px' }}><Edit2 size={16} /></button>
                              <button onClick={() => handleDeleteCard(c.id)} style={{ background: 'transparent', border: 'none', color: '#ff4d4d', cursor: 'pointer', padding: '4px' }}><Trash2 size={16} /></button>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div style={{ textAlign: 'center', padding: '40px 0', opacity: 0.5 }}>
                        No hay tarjetas registradas
                      </div>
                    )}
                  </div>
                  
                  <button className="primary-btn" onClick={openAddCard} style={{ width: '100%' }}>
                    Agregar Tarjeta
                  </button>
                </>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div className="form-group">
                    <label>Banco</label>
                    <input type="text" value={cardBank} onChange={e => setCardBank(e.target.value)} placeholder="Ej: Galicia, Santander..." className="form-input" />
                  </div>
                  
                  <div className="form-group">
                    <label>Marca (Bandera)</label>
                    <select value={cardBrand} onChange={e => setCardBrand(e.target.value)} className="form-select">
                      <option value="visa">Visa</option>
                      <option value="mastercard">Mastercard</option>
                      <option value="amex">American Express</option>
                      <option value="naranja">Naranja</option>
                      <option value="otra">Otra</option>
                    </select>
                  </div>
                  
                  <div className="form-row">
                    <div className="form-group" style={{ flex: 1 }}>
                      <label>Día de Cierre</label>
                      <input type="number" min="1" max="31" value={cardClosing} onChange={e => setCardClosing(e.target.value)} placeholder="Ej: 21" className="form-input" />
                    </div>
                    <div className="form-group" style={{ flex: 1 }}>
                      <label>Día de Vencimiento</label>
                      <input type="number" min="1" max="31" value={cardDue} onChange={e => setCardDue(e.target.value)} placeholder="Ej: 5" className="form-input" />
                    </div>
                  </div>
                  
                  <div className="form-row">
                    <div className="form-group" style={{ flex: 1 }}>
                      <label>Últimos 4 números</label>
                      <input type="text" maxLength={4} value={cardLast4} onChange={e => setCardLast4(e.target.value.replace(/\D/g, ''))} placeholder="Ej: 1234" className="form-input" />
                    </div>
                    <div className="form-group" style={{ flex: 1 }}>
                      <label>Color</label>
                      <input type="color" value={cardColor || '#1e293b'} onChange={e => setCardColor(e.target.value)} className="form-input" style={{ padding: '0 8px', height: '48px', width: '100%' }} />
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                    <button className="secondary-btn" onClick={() => setShowCardForm(false)} style={{ flex: 1 }}>
                      Cancelar
                    </button>
                    <button className="primary-btn" onClick={handleSaveCard} style={{ flex: 1 }} disabled={!cardBank || !cardClosing || !cardDue || cardLast4.length !== 4}>
                      {editingCard ? 'Guardar Cambios' : 'Agregar'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showLogoutModal && (
        <div className="modal-backdrop" onClick={() => setShowLogoutModal(false)}>
          <div className="modal-sheet animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ width: 40 }} />
              <h3 className="modal-content__title">Cerrar Sesión</h3>
              <button className="modal-header__close bounce-effect" onClick={() => setShowLogoutModal(false)}>
                <ChevronRight size={24} style={{ transform: 'rotate(90deg)' }} />
              </button>
            </div>
            <div className="modal-content" style={{ padding: '20px', textAlign: 'center' }}>
              <p style={{ marginBottom: '24px', opacity: 0.8 }}>¿Estás seguro de que querés cerrar sesión?</p>
              <button className="modal-submit--confirm bounce-effect" onClick={handleSignOut}>
                Sí, cerrar sesión
              </button>
              <button className="modal-submit--cancel bounce-effect" onClick={() => setShowLogoutModal(false)} style={{ marginTop: '12px', background: 'transparent', color: 'var(--text-primary)' }}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Modal */}
      {showResetModal && (
        <div className="modal-backdrop" onClick={() => setShowResetModal(false)}>
          <div className="modal-sheet animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ width: 40 }} />
              <h3 className="modal-content__title" style={{ color: '#ef4444' }}>Restablecer Aplicación</h3>
              <button className="modal-header__close bounce-effect" onClick={() => setShowResetModal(false)}>
                <ChevronRight size={24} style={{ transform: 'rotate(90deg)' }} />
              </button>
            </div>
            <div className="modal-content" style={{ padding: '20px', textAlign: 'center' }}>
              <p style={{ marginBottom: '24px', opacity: 0.8 }}>¿Estás seguro de que querés borrar todos los datos? <strong>Esta acción no se puede deshacer.</strong></p>
              <button className="modal-submit--confirm bounce-effect" onClick={handleResetData} style={{ background: '#ef4444' }}>
                Sí, borrar todo
              </button>
              <button className="modal-submit--cancel bounce-effect" onClick={() => setShowResetModal(false)} style={{ marginTop: '12px', background: 'transparent', color: 'var(--text-primary)' }}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Message */}
      {showSuccessMessage && (
        <div className="success-toast animate-slide-up" style={{
          position: 'fixed',
          bottom: 'calc(80px + env(safe-area-inset-bottom, 0px))',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'var(--color-primary)',
          color: 'white',
          padding: '16px 24px',
          borderRadius: '16px',
          boxShadow: '0 8px 25px rgba(27, 107, 79, 0.3)',
          fontWeight: 600,
          fontSize: 'calc(14px + var(--font-size-offset, 0px))',
          zIndex: 1000,
          maxWidth: '90%',
          textAlign: 'center'
        }}>
          ✅ Datos borrados exitosamente
        </div>
      )}

    </div>
  );
}
