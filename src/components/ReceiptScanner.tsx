import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { receiptService } from '../services/receiptService';
import { expenseService } from '../services/expenseService';
import type { Category } from '../types';
import './ReceiptScanner.css';

interface ReceiptData {
  amount: number;
  description: string;
  category: string;
  date: string;
  vendor?: string;
  confidence: number;
}

interface ReceiptScannerProps {
  onReceiptProcessed: (receiptData: ReceiptData, receiptId?: string) => void;
  onClose: () => void;
}

const ReceiptScanner: React.FC<ReceiptScannerProps> = ({ onReceiptProcessed, onClose }) => {
  const { user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<ReceiptData | null>(null);
  const [receiptId, setReceiptId] = useState<string | null>(null);
  const [useCamera, setUseCamera] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Load categories when component mounts
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const categoryList = await expenseService.getCategories();
        setCategories(categoryList);
        console.log('Loaded categories for receipt scanning:', categoryList.map(c => c.name));
      } catch (error) {
        console.error('Error loading categories for receipt scanning:', error);
      }
    };
    
    loadCategories();
  }, []);

  const startCamera = async () => {
    try {
      console.log('Requesting camera access...');
      
      // Check if camera is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera is not supported in this browser');
      }

      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment', // Use back camera on mobile
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setUseCamera(true);
        setError(null);
        console.log('Camera started successfully');
      }
    } catch (err: unknown) {
      console.error('Camera access error:', err);
      
      let errorMessage = 'Unable to access camera.';
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          errorMessage = 'Camera access denied. Please allow camera permissions and try again.';
        } else if (err.name === 'NotFoundError') {
          errorMessage = 'No camera found on this device.';
        } else if (err.name === 'NotSupportedError') {
          errorMessage = 'Camera is not supported in this browser.';
        } else {
          errorMessage = `Camera error: ${err.message}`;
        }
      }
      
      setError(errorMessage + ' You can still upload an image file instead.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setUseCamera(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], 'receipt.jpg', { type: 'image/jpeg' });
            handleImageUpload(file);
          }
        }, 'image/jpeg', 0.8);
      }
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleImageUpload(file);
    }
  };

  const handleImageUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file (JPEG, PNG, GIF, WebP)');
      return;
    }

    // Check file size (limit to 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('Image file is too large. Please select a file smaller than 10MB.');
      return;
    }

    console.log('Processing image file:', file.name, 'Size:', (file.size / 1024 / 1024).toFixed(2) + 'MB');

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewImage(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Process the image
    setIsProcessing(true);
    setError(null);
    stopCamera();

    try {
      console.log('Starting receipt processing...');
      console.log('Using categories for categorization:', categories.map(c => c.name));
      
      // Use the enhanced service that saves to Supabase or localStorage with categories
      const result = await receiptService.scanAndSaveReceipt(file, user?.id, categories);
      
      console.log('Receipt processing result:', result);
      
      if (result.success && result.data) {
        console.log('Receipt processed successfully:', result.data);
        setExtractedData(result.data);
        setReceiptId(result.receiptId || null);
        
        // If confidence is very low, inform the user
        if (result.data.confidence < 0.3) {
          setError('⚠️ Low confidence in extracted data. Please verify and correct the information below.');
        }
      } else {
        throw new Error(result.error || 'Failed to process receipt');
      }
    } catch (err) {
      console.error('Receipt processing error:', err);
      
      const errorMessage = err instanceof Error ? err.message : 'Failed to process receipt';
      setError(`Processing failed: ${errorMessage}`);
      
      // Fallback: provide manual entry option
      setExtractedData({
        amount: 0,
        description: `Manual entry required - ${file.name}`,
        category: 'Other',
        date: new Date().toISOString().split('T')[0],
        confidence: 0
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmData = () => {
    if (extractedData) {
      onReceiptProcessed(extractedData, receiptId || undefined);
      onClose();
    }
  };

  const handleEditData = (field: keyof ReceiptData, value: string | number) => {
    if (extractedData) {
      setExtractedData({
        ...extractedData,
        [field]: value
      });
    }
  };

  return (
    <div className="receipt-scanner-overlay">
      <div className="receipt-scanner-modal">
        <div className="receipt-scanner-header">
          <h2>📸 Scan Receipt</h2>
          <button onClick={onClose} className="close-btn">✕</button>
        </div>

        <div className="receipt-scanner-content">
          {!previewImage && !useCamera && (
            <div className="upload-options">
              <div className="upload-option">
                <button onClick={startCamera} className="camera-btn">
                  📷 Take Photo
                </button>
                <p>Use your camera to capture a receipt</p>
              </div>
              
              <div className="upload-divider">or</div>
              
              <div className="upload-option">
                <button onClick={() => fileInputRef.current?.click()} className="upload-btn">
                  📁 Upload Image
                </button>
                <p>Select a receipt image from your device</p>
              </div>
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
            </div>
          )}

          {useCamera && (
            <div className="camera-view">
              <video ref={videoRef} autoPlay playsInline className="camera-video" />
              <canvas ref={canvasRef} style={{ display: 'none' }} />
              <div className="camera-controls">
                <button onClick={capturePhoto} className="capture-btn">
                  📸 Capture
                </button>
                <button onClick={stopCamera} className="cancel-camera-btn">
                  Cancel
                </button>
              </div>
            </div>
          )}

          {previewImage && (
            <div className="image-preview">
              <img src={previewImage} alt="Receipt preview" className="preview-image" />
              
              {isProcessing && (
                <div className="processing-overlay">
                  <div className="loading-spinner"></div>
                  <p>Processing receipt...</p>
                  <div className="processing-steps">
                    <small>• Extracting text from image</small>
                    <small>• Analyzing expense data</small>
                    <small>• Categorizing transaction</small>
                  </div>
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="error-message">
              <p>{error}</p>
              <button onClick={() => setError(null)} className="retry-btn">
                Try Again
              </button>
            </div>
          )}

          {extractedData && !isProcessing && (
            <div className="extracted-data">
              <h3>Extracted Information</h3>
              <div className="confidence-indicator">
                <span className={`confidence-badge ${
                  extractedData.confidence >= 0.7 ? 'high' : 
                  extractedData.confidence >= 0.4 ? 'medium' : 'low'
                }`}>
                  {extractedData.confidence >= 0.7 ? '✓ High' : 
                   extractedData.confidence >= 0.4 ? '⚠ Medium' : '⚠ Low'} Confidence: {Math.round(extractedData.confidence * 100)}%
                </span>
                <small>Please review and edit the information below if needed</small>
              </div>
              
              <div className="data-fields">
                <div className="field-group">
                  <label>Amount ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={extractedData.amount}
                    onChange={(e) => handleEditData('amount', parseFloat(e.target.value) || 0)}
                  />
                </div>
                
                <div className="field-group">
                  <label>Description</label>
                  <input
                    type="text"
                    value={extractedData.description}
                    onChange={(e) => handleEditData('description', e.target.value)}
                  />
                </div>
                
                <div className="field-group">
                  <label>Category</label>
                  <select
                    value={extractedData.category}
                    onChange={(e) => handleEditData('category', e.target.value)}
                  >
                    <option value="Food">Food</option>
                    <option value="Transportation">Transportation</option>
                    <option value="Shopping">Shopping</option>
                    <option value="Entertainment">Entertainment</option>
                    <option value="Health">Health</option>
                    <option value="Bills">Bills</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                
                <div className="field-group">
                  <label>Date</label>
                  <input
                    type="date"
                    value={extractedData.date}
                    onChange={(e) => handleEditData('date', e.target.value)}
                  />
                </div>
                
                {extractedData.vendor && (
                  <div className="field-group">
                    <label>Vendor</label>
                    <input
                      type="text"
                      value={extractedData.vendor}
                      onChange={(e) => handleEditData('vendor', e.target.value)}
                    />
                  </div>
                )}
              </div>
              
              <div className="action-buttons">
                <button onClick={handleConfirmData} className="confirm-btn">
                  ✓ Add Expense
                </button>
                <button onClick={() => {
                  setPreviewImage(null);
                  setExtractedData(null);
                  setError(null);
                }} className="retake-btn">
                  📸 Retake Photo
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReceiptScanner;
