import React, { useState, useEffect, useCallback } from 'react';
import { expenseService } from '../services/expenseService';
import { useAuth } from '../hooks/useAuth';
import type { Category, ExpenseFormData } from '../types';
import './ExpenseForm.css';

interface BulkExpenseItem extends ExpenseFormData {
  id: string;
}

interface BulkExpenseFormProps {
  onExpensesAdded: () => void;
  onClose: () => void;
}

const BulkExpenseForm: React.FC<BulkExpenseFormProps> = ({ onExpensesAdded, onClose }) => {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<BulkExpenseItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: Partial<ExpenseFormData> }>({});

  const createEmptyExpense = (): BulkExpenseItem => ({
    id: crypto.randomUUID(),
    amount: '',
    description: '',
    category: categories[0]?.name || '',
    date: new Date().toISOString().split('T')[0],
  });

  const loadCategories = useCallback(async () => {
    try {
      const categoryList = await expenseService.getCategories();
      setCategories(categoryList);
      
      // Initialize with one empty expense if none exist
      if (expenses.length === 0) {
        setExpenses([{
          id: crypto.randomUUID(),
          amount: '',
          description: '',
          category: categoryList[0]?.name || '',
          date: new Date().toISOString().split('T')[0],
        }]);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  }, [expenses.length]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const validateExpense = (expense: BulkExpenseItem): Partial<ExpenseFormData> => {
    const errors: Partial<ExpenseFormData> = {};

    if (!expense.amount || isNaN(parseFloat(expense.amount)) || parseFloat(expense.amount) <= 0) {
      errors.amount = 'Please enter a valid amount';
    }

    if (!expense.description.trim()) {
      errors.description = 'Please enter a description';
    }

    if (!expense.category) {
      errors.category = 'Please select a category';
    }

    if (!expense.date) {
      errors.date = 'Please select a date';
    }

    return errors;
  };

  const validateAllExpenses = (): boolean => {
    const newErrors: { [key: string]: Partial<ExpenseFormData> } = {};
    let isValid = true;

    expenses.forEach(expense => {
      const expenseErrors = validateExpense(expense);
      if (Object.keys(expenseErrors).length > 0) {
        newErrors[expense.id] = expenseErrors;
        isValid = false;
      }
    });

    setErrors(newErrors);
    return isValid;
  };
  const addExpenseRow = () => {
    setExpenses(prev => [...prev, createEmptyExpense()]);
  };

  const duplicateExpenseRow = (sourceId: string) => {
    const sourceExpense = expenses.find(e => e.id === sourceId);
    if (sourceExpense) {
      const duplicatedExpense = {
        ...sourceExpense,
        id: crypto.randomUUID(),
        amount: '', // Clear amount for new entry
        description: sourceExpense.description + ' (copy)'
      };
      setExpenses(prev => [...prev, duplicatedExpense]);
    }
  };

  const removeExpenseRow = (id: string) => {
    if (expenses.length > 1) {
      setExpenses(prev => prev.filter(expense => expense.id !== id));
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[id];
        return newErrors;
      });
    }
  };

  const updateExpense = (id: string, field: keyof ExpenseFormData, value: string) => {
    setExpenses(prev => prev.map(expense => 
      expense.id === id ? { ...expense, [field]: value } : expense
    ));
    
    // Clear error for this field
    if (errors[id] && errors[id][field]) {
      setErrors(prev => ({
        ...prev,
        [id]: {
          ...prev[id],
          [field]: undefined
        }
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateAllExpenses()) return;

    if (!user) {
      console.error('User not authenticated');
      return;
    }

    setIsSubmitting(true);
    try {
      // Submit all expenses
      const promises = expenses.map(expense =>
        expenseService.addExpense({
          user_id: user.id,
          amount: parseFloat(expense.amount),
          description: expense.description.trim(),
          category: expense.category,
          date: expense.date,
        })
      );

      await Promise.all(promises);

      onExpensesAdded();
      onClose();
    } catch (error) {
      console.error('Error adding expenses:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTotalAmount = () => {
    return expenses.reduce((total, expense) => {
      const amount = parseFloat(expense.amount) || 0;
      return total + amount;
    }, 0);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content bulk-expense-modal">
        <div className="modal-header">
          <h2>Add Multiple Expenses</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="bulk-expense-form">
          <div className="expense-rows">
            {expenses.map((expense, index) => (
              <div key={expense.id} className="expense-row">
                <div className="row-number">{index + 1}</div>
                
                <div className="form-group">
                  <input
                    type="number"
                    placeholder="Amount"
                    value={expense.amount}
                    onChange={(e) => updateExpense(expense.id, 'amount', e.target.value)}
                    step="0.01"
                    min="0"
                    className={errors[expense.id]?.amount ? 'error' : ''}
                  />
                  {errors[expense.id]?.amount && (
                    <span className="error-text">{errors[expense.id].amount}</span>
                  )}
                </div>

                <div className="form-group">
                  <input
                    type="text"
                    placeholder="Description"
                    value={expense.description}
                    onChange={(e) => updateExpense(expense.id, 'description', e.target.value)}
                    className={errors[expense.id]?.description ? 'error' : ''}
                  />
                  {errors[expense.id]?.description && (
                    <span className="error-text">{errors[expense.id].description}</span>
                  )}
                </div>

                <div className="form-group">
                  <select
                    value={expense.category}
                    onChange={(e) => updateExpense(expense.id, 'category', e.target.value)}
                    className={errors[expense.id]?.category ? 'error' : ''}
                  >
                    {categories.map(category => (
                      <option key={category.id} value={category.name}>
                        {category.icon} {category.name}
                      </option>
                    ))}
                  </select>
                  {errors[expense.id]?.category && (
                    <span className="error-text">{errors[expense.id].category}</span>
                  )}
                </div>

                <div className="form-group">
                  <input
                    type="date"
                    value={expense.date}
                    onChange={(e) => updateExpense(expense.id, 'date', e.target.value)}
                    className={errors[expense.id]?.date ? 'error' : ''}
                  />
                  {errors[expense.id]?.date && (
                    <span className="error-text">{errors[expense.id].date}</span>
                  )}
                </div>                <div className="row-actions">
                  <button
                    type="button"
                    onClick={() => duplicateExpenseRow(expense.id)}
                    className="duplicate-row-btn"
                    title="Duplicate row"
                  >
                    📋
                  </button>
                  <button
                    type="button"
                    onClick={() => removeExpenseRow(expense.id)}
                    className="remove-row-btn"
                    disabled={expenses.length === 1}
                    title="Remove row"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>          <div className="bulk-form-actions">
            <div className="quick-actions">
              <button
                type="button"
                onClick={() => {
                  const today = new Date().toISOString().split('T')[0];
                  setExpenses(prev => prev.map(expense => ({ ...expense, date: today })));
                }}
                className="quick-action-btn"
              >
                📅 Set All to Today
              </button>
              
              <button
                type="button"
                onClick={() => {
                  const lastCategory = expenses[expenses.length - 1]?.category || categories[0]?.name;
                  setExpenses(prev => prev.map(expense => ({ ...expense, category: lastCategory })));
                }}
                className="quick-action-btn"
              >
                🏷️ Use Same Category
              </button>
            </div>
            
            <button
              type="button"
              onClick={addExpenseRow}
              className="add-row-btn"
            >
              + Add Another Expense
            </button>
            
            <div className="bulk-form-shortcuts">
              <small>💡 Tips: Use Tab to navigate between fields • Ctrl+D to duplicate row • Ctrl+Enter to submit</small>
            </div>
          </div>

          <div className="bulk-summary">
            <div className="total-amount">
              <strong>Total Amount: ${getTotalAmount().toFixed(2)}</strong>
            </div>
            <div className="expense-count">
              {expenses.length} expense{expenses.length !== 1 ? 's' : ''}
            </div>
          </div>

          <div className="modal-footer">
            <button
              type="button"
              onClick={onClose}
              className="cancel-btn"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="submit-btn"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Adding...' : `Add ${expenses.length} Expense${expenses.length !== 1 ? 's' : ''}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BulkExpenseForm;
