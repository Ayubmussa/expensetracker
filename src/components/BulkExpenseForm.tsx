import React, { useState, useEffect, useCallback } from 'react';
import { expenseService } from '../services/expenseService';
import { localStorageUtils } from '../utils/localStorage';
import { useAuth } from '../hooks/useAuth';
import type { Category, ExpenseFormData } from '../types';
import './BulkExpenseForm.css';

interface BulkExpenseItem extends ExpenseFormData {
  id: string;
}

interface BulkExpenseFormProps {
  onExpensesAdded: () => void;
  onClose: () => void;
}

const BulkExpenseForm: React.FC<BulkExpenseFormProps> = ({ onExpensesAdded, onClose }) => {
  const { user } = useAuth();  const [expenses, setExpenses] = useState<BulkExpenseItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: Partial<ExpenseFormData> }>({});
  const [showNewCategoryModal, setShowNewCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryIcon, setNewCategoryIcon] = useState('💰');
  const [selectedExpenseIdForCategory, setSelectedExpenseIdForCategory] = useState<string | null>(null);

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
  };  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateAllExpenses()) return;

    setIsSubmitting(true);
    try {
      // Use authenticated user ID or generate offline user ID
      const userId = user?.id || localStorageUtils.getOfflineUserId();
      
      // Prepare expense data
      const expenseData = expenses.map(expense => ({
        user_id: userId,
        amount: parseFloat(expense.amount),
        description: expense.description.trim(),
        category: expense.category,
        date: expense.date,
      }));

      // Use bulk submission method
      await expenseService.addMultipleExpenses(expenseData);

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

  const handleCategoryChange = (expenseId: string, value: string) => {
    if (value === 'create-new') {
      setSelectedExpenseIdForCategory(expenseId);
      setShowNewCategoryModal(true);
    } else {
      updateExpense(expenseId, 'category', value);
    }
  };

  const handleCreateNewCategory = async () => {
    if (!newCategoryName.trim()) return;

    try {
      const newCategory = await expenseService.createCategory({
        name: newCategoryName.trim(),
        color: '#3b82f6',
        icon: newCategoryIcon,
      });

      setCategories(prev => [...prev, newCategory]);
      
      // Update the expense that triggered the category creation
      if (selectedExpenseIdForCategory) {
        updateExpense(selectedExpenseIdForCategory, 'category', newCategory.name);
      }

      // Reset modal state
      setShowNewCategoryModal(false);
      setNewCategoryName('');
      setNewCategoryIcon('💰');
      setSelectedExpenseIdForCategory(null);
    } catch (error) {
      console.error('Error creating category:', error);
    }
  };

  const handleCancelNewCategory = () => {
    setShowNewCategoryModal(false);
    setNewCategoryName('');
    setNewCategoryIcon('💰');
    setSelectedExpenseIdForCategory(null);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content bulk-expense-modal">
        <div className="modal-header">
          <h2>📝 Add Multiple Expenses</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="bulk-expense-form">
          {/* Quick Actions Bar */}
          <div className="bulk-actions-bar">
            <div className="quick-actions">
              <button
                type="button"
                onClick={() => {
                  const today = new Date().toISOString().split('T')[0];
                  setExpenses(prev => prev.map(expense => ({ ...expense, date: today })));
                }}
                className="quick-action-btn"
                title="Set all dates to today"
              >
                📅 Today
              </button>
              
              <button
                type="button"
                onClick={() => {
                  const lastCategory = expenses[expenses.length - 1]?.category || categories[0]?.name;
                  setExpenses(prev => prev.map(expense => ({ ...expense, category: lastCategory })));
                }}
                className="quick-action-btn"
                title="Apply last selected category to all"
              >
                🏷️ Same Category
              </button>
            </div>
            
            <button
              type="button"
              onClick={addExpenseRow}
              className="add-row-btn-mini"
            >
              + Add Row
            </button>
          </div>

          {/* Expense List Header */}
          <div className="expense-list-header">
            <div className="header-row">
              <span className="header-cell header-number">#</span>
              <span className="header-cell header-amount">Amount</span>
              <span className="header-cell header-description">Description</span>
              <span className="header-cell header-category">Category</span>
              <span className="header-cell header-date">Date</span>
              <span className="header-cell header-actions">Actions</span>
            </div>
          </div>

          {/* Expense Rows */}
          <div className="expense-rows">
            {expenses.map((expense, index) => (
              <div key={expense.id} className="expense-row">
                <div className="row-number">{index + 1}</div>
                  <div className="form-group" data-label="Amount">
                  <input
                    type="number"
                    placeholder="0.00"
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

                <div className="form-group" data-label="Description">
                  <input
                    type="text"
                    placeholder="Expense description"
                    value={expense.description}
                    onChange={(e) => updateExpense(expense.id, 'description', e.target.value)}
                    className={errors[expense.id]?.description ? 'error' : ''}
                  />
                  {errors[expense.id]?.description && (
                    <span className="error-text">{errors[expense.id].description}</span>
                  )}
                </div>

                <div className="form-group" data-label="Category">
                  <select
                    value={expense.category}
                    onChange={(e) => handleCategoryChange(expense.id, e.target.value)}
                    className={errors[expense.id]?.category ? 'error' : ''}
                  >
                    {categories.map(category => (
                      <option key={category.id} value={category.name}>
                        {category.icon} {category.name}
                      </option>
                    ))}
                    <option value="create-new">➕ Create New Category</option>
                  </select>
                  {errors[expense.id]?.category && (
                    <span className="error-text">{errors[expense.id].category}</span>
                  )}
                </div>                <div className="form-group" data-label="Date">
                  <input
                    type="date"
                    value={expense.date}
                    onChange={(e) => updateExpense(expense.id, 'date', e.target.value)}
                    className={errors[expense.id]?.date ? 'error' : ''}
                  />
                  {errors[expense.id]?.date && (
                    <span className="error-text">{errors[expense.id].date}</span>
                  )}
                </div>

                <div className="row-actions">
                  <button
                    type="button"
                    onClick={() => duplicateExpenseRow(expense.id)}
                    className="duplicate-row-btn"
                    title="Duplicate this expense"
                  >
                    📋
                  </button>
                  <button
                    type="button"
                    onClick={() => removeExpenseRow(expense.id)}
                    className="remove-row-btn"
                    disabled={expenses.length === 1}
                    title="Remove this expense"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Add More Row Button */}
          <div className="add-more-section">
            <button
              type="button"
              onClick={addExpenseRow}
              className="add-row-btn"
            >
              <span className="add-icon">+</span>
              Add Another Expense
            </button>
            <div className="bulk-form-shortcuts">
              <small>💡 Pro tip: Use Tab to navigate • Click duplicate (📋) to copy a row</small>
            </div>
          </div>

          {/* Summary Section */}
          <div className="bulk-summary">
            <div className="summary-left">
              <div className="expense-count">
                <strong>{expenses.length}</strong> expense{expenses.length !== 1 ? 's' : ''} ready to add
              </div>
            </div>
            <div className="summary-right">
              <div className="total-amount">
                <span className="total-label">Total:</span>
                <span className="total-value">${getTotalAmount().toFixed(2)}</span>
              </div>
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
              {isSubmitting ? (
                <><span className="loading-spinner"></span> Adding...</>
              ) : (
                <>💾 Add {expenses.length} Expense{expenses.length !== 1 ? 's' : ''}</>
              )}
            </button>
          </div>        </form>
      </div>

      {/* New Category Modal - Separate overlay */}
      {showNewCategoryModal && (
        <div className="new-category-modal-overlay">
          <div className="new-category-modal">
            <div className="modal-header">
              <h3>➕ Create New Category</h3>
              <button className="close-button" onClick={handleCancelNewCategory}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Category Name</label>
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="Enter category name"
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label>Category Icon</label>
                <input
                  type="text"
                  value={newCategoryIcon}
                  onChange={(e) => setNewCategoryIcon(e.target.value)}
                  placeholder="Enter category icon"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                onClick={handleCancelNewCategory}
                className="cancel-btn"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateNewCategory}
                className="submit-btn"
                disabled={!newCategoryName.trim()}
              >
                Create Category
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BulkExpenseForm;
