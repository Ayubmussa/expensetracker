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
    now.setHours(23, 59, 59, 999); // End of current day
    const start = new Date();

    switch (period) {
      case 'week': {
        // Get 7 days ago from today (including today = 7 days total)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setTime(now.getTime() - (6 * 24 * 60 * 60 * 1000)); // Subtract 6 full days
        sevenDaysAgo.setHours(0, 0, 0, 0);
        start.setTime(sevenDaysAgo.getTime());
        break;
      }
      case 'month':
        // Current year data (Jan 1 to Dec 31 of current year)
        start.setMonth(0); // January
        start.setDate(1); // First day of the year
        start.setHours(0, 0, 0, 0);
        break;
      case 'quarter':
        start.setMonth(now.getMonth() - 2); // Last 3 months
        start.setDate(1); // First day of that month
        start.setHours(0, 0, 0, 0);
        break;
      case 'year': {
        // Past 5 years of data
        const yearsToShow = 5;
        start.setFullYear(now.getFullYear() - (yearsToShow - 1));
        start.setMonth(0); // January
        start.setDate(1); // First day of that year
        start.setHours(0, 0, 0, 0);
        break;
      }
    }

    return { start, end: now };
  };

  const processExpenseData = () => {
    const { start, end } = getDateRange(selectedPeriod);
    
    console.log(`Processing ${selectedPeriod} data - Date range: ${start.toISOString()} to ${end.toISOString()}`);
    console.log(`Total expenses available: ${expenses.length}`);
    
    // Filter expenses within the selected period
    const filteredExpenses = expenses.filter(expense => {
      const expenseDate = new Date(expense.date + 'T00:00:00'); // Ensure consistent date parsing
      const isInRange = expenseDate >= start && expenseDate <= end;
      
      if (selectedPeriod === 'month') {
        console.log(`Expense ${expense.date}: ${expenseDate.toISOString()} - In range: ${isInRange} - Amount: $${expense.amount}`);
      }
      
      return isInRange;
    });
    
    console.log(`Filtered expenses for ${selectedPeriod}: ${filteredExpenses.length}`);

    // Generate date labels based on period
    const labels: string[] = [];
    const dataPoints: number[] = [];
    
    if (selectedPeriod === 'week') {
      // Daily data for the past week (7 days including today)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      console.log('Week Debug - Today:', today.toISOString().split('T')[0]);
      
      for (let i = 0; i < 7; i++) {
        // Calculate each day by going back from today
        const date = new Date();
        date.setTime(today.getTime() - ((6 - i) * 24 * 60 * 60 * 1000));
        date.setHours(0, 0, 0, 0);
        
        // Format date string consistently 
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;
        
        labels.push(date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }));
        
        const dayExpenses = filteredExpenses.filter(exp => exp.date === dateStr);
        const dayTotal = dayExpenses.reduce((sum, exp) => sum + exp.amount, 0);
        dataPoints.push(Math.round(dayTotal * 100) / 100); // Round to 2 decimal places
        
        console.log(`Week Debug - Day ${i+1}: ${dateStr} (${date.toLocaleDateString('en-US', { weekday: 'short' })}), Expenses: ${dayExpenses.length}, Total: $${dayTotal.toFixed(2)}`);
        if (dayExpenses.length > 0) {
          dayExpenses.forEach(exp => {
            console.log(`  - ${exp.description}: $${exp.amount} on ${exp.date}`);
          });
        }
      }
    } else if (selectedPeriod === 'month') {
      // Monthly data for the current year (12 months)
      const today = new Date();
      const currentYear = today.getFullYear();
      
      for (let month = 0; month < 12; month++) {
        const monthStart = new Date(currentYear, month, 1);
        monthStart.setHours(0, 0, 0, 0);
        
        const monthEnd = new Date(currentYear, month + 1, 0);
        monthEnd.setHours(23, 59, 59, 999);
        
        labels.push(monthStart.toLocaleDateString('en-US', { month: 'short' }));
        
        const monthExpenses = filteredExpenses.filter(exp => {
          const expDate = new Date(exp.date + 'T00:00:00');
          return expDate >= monthStart && expDate <= monthEnd;
        });
        const monthTotal = monthExpenses.reduce((sum, exp) => sum + exp.amount, 0);
        dataPoints.push(Math.round(monthTotal * 100) / 100);
        
        console.log(`Month Debug - ${monthStart.toLocaleDateString('en-US', { month: 'long' })} ${currentYear}: ${monthExpenses.length} expenses, $${monthTotal.toFixed(2)}`);
        if (monthExpenses.length > 0) {
          monthExpenses.forEach(exp => {
            console.log(`  - ${exp.description}: $${exp.amount} on ${exp.date}`);
          });
        }
      }
    } else if (selectedPeriod === 'quarter') {
      // Monthly data for the past quarter (3 months)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      for (let i = 2; i >= 0; i--) {
        const monthDate = new Date(today);
        monthDate.setMonth(today.getMonth() - i);
        monthDate.setDate(1); // First day of month
        monthDate.setHours(0, 0, 0, 0);
        
        const nextMonth = new Date(monthDate);
        nextMonth.setMonth(monthDate.getMonth() + 1);
        nextMonth.setDate(0); // Last day of the month
        nextMonth.setHours(23, 59, 59, 999);
        
        labels.push(monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }));
        
        const monthExpenses = filteredExpenses.filter(exp => {
          const expDate = new Date(exp.date + 'T00:00:00');
          return expDate >= monthDate && expDate <= nextMonth;
        });
        const monthTotal = monthExpenses.reduce((sum, exp) => sum + exp.amount, 0);
        dataPoints.push(Math.round(monthTotal * 100) / 100);
        
        console.log(`Quarter Debug - Month ${3-i}: ${monthDate.toISOString().split('T')[0]} to ${nextMonth.toISOString().split('T')[0]}, Expenses: ${monthExpenses.length}, Total: $${monthTotal.toFixed(2)}`);
      }
    } else {
      // Yearly data for the past several years
      const today = new Date();
      const currentYear = today.getFullYear();
      const yearsToShow = 5; // Show last 5 years
      
      for (let i = yearsToShow - 1; i >= 0; i--) {
        const targetYear = currentYear - i;
        
        const yearStart = new Date(targetYear, 0, 1);
        yearStart.setHours(0, 0, 0, 0);
        
        const yearEnd = new Date(targetYear, 11, 31);
        yearEnd.setHours(23, 59, 59, 999);
        
        labels.push(targetYear.toString());
        
        const yearExpenses = filteredExpenses.filter(exp => {
          const expDate = new Date(exp.date + 'T00:00:00');
          return expDate >= yearStart && expDate <= yearEnd;
        });
        const yearTotal = yearExpenses.reduce((sum, exp) => sum + exp.amount, 0);
        dataPoints.push(Math.round(yearTotal * 100) / 100);
        
        console.log(`Year Debug - ${targetYear}: ${yearExpenses.length} expenses, $${yearTotal.toFixed(2)}`);
        if (yearExpenses.length > 0) {
          console.log(`  First expense: ${yearExpenses[0].date}, Last expense: ${yearExpenses[yearExpenses.length - 1].date}`);
        }
      }
    }

    return { labels, dataPoints };
  };

  const { labels, dataPoints } = processExpenseData();
  
  // Calculate summary statistics for validation
  const totalAmount = dataPoints.reduce((sum, amount) => sum + amount, 0);
  const avgAmount = dataPoints.length > 0 ? totalAmount / dataPoints.length : 0;
  
  const getPeriodText = () => {
    switch (selectedPeriod) {
      case 'week': return 'past 7 days';
      case 'month': return 'current year';
      case 'quarter': return 'past 3 months';
      case 'year': return 'past 5 years';
      default: return selectedPeriod;
    }
  };

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
            return `Total: $${ctx.parsed.y.toFixed(2)}`;
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
            const numValue = Number(value);
            return '$' + numValue.toFixed(2);
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
        <div className="chart-summary">
          <span className="chart-total">Total: ${totalAmount.toFixed(2)} over {getPeriodText()}</span>
          {totalAmount > 0 && (
            <span className="chart-average">Avg: ${avgAmount.toFixed(2)} per period</span>
          )}
        </div>
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
            <div className="debug-info">
              Debug: {expenses.length} total expenses loaded, {
                expenses.filter(exp => {
                  const { start, end } = getDateRange(selectedPeriod);
                  const expenseDate = new Date(exp.date + 'T00:00:00');
                  return expenseDate >= start && expenseDate <= end;
                }).length
              } match period filter ({getPeriodText()})
            </div>
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
