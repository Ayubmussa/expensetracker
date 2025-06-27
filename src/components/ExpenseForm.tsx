import React, { useState, useEffect, useCallback } from 'react';
import { expenseService } from '../services/expenseService';
import { receiptService } from '../services/receiptService';
import ReceiptScanner from './ReceiptScanner';
import type { Category, ExpenseFormData, ReceiptData } from '../types';
import './ExpenseForm.css';

interface ExpenseFormProps {
  onExpenseAdded: () => void;
}

const ExpenseForm: React.FC<ExpenseFormProps> = ({ onExpenseAdded }) => {
  const [formData, setFormData] = useState<ExpenseFormData>({
    amount: '',
    description: '',
    category: '',
    date: new Date().toISOString().split('T')[0],
  });  const [categories, setCategories] = useState<Category[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);  const [errors, setErrors] = useState<Partial<ExpenseFormData>>({});
  const [showNewCategoryModal, setShowNewCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryIcon, setNewCategoryIcon] = useState('💰');
  const [showReceiptScanner, setShowReceiptScanner] = useState(false);
  const [currentReceiptId, setCurrentReceiptId] = useState<string | null>(null);

  const loadCategories = useCallback(async () => {
    try {
      const categoryList = await expenseService.getCategories();
      setCategories(categoryList);
      if (categoryList.length > 0 && !formData.category) {
        setFormData(prev => ({ ...prev, category: categoryList[0].name }));
      }
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  }, [formData.category]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const validateForm = (): boolean => {
    const newErrors: Partial<ExpenseFormData> = {};

    if (!formData.amount || isNaN(parseFloat(formData.amount)) || parseFloat(formData.amount) <= 0) {
      newErrors.amount = 'Please enter a valid amount';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Please enter a description';
    }

    if (!formData.category) {
      newErrors.category = 'Please select a category';
    }

    if (!formData.date) {
      newErrors.date = 'Please select a date';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
      if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const newExpense = await expenseService.addExpense({
        amount: parseFloat(formData.amount),
        description: formData.description.trim(),
        category: formData.category,
        date: formData.date,
      });

      // If we have a receipt ID, link it to the newly created expense
      if (currentReceiptId && newExpense.id) {
        try {
          await receiptService.linkReceiptToExpense(currentReceiptId, newExpense.id);
          console.log('Receipt linked to expense successfully');
        } catch (error) {
          console.warn('Failed to link receipt to expense:', error);
          // Don't fail the whole operation if receipt linking fails
        }
      }

      // Reset form
      setFormData({
        amount: '',
        description: '',
        category: categories[0]?.name || '',
        date: new Date().toISOString().split('T')[0],
      });

      // Reset receipt ID
      setCurrentReceiptId(null);

      onExpenseAdded();
    } catch (error) {
      console.error('Error adding expense:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (errors[name as keyof ExpenseFormData]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value === 'create-new') {
      setShowNewCategoryModal(true);
    } else {
      setFormData(prev => ({ ...prev, category: value }));
      // Clear error when user selects a category
      if (errors.category) {
        setErrors(prev => ({ ...prev, category: undefined }));
      }
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
      setFormData(prev => ({ ...prev, category: newCategory.name }));
      
      // Reset modal state
      setShowNewCategoryModal(false);
      setNewCategoryName('');
      setNewCategoryIcon('💰');
    } catch (error) {
      console.error('Error creating category:', error);
    }
  };

  const handleCancelNewCategory = () => {
    setShowNewCategoryModal(false);
    setNewCategoryName('');
    setNewCategoryIcon('💰');
  };

  const handleReceiptProcessed = (receiptData: ReceiptData, receiptId?: string) => {
    // Update form data with extracted receipt data
    setFormData(prev => ({
      ...prev,
      amount: receiptData.amount.toString(),
      description: receiptData.description || receiptData.vendor || prev.description,
      category: receiptData.category || prev.category,
      date: receiptData.date || prev.date,
    }));

    // Store receipt ID for linking to expense later
    setCurrentReceiptId(receiptId || null);

    // Clear any existing errors
    setErrors({});
    setShowReceiptScanner(false);
  };

  const selectedCategory = categories.find(cat => cat.name === formData.category);
  return (
    <div className="expense-form-container">
      <form onSubmit={handleSubmit} className="expense-form">
        <div className="form-group">
          <label htmlFor="amount">Amount ($)</label>
          <input
            type="number"
            id="amount"
            name="amount"
            value={formData.amount}
            onChange={handleInputChange}
            placeholder="0.00"
            step="0.01"
            min="0"
            className={errors.amount ? 'error' : ''}
          />
          {errors.amount && <span className="error-message">{errors.amount}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            placeholder="What did you spend on?"
            rows={3}
            className={errors.description ? 'error' : ''}
          />
          {errors.description && <span className="error-message">{errors.description}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="category">Category</label>
          <div className="category-select-container">
            <select
              id="category"
              name="category"
              value={formData.category}
              onChange={handleCategoryChange}
              className={errors.category ? 'error' : ''}
            >
              <option value="">Select a category</option>
              {categories.map(category => (
                <option key={category.id} value={category.name}>
                  {category.icon} {category.name}
                </option>
              ))}
              <option value="create-new">+ Create new category</option>
            </select>
            {selectedCategory && (
              <div className="category-preview" style={{ backgroundColor: selectedCategory.color }}>
                {selectedCategory.icon}
              </div>
            )}
          </div>
          {errors.category && <span className="error-message">{errors.category}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="date">Date</label>
          <input
            type="date"
            id="date"
            name="date"
            value={formData.date}
            onChange={handleInputChange}
            max={new Date().toISOString().split('T')[0]}
            className={errors.date ? 'error' : ''}
          />
          {errors.date && <span className="error-message">{errors.date}</span>}
        </div>

        <div className="form-group receipt-scanner-group">
          <button
            type="button"
            onClick={() => setShowReceiptScanner(true)}
            className="receipt-scanner-button"
          >
            📷 Scan Receipt
          </button>
          <span className="receipt-scanner-hint">Take a photo or upload an image to extract expense data</span>
          
          {process.env.NODE_ENV === 'development' && (
            <button
              type="button"
              onClick={async () => {
                try {
                  const { testTesseractInstallation } = await import('../utils/receiptTestUtils');
                  const result = await testTesseractInstallation();
                  alert(`Tesseract test: ${result.success ? 'PASSED' : 'FAILED'}${result.error ? ` - ${result.error}` : ''}`);
                } catch (error) {
                  alert(`Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
                }
              }}
              className="test-button"
              style={{ marginLeft: '10px', fontSize: '12px', padding: '4px 8px' }}
            >
              🧪 Test OCR
            </button>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="submit-button"
        >
          {isSubmitting ? 'Adding...' : 'Add Expense'}
        </button>

        {showNewCategoryModal && (
          <div className="new-category-modal">
            <h3>Create New Category</h3>
            <div className="form-group">
              <label htmlFor="newCategoryName">Category Name</label>
              <input
                type="text"
                id="newCategoryName"
                value={newCategoryName}
                onChange={e => setNewCategoryName(e.target.value)}
                placeholder="Enter category name"
              />
            </div>

            <div className="form-group">
              <label htmlFor="newCategoryIcon">Category Icon</label>
              <input
                type="text"
                id="newCategoryIcon"
                value={newCategoryIcon}
                onChange={e => setNewCategoryIcon(e.target.value)}
                placeholder="Enter category icon"
              />
            </div>

            <div className="modal-actions">
              <button onClick={handleCreateNewCategory} className="submit-button">
                Create Category
              </button>
              <button onClick={handleCancelNewCategory} className="cancel-button">
                Cancel
              </button>
            </div>
          </div>
        )}

        {showReceiptScanner && (
          <ReceiptScanner
            onReceiptProcessed={handleReceiptProcessed}
            onClose={() => setShowReceiptScanner(false)}
          />
        )}
      </form>
    </div>
  );
};

export default ExpenseForm;
