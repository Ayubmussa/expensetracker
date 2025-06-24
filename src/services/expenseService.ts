import { supabase, TABLES } from '../config/supabase';
import { localStorageUtils } from '../utils/localStorage';
import type { Expense, Category, ExpenseSummary, CategorySummary, FilterOptions } from '../types';
import { v4 as uuidv4 } from 'uuid';

class ExpenseService {
  private isOnline = navigator.onLine;

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

  private async isAuthenticated(): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      return user !== null;
    } catch (error) {
      console.log('Authentication check failed:', error);
      return false;
    }
  }async getExpenses(filters?: FilterOptions): Promise<Expense[]> {
    try {
      // Only try Supabase if online AND authenticated
      if (this.isOnline && await this.isAuthenticated()) {
        // RLS policies will automatically filter by authenticated user
        const { data, error } = await supabase
          .from(TABLES.EXPENSES)
          .select('*')
          .order('date', { ascending: false });

        if (error) throw error;
        return this.applyFilters(data || [], filters);
      }
    } catch (error) {
      console.log('Using localStorage (offline mode or auth issue):', error);
    }

    // Fallback to localStorage for offline mode or when not authenticated
    const expenses = localStorageUtils.getExpenses();
    return this.applyFilters(expenses, filters);
  }
  async addExpense(expenseData: Omit<Expense, 'id' | 'created_at' | 'updated_at'>): Promise<Expense> {
    console.log('expenseService: Adding expense', expenseData);
    
    const expense: Expense = {
      id: uuidv4(),
      ...expenseData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    console.log('expenseService: Created expense object', expense);

    try {
      // Only try Supabase if online AND authenticated
      if (this.isOnline && await this.isAuthenticated()) {
        const { error } = await supabase
          .from(TABLES.EXPENSES)
          .insert([expense]);

        if (error) throw error;
        console.log('expenseService: Expense saved to Supabase');
      } else {
        console.log('expenseService: Saving expense to localStorage (offline mode)');
      }
    } catch (error) {
      console.log('expenseService: Error with Supabase, using localStorage:', error);
    }

    // Always save to localStorage as backup or primary storage
    console.log('expenseService: Calling localStorage.addExpense');
    localStorageUtils.addExpense(expense);
    console.log('expenseService: Expense saved successfully');
    return expense;
  }

  async addMultipleExpenses(expensesData: Omit<Expense, 'id' | 'created_at' | 'updated_at'>[]): Promise<Expense[]> {
    const expenses: Expense[] = expensesData.map(expenseData => ({
      id: uuidv4(),
      ...expenseData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    try {
      // Only try Supabase if online AND authenticated
      if (this.isOnline && await this.isAuthenticated()) {
        const { error } = await supabase
          .from(TABLES.EXPENSES)
          .insert(expenses);

        if (error) throw error;
        console.log('Multiple expenses saved to Supabase');
      } else {
        console.log('Saving multiple expenses to localStorage (offline mode)');
      }
    } catch (error) {
      console.log('Error with Supabase, using localStorage:', error);
    }

    // Always save to localStorage as backup or primary storage
    localStorageUtils.addMultipleExpenses(expenses);
    return expenses;
  }
  async updateExpense(expense: Expense): Promise<Expense> {
    const updatedExpense = {
      ...expense,
      updated_at: new Date().toISOString(),
    };

    try {
      // Only try Supabase if online AND authenticated
      if (this.isOnline && await this.isAuthenticated()) {
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
      // Only try Supabase if online AND authenticated
      if (this.isOnline && await this.isAuthenticated()) {
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
  }
  async getCategories(): Promise<Category[]> {
    try {
      // Categories are usually public, but we'll check if authenticated for consistency
      if (this.isOnline) {
        const { data, error } = await supabase
          .from(TABLES.CATEGORIES)
          .select('*')
          .order('name');

        if (error) throw error;
        if (data && data.length > 0) {
          console.log('Categories loaded from Supabase');
          return data;
        }
      }
    } catch (error) {
      console.log('Error fetching categories from Supabase, using localStorage:', error);
    }

    console.log('Using localStorage categories (offline mode)');
    return localStorageUtils.getCategories();
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
    // This method would handle syncing local data with Supabase when coming back online
    // For now, we'll keep it simple and just fetch from Supabase
    console.log('Back online - syncing with Supabase');
  }
}

export const expenseService = new ExpenseService();
