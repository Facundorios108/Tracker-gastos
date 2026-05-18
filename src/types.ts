export interface Transaction {
  id: string;
  amount: number;
  category: string;
  description: string;
  date: string; // ISO string
  type: 'income' | 'expense';
  currency: 'ARS' | 'USD';
  paymentMethod?: 'credit' | 'debit' | 'cash' | 'transfer';
}

export interface SavingsGoal {
  id: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  emoji: string;
  color: string;
  currency: 'ARS' | 'USD';
  deadline?: string; // ISO date string "YYYY-MM-DD"
}

export interface FundAllocation {
  id: string;
  title: string;
  amount: number;
  emoji: string;
  color: string;
  currency: 'ARS' | 'USD';
}

export interface UserSettings {
  name: string;
  monthlyBudget: number;
  theme: 'light' | 'dark';
  displayCurrency: 'ARS' | 'USD';
  exchangeRate: number; // ARS per USD
  customization?: {
    primaryColor: string;
    backgroundColor: string;
    fontSizeOffset: number;
  };
}

export type CategoryConfig = {
  id: string;
  label: string;
  emoji: string;
  color: string;
  type: 'income' | 'expense' | 'both';
};

export const CATEGORIES: CategoryConfig[] = [
  { id: 'food', label: 'Alimentación', emoji: '🍕', color: '#ff9f43', type: 'expense' },
  { id: 'transport', label: 'Transporte', emoji: '🚗', color: '#54a0ff', type: 'expense' },
  { id: 'entertainment', label: 'Ocio', emoji: '🎬', color: '#ff6b6b', type: 'expense' },
  { id: 'health', label: 'Salud', emoji: '💊', color: '#1dd1a1', type: 'expense' },
  { id: 'shopping', label: 'Compras', emoji: '🛍️', color: '#c56cf0', type: 'expense' },
  { id: 'home', label: 'Hogar', emoji: '🏠', color: '#feca57', type: 'expense' },
  { id: 'education', label: 'Educación', emoji: '📚', color: '#48dbfb', type: 'expense' },
  { id: 'dining', label: 'Restaurantes', emoji: '🍽️', color: '#e17055', type: 'expense' },
  { id: 'subscriptions', label: 'Suscripciones', emoji: '📱', color: '#6c5ce7', type: 'expense' },
  { id: 'other-expense', label: 'Otros', emoji: '📦', color: '#a29bfe', type: 'expense' },
  { id: 'salary', label: 'Sueldo', emoji: '💰', color: '#1b6b4f', type: 'income' },
  { id: 'freelance', label: 'Freelance', emoji: '💻', color: '#00b894', type: 'income' },
  { id: 'investment', label: 'Inversiones', emoji: '📈', color: '#0984e3', type: 'income' },
  { id: 'other-income', label: 'Otros', emoji: '🎁', color: '#fdcb6e', type: 'income' },
];

export function getCategoryConfig(categoryId: string): CategoryConfig {
  return CATEGORIES.find(c => c.id === categoryId) || CATEGORIES[CATEGORIES.length - 1];
}
