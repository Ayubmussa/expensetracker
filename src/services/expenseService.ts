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
  async getExpenses(filters?: FilterOptions): Promise<Expense[]> {
    try {
      if (this.isOnline) {
        // RLS policies will automatically filter by authenticated user
        const { data, error } = await supabase
          .from(TABLES.EXPENSES)
          .select('*')
          .order('date', { ascending: false });

        if (error) throw error;
        return this.applyFilters(data || [], filters);
      }
    } catch (error) {
      console.error('Error fetching from Supabase, using localStorage:', error);
    }

    // Fallback to localStorage
    const expenses = localStorageUtils.getExpenses();
    return this.applyFilters(expenses, filters);
  }

  async addExpense(expenseData: Omit<Expense, 'id' | 'created_at' | 'updated_at'>): Promise<Expense> {
    const expense: Expense = {
      id: uuidv4(),
      ...expenseData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    try {
      if (this.isOnline) {
        const { error } = await supabase
          .from(TABLES.EXPENSES)
          .insert([expense]);

        if (error) throw error;
      }
    } catch (error) {
      console.error('Error adding to Supabase, saving to localStorage:', error);
    }

    // Always save to localStorage as backup
    localStorageUtils.addExpense(expense);
    return expense;
  }

  async updateExpense(expense: Expense): Promise<Expense> {
    const updatedExpense = {
      ...expense,
      updated_at: new Date().toISOString(),
    };

    try {
      if (this.isOnline) {
        const { error } = await supabase
          .from(TABLES.EXPENSES)
          .update(updatedExpense)
          .eq('id', expense.id);

        if (error) throw error;
      }
    } catch (error) {
      console.error('Error updating in Supabase, updating localStorage:', error);
    }

    localStorageUtils.updateExpense(updatedExpense);
    return updatedExpense;
  }

  async deleteExpense(expenseId: string): Promise<void> {
    try {
      if (this.isOnline) {
        const { error } = await supabase
          .from(TABLES.EXPENSES)
          .delete()
          .eq('id', expenseId);

        if (error) throw error;
      }
    } catch (error) {
      console.error('Error deleting from Supabase, deleting from localStorage:', error);
    }

    localStorageUtils.deleteExpense(expenseId);
  }

  async getCategories(): Promise<Category[]> {
    try {
      if (this.isOnline) {
        const { data, error } = await supabase
          .from(TABLES.CATEGORIES)
          .select('*')
          .order('name');

        if (error) throw error;
        if (data && data.length > 0) return data;
      }
    } catch (error) {
      console.error('Error fetching categories from Supabase, using localStorage:', error);
    }

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
