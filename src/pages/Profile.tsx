import { useState, useEffect, useMemo } from 'react';
import { 
  User, Moon, Sun, DollarSign, LogOut, ChevronRight, 
  Calculator, Trash2, Shield, HelpCircle,
  Wallet, Edit2, Check, Palette, Type, Download
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
  
  // Group transactions by month for History
  const historyByMonth = useMemo(() => {
    if (!state?.transactions) return [];
    
    const groups: { [month: string]: { income: number, expenses: number, balance: number, transactions: any[] } } = {};
    
    state.transactions.forEach(t => {
      const d = new Date(t.date);
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      
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
        {historyByMonth.length > 0 && (
          <section className="profile-section animate-slide-up stagger-4">
            <h3 className="section-label">Historial Mensual</h3>
            <div className="history-list">
              {historyByMonth.map(([monthKey, data]) => {
                const [year, month] = monthKey.split('-');
                const monthName = new Date(parseInt(year), parseInt(month) - 1, 1).toLocaleString('es-ES', { month: 'long', year: 'numeric' });
                
                return (
                  <div key={monthKey} className="settings-list-glass" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h4 style={{ textTransform: 'capitalize', fontSize: '16px', margin: 0 }}>{monthName}</h4>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '12px', opacity: 0.7 }}>Balance Final</div>
                        <div style={{ fontSize: '18px', fontWeight: 'bold', color: data.balance >= 0 ? 'var(--color-primary)' : 'var(--color-expense)' }}>
                          {data.balance >= 0 ? '+' : ''}{formatCurrency(data.balance)}
                        </div>
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto' }}>
                      {data.transactions.map(t => {
                        const cat = getCategoryConfig(t.category);
                        return (
                          <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '18px' }}>{cat.emoji}</span>
                              <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontSize: '14px', fontWeight: 600 }}>{t.description}</span>
                                <span style={{ fontSize: '11px', opacity: 0.6 }}>{formatDate(t.date)}</span>
                              </div>
                            </div>
                            <div style={{ fontWeight: 'bold', color: t.type === 'income' ? 'var(--color-primary)' : 'var(--color-expense)' }}>
                              {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
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
