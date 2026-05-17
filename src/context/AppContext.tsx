import { createContext, useContext, useReducer, useEffect, type ReactNode } from 'react';
import type { Transaction, SavingsGoal, FundAllocation, UserSettings } from '../types';
import { auth, db } from '../firebaseConfig';
import { onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { doc, setDoc, onSnapshot, collection, query, orderBy, deleteDoc } from 'firebase/firestore';

/* ── State Shape ── */
interface AppState {
  transactions: Transaction[];
  goals: SavingsGoal[];
  funds: FundAllocation[];
  settings: UserSettings;
  user: any | null;
  isLoading: boolean;
}


const defaultSettings: UserSettings = {
  name: 'Invitado',
  monthlyBudget: 500000,
  theme: 'light',
  displayCurrency: 'ARS',
  exchangeRate: 1100,
  customization: {
    primaryColor: '#10b981',
    backgroundColor: '#f8fafc',
    fontSizeOffset: 0
  }
};

const getInitialSettings = (): UserSettings => {
  try {
    const local = localStorage.getItem('app_settings');
    if (local) return { ...defaultSettings, ...JSON.parse(local) };
  } catch (e) {}
  return defaultSettings;
};

const defaultState: AppState = {
  transactions: [],
  goals: [],
  funds: [],
  settings: getInitialSettings(),
  user: null,
  isLoading: true,
};

let settingsSaveTimeout: any = null;

/* ── Actions ── */

type Action =
  | { type: 'SET_TRANSACTIONS'; payload: Transaction[] }
  | { type: 'SET_GOALS'; payload: SavingsGoal[] }
  | { type: 'SET_FUNDS'; payload: FundAllocation[] }
  | { type: 'SET_SETTINGS'; payload: Partial<UserSettings> }
  | { type: 'SET_USER'; payload: any | null }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_EXCHANGE_RATE'; payload: number }
  | { type: 'RESET_DATA' };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_TRANSACTIONS':
      return { ...state, transactions: action.payload };
    case 'SET_GOALS':
      return { ...state, goals: action.payload };
    case 'SET_FUNDS':
      return { ...state, funds: action.payload };
    case 'SET_SETTINGS':
      return { ...state, settings: { ...state.settings, ...action.payload } };
    case 'SET_USER':
      return { ...state, user: action.payload };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_EXCHANGE_RATE':
      return { ...state, settings: { ...state.settings, exchangeRate: action.payload } };
    case 'RESET_DATA':
      return { ...defaultState, user: state.user, isLoading: false };
    default:
      return state;
  }
}

