import React, { useState, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { expenseService } from '../services/expenseService';
import type { Expense } from '../types';
import './ExpenseChart.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface ExpenseChartProps {
  refreshTrigger: number;
}

type ChartPeriod = 'week' | 'month' | 'quarter' | 'year';

const ExpenseChart: React.FC<ExpenseChartProps> = ({ refreshTrigger }) => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<ChartPeriod>('month');

  useEffect(() => {
    const loadExpenses = async () => {
      setIsLoading(true);
      try {
        const expenseData = await expenseService.getExpenses();
        setExpenses(expenseData);
      } catch (error) {
        console.error('Error loading expenses for chart:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadExpenses();
  }, [refreshTrigger]);

  const getDateRange = (period: ChartPeriod) => {
    const now = new Date();
    const start = new Date();

    switch (period) {
      case 'week':
        start.setDate(now.getDate() - 7);
        break;
      case 'month':
        start.setMonth(now.getMonth() - 1);
        break;
      case 'quarter':
        start.setMonth(now.getMonth() - 3);
        break;
      case 'year':
        start.setFullYear(now.getFullYear() - 1);
        break;
    }

    return { start, end: now };
  };

  const processExpenseData = () => {
    const { start, end } = getDateRange(selectedPeriod);
    
    // Filter expenses within the selected period
    const filteredExpenses = expenses.filter(expense => {
      const expenseDate = new Date(expense.date);
      return expenseDate >= start && expenseDate <= end;
    });

    // Generate date labels based on period
    const labels: string[] = [];
    const dataPoints: number[] = [];
    
    if (selectedPeriod === 'week') {
      // Daily data for the past week
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        labels.push(date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }));
        
        const dayExpenses = filteredExpenses.filter(exp => exp.date === dateStr);
        const dayTotal = dayExpenses.reduce((sum, exp) => sum + exp.amount, 0);
        dataPoints.push(dayTotal);
      }
    } else if (selectedPeriod === 'month') {
      // Weekly data for the past month
      for (let i = 4; i >= 0; i--) {
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - (i * 7));
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        
        labels.push(`Week of ${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`);
        
        const weekExpenses = filteredExpenses.filter(exp => {
          const expDate = new Date(exp.date);
          return expDate >= weekStart && expDate <= weekEnd;
        });
        const weekTotal = weekExpenses.reduce((sum, exp) => sum + exp.amount, 0);
        dataPoints.push(weekTotal);
      }
    } else if (selectedPeriod === 'quarter') {
      // Monthly data for the past quarter
      for (let i = 2; i >= 0; i--) {
        const monthDate = new Date();
        monthDate.setMonth(monthDate.getMonth() - i);
        labels.push(monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }));
        
        const monthStr = monthDate.toISOString().slice(0, 7); // YYYY-MM
        const monthExpenses = filteredExpenses.filter(exp => exp.date.startsWith(monthStr));
        const monthTotal = monthExpenses.reduce((sum, exp) => sum + exp.amount, 0);
        dataPoints.push(monthTotal);
      }
    } else {
      // Quarterly data for the past year
      for (let i = 3; i >= 0; i--) {
        const quarterStart = new Date();
        quarterStart.setMonth(quarterStart.getMonth() - (i * 3));
        const quarterEnd = new Date(quarterStart);
        quarterEnd.setMonth(quarterStart.getMonth() + 2);
        quarterEnd.setDate(new Date(quarterEnd.getFullYear(), quarterEnd.getMonth() + 1, 0).getDate());
        
        labels.push(`Q${Math.floor(quarterStart.getMonth() / 3) + 1} ${quarterStart.getFullYear()}`);
        
        const quarterExpenses = filteredExpenses.filter(exp => {
          const expDate = new Date(exp.date);
          return expDate >= quarterStart && expDate <= quarterEnd;
        });
        const quarterTotal = quarterExpenses.reduce((sum, exp) => sum + exp.amount, 0);
        dataPoints.push(quarterTotal);
      }
    }

    return { labels, dataPoints };
  };

  const { labels, dataPoints } = processExpenseData();

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Expenses',
        data: dataPoints,
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#3b82f6',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 6,
        pointHoverRadius: 8,
        pointHoverBackgroundColor: '#2563eb',
        pointHoverBorderColor: '#ffffff',
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(17, 17, 17, 0.9)',
        titleColor: '#ffffff',
        bodyColor: '#ffffff',
        borderColor: '#3b82f6',
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: false,        callbacks: {
          title: (context: unknown[]) => {
            const ctx = context as Array<{ label: string }>;
            return ctx[0]?.label || '';
          },
          label: (context: unknown) => {
            const ctx = context as { parsed: { y: number } };
            return `$${ctx.parsed.y.toFixed(2)}`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
          drawBorder: false,
        },
        ticks: {
          color: '#9ca3af',
          font: {
            size: 12,
          },
        },
      },
      y: {
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
          drawBorder: false,
        },
        ticks: {
          color: '#9ca3af',
          font: {
            size: 12,
          },          callback: function(value: unknown) {
            return '$' + String(value);
          },
        },
        beginAtZero: true,
      },
    },
    interaction: {
      intersect: false,
      mode: 'index' as const,
    },
  };

  if (isLoading) {
    return (
      <div className="expense-chart-container">
        <div className="chart-header">
          <h2>📈 Expense Trends</h2>
        </div>
        <div className="chart-loading">
          <div className="loading-spinner"></div>
          <p>Loading chart data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="expense-chart-container">
      <div className="chart-header">
        <h2>📈 Expense Trends</h2>
        <div className="period-selector">
          <button
            className={selectedPeriod === 'week' ? 'active' : ''}
            onClick={() => setSelectedPeriod('week')}
          >
            Week
          </button>
          <button
            className={selectedPeriod === 'month' ? 'active' : ''}
            onClick={() => setSelectedPeriod('month')}
          >
            Month
          </button>
          <button
            className={selectedPeriod === 'quarter' ? 'active' : ''}
            onClick={() => setSelectedPeriod('quarter')}
          >
            Quarter
          </button>
          <button
            className={selectedPeriod === 'year' ? 'active' : ''}
            onClick={() => setSelectedPeriod('year')}
          >
            Year
          </button>
        </div>
      </div>

      <div className="chart-content">
        {dataPoints.every(point => point === 0) ? (
          <div className="chart-no-data">
            <div className="no-data-icon">📊</div>
            <h3>No expense data</h3>
            <p>No expenses found for the selected period. Start adding expenses to see your spending trends!</p>
          </div>
        ) : (
          <div className="chart-wrapper">
            <Line data={chartData} options={chartOptions} />
          </div>
        )}
      </div>

      <div className="chart-summary">
        <div className="summary-stat">
          <span className="stat-label">Total ({selectedPeriod}):</span>
          <span className="stat-value">${dataPoints.reduce((sum, val) => sum + val, 0).toFixed(2)}</span>
        </div>
        <div className="summary-stat">
          <span className="stat-label">Average:</span>
          <span className="stat-value">
            ${dataPoints.length > 0 ? (dataPoints.reduce((sum, val) => sum + val, 0) / dataPoints.length).toFixed(2) : '0.00'}
          </span>
        </div>
        <div className="summary-stat">
          <span className="stat-label">Peak:</span>
          <span className="stat-value">${Math.max(...dataPoints, 0).toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
};

export default ExpenseChart;
