import React, { useState, useEffect } from 'react';
import { expenseService } from '../services/expenseService';
import './Budget.css';

interface BudgetProps {
  refreshTrigger: number;
}

interface BudgetData {
  budget: number;
  limit: number;
  spent: number;
  remaining: number;
  percentage: number;
  limitPercentage: number;
}

const Budget: React.FC<BudgetProps> = ({ refreshTrigger }) => {
  const [budget, setBudget] = useState<number>(1000);
  const [budgetLimit, setBudgetLimit] = useState<number>(800); // 80% of budget by default
  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [newBudget, setNewBudget] = useState<string>('');
  const [newBudgetLimit, setNewBudgetLimit] = useState<string>('');
  const [budgetData, setBudgetData] = useState<BudgetData>({
    budget: 1000,
    limit: 800,
    spent: 0,
    remaining: 1000,
    percentage: 0,
    limitPercentage: 0
  });
  // Load budget and limit from localStorage on component mount
  useEffect(() => {
    const savedBudget = localStorage.getItem('budget');
    const savedBudgetLimit = localStorage.getItem('budgetLimit');
    
    if (savedBudget) {
      const budgetAmount = parseFloat(savedBudget);
      setBudget(budgetAmount);
    }
    
    if (savedBudgetLimit) {
      const limitAmount = parseFloat(savedBudgetLimit);
      setBudgetLimit(limitAmount);
    } else if (savedBudget) {
      // If no limit is set, default to 80% of budget
      const budgetAmount = parseFloat(savedBudget);
      const defaultLimit = budgetAmount * 0.8;
      setBudgetLimit(defaultLimit);
      localStorage.setItem('budgetLimit', defaultLimit.toString());
    }
  }, []);
  // Calculate budget data whenever expenses change
  useEffect(() => {
    const calculateBudgetData = async () => {
      try {
        const expenses = await expenseService.getExpenses();
        
        // Calculate total spent this month
        const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
        const monthlyExpenses = expenses.filter(expense => 
          expense.date.startsWith(currentMonth)
        );
          const totalSpent = monthlyExpenses.reduce((sum, expense) => sum + expense.amount, 0);
        const remaining = budget - totalSpent;
        const percentage = budget > 0 ? (totalSpent / budget) * 100 : 0;
        const limitPercentage = budgetLimit > 0 ? (totalSpent / budgetLimit) * 100 : 0;

        setBudgetData({
          budget,
          limit: budgetLimit,
          spent: totalSpent,
          remaining,
          percentage: Math.min(percentage, 100),
          limitPercentage: Math.min(limitPercentage, 100)
        });
      } catch (error) {
        console.error('Error calculating budget data:', error);        // Fallback to empty data
        setBudgetData({
          budget,
          limit: budgetLimit,
          spent: 0,
          remaining: budget,
          percentage: 0,
          limitPercentage: 0
        });
      }
    };

    calculateBudgetData();
  }, [refreshTrigger, budget, budgetLimit]);
  const handleBudgetUpdate = () => {
    const newBudgetAmount = parseFloat(newBudget);
    const newLimitAmount = parseFloat(newBudgetLimit);
    
    if (!isNaN(newBudgetAmount) && newBudgetAmount > 0) {
      setBudget(newBudgetAmount);
      localStorage.setItem('budget', newBudgetAmount.toString());
    }
    
    if (!isNaN(newLimitAmount) && newLimitAmount > 0) {
      setBudgetLimit(newLimitAmount);
      localStorage.setItem('budgetLimit', newLimitAmount.toString());
    }
    
    setIsEditingBudget(false);
    setNewBudget('');
    setNewBudgetLimit('');
  };

  const handleEditBudget = () => {
    setNewBudget(budget.toString());
    setNewBudgetLimit(budgetLimit.toString());
    setIsEditingBudget(true);
  };

  const cancelEditBudget = () => {
    setIsEditingBudget(false);
    setNewBudget('');
    setNewBudgetLimit('');
  };  const getBudgetStatus = () => {
    // Use limit percentage for status, but show warning if over budget entirely
    if (budgetData.percentage >= 100) return 'over-budget';
    if (budgetData.limitPercentage >= 100) return 'danger';
    if (budgetData.limitPercentage >= 90) return 'warning';
    if (budgetData.limitPercentage >= 75) return 'caution';
    if (budgetData.limitPercentage >= 50) return 'moderate';
    return 'good';
  };

  const getBudgetMessage = () => {
    const status = getBudgetStatus();
    const daysLeftInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate() - new Date().getDate();
    const averageDailySpending = budgetData.spent / new Date().getDate();
    const projectedMonthlySpending = averageDailySpending * new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
    
    switch (status) {
      case 'over-budget':
        return {
          icon: '🚨',
          title: 'Budget Exceeded!',
          message: `You have exceeded your total budget by $${Math.abs(budgetData.remaining).toFixed(2)}. Consider reducing expenses immediately.`,
          details: `At current spending rate ($${averageDailySpending.toFixed(2)}/day), you're projected to spend $${projectedMonthlySpending.toFixed(2)} this month.`,
          actionable: 'Review and cut non-essential expenses'
        };
      case 'danger':
        return {
          icon: '⚠️',
          title: 'Budget Limit Reached!',
          message: `You've reached your budget limit of $${budgetData.limit.toFixed(2)}. You still have $${(budgetData.budget - budgetData.spent).toFixed(2)} left in your total budget.`,
          details: `${daysLeftInMonth} days remaining this month. Daily budget remaining: $${((budgetData.budget - budgetData.spent) / Math.max(daysLeftInMonth, 1)).toFixed(2)}`,
          actionable: 'Monitor spending closely and stick to essentials'
        };
      case 'warning':
        return {
          icon: '�',
          title: 'Approaching Budget Limit',
          message: `You're at ${budgetData.limitPercentage.toFixed(1)}% of your budget limit with ${daysLeftInMonth} days left this month.`,
          details: `Current daily average: $${averageDailySpending.toFixed(2)}. Recommended daily limit: $${((budgetData.limit - budgetData.spent) / Math.max(daysLeftInMonth, 1)).toFixed(2)}`,
          actionable: 'Consider reducing discretionary spending'
        };
      case 'caution':
        return {
          icon: '⚡',
          title: 'Budget on Track (Caution)',
          message: `You've used ${budgetData.limitPercentage.toFixed(1)}% of your budget limit. You're pacing well but stay mindful.`,
          details: `Projected monthly spending: $${projectedMonthlySpending.toFixed(2)}. ${daysLeftInMonth} days remaining.`,
          actionable: 'Continue monitoring spending patterns'
        };
      case 'moderate':
        return {
          icon: '📊',
          title: 'Moderate Spending',
          message: `You've used ${budgetData.percentage.toFixed(1)}% of your total budget. Good progress through the month.`,
          details: `Daily average: $${averageDailySpending.toFixed(2)}. On track to spend $${projectedMonthlySpending.toFixed(2)} total.`,
          actionable: 'Maintain current spending habits'
        };
      default:
        return {
          icon: '✅',
          title: 'Excellent Budget Control',
          message: `You're doing great! Only ${budgetData.percentage.toFixed(1)}% of your budget used so far.`,
          details: `At this rate, you'll spend approximately $${projectedMonthlySpending.toFixed(2)} this month, well under your $${budgetData.budget.toFixed(2)} budget.`,
          actionable: 'Keep up the good work! Consider saving the surplus.'
        };
    }
  };

  return (
    <div className="budget-container">
      <div className="budget-header">
        <h2>💰 Monthly Budget</h2>
        <button 
          className="edit-budget-btn"
          onClick={handleEditBudget}
          disabled={isEditingBudget}
        >
          ✏️ Edit
        </button>
      </div>      {isEditingBudget ? (
        <div className="budget-edit-form">
          <div className="edit-input-group">
            <label htmlFor="budget-input">Total Budget:</label>
            <input
              id="budget-input"
              type="number"
              value={newBudget}
              onChange={(e) => setNewBudget(e.target.value)}
              placeholder="Enter total budget"
              min="0"
              step="0.01"
            />
          </div>
          <div className="edit-input-group">
            <label htmlFor="limit-input">Budget Limit (Warning Threshold):</label>
            <input
              id="limit-input"
              type="number"
              value={newBudgetLimit}
              onChange={(e) => setNewBudgetLimit(e.target.value)}
              placeholder="Enter budget limit"
              min="0"
              step="0.01"
            />
          </div>
          <div className="edit-buttons">
            <button className="save-budget-btn" onClick={handleBudgetUpdate}>
              💾 Save
            </button>
            <button className="cancel-budget-btn" onClick={cancelEditBudget}>
              ❌ Cancel
            </button>
          </div>
        </div>
      ) : (        <div className="budget-display">
          <div className="budget-stats">
            <div className="budget-stat">
              <span className="stat-label">Total Budget:</span>
              <span className="stat-value budget-limit">${budgetData.budget.toFixed(2)}</span>
            </div>
            <div className="budget-stat">
              <span className="stat-label">Budget Limit:</span>
              <span className="stat-value budget-limit">${budgetData.limit.toFixed(2)}</span>
            </div>
            <div className="budget-stat">
              <span className="stat-label">Spent:</span>
              <span className="stat-value spent-amount">${budgetData.spent.toFixed(2)}</span>
            </div>
            <div className="budget-stat">
              <span className="stat-label">Remaining:</span>
              <span className={`stat-value remaining-amount ${budgetData.remaining < 0 ? 'negative' : 'positive'}`}>
                ${budgetData.remaining.toFixed(2)}
              </span>
            </div>
          </div>

          <div className="budget-progress">
            <div className="progress-bar-container">
              <div 
                className={`progress-bar ${getBudgetStatus()}`}
                style={{ width: `${budgetData.limitPercentage}%` }}
              />
            </div>
            <div className="progress-text">
              {budgetData.limitPercentage.toFixed(1)}% of limit used • {budgetData.percentage.toFixed(1)}% of total budget used
            </div>
          </div>          <div className={`budget-status ${getBudgetStatus()}`}>
            <div className="status-header">
              <span className="status-icon">{getBudgetMessage().icon}</span>
              <h3 className="status-title">{getBudgetMessage().title}</h3>
            </div>
            <p className="status-message">{getBudgetMessage().message}</p>
            <p className="status-details">{getBudgetMessage().details}</p>
            <div className="status-actionable">
              <strong>💡 Recommendation:</strong> {getBudgetMessage().actionable}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Budget;