/* ── Context ── */
interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  addTransaction: (t: Omit<Transaction, 'id'>) => Promise<void>;
  updateTransaction: (t: Transaction) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  addGoal: (g: SavingsGoal) => Promise<void>;
  updateGoal: (g: SavingsGoal) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;
  addToGoal: (goalId: string, amount: number) => Promise<void>;
  addFund: (f: FundAllocation) => Promise<void>;
  updateFund: (f: FundAllocation) => Promise<void>;
  deleteFund: (id: string) => Promise<void>;
  updateSettings: (settings: Partial<UserSettings>) => Promise<void>;
  clearAllData: () => Promise<void>;
  convertToDisplay: (amount: number, from: 'ARS' | 'USD') => number;
  formatCurrency: (amount: number, currency?: 'ARS' | 'USD') => string;
  totalIncome: number;
  totalExpenses: number;
  balance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  monthlyBalance: number;
  toggleTheme: () => void;
  signOut: () => Promise<void>;
  displayCurrency: 'ARS' | 'USD';
  exchangeRate: number;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, defaultState);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      dispatch({ type: 'SET_USER', payload: user });
      dispatch({ type: 'SET_LOADING', payload: false });
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!state.user) return;

    // Listen to Settings
    const settingsRef = doc(db, 'users', state.user.uid);
    const unsubSettings = onSnapshot(settingsRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const merged = { ...defaultSettings, ...data.settings };
        localStorage.setItem('app_settings', JSON.stringify(merged));
        dispatch({ type: 'SET_SETTINGS', payload: merged });
      } else {
        // Init default settings in Firestore if new user
        setDoc(settingsRef, { settings: defaultSettings }, { merge: true });
      }
    }, (error) => {
      console.error("Settings listener error:", error);
    });

    // Listen to Transactions
    const transactionsQuery = query(
      collection(db, 'users', state.user.uid, 'transactions'),
      orderBy('date', 'desc')
    );
    const unsubTransactions = onSnapshot(transactionsQuery, (querySnap) => {
      const transactions = querySnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
      dispatch({ type: 'SET_TRANSACTIONS', payload: transactions });
    }, (error) => {
      console.error("Transactions listener error:", error);
    });

    const unsubGoals = onSnapshot(query(collection(db, 'users', state.user.uid, 'goals')), (querySnap) => {
      const goals = querySnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as SavingsGoal));
      dispatch({ type: 'SET_GOALS', payload: goals });
    }, (error) => {
      console.error("Goals listener error:", error);
    });

    const unsubFunds = onSnapshot(query(collection(db, 'users', state.user.uid, 'funds')), (querySnap) => {
      const funds = querySnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as FundAllocation));
      dispatch({ type: 'SET_FUNDS', payload: funds });
    }, (error) => {
      console.error("Funds listener error:", error);
    });

    return () => {
      unsubSettings();
      unsubTransactions();
      unsubGoals();
      unsubFunds();
    };
  }, [state.user?.uid]);

  useEffect(() => {
    // Apply theme to document
    if (state.settings?.theme) {
      document.documentElement.setAttribute('data-theme', state.settings.theme);
    }
    
    // Apply customization CSS variables
    if (state.settings?.customization) {
      const { primaryColor, backgroundColor, fontSizeOffset } = state.settings.customization;
      if (primaryColor) {
        document.documentElement.style.setProperty('--color-primary', primaryColor);
      } else {
        document.documentElement.style.removeProperty('--color-primary');
      }
      
      if (backgroundColor) {
        document.documentElement.style.setProperty('--color-background', backgroundColor);
      } else {
        document.documentElement.style.removeProperty('--color-background');
      }
      
      if (fontSizeOffset !== undefined) {
        // Assume default html font-size is 16px. We'll adjust the base font size for the root.
        // If they chose to increase size, we add to base size.
        document.documentElement.style.setProperty('--font-size-offset', `${fontSizeOffset}px`);
      } else {
        document.documentElement.style.removeProperty('--font-size-offset');
      }
    }
  }, [state.settings?.theme, state.settings?.customization]);

  const addTransaction = async (t: Omit<Transaction, 'id'>) => {
    if (!state.user) return;
    const docRef = doc(collection(db, 'users', state.user.uid, 'transactions'));
    await setDoc(docRef, { ...t, id: docRef.id });
  };

  const updateTransaction = async (t: Transaction) => {
    if (!state.user) return;
    await setDoc(doc(db, 'users', state.user.uid, 'transactions', t.id), t, { merge: true });
  };

  const deleteTransaction = async (id: string) => {
    if (!state.user) return;
    await deleteDoc(doc(db, 'users', state.user.uid, 'transactions', id));
  };

  const addGoal = async (g: SavingsGoal) => {
    if (!state.user) return;
    await setDoc(doc(db, 'users', state.user.uid, 'goals', g.id), g);
  };

  const updateGoal = async (g: SavingsGoal) => {
    if (!state.user) return;
    await setDoc(doc(db, 'users', state.user.uid, 'goals', g.id), g, { merge: true });
  };

  const deleteGoal = async (id: string) => {
    if (!state.user) return;
    await deleteDoc(doc(db, 'users', state.user.uid, 'goals', id));
  };

  const addToGoal = async (goalId: string, amount: number) => {
    if (!state.user) return;
    const goal = state.goals.find(g => g.id === goalId);
    if (goal) {
      const newAmount = Math.min(goal.currentAmount + amount, goal.targetAmount);
      await setDoc(doc(db, 'users', state.user.uid, 'goals', goal.id), { currentAmount: newAmount }, { merge: true });
    }
  };

  const addFund = async (f: FundAllocation) => {
    if (!state.user) return;
    await setDoc(doc(db, 'users', state.user.uid, 'funds', f.id), f);
  };

  const updateFund = async (f: FundAllocation) => {
    if (!state.user) return;
    await setDoc(doc(db, 'users', state.user.uid, 'funds', f.id), f, { merge: true });
  };

  const deleteFund = async (id: string) => {
    if (!state.user) return;
    await deleteDoc(doc(db, 'users', state.user.uid, 'funds', id));
  };

  const updateSettings = async (nextSettings: Partial<UserSettings>) => {
    if (!state.user) return;
    const mergedSettings = { ...state.settings, ...nextSettings };
    
    dispatch({ type: 'SET_SETTINGS', payload: nextSettings });
    localStorage.setItem('app_settings', JSON.stringify(mergedSettings));

    if (settingsSaveTimeout) clearTimeout(settingsSaveTimeout);
    settingsSaveTimeout = setTimeout(() => {
      setDoc(doc(db, 'users', state.user.uid), { settings: mergedSettings }, { merge: true }).catch(console.error);
    }, 1000);
  };

  const clearAllData = async () => {
    if (!state.user) return;
    
    try {
      // Use batches or sequential deletes for reliability in this environment
      const tPromises = state.transactions.map(t => deleteDoc(doc(db, 'users', state.user.uid, 'transactions', t.id)));
      const gPromises = state.goals.map(g => deleteDoc(doc(db, 'users', state.user.uid, 'goals', g.id)));
      const fPromises = state.funds.map(f => deleteDoc(doc(db, 'users', state.user.uid, 'funds', f.id)));
      
      await Promise.all([...tPromises, ...gPromises, ...fPromises]);
      
      // Reset settings to default
      await setDoc(doc(db, 'users', state.user.uid), { settings: defaultSettings }, { merge: true });
      
      dispatch({ type: 'RESET_DATA' });
    } catch (err) {
      console.error('Error clearing data:', err);
      throw err;
    }
  };

  const handleSignOut = async () => {
    await firebaseSignOut(auth);
    dispatch({ type: 'SET_USER', payload: null });
    dispatch({ type: 'SET_TRANSACTIONS', payload: [] });
    dispatch({ type: 'SET_GOALS', payload: [] });
    dispatch({ type: 'SET_FUNDS', payload: [] });
    dispatch({ type: 'SET_SETTINGS', payload: defaultSettings });
  };

  useEffect(() => {
    if (!state.user) return;
    const fetchRate = async () => {
      try {
        const response = await fetch('https://dolarapi.com/v1/dolares/oficial');
        const data = await response.json();
        if (data && data.venta) {
          updateSettings({ exchangeRate: data.venta });
        }
      } catch (error) {
        console.error('Error fetching exchange rate:', error);
      }
    };
    fetchRate();
  }, [state.user?.uid]);

  const { displayCurrency, exchangeRate } = state.settings;

  const toggleTheme = () => {
    const nextTheme = state.settings.theme === 'light' ? 'dark' : 'light';
    updateSettings({ theme: nextTheme });
  };

  const convertToDisplay = (amount: number, from: 'ARS' | 'USD') => {
    if (from === displayCurrency) return amount;
    if (from === 'ARS' && displayCurrency === 'USD') return amount / exchangeRate;
    if (from === 'USD' && displayCurrency === 'ARS') return amount * exchangeRate;
    return amount;
  };

  const formatCurrency = (amount: number, currency?: 'ARS' | 'USD') => {
    const targetCurrency = currency || displayCurrency;
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: targetCurrency,
      minimumFractionDigits: targetCurrency === 'USD' ? 2 : 0,
    }).format(amount);
  };

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const monthlyTransactions = state.transactions.filter(t => {
    const d = new Date(t.date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  const getTransactionAmountInDisplay = (t: Transaction) => convertToDisplay(t.amount, t.currency);

  const totalIncome = state.transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + getTransactionAmountInDisplay(t), 0);
  const totalExpenses = state.transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + getTransactionAmountInDisplay(t), 0);
  const balance = totalIncome - totalExpenses;

  const monthlyIncome = monthlyTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + getTransactionAmountInDisplay(t), 0);
  const monthlyExpenses = monthlyTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + getTransactionAmountInDisplay(t), 0);
  const monthlyBalance = monthlyIncome - monthlyExpenses;

  return (
    <AppContext.Provider value={{ 
      state, 
      dispatch, 
      addTransaction,
      updateTransaction,
      deleteTransaction,
      addGoal,
      updateGoal,
      deleteGoal,
      addToGoal,
      addFund,
      updateFund,
      deleteFund,
      updateSettings,
      clearAllData,
      convertToDisplay,
      formatCurrency,
      totalIncome, 
      totalExpenses, 
      balance, 
      monthlyIncome, 
      monthlyExpenses, 
      monthlyBalance,
      toggleTheme,
      signOut: handleSignOut,
      displayCurrency,
      exchangeRate
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
