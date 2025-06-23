import type { Expense, Category } from '../types';

const STORAGE_KEYS = {
  EXPENSES: 'expenses',
  CATEGORIES: 'categories',
} as const;

export const localStorageUtils = {
  // Expense operations
  getExpenses: (): Expense[] => {
    try {
      const expenses = localStorage.getItem(STORAGE_KEYS.EXPENSES);
      return expenses ? JSON.parse(expenses) : [];
    } catch (error) {
      console.error('Error reading expenses from localStorage:', error);
      return [];
    }
  },

  saveExpenses: (expenses: Expense[]): void => {
    try {
      localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(expenses));
    } catch (error) {
      console.error('Error saving expenses to localStorage:', error);
    }
  },

  addExpense: (expense: Expense): void => {
    const expenses = localStorageUtils.getExpenses();
    expenses.push(expense);
    localStorageUtils.saveExpenses(expenses);
  },

  updateExpense: (updatedExpense: Expense): void => {
    const expenses = localStorageUtils.getExpenses();
    const index = expenses.findIndex(exp => exp.id === updatedExpense.id);
    if (index !== -1) {
      expenses[index] = updatedExpense;
      localStorageUtils.saveExpenses(expenses);
    }
  },

  deleteExpense: (expenseId: string): void => {
    const expenses = localStorageUtils.getExpenses();
    const filteredExpenses = expenses.filter(exp => exp.id !== expenseId);
    localStorageUtils.saveExpenses(filteredExpenses);
  },

  // Category operations
  getCategories: (): Category[] => {
    try {
      const categories = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
      return categories ? JSON.parse(categories) : getDefaultCategories();
    } catch (error) {
      console.error('Error reading categories from localStorage:', error);
      return getDefaultCategories();
    }
  },

  saveCategories: (categories: Category[]): void => {
    try {
      localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
    } catch (error) {
      console.error('Error saving categories to localStorage:', error);
    }
  },

  // Clear all data
  clearAll: (): void => {
    try {
      localStorage.removeItem(STORAGE_KEYS.EXPENSES);
      localStorage.removeItem(STORAGE_KEYS.CATEGORIES);
    } catch (error) {
      console.error('Error clearing localStorage:', error);
    }
  },
};

function getDefaultCategories(): Category[] {
  return [
    { id: '1', name: 'Food & Dining', color: '#FF6B6B', icon: '🍔' },
    { id: '2', name: 'Transportation', color: '#4ECDC4', icon: '🚗' },
    { id: '3', name: 'Shopping', color: '#45B7D1', icon: '🛍️' },
    { id: '4', name: 'Entertainment', color: '#96CEB4', icon: '🎬' },
    { id: '5', name: 'Bills & Utilities', color: '#FFEAA7', icon: '💡' },
    { id: '6', name: 'Healthcare', color: '#DDA0DD', icon: '🏥' },
    { id: '7', name: 'Education', color: '#98D8C8', icon: '📚' },
    { id: '8', name: 'Other', color: '#F7DC6F', icon: '💰' },
  ];
}
