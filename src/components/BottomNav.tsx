import { useState } from 'react';
import { LayoutDashboard, ArrowDownCircle, ArrowUpCircle, Target, Plus, User } from 'lucide-react';
import './BottomNav.css';

type Tab = 'dashboard' | 'expenses' | 'income' | 'goals' | 'profile';

interface BottomNavProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  onFabClick: () => void;
}

export default function BottomNav({ activeTab, onTabChange, onFabClick }: BottomNavProps) {
  const [fabPressed, setFabPressed] = useState(false);

  const tabs: { id: Tab; label: string; icon: typeof LayoutDashboard }[] = [
    { id: 'dashboard', label: 'Resumen', icon: LayoutDashboard },
    { id: 'expenses', label: 'Gastos', icon: ArrowDownCircle },
    { id: 'income', label: 'Ingreso', icon: ArrowUpCircle },
    { id: 'goals', label: 'Metas', icon: Target },
    { id: 'profile', label: 'Perfil', icon: User },
  ];

  return (
    <>
      {activeTab !== 'profile' && (
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
