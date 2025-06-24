import type { Expense, Category } from '../types';

const STORAGE_KEYS = {
  EXPENSES: 'expenses',
  CATEGORIES: 'categories',
  OFFLINE_USER: 'offline_user',
} as const;

// Create a unique identifier for offline mode if it doesn't exist
const getOfflineUserId = (): string => {
  let offlineUserId = localStorage.getItem(STORAGE_KEYS.OFFLINE_USER);
  if (!offlineUserId) {
    offlineUserId = `offline_user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem(STORAGE_KEYS.OFFLINE_USER, offlineUserId);
  }
  return offlineUserId;
};

export const localStorageUtils = {
  // Get offline user identifier
  getOfflineUserId,
  // Clear offline user data (for fresh start)
  clearOfflineUser: (): void => {
    try {
      localStorage.removeItem(STORAGE_KEYS.OFFLINE_USER);
      // Note: This preserves expenses and categories data
      console.log('Offline user cleared, data preserved');
    } catch (error) {
      console.error('Error clearing offline user data:', error);
    }
  },
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
  },  addExpense: (expense: Expense): void => {
    console.log('localStorage: Adding expense', expense);
    const expenses = localStorageUtils.getExpenses();
    expenses.push(expense);
    localStorageUtils.saveExpenses(expenses);
    console.log('localStorage: Expense added, total count:', expenses.length);
  },

  addMultipleExpenses: (newExpenses: Expense[]): void => {
    console.log('localStorage: Adding multiple expenses', newExpenses.length);
    const expenses = localStorageUtils.getExpenses();
    expenses.push(...newExpenses);
    localStorageUtils.saveExpenses(expenses);
    console.log('localStorage: Multiple expenses added, total count:', expenses.length);
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
  },  addCategory: (category: Category): void => {
    try {
      const categories = localStorageUtils.getCategories();
      categories.push(category);
      localStorageUtils.saveCategories(categories);
      console.log('localStorage: Added category', category);
    } catch (error) {
      console.error('Error adding category to localStorage:', error);
    }
  },

  // Clear only temporary data (preserves user expenses and categories)
  clearTempData: (): void => {
    try {
      // Only clear non-user data if needed in the future
      // This preserves expenses and categories
      console.log('Clearing temporary data (user data preserved)');
    } catch (error) {
      console.error('Error clearing temporary data:', error);
    }
  },

  // Reset to fresh offline user (generates new offline user ID but keeps data structure)
  resetOfflineUser: (): void => {
    try {
      localStorage.removeItem(STORAGE_KEYS.OFFLINE_USER);
      // Generate new offline user ID
      getOfflineUserId();
      console.log('Offline user reset, data preserved');
    } catch (error) {
      console.error('Error resetting offline user:', error);
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
