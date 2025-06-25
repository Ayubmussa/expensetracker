import { supabase, TABLES } from '../config/supabase';
import { localStorageUtils } from '../utils/localStorage';
import { syncService } from './syncService';
import type { Expense, Category, ExpenseSummary, CategorySummary, FilterOptions } from '../types';
import { v4 as uuidv4 } from 'uuid';

class ExpenseService {
  private isOnline = navigator.onLine;
  private forceOfflineMode = false;

  constructor() {
    // Listen for online/offline events
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.syncWithSupabase();
    });
    
    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  }

  // Method to set offline mode preference
  setOfflineMode(offline: boolean): void {
    this.forceOfflineMode = offline;
    console.log('ExpenseService offline mode set to:', offline);
  }

  private get shouldUseOfflineMode(): boolean {
    return !this.isOnline || this.forceOfflineMode;
  }

  private async isAuthenticated(): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      return user !== null;
    } catch (error) {
      console.log('Authentication check failed:', error);
      return false;
    }
  }  async getExpenses(filters?: FilterOptions): Promise<Expense[]> {
    console.log('ExpenseService.getExpenses called with:', { 
      shouldUseOfflineMode: this.shouldUseOfflineMode,
      isOnline: this.isOnline,
      forceOfflineMode: this.forceOfflineMode 
    });
    
    try {
      // Only try Supabase if not in offline mode AND authenticated
      if (!this.shouldUseOfflineMode && await this.isAuthenticated()) {
        console.log('Fetching expenses from Supabase...');
        // RLS policies will automatically filter by authenticated user
        const { data, error } = await supabase
          .from(TABLES.EXPENSES)
          .select('*')
          .order('date', { ascending: false });

        if (error) throw error;
        console.log(`Retrieved ${data?.length || 0} expenses from Supabase`);
        return this.applyFilters(data || [], filters);
      }
    } catch (error) {
      console.log('Using localStorage (offline mode or auth issue):', error);
    }

    // Fallback to localStorage for offline mode or when not authenticated
    const expenses = localStorageUtils.getExpenses();
    console.log(`Retrieved ${expenses.length} expenses from localStorage`);
    return this.applyFilters(expenses, filters);
  }async addExpense(expenseData: Omit<Expense, 'id' | 'created_at' | 'updated_at' | 'user_id'>): Promise<Expense> {
    console.log('expenseService: Adding expense', expenseData);
    
    const expense: Omit<Expense, 'user_id'> = {
      id: uuidv4(),
      ...expenseData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    console.log('expenseService: Created expense object', expense);

    try {
      // Only try Supabase if not in offline mode AND authenticated
      if (!this.shouldUseOfflineMode && await this.isAuthenticated()) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const expenseWithUserId = {
          ...expense,
          user_id: user.id
        };

        const { error } = await supabase
          .from(TABLES.EXPENSES)
          .insert([expenseWithUserId]);

        if (error) throw error;
        console.log('expenseService: Expense saved to Supabase');
        
        // Return the expense with user_id for consistency
        const fullExpense: Expense = expenseWithUserId;
        localStorageUtils.addExpense(fullExpense);
        return fullExpense;
      } else {
        console.log('expenseService: Saving expense to localStorage (offline mode)');
      }
    } catch (error) {
      console.log('expenseService: Error with Supabase, using localStorage:', error);
    }

    // For offline mode, we create expense without user_id (will be added during sync)
    const offlineExpense: Expense = {
      ...expense,
      user_id: 'offline' // Placeholder that will be replaced during sync
    };
    
    console.log('expenseService: Calling localStorage.addExpense');
    localStorageUtils.addExpense(offlineExpense);
    console.log('expenseService: Expense saved successfully');
    return offlineExpense;
  }  async addMultipleExpenses(expensesData: Omit<Expense, 'id' | 'created_at' | 'updated_at' | 'user_id'>[]): Promise<Expense[]> {
    const baseExpenses = expensesData.map(expenseData => ({
      id: uuidv4(),
      ...expenseData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    try {
      // Only try Supabase if not in offline mode AND authenticated
      if (!this.shouldUseOfflineMode && await this.isAuthenticated()) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const expensesWithUserId = baseExpenses.map(expense => ({
          ...expense,
          user_id: user.id
        }));

        const { error } = await supabase
          .from(TABLES.EXPENSES)
          .insert(expensesWithUserId);

        if (error) throw error;
        console.log('Multiple expenses saved to Supabase');
        
        // Save to localStorage and return
        localStorageUtils.addMultipleExpenses(expensesWithUserId);
        return expensesWithUserId;
      } else {
        console.log('Saving multiple expenses to localStorage (offline mode)');
      }
    } catch (error) {
      console.log('Error with Supabase, using localStorage:', error);
    }

    // For offline mode, add placeholder user_id
    const offlineExpenses = baseExpenses.map(expense => ({
      ...expense,
      user_id: 'offline' // Placeholder that will be replaced during sync
    }));

    // Always save to localStorage as backup or primary storage
    localStorageUtils.addMultipleExpenses(offlineExpenses);
    return offlineExpenses;
  }async updateExpense(expense: Expense): Promise<Expense> {
    const updatedExpense = {
      ...expense,
      updated_at: new Date().toISOString(),
    };

    try {
      // Only try Supabase if not in offline mode AND authenticated
      if (!this.shouldUseOfflineMode && await this.isAuthenticated()) {
        const { error } = await supabase
          .from(TABLES.EXPENSES)
          .update(updatedExpense)
          .eq('id', expense.id);

        if (error) throw error;
        console.log('Expense updated in Supabase');
      } else {
        console.log('Updating expense in localStorage (offline mode)');
      }
    } catch (error) {
      console.log('Error updating in Supabase, using localStorage:', error);
    }

    localStorageUtils.updateExpense(updatedExpense);
    return updatedExpense;
  }
  async deleteExpense(expenseId: string): Promise<void> {
    try {
      // Only try Supabase if not in offline mode AND authenticated
      if (!this.shouldUseOfflineMode && await this.isAuthenticated()) {
        const { error } = await supabase
          .from(TABLES.EXPENSES)
          .delete()
          .eq('id', expenseId);

        if (error) throw error;
        console.log('Expense deleted from Supabase');
      } else {
        console.log('Deleting expense from localStorage (offline mode)');
      }
    } catch (error) {
      console.log('Error deleting from Supabase, using localStorage:', error);
    }

    localStorageUtils.deleteExpense(expenseId);
  }  async getCategories(): Promise<Category[]> {
    console.log('ExpenseService.getCategories called with:', { 
      shouldUseOfflineMode: this.shouldUseOfflineMode,
      isOnline: this.isOnline,
      forceOfflineMode: this.forceOfflineMode 
    });
    
    try {
      // Only try Supabase if not in offline mode AND authenticated
      if (!this.shouldUseOfflineMode && await this.isAuthenticated()) {
        console.log('Fetching categories from Supabase...');
        const { data, error } = await supabase
          .from(TABLES.CATEGORIES)
          .select('*')
          .order('name');

        if (error) throw error;
        if (data && data.length > 0) {
          console.log(`Retrieved ${data.length} categories from Supabase`);
          // Merge with localStorage categories to include any offline-created ones
          const localCategories = localStorageUtils.getCategories();
          const mergedCategories = this.mergeCategories(data, localCategories);
          console.log(`Merged to ${mergedCategories.length} total categories`);
          return mergedCategories;
        }
      }
    } catch (error) {
      console.log('Error fetching categories from Supabase, using localStorage:', error);
    }

    const localCategories = localStorageUtils.getCategories();
    console.log(`Using ${localCategories.length} localStorage categories (offline mode)`);
    return localCategories;
  }
  private mergeCategories(supabaseCategories: Category[], localCategories: Category[]): Category[] {
    const mergedMap = new Map<string, Category>();
    const nameSet = new Set<string>();
    
    // Add Supabase categories first (these are the "source of truth")
    supabaseCategories.forEach(cat => {
      mergedMap.set(cat.id, cat);
      nameSet.add(cat.name.toLowerCase());
    });
    
    // Add local categories that don't exist in Supabase (by ID OR name)
    localCategories.forEach(cat => {
      if (!mergedMap.has(cat.id) && !nameSet.has(cat.name.toLowerCase())) {
        mergedMap.set(cat.id, cat);
        nameSet.add(cat.name.toLowerCase());
      }
    });
    
    return Array.from(mergedMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }

  async getExpenseSummary(filters?: FilterOptions): Promise<ExpenseSummary> {
    const expenses = await this.getExpenses(filters);
    const totalAmount = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    const expenseCount = expenses.length;

    // Calculate category breakdown
    const categoryTotals = expenses.reduce((acc, expense) => {
      acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
      return acc;
    }, {} as Record<string, number>);

    const categoryBreakdown: CategorySummary[] = Object.entries(categoryTotals).map(([category, amount]) => ({
      category,
      totalAmount: amount,
      expenseCount: expenses.filter(exp => exp.category === category).length,
      percentage: totalAmount > 0 ? (amount / totalAmount) * 100 : 0,
    }));

    return {
      totalAmount,
      expenseCount,
      categoryBreakdown: categoryBreakdown.sort((a, b) => b.totalAmount - a.totalAmount),
    };
  }
  async createCategory(categoryData: Omit<Category, 'id'>): Promise<Category> {
    const newCategory: Category = {
      id: uuidv4(),
      ...categoryData
    };

    try {
      // Only try Supabase if not in offline mode AND authenticated
      if (!this.shouldUseOfflineMode && await this.isAuthenticated()) {
        const { data, error } = await supabase
          .from(TABLES.CATEGORIES)
          .insert([newCategory])
          .select()
          .single();

        if (error) throw error;
        console.log('Category created in Supabase:', data);
        return data;
      }
    } catch (error) {
      console.log('Error creating category in Supabase, using localStorage:', error);
    }

    // Fallback to localStorage for offline mode or when not authenticated
    console.log('Creating category in localStorage (offline mode)');
    localStorageUtils.addCategory(newCategory);
    return newCategory;
  }
  async manualSync(): Promise<{ success: boolean; syncedExpenses: number; syncedCategories: number; errors: string[] }> {
    try {
      console.log('Manual sync requested');
      
      if (this.shouldUseOfflineMode) {
        throw new Error('Cannot sync while in offline mode');
      }

      if (!await this.isAuthenticated()) {
        throw new Error('User must be authenticated to sync data');
      }

      const syncResult = await syncService.syncOfflineDataToOnline();
      
      if (syncResult.success) {
        console.log('Manual sync completed successfully');
        // Trigger UI refresh
        window.dispatchEvent(new CustomEvent('dataSync', { 
          detail: syncResult 
        }));
      } else {
        console.log('Manual sync completed with errors');
        // Trigger error event
        window.dispatchEvent(new CustomEvent('dataSyncError', { 
          detail: syncResult.errors 
        }));
      }
      
      return syncResult;
    } catch (error) {
      console.error('Manual sync failed:', error);
      throw error;
    }
  }

  async hasUnsyncedData(): Promise<boolean> {
    return await syncService.hasUnsyncedData();
  }

  getLastSyncTimestamp(): string | null {
    return syncService.getLastSyncTimestamp();
  }

  private applyFilters(expenses: Expense[], filters?: FilterOptions): Expense[] {
    if (!filters) return expenses;

    let filteredExpenses = [...expenses];

    if (filters.category) {
      filteredExpenses = filteredExpenses.filter(exp => exp.category === filters.category);
    }

    if (filters.dateFrom) {
      filteredExpenses = filteredExpenses.filter(exp => exp.date >= filters.dateFrom!);
    }

    if (filters.dateTo) {
      filteredExpenses = filteredExpenses.filter(exp => exp.date <= filters.dateTo!);
    }

    // Sort expenses
    if (filters.sortBy) {
      filteredExpenses.sort((a, b) => {
        let comparison = 0;
        
        switch (filters.sortBy) {
          case 'date':
            comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
            break;
          case 'amount':
            comparison = a.amount - b.amount;
            break;
          case 'category':
            comparison = a.category.localeCompare(b.category);
            break;
        }

        return filters.sortOrder === 'desc' ? -comparison : comparison;
      });
    }

    return filteredExpenses;
  }
  private async syncWithSupabase(): Promise<void> {
    try {
      console.log('Back online - checking for data to sync');
      
      // Check if user is authenticated
      if (!await this.isAuthenticated()) {
        console.log('User not authenticated, skipping sync');
        return;
      }

      // Check if there's unsynced data
      const hasUnsyncedData = await syncService.hasUnsyncedData();
      if (!hasUnsyncedData) {
        console.log('No unsynced data found');
        return;
      }

      console.log('Found unsynced offline data, starting sync...');
      const syncResult = await syncService.syncOfflineDataToOnline();
      
      if (syncResult.success) {
        console.log('✅ Sync completed successfully:', {
          expenses: syncResult.syncedExpenses,
          categories: syncResult.syncedCategories
        });
        
        // Optionally trigger a refresh in the UI
        window.dispatchEvent(new CustomEvent('dataSync', { 
          detail: syncResult 
        }));
      } else {
        console.error('❌ Sync failed:', syncResult.errors);
        
        // Optionally show user notification about sync failure
        window.dispatchEvent(new CustomEvent('dataSyncError', { 
          detail: syncResult.errors 
        }));
      }
    } catch (error) {
      console.error('Error during sync process:', error);
    }
  }
}

export const expenseService = new ExpenseService();
