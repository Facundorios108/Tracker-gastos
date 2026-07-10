import { useState, useEffect } from 'react';
import Expenses from './Expenses';
import Income from './Income';
import './Transactions.css';

interface TransactionsProps {
  onEdit?: (transaction: any) => void;
  initialFilters?: any;
  onSubTabChange?: (type: 'expenses' | 'income') => void;
}

export default function Transactions({ onEdit, initialFilters, onSubTabChange }: TransactionsProps) {
  const [activeSubTab, setActiveSubTab] = useState<'expenses' | 'income'>('expenses');

  useEffect(() => {
    if (initialFilters?.type) {
      setActiveSubTab(initialFilters.type);
    }
  }, [initialFilters?.type]);

  return (
    <div className="transactions-wrapper">
      <div className="transactions-tabs animate-slide-up">
        <button 
          className={`transactions-tab bounce-effect ${activeSubTab === 'expenses' ? 'transactions-tab--active' : ''}`}
          onClick={() => {
            setActiveSubTab('expenses');
            onSubTabChange?.('expenses');
          }}
        >
          Gastos
        </button>
        <button 
          className={`transactions-tab bounce-effect ${activeSubTab === 'income' ? 'transactions-tab--active' : ''}`}
          onClick={() => {
            setActiveSubTab('income');
            onSubTabChange?.('income');
          }}
        >
          Ingresos
        </button>
      </div>

      <div className="transactions-content">
        {activeSubTab === 'expenses' ? (
          <Expenses onEdit={onEdit} initialFilters={initialFilters} />
        ) : (
          <Income onEdit={onEdit} initialFilters={initialFilters} />
        )}
      </div>
    </div>
  );
}
