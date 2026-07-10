import { useState } from 'react';
import { LayoutDashboard, ArrowRightLeft, Target, Plus, User, CreditCard } from 'lucide-react';
import './BottomNav.css';

type Tab = 'dashboard' | 'transactions' | 'goals' | 'cards' | 'profile' | 'analytics';

interface BottomNavProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  onFabClick: () => void;
}

export default function BottomNav({ activeTab, onTabChange, onFabClick }: BottomNavProps) {
  const [fabPressed, setFabPressed] = useState(false);

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: 'dashboard', label: 'Resumen', icon: LayoutDashboard },
    { id: 'transactions', label: 'Movimientos', icon: ArrowRightLeft },
    { id: 'goals', label: 'Metas', icon: Target },
    { id: 'cards', label: 'Tarjetas', icon: CreditCard },
    { id: 'profile', label: 'Perfil', icon: User },
  ];

  return (
    <>
      {(activeTab === 'dashboard' || activeTab === 'transactions') && (
        <button
          className={`fab-fixed bounce-effect ${fabPressed ? 'fab-fixed--pressed' : ''}`}
          id="add-transaction-fab"
          onClick={() => {
            setFabPressed(true);
            setTimeout(() => setFabPressed(false), 200);
            onFabClick();
          }}
          aria-label="Agregar transacción"
        >
          <Plus size={32} strokeWidth={2.5} />
        </button>
      )}

      <nav className="bottom-nav" id="bottom-navigation">
        <div className="bottom-nav__inner">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              id={`nav-tab-${tab.id}`}
              className={`bottom-nav__tab bounce-effect ${activeTab === tab.id ? 'bottom-nav__tab--active' : ''}`}
              onClick={() => onTabChange(tab.id)}
              aria-label={tab.label}
            >
              <tab.icon size={22} strokeWidth={activeTab === tab.id ? 2.2 : 1.8} />
              <span className="bottom-nav__label">{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </>
  );
}
