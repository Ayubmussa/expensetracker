// Utility functions for testing receipt scanner functionality

import type { ReceiptData, Category } from '../types';

/**
 * Test the Tesseract.js installation and basic functionality
 */
export const testTesseractInstallation = async (): Promise<{ success: boolean; error?: string }> => {
  try {
    // Try to import tesseract
    const { createWorker } = await import('tesseract.js');
    
    // Create a simple test
    const worker = await createWorker('eng');
    
    // Test with a simple text canvas
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 50;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, 200, 50);
      ctx.fillStyle = 'black';
      ctx.font = '16px Arial';
      ctx.fillText('Test $12.34', 10, 30);
    }
    
    const { data: { text } } = await worker.recognize(canvas);
    await worker.terminate();
    
    console.log('Tesseract test result:', text);
    
    return {
      success: text.includes('12.34') || text.includes('Test'),
    };
  } catch (error) {
    console.error('Tesseract test failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

/**
 * Create a sample receipt image for testing
 */
export const createSampleReceiptBlob = (): Promise<Blob> => {
  const canvas = document.createElement('canvas');
  canvas.width = 400;
  canvas.height = 600;
  const ctx = canvas.getContext('2d');
  
  if (ctx) {
    // White background
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, 400, 600);
    
    // Black text
    ctx.fillStyle = 'black';
    ctx.font = 'bold 20px Arial';
    
    // Receipt content
    ctx.fillText('GROCERY STORE', 100, 50);
    ctx.font = '16px Arial';
    ctx.fillText('123 Main Street', 120, 80);
    ctx.fillText('Date: 12/27/2024', 120, 120);
    ctx.fillText('Time: 2:30 PM', 120, 150);
    
    ctx.fillText('Items:', 50, 200);
    ctx.fillText('Milk           $3.99', 50, 230);
    ctx.fillText('Bread          $2.50', 50, 260);
    ctx.fillText('Eggs           $4.25', 50, 290);
    
    ctx.font = 'bold 18px Arial';
    ctx.fillText('TOTAL:        $10.74', 50, 350);
    
    ctx.font = '14px Arial';
    ctx.fillText('Thank you for shopping!', 100, 400);
  }
  
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('Failed to create blob'));
      }
    }, 'image/png');
  });
};

/**
 * Log detailed information about the receipt scanning process
 */
export const debugReceiptScan = (
  extractedText: string,
  extractedData: ReceiptData,
  categories: Category[],
  confidence: number
) => {
  console.group('🔍 Receipt Scan Debug Info');
  console.log('📄 Extracted Text:');
  console.log(extractedText);
  console.log('📊 Extracted Data:');
  console.table(extractedData);
  console.log('🏷️ Available Categories:');
  console.table(categories);
  console.log('📈 Confidence Score:', `${Math.round(confidence * 100)}%`);
  console.groupEnd();
};
