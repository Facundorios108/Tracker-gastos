import { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import BottomNav from './components/BottomNav';
import TransactionModal from './components/TransactionModal';
import ToastContainer from './components/ToastContainer';
import SkeletonLoader from './components/SkeletonLoader';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import Goals from './pages/Goals';
import Profile from './pages/Profile';
import Cards from './pages/Cards';
import Login from './pages/Login';
import Analytics from './pages/Analytics';
import type { Transaction } from './types';
import './styles/global.css';

type Tab = 'dashboard' | 'transactions' | 'goals' | 'cards' | 'profile' | 'analytics';

function AppContent() {
  const { state, toasts, removeToast } = useApp();
  const { user, isLoading } = state;
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'income' | 'expense'>('expense');
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [navFilters, setNavFilters] = useState<any>(null);
  const [prefilledData, setPrefilledData] = useState<Partial<Transaction> | null>(null);

  const handleFabClick = () => {
    // Determine which modal to show based on the active tab/filters
    const type = (activeTab === 'transactions' && navFilters?.type === 'income') ? 'income' : 'expense';
    setModalType(type);
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
      case 'transactions':
        return <Transactions 
                 onEdit={handleEdit} 
                 initialFilters={navFilters} 
                 onSubTabChange={(type) => setNavFilters({ ...navFilters, type })}
               />;
      case 'goals':
        return <Goals />;
      case 'cards':
        return <Cards onEdit={handleEdit} onAddExpense={handleAddExpenseForCard} />;
      case 'profile':
        return <Profile />;
      case 'analytics':
        return <Analytics onBack={() => handleNavigate('dashboard')} />;
    }
  };

  if (isLoading) {
    return <SkeletonLoader />;
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
      <ToastContainer toasts={toasts} onRemove={removeToast} />
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
