import { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import BottomNav from './components/BottomNav';
import TransactionModal from './components/TransactionModal';
import Dashboard from './pages/Dashboard';
import Expenses from './pages/Expenses';
import Income from './pages/Income';
import Goals from './pages/Goals';
import Profile from './pages/Profile';
import Cards from './pages/Cards';
import Login from './pages/Login';
import type { Transaction } from './types';
import './styles/global.css';

type Tab = 'dashboard' | 'expenses' | 'income' | 'goals' | 'cards' | 'profile';

function AppContent() {
  const { state } = useApp();
  const { user, isLoading } = state;
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'income' | 'expense'>('expense');
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [navFilters, setNavFilters] = useState<any>(null);
  const [prefilledData, setPrefilledData] = useState<Partial<Transaction> | null>(null);

  const handleFabClick = () => {
    setModalType(activeTab === 'income' ? 'income' : 'expense');
    setEditingTransaction(null);
    setPrefilledData(null);
    setShowModal(true);
  };

  const handleAddExpenseForCard = (cardId: string) => {
    setModalType('expense');
    setEditingTransaction(null);
    setPrefilledData({
      paymentMethod: 'credit',
      creditCardId: cardId
    });
    setShowModal(true);
  };

  const handleEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setModalType(transaction.type);
    setShowModal(true);
  };

  const handleNavigate = (tab: Tab, filters?: any) => {
    setNavFilters(filters || null);
    setActiveTab(tab);
  };

  const renderPage = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard onNavigate={handleNavigate} onEdit={handleEdit} />;
      case 'expenses':
        return <Expenses onEdit={handleEdit} initialFilters={navFilters} />;
      case 'income':
        return <Income onEdit={handleEdit} initialFilters={navFilters} />;
      case 'goals':
        return <Goals />;
      case 'cards':
        return <Cards onEdit={handleEdit} onAddExpense={handleAddExpenseForCard} />;
      case 'profile':
        return <Profile />;
    }
  };

  if (isLoading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Cargando tus finanzas...</p>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <div className="app">
      <main className="app__content">
        {renderPage()}
      </main>
      <BottomNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onFabClick={handleFabClick}
      />
      <TransactionModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingTransaction(null);
          setPrefilledData(null);
        }}
        initialType={modalType}
        editingTransaction={editingTransaction}
        prefilledData={prefilledData}
      />
    </div>
  );
}

function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default App;
