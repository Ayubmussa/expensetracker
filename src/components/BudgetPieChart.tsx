import React, { useState, useEffect } from 'react';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend
} from 'chart.js';
import type { ChartOptions } from 'chart.js';
import { Pie } from 'react-chartjs-2';
import { expenseService } from '../services/expenseService';
import { useTheme } from '../hooks/useTheme';
import type { Expense } from '../types';
import './BudgetPieChart.css';

ChartJS.register(ArcElement, Tooltip, Legend);

interface BudgetPieChartProps {
  refreshTrigger: number;
}

const BudgetPieChart: React.FC<BudgetPieChartProps> = ({ refreshTrigger }) => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { theme } = useTheme();

  // Get theme-aware colors
  const getThemeColors = () => {
    const textColor = theme === 'dark' ? '#ffffff' : '#1f2937';
    const backgroundColor = theme === 'dark' ? 'rgba(0, 0, 0, 0.8)' : 'rgba(255, 255, 255, 0.9)';
    const borderColor = theme === 'dark' ? '#3b82f6' : '#2563eb';
    
    return { textColor, backgroundColor, borderColor };
  };

  useEffect(() => {
    const loadExpenses = async () => {
      setIsLoading(true);
      try {
        const expenseData = await expenseService.getExpenses();
        
        // Filter for current month
        const currentMonth = new Date().toISOString().slice(0, 7);
        const monthlyExpenses = expenseData.filter(expense => 
          expense.date.startsWith(currentMonth)
        );
        
        setExpenses(monthlyExpenses);
      } catch (error) {
        console.error('Error loading expenses for pie chart:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadExpenses();
  }, [refreshTrigger]);

  // Calculate category totals
  const categoryTotals = expenses.reduce((acc, expense) => {
    acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
    return acc;
  }, {} as Record<string, number>);

  // Get budget info from localStorage
  const budget = parseFloat(localStorage.getItem('budget') || '1000');
  const totalSpent = Object.values(categoryTotals).reduce((sum, amount) => sum + amount, 0);
  const remaining = budget - totalSpent;

  // Prepare chart data
  const chartData = {
    labels: [...Object.keys(categoryTotals), 'Remaining Budget'],
    datasets: [
      {
        label: 'Budget Distribution',
        data: [...Object.values(categoryTotals), Math.max(remaining, 0)],
        backgroundColor: [
          '#ef4444', // Red
          '#f59e0b', // Amber
          '#10b981', // Emerald
          '#3b82f6', // Blue
          '#8b5cf6', // Violet
          '#ec4899', // Pink
          '#06b6d4', // Cyan
          '#84cc16', // Lime
          '#f97316', // Orange
          '#6b7280', // Gray for remaining
        ],
        borderColor: [
          '#dc2626',
          '#d97706',
          '#059669',
          '#2563eb',
          '#7c3aed',
          '#db2777',
          '#0891b2',
          '#65a30d',
          '#ea580c',
          '#4b5563',
        ],
        borderWidth: 2,
      },
    ],
  };

  const options: ChartOptions<'pie'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          padding: 20,
          usePointStyle: true,
          color: getThemeColors().textColor,
          font: {
            size: 12,
          },
        },
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const label = context.label || '';
            const value = context.parsed;
            const percentage = ((value / budget) * 100).toFixed(1);
            return `${label}: $${value.toFixed(2)} (${percentage}%)`;
          },
        },
        backgroundColor: getThemeColors().backgroundColor,
        titleColor: getThemeColors().textColor,
        bodyColor: getThemeColors().textColor,
        borderColor: getThemeColors().borderColor,
        borderWidth: 1,
      },
    },
  };

  if (isLoading) {
    return (
      <div className="budget-pie-chart-container">
        <div className="chart-header">
          <h3>📊 Budget Distribution</h3>
        </div>
        <div className="chart-loading">
          <div className="loading-spinner"></div>
          <p>Loading chart data...</p>
        </div>
      </div>
    );
  }

  if (expenses.length === 0) {
    return (
      <div className="budget-pie-chart-container">
        <div className="chart-header">
          <h3>📊 Budget Distribution</h3>
        </div>
        <div className="chart-empty">
          <div className="empty-icon">📊</div>
          <h4>No expenses to display</h4>
          <p>Add some expenses to see your budget distribution.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="budget-pie-chart-container">
      <div className="chart-header">
        <h3>📊 Budget Distribution</h3>
        <div className="chart-summary">
          <span className="total-spent">Spent: ${totalSpent.toFixed(2)}</span>
          <span className="total-budget">Budget: ${budget.toFixed(2)}</span>
        </div>
      </div>
      <div className="chart-wrapper">
        <Pie data={chartData} options={options} />
      </div>
      <div className="chart-stats">
        <div className="stat-item">
          <span className="stat-label">Categories:</span>
          <span className="stat-value">
            {Object.keys(categoryTotals).length > 0 
              ? Object.keys(categoryTotals).join(', ') 
              : 'None'}
          </span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Expenses:</span>
          <span className="stat-value">
            {expenses.length > 0 
              ? expenses.map(expense => expense.description).join(', ')
              : 'None'}
          </span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Utilization:</span>
          <span className="stat-value">{((totalSpent / budget) * 100).toFixed(1)}%</span>
        </div>
      </div>
    </div>
  );
};

export default BudgetPieChart;
