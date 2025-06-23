import React, { useState, useEffect, useCallback } from 'react';
import { expenseService } from '../services/expenseService';
import { useAuth } from '../hooks/useAuth';
import type { Expense, Category, FilterOptions } from '../types';
import './ExpenseList.css';

interface ExpenseListProps {
  refreshTrigger?: number;
}

const ExpenseList: React.FC<ExpenseListProps> = ({ refreshTrigger }) => {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<FilterOptions>({
    sortBy: 'date',
    sortOrder: 'desc',
  });
  const loadData = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const [expenseData, categoryData] = await Promise.all([
        expenseService.getExpenses(filters),
        expenseService.getCategories(),
      ]);
      setExpenses(expenseData);
      setCategories(categoryData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user, filters]);

  useEffect(() => {
    loadData();
  }, [refreshTrigger, loadData]);

  const handleDeleteExpense = async (expenseId: string) => {
    if (window.confirm('Are you sure you want to delete this expense?')) {
      try {
        await expenseService.deleteExpense(expenseId);
        setExpenses(prev => prev.filter(exp => exp.id !== expenseId));
      } catch (error) {
        console.error('Error deleting expense:', error);
      }
    }
  };

  const handleFilterChange = (key: keyof FilterOptions, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value || undefined,
    }));
  };

  const getCategoryInfo = (categoryName: string) => {
    return categories.find(cat => cat.name === categoryName) || {
      name: categoryName,
      color: '#6B7280',
      icon: '💰',
    };
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="expense-list-container">
        <div className="loading">Loading expenses...</div>
      </div>
    );
  }

  return (
    <div className="expense-list-container">
      <div className="expense-list-header">
        <h2>Your Expenses</h2>
        <div className="expense-count">
          {expenses.length} expense{expenses.length !== 1 ? 's' : ''}
        </div>
      </div>

      <div className="filters">
        <div className="filter-group">
          <label htmlFor="category-filter">Filter by Category:</label>
          <select
            id="category-filter"
            value={filters.category || ''}
            onChange={(e) => handleFilterChange('category', e.target.value)}
          >
            <option value="">All Categories</option>
            {categories.map(category => (
              <option key={category.id} value={category.name}>
                {category.icon} {category.name}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="sort-filter">Sort by:</label>          <select
            id="sort-filter"
            value={`${filters.sortBy}-${filters.sortOrder}`}
            onChange={(e) => {
              const [sortBy, sortOrder] = e.target.value.split('-');
              setFilters(prev => ({ 
                ...prev, 
                sortBy: sortBy as 'date' | 'amount' | 'category', 
                sortOrder: sortOrder as 'asc' | 'desc' 
              }));
            }}
          >
            <option value="date-desc">Date (Newest First)</option>
            <option value="date-asc">Date (Oldest First)</option>
            <option value="amount-desc">Amount (High to Low)</option>
            <option value="amount-asc">Amount (Low to High)</option>
            <option value="category-asc">Category (A-Z)</option>
            <option value="category-desc">Category (Z-A)</option>
          </select>
        </div>
      </div>

      {expenses.length === 0 ? (
        <div className="no-expenses">
          <div className="no-expenses-icon">📝</div>
          <h3>No expenses yet</h3>
          <p>Start tracking your expenses by adding your first expense above.</p>
        </div>
      ) : (
        <div className="expense-list">
          {expenses.map(expense => {
            const categoryInfo = getCategoryInfo(expense.category);
            return (
              <div key={expense.id} className="expense-item">
                <div className="expense-category" style={{ backgroundColor: categoryInfo.color }}>
                  {categoryInfo.icon}
                </div>
                <div className="expense-details">
                  <div className="expense-description">{expense.description}</div>
                  <div className="expense-meta">
                    <span className="expense-category-name">{expense.category}</span>
                    <span className="expense-date">{formatDate(expense.date)}</span>
                  </div>
                </div>
                <div className="expense-amount">
                  {formatAmount(expense.amount)}
                </div>
                <button
                  className="delete-button"
                  onClick={() => handleDeleteExpense(expense.id)}
                  title="Delete expense"
                >
                  🗑️
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ExpenseList;
