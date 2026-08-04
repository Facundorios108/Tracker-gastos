import { createContext, useContext, useReducer, useEffect, useState, type ReactNode } from 'react';
import type { Transaction, SavingsGoal, FundAllocation, UserSettings } from '../types';
import { parseTransactionDate } from '../utils';

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}
import { auth, db } from '../firebaseConfig';
import { onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { doc, setDoc, onSnapshot, collection, query, orderBy, deleteDoc, getDocs } from 'firebase/firestore';

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
  exchangeRateEUR: 1200,
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

const getLocalData = <T,>(key: string, fallback: T): T => {
  try {
    const local = localStorage.getItem(key);
    if (local) return JSON.parse(local);
  } catch (e) {}
  return fallback;
};

const defaultState: AppState = {
  transactions: getLocalData<Transaction[]>('app_transactions', []),
  goals: getLocalData<SavingsGoal[]>('app_goals', []),
  funds: getLocalData<FundAllocation[]>('app_funds', []),
  settings: getInitialSettings(),
  user: null,
  isLoading: true,
};

let pendingSettings: Partial<UserSettings> = {};
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
  convertToDisplay: (amount: number, from: 'ARS' | 'USD' | 'EUR') => number;
  formatCurrency: (amount: number, currency?: 'ARS' | 'USD' | 'EUR') => string;
  totalIncome: number;
  totalExpenses: number;
  balance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  monthlyBalance: number;
  toggleTheme: () => void;
  signOut: () => Promise<void>;
  displayCurrency: 'ARS' | 'USD' | 'EUR';
  exchangeRate: number;
  toggleCardPayment: (cardId: string, month: string, totals?: { ars: number, usd: number }) => Promise<void>;
  toasts: ToastMessage[];
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  removeToast: (id: string) => void;
  importBackupData: (data: {
    transactions: Transaction[];
    goals: SavingsGoal[];
    funds: FundAllocation[];
    settings: UserSettings;
  }) => Promise<void>;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, defaultState);

  const [authResolved, setAuthResolved] = useState(false);
  const [listenersFired, setListenersFired] = useState({
    settings: false,
    transactions: false,
    goals: false,
    funds: false,
  });

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      dispatch({ type: 'SET_USER', payload: user });
      setAuthResolved(true);
      if (!user) {
        dispatch({ type: 'SET_LOADING', payload: false });
        localStorage.setItem('app_user_uid', 'guest');
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!authResolved) return;
    if (!state.user) {
      dispatch({ type: 'SET_LOADING', payload: false });
    } else {
      if (listenersFired.settings && listenersFired.transactions && listenersFired.goals && listenersFired.funds) {
        dispatch({ type: 'SET_LOADING', payload: false });
      } else {
        dispatch({ type: 'SET_LOADING', payload: true });
      }
    }
  }, [authResolved, state.user, listenersFired]);

  useEffect(() => {
    setListenersFired({
      settings: false,
      transactions: false,
      goals: false,
      funds: false,
    });
    if (!state.user) return;

    let active = true;
    let unsubs: (() => void)[] = [];

    const initUserAndListeners = async () => {
      const currentUid = state.user.uid;
      const storedUid = localStorage.getItem('app_user_uid');

      console.log('🚀 Inicializando listeners para usuario:', {
        currentUid,
        storedUid,
        email: state.user.email
      });

      if (storedUid !== currentUid) {
        // If storedUid is guest or empty, migrate the guest data
        if (!storedUid || storedUid === 'guest') {
          const guestTransactions = getLocalData<Transaction[]>('app_transactions', []);
          const guestGoals = getLocalData<SavingsGoal[]>('app_goals', []);
          const guestFunds = getLocalData<FundAllocation[]>('app_funds', []);
          const guestSettings = getInitialSettings();

          if (guestTransactions.length > 0 || guestGoals.length > 0 || guestFunds.length > 0) {
            console.log("Migrating guest data to user:", currentUid);
            
            const promises: Promise<void>[] = [];
            for (const t of guestTransactions) {
              promises.push(setDoc(doc(db, 'users', currentUid, 'transactions', t.id), t, { merge: true }));
            }
            for (const g of guestGoals) {
              promises.push(setDoc(doc(db, 'users', currentUid, 'goals', g.id), g, { merge: true }));
            }
            for (const f of guestFunds) {
              promises.push(setDoc(doc(db, 'users', currentUid, 'funds', f.id), f, { merge: true }));
            }
            promises.push(setDoc(doc(db, 'users', currentUid), { settings: guestSettings }, { merge: true }));

            try {
              await Promise.all(promises);
              console.log("Guest data migration complete.");
            } catch (err) {
              console.error("Migration error:", err);
            }
          }
        } else {
          // Different user logged in. Clean up other user's caches.
          console.log("Different user logged in. Clearing local storage caches.");
          localStorage.removeItem('app_transactions');
          localStorage.removeItem('app_goals');
          localStorage.removeItem('app_funds');
          localStorage.setItem('app_settings', JSON.stringify(defaultSettings));

          dispatch({ type: 'SET_TRANSACTIONS', payload: [] });
          dispatch({ type: 'SET_GOALS', payload: [] });
          dispatch({ type: 'SET_FUNDS', payload: [] });
          dispatch({ type: 'SET_SETTINGS', payload: defaultSettings });
        }

        localStorage.setItem('app_user_uid', currentUid);
      }

      if (!active) return;

      // Listen to Settings
      const settingsRef = doc(db, 'users', currentUid);
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
        setListenersFired(prev => ({ ...prev, settings: true }));
      }, (error) => {
        console.error("Settings listener error:", error);
        setListenersFired(prev => ({ ...prev, settings: true }));
      });
      unsubs.push(unsubSettings);

      // Listen to Transactions
      const transactionsQuery = query(
        collection(db, 'users', currentUid, 'transactions'),
        orderBy('date', 'desc')
      );
      const unsubTransactions = onSnapshot(transactionsQuery, (querySnap) => {
        const transactions = querySnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
        console.log('🔄 Listener de transacciones actualizado:', {
          cantidad: transactions.length,
          ids: transactions.map(t => t.id),
          categorias: transactions.map(t => t.category)
        });
        localStorage.setItem('app_transactions', JSON.stringify(transactions));
        dispatch({ type: 'SET_TRANSACTIONS', payload: transactions });
        setListenersFired(prev => ({ ...prev, transactions: true }));
      }, (error) => {
        console.error("❌ Error en listener de transacciones:", error);
        setListenersFired(prev => ({ ...prev, transactions: true }));
      });
      unsubs.push(unsubTransactions);

      // Listen to Goals
      const unsubGoals = onSnapshot(query(collection(db, 'users', currentUid, 'goals')), (querySnap) => {
        const goals = querySnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as SavingsGoal));
        localStorage.setItem('app_goals', JSON.stringify(goals));
        dispatch({ type: 'SET_GOALS', payload: goals });
        setListenersFired(prev => ({ ...prev, goals: true }));
      }, (error) => {
        console.error("Goals listener error:", error);
        setListenersFired(prev => ({ ...prev, goals: true }));
      });
      unsubs.push(unsubGoals);

      // Listen to Funds
      const unsubFunds = onSnapshot(query(collection(db, 'users', currentUid, 'funds')), (querySnap) => {
        const funds = querySnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as FundAllocation));
        localStorage.setItem('app_funds', JSON.stringify(funds));
        dispatch({ type: 'SET_FUNDS', payload: funds });
        setListenersFired(prev => ({ ...prev, funds: true }));
      }, (error) => {
        console.error("Funds listener error:", error);
        setListenersFired(prev => ({ ...prev, funds: true }));
      });
      unsubs.push(unsubFunds);
    };

    initUserAndListeners();

    return () => {
      active = false;
      unsubs.forEach(unsub => unsub());
    };
  }, [state.user?.uid]);

  useEffect(() => {
    const isDark = state.settings?.theme === 'dark';

    // Apply theme attribute to html element
    if (state.settings?.theme) {
      document.documentElement.setAttribute('data-theme', state.settings.theme);
    }

    // Apply customization CSS variables
    if (state.settings?.customization) {
      const { primaryColor, backgroundColor, fontSizeOffset } = state.settings.customization;

      // Primary color - respected in both modes
      if (primaryColor) {
        document.documentElement.style.setProperty('--color-primary', primaryColor);
      } else {
        document.documentElement.style.removeProperty('--color-primary');
      }

      // Background color - ONLY in light mode.
      // In dark mode, always remove the inline override so [data-theme='dark'] tokens win.
      if (backgroundColor && !isDark) {
        document.documentElement.style.setProperty('--color-background', backgroundColor);
        document.documentElement.style.setProperty('--color-surface', backgroundColor);
      } else {
        document.documentElement.style.removeProperty('--color-background');
        document.documentElement.style.removeProperty('--color-surface');
      }

      if (fontSizeOffset !== undefined) {
        document.documentElement.style.setProperty('--font-size-offset', `${fontSizeOffset}px`);
      } else {
        document.documentElement.style.removeProperty('--font-size-offset');
      }
    }
  }, [state.settings?.theme, state.settings?.customization]);

  // TODO: Sistema de auto-generación deshabilitado - las transacciones se crean manualmente
  // Procesar suscripciones y cuotas pendientes automáticamente
  useEffect(() => {
    if (state.transactions.length === 0) return;
    
    const processRecurringTransactions = async () => {
      const today = new Date();
      const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
      
      console.log('🔍 Verificando transacciones recurrentes para el mes:', currentMonth);
      
      // Buscar suscripciones activas (las más recientes con isRecurring: true)
      const subscriptions = state.transactions.filter(t => t.isRecurring && t.recurringDay);
      const uniqueSubscriptions = new Map();
      
      // Agrupar por día para evitar duplicados
      subscriptions.forEach(sub => {
        const key = `${sub.recurringDay}-${sub.category}-${sub.description}`;
        const existing = uniqueSubscriptions.get(key);
        if (!existing || new Date(sub.date) > new Date(existing.date)) {
          uniqueSubscriptions.set(key, sub);
        }
      });
      
      // Verificar si falta crear la del mes actual
      for (const [, sub] of uniqueSubscriptions) {
        const subDate = new Date(sub.date);
        const subMonth = `${subDate.getFullYear()}-${String(subDate.getMonth() + 1).padStart(2, '0')}`;
        
        // Si la última suscripción es de un mes anterior al actual, crear la nueva
        if (subMonth < currentMonth) {
          const newDate = new Date(today.getFullYear(), today.getMonth(), sub.recurringDay!);
          
          // Solo crear si el día no ha pasado aún este mes, o si no existe ya
          const existsThisMonth = state.transactions.some(t => 
            t.recurringDay === sub.recurringDay &&
            t.category === sub.category &&
            new Date(t.date).getMonth() === today.getMonth() &&
            new Date(t.date).getFullYear() === today.getFullYear()
          );
          
          if (!existsThisMonth && newDate.getDate() === sub.recurringDay) {
            console.log('📅 Creando suscripción automática:', sub.description);
            
            const newTransaction: any = {
              amount: sub.amount,
              category: sub.category,
              description: sub.description,
              date: newDate.toISOString(),
              type: sub.type,
              currency: sub.currency,
              isRecurring: true,
              recurringDay: sub.recurringDay,
            };
            
            if (sub.paymentMethod) {
              newTransaction.paymentMethod = sub.paymentMethod;
            }
            if (sub.notes) {
              newTransaction.notes = sub.notes;
            }
            if (sub.creditCardId) {
              newTransaction.creditCardId = sub.creditCardId;
              const card = state.settings.creditCards?.find(c => c.id === sub.creditCardId);
              if (card) {
                let bYear = newDate.getFullYear();
                let bMonth = newDate.getMonth() + 1;
                if (newDate.getDate() > card.closingDate) {
                  bMonth += 1;
                  if (bMonth > 12) {
                    bMonth = 1;
                    bYear += 1;
                  }
                }
                newTransaction.billingMonth = `${bYear}-${String(bMonth).padStart(2, '0')}`;
              }
            }
            
            await addTransaction(newTransaction);
          }
        }
      }
      
      // Buscar cuotas activas que necesitan crear la siguiente
      const installments = state.transactions.filter(t => t.isInstallment && t.installmentDay);
      const activeInstallments = new Map();
      
      // Agrupar por installmentDay y descripción base
      installments.forEach(inst => {
        if (!inst.totalInstallments || !inst.installmentNumber) return;
        
        const baseDesc = inst.description.replace(/\(Cuota \d+\/\d+\)/, '').trim();
        const key = `${inst.installmentDay}-${baseDesc}`;
        const existing = activeInstallments.get(key);
        
        if (!existing || (inst.installmentNumber! > existing.installmentNumber!)) {
          activeInstallments.set(key, inst);
        }
      });
      
      // Verificar si falta crear la siguiente cuota
      for (const [, inst] of activeInstallments) {
        const instDate = new Date(inst.date);
        const instMonth = `${instDate.getFullYear()}-${String(instDate.getMonth() + 1).padStart(2, '0')}`;
        
        // Si la última cuota es de un mes anterior y aún quedan cuotas por pagar
        if (instMonth < currentMonth && inst.installmentNumber! < inst.totalInstallments!) {
          const newDate = new Date(today.getFullYear(), today.getMonth(), inst.installmentDay!);
          
          // Solo crear si no existe ya
          const existsThisMonth = state.transactions.some(t => 
            t.installmentDay === inst.installmentDay &&
            t.isInstallment &&
            new Date(t.date).getMonth() === today.getMonth() &&
            new Date(t.date).getFullYear() === today.getFullYear() &&
            t.description?.includes(inst.description.replace(/\(Cuota \d+\/\d+\)/, '').trim())
          );
          
          if (!existsThisMonth && newDate.getDate() === inst.installmentDay) {
            const nextInstallmentNumber = inst.installmentNumber! + 1;
            const installmentAmount = inst.installmentTotal! / inst.totalInstallments!;
            const baseDesc = inst.description.replace(/\(Cuota \d+\/\d+\)/, '').trim();
            
            console.log(`📅 Creando cuota automática ${nextInstallmentNumber}/${inst.totalInstallments}`);
            
            const newTransaction: any = {
              amount: Math.round(installmentAmount * 100) / 100,
              category: inst.category,
              description: `${baseDesc} (Cuota ${nextInstallmentNumber}/${inst.totalInstallments})`,
              date: newDate.toISOString(),
              type: inst.type,
              currency: inst.currency,
              isInstallment: true,
              installmentTotal: inst.installmentTotal,
              installmentNumber: nextInstallmentNumber,
              totalInstallments: inst.totalInstallments,
              installmentDay: inst.installmentDay,
            };
            
            if (inst.paymentMethod) {
              newTransaction.paymentMethod = inst.paymentMethod;
            }
            if (inst.notes) {
              newTransaction.notes = inst.notes;
            }
            if (inst.creditCardId) {
              newTransaction.creditCardId = inst.creditCardId;
              const card = state.settings.creditCards?.find(c => c.id === inst.creditCardId);
              if (card) {
                let bYear = newDate.getFullYear();
                let bMonth = newDate.getMonth() + 1;
                if (newDate.getDate() > card.closingDate) {
                  bMonth += 1;
                  if (bMonth > 12) {
                    bMonth = 1;
                    bYear += 1;
                  }
                }
                newTransaction.billingMonth = `${bYear}-${String(bMonth).padStart(2, '0')}`;
              }
            }
            
            await addTransaction(newTransaction);
          }
        }
      }
    };
    
    // Ejecutar solo una vez cuando cambien las transacciones
    const timeoutId = setTimeout(() => {
      processRecurringTransactions().catch(err => {
        console.error('Error procesando transacciones recurrentes:', err);
      });
    }, 2000); // Esperar 2 segundos después de que carguen las transacciones
    
    return () => clearTimeout(timeoutId);
  }, [state.transactions.length, state.user?.uid]);

  const cleanForFirestore = <T,>(obj: T): T => {
    return JSON.parse(JSON.stringify(obj));
  };

  const addTransaction = async (t: Omit<Transaction, 'id'>) => {
    const id = state.user ? doc(collection(db, 'users', state.user.uid, 'transactions')).id : crypto.randomUUID();
    const newTransaction = cleanForFirestore({ ...t, id });
    
    console.log('📝 Agregando nueva transacción:', {
      id,
      category: newTransaction.category,
      amount: newTransaction.amount,
      date: newTransaction.date,
      type: newTransaction.type,
      paymentMethod: newTransaction.paymentMethod,
      notes: newTransaction.notes,
      userId: state.user?.uid
    });

    // Actualización local optimista inmediata
    const newTransactions = [newTransaction, ...state.transactions];
    dispatch({ type: 'SET_TRANSACTIONS', payload: newTransactions });
    localStorage.setItem('app_transactions', JSON.stringify(newTransactions));
    showToast(newTransaction.type === 'income' ? 'Ingreso registrado con éxito' : 'Gasto registrado con éxito', 'success');

    if (state.user) {
      try {
        console.log('💾 Sincronizando transacción en Firebase...');
        await setDoc(doc(db, 'users', state.user.uid, 'transactions', id), newTransaction);
        console.log('✅ Transacción guardada exitosamente en Firebase:', id);
      } catch (err) {
        console.error("⚠️ Error de sincronización en Firebase (se mantiene copia local):", err);
      }
    }
  };

  const updateTransaction = async (t: Transaction) => {
    console.log('✏️ Actualizando transacción:', {
      id: t.id,
      category: t.category,
      amount: t.amount,
      userId: state.user?.uid
    });

    const cleanData = cleanForFirestore(t);

    // Actualización local optimista inmediata
    const newTransactions = state.transactions.map(tr => tr.id === t.id ? cleanData : tr);
    dispatch({ type: 'SET_TRANSACTIONS', payload: newTransactions });
    localStorage.setItem('app_transactions', JSON.stringify(newTransactions));
    showToast('Movimiento actualizado con éxito', 'success');

    if (state.user) {
      try {
        console.log('💾 Sincronizando actualización en Firebase...');
        await setDoc(doc(db, 'users', state.user.uid, 'transactions', t.id), cleanData, { merge: true });
        console.log('✅ Transacción actualizada exitosamente en Firebase:', t.id);
      } catch (err) {
        console.error("⚠️ Error de sincronización en Firebase (se mantiene copia local):", err);
      }
    }
  };

  const deleteTransaction = async (id: string) => {
    console.log('🗑️ Eliminando transacción:', id);

    // Actualización local optimista inmediata
    const newTransactions = state.transactions.filter(t => t.id !== id);
    dispatch({ type: 'SET_TRANSACTIONS', payload: newTransactions });
    localStorage.setItem('app_transactions', JSON.stringify(newTransactions));
    showToast('Movimiento eliminado con éxito', 'success');

    if (state.user) {
      try {
        console.log('💾 Eliminando de Firebase...');
        await deleteDoc(doc(db, 'users', state.user.uid, 'transactions', id));
        console.log('✅ Transacción eliminada exitosamente de Firebase:', id);
      } catch (err) {
        console.error("⚠️ Error de eliminación en Firebase (se mantiene copia local):", err);
      }
    }
  };

  const addGoal = async (g: SavingsGoal) => {
    const cleanG = cleanForFirestore(g);
    const newGoals = [...state.goals, cleanG];
    dispatch({ type: 'SET_GOALS', payload: newGoals });
    localStorage.setItem('app_goals', JSON.stringify(newGoals));
    showToast(`Meta "${g.title}" creada con éxito`, 'success');

    if (state.user) {
      try {
        await setDoc(doc(db, 'users', state.user.uid, 'goals', g.id), cleanG);
      } catch (err) {
        console.error("Firebase sync error:", err);
      }
    }
  };

  const updateGoal = async (g: SavingsGoal) => {
    const cleanG = cleanForFirestore(g);
    const newGoals = state.goals.map(goal => goal.id === g.id ? cleanG : goal);
    dispatch({ type: 'SET_GOALS', payload: newGoals });
    localStorage.setItem('app_goals', JSON.stringify(newGoals));
    showToast(`Meta "${g.title}" actualizada`, 'success');

    if (state.user) {
      try {
        await setDoc(doc(db, 'users', state.user.uid, 'goals', g.id), cleanG, { merge: true });
      } catch (err) {
        console.error("Firebase sync error:", err);
      }
    }
  };

  const deleteGoal = async (id: string) => {
    const goalToDelete = state.goals.find(g => g.id === id);
    const newGoals = state.goals.filter(goal => goal.id !== id);
    dispatch({ type: 'SET_GOALS', payload: newGoals });
    localStorage.setItem('app_goals', JSON.stringify(newGoals));
    showToast(`Meta "${goalToDelete?.title || ''}" eliminada`, 'success');

    if (state.user) {
      try {
        await deleteDoc(doc(db, 'users', state.user.uid, 'goals', id));
      } catch (err) {
        console.error("Firebase sync error:", err);
      }
    }
  };

  const addToGoal = async (goalId: string, amount: number) => {
    const newGoals = state.goals.map(g => {
      if (g.id === goalId) {
        const newAmount = Math.max(0, g.currentAmount + amount);
        return { ...g, currentAmount: newAmount };
      }
      return g;
    });
    dispatch({ type: 'SET_GOALS', payload: newGoals });
    localStorage.setItem('app_goals', JSON.stringify(newGoals));

    if (state.user) {
      const goal = state.goals.find(g => g.id === goalId);
      if (goal) {
        const newAmount = Math.max(0, goal.currentAmount + amount);
        try {
          await setDoc(doc(db, 'users', state.user.uid, 'goals', goal.id), cleanForFirestore({ currentAmount: newAmount }), { merge: true });
        } catch (err) {
          console.error("Firebase sync error:", err);
        }
      }
    }
  };

  const addFund = async (f: FundAllocation) => {
    const cleanF = cleanForFirestore(f);
    const newFunds = [...state.funds, cleanF];
    dispatch({ type: 'SET_FUNDS', payload: newFunds });
    localStorage.setItem('app_funds', JSON.stringify(newFunds));

    if (state.user) {
      try {
        await setDoc(doc(db, 'users', state.user.uid, 'funds', f.id), cleanF);
      } catch (err) {
        console.error("Firebase sync error:", err);
      }
    }
  };

  const updateFund = async (f: FundAllocation) => {
    const cleanF = cleanForFirestore(f);
    const newFunds = state.funds.map(fund => fund.id === f.id ? cleanF : fund);
    dispatch({ type: 'SET_FUNDS', payload: newFunds });
    localStorage.setItem('app_funds', JSON.stringify(newFunds));

    if (state.user) {
      try {
        await setDoc(doc(db, 'users', state.user.uid, 'funds', f.id), cleanF, { merge: true });
      } catch (err) {
        console.error("Firebase sync error:", err);
      }
    }
  };

  const deleteFund = async (id: string) => {
    const newFunds = state.funds.filter(fund => fund.id !== id);
    dispatch({ type: 'SET_FUNDS', payload: newFunds });
    localStorage.setItem('app_funds', JSON.stringify(newFunds));

    if (state.user) {
      try {
        await deleteDoc(doc(db, 'users', state.user.uid, 'funds', id));
      } catch (err) {
        console.error("Firebase sync error:", err);
      }
    }
  };

  const updateSettings = async (nextSettings: Partial<UserSettings>) => {
    pendingSettings = { ...pendingSettings, ...nextSettings };
    
    // Optimistic local update
    dispatch({ type: 'SET_SETTINGS', payload: nextSettings });
    
    // Note: We don't write to localStorage here because the reducer state isn't available synchronously.
    // The onSnapshot listener will update localStorage when the DB updates.
    // If we wanted to, we could read current localStorage and merge, but it's not strictly necessary.

    if (state.user) {
      if (settingsSaveTimeout) clearTimeout(settingsSaveTimeout);
      settingsSaveTimeout = setTimeout(() => {
        const settingsToSave = { ...pendingSettings };
        pendingSettings = {};
        setDoc(doc(db, 'users', state.user.uid), { settings: settingsToSave }, { merge: true })
          .catch(err => console.error("Firebase sync error:", err));
      }, 1000);
    } else {
      // For guest mode, we must update localStorage immediately
      try {
        const local = localStorage.getItem('app_settings');
        const current = local ? JSON.parse(local) : defaultSettings;
        localStorage.setItem('app_settings', JSON.stringify({ ...current, ...nextSettings }));
      } catch (e) {}
    }
  };

  const clearAllData = async () => {
    console.log('🗑️ Iniciando clearAllData...');
    
    if (!state.user) {
      localStorage.removeItem('app_transactions');
      localStorage.removeItem('app_goals');
      localStorage.removeItem('app_funds');
      localStorage.setItem('app_settings', JSON.stringify(defaultSettings));
      dispatch({ type: 'RESET_DATA' });
      console.log('✅ Datos locales borrados (modo invitado)');
      return;
    }
    
    try {
      const userId = state.user.uid;
      console.log('📡 Consultando todas las colecciones de Firebase para usuario:', userId);
      
      // Obtener TODAS las transacciones, metas y fondos directamente de Firebase
      const [transactionsSnap, goalsSnap, fundsSnap] = await Promise.all([
        getDocs(collection(db, 'users', userId, 'transactions')),
        getDocs(collection(db, 'users', userId, 'goals')),
        getDocs(collection(db, 'users', userId, 'funds'))
      ]);
      
      console.log('📊 Documentos encontrados:', {
        transacciones: transactionsSnap.size,
        metas: goalsSnap.size,
        fondos: fundsSnap.size
      });
      
      // Eliminar todos los documentos
      const deletePromises: Promise<void>[] = [];
      
      transactionsSnap.forEach(doc => {
        deletePromises.push(deleteDoc(doc.ref));
      });
      
      goalsSnap.forEach(doc => {
        deletePromises.push(deleteDoc(doc.ref));
      });
      
      fundsSnap.forEach(doc => {
        deletePromises.push(deleteDoc(doc.ref));
      });
      
      console.log('🔄 Eliminando', deletePromises.length, 'documentos...');
      await Promise.all(deletePromises);
      
      // Reset settings to default
      console.log('⚙️ Reseteando configuración a valores predeterminados...');
      await setDoc(doc(db, 'users', userId), { settings: defaultSettings }, { merge: true });
      
      // Limpiar localStorage
      localStorage.removeItem('app_transactions');
      localStorage.removeItem('app_goals');
      localStorage.removeItem('app_funds');
      localStorage.setItem('app_settings', JSON.stringify(defaultSettings));
      
      console.log('✅ Todos los datos borrados exitosamente');
      
      // El listener actualizará automáticamente el estado
    } catch (err) {
      console.error('❌ Error al borrar datos:', err);
      throw err;
    }
  };

  const importBackupData = async (data: {
    transactions: Transaction[];
    goals: SavingsGoal[];
    funds: FundAllocation[];
    settings: UserSettings;
  }) => {
    if (!state.user) {
      localStorage.setItem('app_transactions', JSON.stringify(data.transactions));
      localStorage.setItem('app_goals', JSON.stringify(data.goals));
      localStorage.setItem('app_funds', JSON.stringify(data.funds));
      localStorage.setItem('app_settings', JSON.stringify(data.settings));
      
      dispatch({ type: 'SET_TRANSACTIONS', payload: data.transactions });
      dispatch({ type: 'SET_GOALS', payload: data.goals });
      dispatch({ type: 'SET_FUNDS', payload: data.funds });
      dispatch({ type: 'SET_SETTINGS', payload: data.settings });
      
      showToast('Copia de seguridad restaurada con éxito (invitado)', 'success');
      return;
    }

    try {
      const userId = state.user.uid;
      const [transactionsSnap, goalsSnap, fundsSnap] = await Promise.all([
        getDocs(collection(db, 'users', userId, 'transactions')),
        getDocs(collection(db, 'users', userId, 'goals')),
        getDocs(collection(db, 'users', userId, 'funds'))
      ]);

      const deletePromises: Promise<void>[] = [];
      transactionsSnap.forEach(doc => deletePromises.push(deleteDoc(doc.ref)));
      goalsSnap.forEach(doc => deletePromises.push(deleteDoc(doc.ref)));
      fundsSnap.forEach(doc => deletePromises.push(deleteDoc(doc.ref)));
      await Promise.all(deletePromises);

      const uploadPromises: Promise<void>[] = [];
      data.transactions.forEach(t => {
        uploadPromises.push(setDoc(doc(db, 'users', userId, 'transactions', t.id), t));
      });
      data.goals.forEach(g => {
        uploadPromises.push(setDoc(doc(db, 'users', userId, 'goals', g.id), g));
      });
      data.funds.forEach(f => {
        uploadPromises.push(setDoc(doc(db, 'users', userId, 'funds', f.id), f));
      });
      uploadPromises.push(setDoc(doc(db, 'users', userId), { settings: data.settings }, { merge: true }));
      await Promise.all(uploadPromises);

      localStorage.setItem('app_transactions', JSON.stringify(data.transactions));
      localStorage.setItem('app_goals', JSON.stringify(data.goals));
      localStorage.setItem('app_funds', JSON.stringify(data.funds));
      localStorage.setItem('app_settings', JSON.stringify(data.settings));

      showToast('Copia de seguridad restaurada con éxito', 'success');
    } catch (err) {
      console.error('Error importing backup data:', err);
      showToast('Error al importar la copia de seguridad', 'error');
      throw err;
    }
  };

  const handleSignOut = async () => {
    await firebaseSignOut(auth);
    
    // Clear user-specific local data to prevent leakage to guest interface
    localStorage.removeItem('app_transactions');
    localStorage.removeItem('app_goals');
    localStorage.removeItem('app_funds');
    localStorage.setItem('app_settings', JSON.stringify(defaultSettings));
    localStorage.setItem('app_user_uid', 'guest');

    dispatch({ type: 'SET_USER', payload: null });
    dispatch({ type: 'SET_TRANSACTIONS', payload: [] });
    dispatch({ type: 'SET_GOALS', payload: [] });
    dispatch({ type: 'SET_FUNDS', payload: [] });
    dispatch({ type: 'SET_SETTINGS', payload: defaultSettings });
  };

  useEffect(() => {
    if (!state.user) return;
    const fetchRates = async () => {
      try {
        const [usdRes, eurRes] = await Promise.all([
          fetch('https://dolarapi.com/v1/dolares/oficial'),
          fetch('https://dolarapi.com/v1/cotizaciones/eur')
        ]);
        const usdData = await usdRes.json();
        const eurData = await eurRes.json();
        const updates: any = {};
        if (usdData && usdData.venta) updates.exchangeRate = usdData.venta;
        if (eurData && eurData.venta) updates.exchangeRateEUR = eurData.venta;
        if (Object.keys(updates).length > 0) updateSettings(updates);
      } catch (error) {
        console.error('Error fetching exchange rates:', error);
      }
    };
    fetchRates();
  }, [state.user?.uid]);

  const { displayCurrency, exchangeRate, exchangeRateEUR } = state.settings;

  const toggleTheme = () => {
    const nextTheme = state.settings.theme === 'light' ? 'dark' : 'light';
    updateSettings({ theme: nextTheme });
  };

  const convertToDisplay = (amount: number, from: 'ARS' | 'USD' | 'EUR') => {
    if (from === displayCurrency) return amount;
    // Convert to ARS base first
    let amountInARS = amount;
    if (from === 'USD') amountInARS = amount * exchangeRate;
    if (from === 'EUR') amountInARS = amount * (exchangeRateEUR || 1200);
    // Convert from ARS to target displayCurrency
    if (displayCurrency === 'ARS') return amountInARS;
    if (displayCurrency === 'USD') return amountInARS / exchangeRate;
    if (displayCurrency === 'EUR') return amountInARS / (exchangeRateEUR || 1200);
    return amount;
  };

  const formatCurrency = (amount: number, currency?: 'ARS' | 'USD' | 'EUR') => {
    const targetCurrency = currency || displayCurrency;
    if (targetCurrency === 'EUR') {
      return new Intl.NumberFormat('de-DE', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 2,
      }).format(amount);
    }
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: targetCurrency,
      minimumFractionDigits: targetCurrency === 'USD' ? 2 : 0,
    }).format(amount);
  };

  const toggleCardPayment = async (cardId: string, month: string, totals?: { ars: number, usd: number }) => {
    const cards = state.settings.creditCards || [];
    const card = cards.find(c => c.id === cardId);
    if (!card) return;

    const paidMonths = card.paidMonths || [];
    const isPaid = paidMonths.includes(month);
    const nextPaidMonths = isPaid
      ? paidMonths.filter(m => m !== month)
      : [...paidMonths, month];

    const updatedCards = cards.map(c => {
      if (c.id === cardId) {
        return { ...c, paidMonths: nextPaidMonths };
      }
      return c;
    });

    await updateSettings({ creditCards: updatedCards });

    const matchNote = `Pago automático tarjeta ${cardId} resumen ${month}`;

    if (isPaid) {
      const toDelete = state.transactions.filter(t => t.notes === matchNote);
      for (const t of toDelete) {
        await deleteTransaction(t.id);
      }
    } else if (totals) {
      const brandNames = {
        visa: 'Visa',
        mastercard: 'Mastercard',
        amex: 'American Express',
        naranja: 'Naranja',
        otra: 'Otra',
        otro: 'Otra'
      };
      const brandLabel = brandNames[card.brand as keyof typeof brandNames] || 'Tarjeta';

      if (totals.ars > 0) {
        await addTransaction({
          amount: Math.round(totals.ars),
          category: 'card-payment',
          description: `Pago tarjeta ${brandLabel} - ${card.bank}`,
          date: new Date().toISOString(),
          type: 'expense',
          currency: 'ARS',
          paymentMethod: 'credit',
          notes: matchNote
        });
      }
      if (totals.usd > 0) {
        await addTransaction({
          amount: Math.round(totals.usd * 100) / 100,
          category: 'card-payment',
          description: `Pago tarjeta ${brandLabel} - ${card.bank} (USD)`,
          date: new Date().toISOString(),
          type: 'expense',
          currency: 'USD',
          paymentMethod: 'credit',
          notes: matchNote
        });
      }
    }
  };

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const currentMonthString = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;

  const monthlyTransactions = state.transactions.filter(t => {
    if (t.billingMonth) {
      return t.billingMonth === currentMonthString;
    }
    const d = parseTransactionDate(t.date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  const getTransactionAmountInDisplay = (t: Transaction) => convertToDisplay(t.amount, t.currency);

  const totalIncome = state.transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + getTransactionAmountInDisplay(t), 0);
  const totalExpenses = state.transactions.filter(t => t.type === 'expense' && !(t.paymentMethod === 'credit' && t.creditCardId)).reduce((sum, t) => sum + getTransactionAmountInDisplay(t), 0);
  const balance = totalIncome - totalExpenses;

  const monthlyIncome = monthlyTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + getTransactionAmountInDisplay(t), 0);
  const monthlyExpenses = monthlyTransactions.filter(t => t.type === 'expense' && !(t.paymentMethod === 'credit' && t.creditCardId)).reduce((sum, t) => sum + getTransactionAmountInDisplay(t), 0);
  const monthlyBalance = monthlyIncome - monthlyExpenses;

  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
  };
  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

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
      exchangeRate,
      toggleCardPayment,
      toasts,
      showToast,
      removeToast,
      importBackupData
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
