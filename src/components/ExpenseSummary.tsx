import React, { useState, useEffect, useCallback } from 'react';
import { expenseService } from '../services/expenseService';
import type { ExpenseSummary as ExpenseSummaryType, Category } from '../types';
import './ExpenseSummary.css';

interface ExpenseSummaryProps {
  refreshTrigger?: number;
  onCategoryClick?: (category: string) => void;
}

const ExpenseSummary: React.FC<ExpenseSummaryProps> = ({ refreshTrigger, onCategoryClick }) => {
  const [summary, setSummary] = useState<ExpenseSummaryType | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'all' | 'month' | 'week'>('all');

  const loadSummary = useCallback(async () => {
    setIsLoading(true);
    try {
      const filters = getFiltersForPeriod(selectedPeriod);
      const [summaryData, categoryData] = await Promise.all([
        expenseService.getExpenseSummary(filters),
        expenseService.getCategories(),
      ]);
      setSummary(summaryData);
      setCategories(categoryData);
      console.log('ExpenseSummary: Loaded summary:', summaryData);
    } catch (error) {
      console.error('Error loading summary:', error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedPeriod]); // Removed user dependency

  useEffect(() => {
    loadSummary();
  }, [refreshTrigger, loadSummary]);
  const getFiltersForPeriod = (period: string) => {
    const now = new Date();
    let dateFrom: string | undefined;

    switch (period) {
      case 'week': {
        const weekAgo = new Date(now);
        weekAgo.setDate(now.getDate() - 7);
        dateFrom = weekAgo.toISOString().split('T')[0];
        break;
      }
      case 'month': {
        const monthAgo = new Date(now);
        monthAgo.setMonth(now.getMonth() - 1);
        dateFrom = monthAgo.toISOString().split('T')[0];
        break;
      }
      default:
        dateFrom = undefined;
    }

    return dateFrom ? { dateFrom } : undefined;
  };

  const getCategoryInfo = (categoryName: string) => {
    return categories.find(cat => cat.name === categoryName) || {
      name: categoryName,
      color: '#6B7280',
      icon: '💰',
    };
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getPeriodLabel = () => {
    switch (selectedPeriod) {
      case 'week': return 'This Week';
      case 'month': return 'This Month';
      default: return 'All Time';
    }
  };

  if (isLoading) {
    return (
      <div className="expense-summary-container">
        <div className="loading">Loading summary...</div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="expense-summary-container">
        <div className="no-data">No data available</div>
      </div>
    );
  }

  return (
    <div className="expense-summary-container">
      <div className="summary-header">
        <h2>Spending Summary</h2>
        <div className="period-selector">
          <button
            className={selectedPeriod === 'all' ? 'active' : ''}
            onClick={() => setSelectedPeriod('all')}
          >
            All Time
          </button>
          <button
            className={selectedPeriod === 'month' ? 'active' : ''}
            onClick={() => setSelectedPeriod('month')}
          >
            This Month
          </button>
          <button
            className={selectedPeriod === 'week' ? 'active' : ''}
            onClick={() => setSelectedPeriod('week')}
          >
            This Week
          </button>
        </div>
      </div>

      <div className="summary-cards">
        <div className="summary-card total-amount">
          <div className="card-icon">💰</div>
          <div className="card-content">
            <div className="card-title">Total Spent</div>
            <div className="card-value">{formatAmount(summary.totalAmount)}</div>
            <div className="card-subtitle">{getPeriodLabel()}</div>
          </div>
        </div>

        <div className="summary-card expense-count">
          <div className="card-icon">📝</div>
          <div className="card-content">
            <div className="card-title">Total Expenses</div>
            <div className="card-value">{summary.expenseCount}</div>
            <div className="card-subtitle">
              {summary.expenseCount === 1 ? 'transaction' : 'transactions'}
            </div>
          </div>
        </div>

        <div className="summary-card average-amount">
          <div className="card-icon">📊</div>
          <div className="card-content">
            <div className="card-title">Average Amount</div>
            <div className="card-value">
              {formatAmount(summary.expenseCount > 0 ? summary.totalAmount / summary.expenseCount : 0)}
            </div>
            <div className="card-subtitle">per transaction</div>
          </div>
        </div>
      </div>

      {summary.categoryBreakdown.length > 0 && (
        <div className="category-breakdown">
          <h3>Spending by Category</h3>
          <div className="category-list">
            {summary.categoryBreakdown.map(categoryData => {
              const categoryInfo = getCategoryInfo(categoryData.category);
              return (
                <div 
                  key={categoryData.category} 
                  className="category-item"
                  onClick={() => onCategoryClick?.(categoryData.category)}
                  style={{ cursor: onCategoryClick ? 'pointer' : 'default' }}
                >
                  <div className="category-header">
                    <div className="category-info">
                      <div
                        className="category-icon"
                        style={{ backgroundColor: categoryInfo.color }}
                      >
                        {categoryInfo.icon}
                      </div>
                      <span className="category-name">{categoryData.category}</span>
                    </div>
                    <div className="category-amount">
                      {formatAmount(categoryData.totalAmount)}
                    </div>
                  </div>
                  <div className="category-details">
                    <div className="progress-bar">
                      <div
                        className="progress-fill"
                        style={{
                          width: `${categoryData.percentage}%`,
                          backgroundColor: categoryInfo.color,
                        }}
                      />
                    </div>
                    <div className="category-stats">
                      <span>{categoryData.percentage.toFixed(1)}%</span>
                      <span>
                        {categoryData.expenseCount} expense{categoryData.expenseCount !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpenseSummary;
