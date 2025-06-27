import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabaseReceiptService } from '../services/supabaseReceiptService';
import type { Receipt } from '../types';
import './ReceiptHistory.css';

interface ReceiptHistoryProps {
  onClose: () => void;
}

const ReceiptHistory: React.FC<ReceiptHistoryProps> = ({ onClose }) => {
  const { user } = useAuth();
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadReceipts = useCallback(async () => {
    if (!user?.id) {
      setError('User not authenticated');
      setLoading(false);
      return;
    }

    try {
      const result = await supabaseReceiptService.getUserReceipts(user.id);
      if (result.success && result.receipts) {
        setReceipts(result.receipts);
      } else {
        setError(result.error || 'Failed to load receipts');
      }
    } catch (err) {
      setError('Failed to load receipts');
      console.error('Error loading receipts:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadReceipts();
  }, [loadReceipts]);

  const handleDeleteReceipt = async (receiptId: string) => {
    if (!user?.id) return;

    if (confirm('Are you sure you want to delete this receipt?')) {
      try {
        const result = await supabaseReceiptService.deleteReceipt(receiptId, user.id);
        if (result.success) {
          setReceipts(prev => prev.filter(r => r.id !== receiptId));
        } else {
          alert('Failed to delete receipt: ' + result.error);
        }
      } catch (err) {
        alert('Failed to delete receipt');
        console.error('Error deleting receipt:', err);
      }
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  return (
    <div className="receipt-history-overlay">
      <div className="receipt-history-modal">
        <div className="receipt-history-header">
          <h2>📄 Receipt History</h2>
          <button onClick={onClose} className="close-button">×</button>
        </div>

        <div className="receipt-history-content">
          {loading && (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Loading receipts...</p>
            </div>
          )}

          {error && (
            <div className="error-state">
              <p className="error-message">❌ {error}</p>
              <button onClick={loadReceipts} className="retry-button">
                🔄 Retry
              </button>
            </div>
          )}

          {!loading && !error && receipts.length === 0 && (
            <div className="empty-state">
              <p>📭 No receipts found</p>
              <p className="empty-hint">Start scanning receipts to see them here!</p>
            </div>
          )}

          {!loading && !error && receipts.length > 0 && (
            <div className="receipts-grid">
              {receipts.map((receipt) => (
                <div key={receipt.id} className="receipt-card">
                  <div className="receipt-image">
                    <img 
                      src={receipt.image_url} 
                      alt={receipt.original_filename}
                      loading="lazy"
                    />
                  </div>
                  
                  <div className="receipt-details">
                    <div className="receipt-amount">
                      {formatCurrency(receipt.extracted_data.amount)}
                    </div>
                    
                    <div className="receipt-description">
                      {receipt.extracted_data.description}
                    </div>
                    
                    <div className="receipt-category">
                      📂 {receipt.extracted_data.category}
                    </div>
                    
                    <div className="receipt-date">
                      📅 {formatDate(receipt.extracted_data.date)}
                    </div>
                    
                    <div className="receipt-filename">
                      📎 {receipt.original_filename}
                    </div>

                    <div className="receipt-confidence">
                      🎯 Confidence: {Math.round(receipt.extracted_data.confidence * 100)}%
                    </div>

                    {receipt.expense_id && (
                      <div className="receipt-linked">
                        ✅ Linked to expense
                      </div>
                    )}
                  </div>

                  <div className="receipt-actions">
                    <button 
                      onClick={() => window.open(receipt.image_url, '_blank')}
                      className="view-button"
                      title="View full image"
                    >
                      👁️ View
                    </button>
                    
                    <button 
                      onClick={() => handleDeleteReceipt(receipt.id)}
                      className="delete-button"
                      title="Delete receipt"
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="receipt-history-footer">
          <p className="receipts-count">
            {receipts.length} receipt{receipts.length !== 1 ? 's' : ''} total
          </p>
        </div>
      </div>
    </div>
  );
};

export default ReceiptHistory;
