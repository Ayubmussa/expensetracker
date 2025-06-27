import { supabaseReceiptService } from './supabaseReceiptService';
import { localStorageUtils } from '../utils/localStorage';
import { v4 as uuidv4 } from 'uuid';
import type { ReceiptData, Category } from '../types';
import type { OfflineReceipt } from '../utils/localStorage';
import { createWorker } from 'tesseract.js';

interface ReceiptScanResult {
  success: boolean;
  data?: {
    amount: number;
    description: string;
    category: string;
    date: string;
    vendor?: string;
    confidence: number;
    rawText?: string;
  };
  error?: string;
}

interface ReceiptUploadResult {
  success: boolean;
  receiptId?: string;
  url?: string;
  error?: string;
}

class ReceiptService {
  /**
   * Convert File to base64 string for offline storage
   */
  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  }

  /**
   * Extract text from image using client-side OCR
   */
  private async extractTextFromImage(imageFile: File): Promise<string> {
    console.log('Creating Tesseract worker...');
    let worker;
    
    try {
      // Create worker with better error handling
      worker = await createWorker('eng', 1, {
        logger: m => console.log('Tesseract:', m)
      });
      
      console.log('Recognizing text from image...');
      const { data: { text, confidence } } = await worker.recognize(imageFile);
      console.log('OCR completed with confidence:', confidence);
      console.log('Extracted text length:', text.length);
      
      return text || '';
    } catch (error) {
      console.error('Tesseract OCR failed:', error);
      throw new Error(`OCR processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      if (worker) {
        try {
          await worker.terminate();
          console.log('Tesseract worker terminated');
        } catch (error) {
          console.warn('Error terminating worker:', error);
        }
      }
    }
  }

  /**
   * Extract expense data from OCR text
   */
  private extractExpenseData(text: string, categories: Category[] = []): ReceiptData {
    console.log('Processing OCR text for expense data extraction...');
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    console.log('Text lines found:', lines.length);
    
    // Extract amount (look for currency symbols and numbers)
    const amountRegex = /(?:total|amount|sum)[:\s]*[$£€¥₹]?\s*(\d+(?:[.,]\d{2})?)|[$£€¥₹]\s*(\d+(?:[.,]\d{2})?)|(\d+(?:[.,]\d{2})?)\s*[$£€¥₹]/i;
    let amount = 0;
    let confidence = 0;

    for (const line of lines) {
      const amountMatch = line.match(amountRegex);
      if (amountMatch) {
        // Parse amount, handle both comma and dot as decimal separator
        const amountStr = (amountMatch[1] || amountMatch[2] || amountMatch[3] || '0').replace(',', '.');
        amount = parseFloat(amountStr);
        console.log('Found amount:', amount);
        if (amount > 0) {
          confidence += 0.4;
          break;
        }
      }
    }

    // If no amount found, try a simpler pattern
    if (amount === 0) {
      const simpleAmountRegex = /(\d+[.,]\d{2})/g;
      const allAmounts = text.match(simpleAmountRegex) || [];
      if (allAmounts.length > 0) {
        // Take the largest amount found
        amount = Math.max(...allAmounts.map(a => parseFloat(a.replace(',', '.'))));
        console.log('Found amount using simple pattern:', amount);
        confidence += 0.2;
      }
    }

    // Extract vendor/merchant name (usually at the top, clean it better)
    let vendor = '';
    if (lines.length > 0) {
      // Try first few lines for vendor name
      for (let i = 0; i < Math.min(3, lines.length); i++) {
        const cleanLine = lines[i].replace(/[^a-zA-Z\s&']/g, '').trim();
        if (cleanLine.length > 3 && cleanLine.length < 50) {
          vendor = cleanLine;
          console.log('Found vendor:', vendor);
          confidence += 0.2;
          break;
        }
      }
    }

    // Extract date with improved patterns
    const dateRegex = /(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})|(\d{4}[/-]\d{1,2}[/-]\d{1,2})/;
    let date = new Date().toISOString().split('T')[0]; // Default to today
    
    for (const line of lines) {
      const dateMatch = line.match(dateRegex);
      if (dateMatch) {
        try {
          const dateStr = dateMatch[0];
          const parsedDate = new Date(dateStr);
          if (!isNaN(parsedDate.getTime()) && parsedDate.getFullYear() > 2000) {
            date = parsedDate.toISOString().split('T')[0];
            console.log('Found date:', date);
            confidence += 0.2;
          }
        } catch {
          // Ignore invalid dates
        }
        break;
      }
    }

    // Categorize based on vendor name, common terms, and database categories
    let category = 'Other';
    const fullText = text.toLowerCase();
    
    console.log('Attempting category matching...');
    
    // First, try to match against actual database categories
    if (categories && categories.length > 0) {
      console.log('Available categories:', categories.map(c => c.name));
      
      for (const dbCategory of categories) {
        const categoryName = dbCategory.name.toLowerCase();
        
        // Direct name match
        if (fullText.includes(categoryName)) {
          category = dbCategory.name;
          console.log('Direct category match:', category);
          confidence += 0.3;
          break;
        }
        
        // Check if category has common keywords
        const categoryKeywords = this.getCategoryKeywords(categoryName);
        if (categoryKeywords.some(keyword => fullText.includes(keyword))) {
          category = dbCategory.name;
          console.log('Keyword category match:', category, 'via keywords:', categoryKeywords);
          confidence += 0.25;
          break;
        }
      }
    }
    
    // Fallback to hardcoded keywords if no database category matched
    if (category === 'Other') {
      console.log('Using fallback category matching...');
      const fallbackCategories = {
        'Food': ['restaurant', 'cafe', 'pizza', 'burger', 'coffee', 'food', 'kitchen', 'diner', 'bistro', 'mcdonalds', 'subway', 'starbucks', 'dining'],
        'Transportation': ['gas', 'fuel', 'uber', 'taxi', 'parking', 'metro', 'bus', 'shell', 'exxon', 'chevron', 'lyft'],
        'Shopping': ['store', 'mall', 'shop', 'market', 'walmart', 'target', 'amazon', 'costco', 'retail'],
        'Entertainment': ['cinema', 'movie', 'theater', 'game', 'entertainment', 'netflix', 'spotify', 'concert'],
        'Health': ['pharmacy', 'hospital', 'clinic', 'medical', 'doctor', 'cvs', 'walgreens', 'health'],
        'Bills': ['electric', 'water', 'internet', 'phone', 'utility', 'verizon', 'at&t', 'bill'],
        'Groceries': ['grocery', 'supermarket', 'market', 'food store', 'kroger', 'safeway'],
        'Other': []
      };

      for (const [cat, keywords] of Object.entries(fallbackCategories)) {
        if (keywords.some(keyword => fullText.includes(keyword))) {
          category = cat;
          console.log('Fallback category match:', category);
          confidence += 0.15;
          break;
        }
      }
    }

    // Generate description
    let description = vendor || 'Receipt purchase';
    if (vendor && category !== 'Other') {
      description = `${vendor}`;
    }

    const result = {
      amount,
      description,
      category,
      date,
      vendor,
      confidence: Math.min(confidence, 1.0)
    };

    console.log('Final extracted data:', result);
    return result;
  }

  /**
   * Helper function to generate keywords for database categories
   */
  private getCategoryKeywords(categoryName: string): string[] {
    const keywords = [categoryName];
    
    switch (categoryName.toLowerCase()) {
      case 'food':
      case 'food & dining':
      case 'dining':
      case 'restaurants':
        keywords.push('restaurant', 'cafe', 'coffee', 'pizza', 'burger', 'food', 'kitchen', 'diner', 'bistro');
        break;
      case 'transportation':
      case 'transport':
      case 'travel':
        keywords.push('gas', 'fuel', 'uber', 'taxi', 'parking', 'metro', 'bus', 'train');
        break;
      case 'shopping':
      case 'retail':
        keywords.push('store', 'mall', 'shop', 'market', 'retail');
        break;
      case 'entertainment':
        keywords.push('movie', 'cinema', 'theater', 'game', 'entertainment');
        break;
      case 'healthcare':
      case 'medical':
        keywords.push('pharmacy', 'hospital', 'clinic', 'medical', 'doctor');
        break;
      case 'utilities':
        keywords.push('electric', 'water', 'internet', 'phone', 'utility');
        break;
      case 'groceries':
        keywords.push('grocery', 'supermarket', 'market', 'food');
        break;
      case 'housing':
      case 'rent':
        keywords.push('rent', 'mortgage', 'housing', 'apartment');
        break;
    }
    
    return keywords;
  }

  async scanReceipt(imageFile: File, categories?: Category[]): Promise<ReceiptScanResult> {
    try {
      console.log('Starting client-side receipt scanning for:', imageFile.name);
      console.log('File size:', (imageFile.size / 1024 / 1024).toFixed(2), 'MB');
      console.log('File type:', imageFile.type);
      
      // Validate file
      if (!imageFile.type.startsWith('image/')) {
        throw new Error('Invalid file type. Please upload an image file.');
      }
      
      // Extract text from image using client-side OCR
      const extractedText = await this.extractTextFromImage(imageFile);
      console.log('OCR completed. Text length:', extractedText.length);
      
      if (!extractedText || extractedText.trim().length === 0) {
        console.warn('No text extracted from image');
        return this.fallbackExtraction(imageFile);
      }

      // Parse expense data from text with categories
      const expenseData = this.extractExpenseData(extractedText, categories || []);
      console.log('Extracted expense data:', expenseData);

      return {
        success: true,
        data: {
          ...expenseData,
          rawText: extractedText
        }
      };
    } catch (error) {
      console.error('Receipt scanning failed:', error);
      
      // Provide more specific error messages
      let errorMessage = 'Failed to process receipt';
      if (error instanceof Error) {
        if (error.message.includes('OCR processing failed')) {
          errorMessage = 'Could not read text from image. Please try a clearer photo or enter details manually.';
        } else if (error.message.includes('Invalid file type')) {
          errorMessage = error.message;
        } else {
          errorMessage = `Processing error: ${error.message}`;
        }
      }
      
      // Always return fallback data even if there's an error
      const fallbackResult = await this.fallbackExtraction(imageFile);
      return {
        ...fallbackResult,
        error: errorMessage
      };
    }
  }

  async uploadReceiptImage(imageFile: File, userId?: string): Promise<ReceiptUploadResult> {
    try {
      // Since we're doing everything client-side now, just return success
      // The actual saving will be handled by scanAndSaveReceipt method
      const receiptId = userId ? `${userId}-${uuidv4()}` : uuidv4();
      return {
        success: true,
        receiptId,
        url: URL.createObjectURL(imageFile)
      };
    } catch (error) {
      console.error('Receipt upload failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed'
      };
    }
  }

  private async fallbackExtraction(imageFile: File): Promise<ReceiptScanResult> {
    try {
      console.log('Using fallback extraction for:', imageFile.name);
      const today = new Date().toISOString().split('T')[0];
      
      return {
        success: true,
        data: {
          amount: 0,
          description: `Receipt from ${imageFile.name.split('.')[0]}`,
          category: 'Other',
          date: today,
          vendor: '',
          confidence: 0.1,
          rawText: 'Manual entry required - OCR processing failed'
        }
      };
    } catch (error) {
      console.error('Fallback extraction failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process receipt'
      };
    }
  }

  // Helper method to validate and categorize expenses based on common patterns
  categorizeExpense(description: string, vendor?: string): string {
    const text = `${description} ${vendor || ''}`.toLowerCase();
    
    // Food & Dining
    if (text.match(/restaurant|cafe|coffee|pizza|burger|food|dining|kitchen|bistro|grill|bar|pub/)) {
      return 'Food';
    }
    
    // Transportation
    if (text.match(/gas|fuel|uber|lyft|taxi|parking|metro|bus|train|airline|flight/)) {
      return 'Transportation';
    }
    
    // Shopping
    if (text.match(/store|shop|market|mall|amazon|target|walmart|costco|retail/)) {
      return 'Shopping';
    }
    
    // Health & Medical
    if (text.match(/pharmacy|doctor|medical|health|hospital|clinic|dentist|medicine/)) {
      return 'Health';
    }
    
    // Entertainment
    if (text.match(/movie|cinema|theater|game|entertainment|music|concert|sports|gym/)) {
      return 'Entertainment';
    }
    
    // Bills & Utilities
    if (text.match(/electric|water|gas|internet|phone|cable|insurance|rent|mortgage|utility/)) {
      return 'Bills';
    }
    
    return 'Other';
  }

  // Method to extract amount from text using regex
  extractAmount(text: string): number {
    // Look for currency patterns like $12.34, 12.34, $12, etc.
    const patterns = [
      /\$\s*(\d+(?:\.\d{2})?)/g,
      /(\d+\.\d{2})\s*(?:USD|$)/g,
      /total[:\s]*\$?(\d+(?:\.\d{2})?)/gi,
      /amount[:\s]*\$?(\d+(?:\.\d{2})?)/gi,
    ];
    
    for (const pattern of patterns) {
      const matches = text.match(pattern);
      if (matches && matches.length > 0) {
        const amountStr = matches[matches.length - 1].replace(/[^0-9.]/g, '');
        const amount = parseFloat(amountStr);
        if (!isNaN(amount) && amount > 0) {
          return amount;
        }
      }
    }
    
    return 0;
  }

  // Method to extract date from text
  extractDate(text: string): string {
    const datePatterns = [
      /(\d{1,2}\/\d{1,2}\/\d{4})/g,
      /(\d{4}-\d{2}-\d{2})/g,
      /(\d{1,2}-\d{1,2}-\d{4})/g,
    ];
    
    for (const pattern of datePatterns) {
      const match = text.match(pattern);
      if (match) {
        const dateStr = match[0];
        const date = new Date(dateStr);
        if (!isNaN(date.getTime())) {
          return date.toISOString().split('T')[0];
        }
      }
    }
    
    // Return today's date as fallback
    return new Date().toISOString().split('T')[0];
  }

  /**
   * Scan receipt and save to Supabase (online) or localStorage (offline)
   */
  async scanAndSaveReceipt(imageFile: File, userId?: string, providedCategories?: Category[]): Promise<ReceiptScanResult & { receiptId?: string }> {
    try {
      // Use provided categories or fetch them if not provided
      let categories: Category[] = providedCategories || [];
      
      if (!providedCategories || providedCategories.length === 0) {
        try {
          const { expenseService } = await import('./expenseService');
          categories = await expenseService.getCategories();
        } catch (error) {
          console.warn('Failed to fetch categories for receipt scanning:', error);
        }
      }

      // First, scan the receipt using the backend OCR service with categories
      const scanResult = await this.scanReceipt(imageFile, categories);
      
      if (scanResult.success && scanResult.data) {
        // OCR was successful
        if (userId) {
          // User is logged in - save to Supabase
          const saveResult = await supabaseReceiptService.processAndSaveReceipt(
            imageFile,
            userId,
            scanResult.data as ReceiptData,
            scanResult.data.rawText
          );

          if (saveResult.success && saveResult.receipt) {
            return {
              ...scanResult,
              receiptId: saveResult.receipt.id
            };
          } else {
            // OCR worked but Supabase save failed - save offline instead
            console.warn('Failed to save receipt to Supabase, saving offline:', saveResult.error);
            const offlineReceiptId = await this.saveReceiptOffline(imageFile, scanResult.data as ReceiptData, scanResult.data.rawText);
            return {
              ...scanResult,
              receiptId: offlineReceiptId
            };
          }
        } else {
          // User not logged in - save offline
          const offlineReceiptId = await this.saveReceiptOffline(imageFile, scanResult.data as ReceiptData, scanResult.data.rawText);
          return {
            ...scanResult,
            receiptId: offlineReceiptId
          };
        }
      } else {
        // OCR failed - create fallback data
        const fallbackData: ReceiptData = {
          amount: 0,
          description: `Receipt ${imageFile.name}`,
          category: 'Other',
          date: new Date().toISOString().split('T')[0],
          vendor: '',
          confidence: 0.1
        };

        if (userId) {
          // Try to save to Supabase
          const saveResult = await supabaseReceiptService.processAndSaveReceipt(
            imageFile,
            userId,
            fallbackData,
            'OCR processing failed - manual entry required'
          );

          return {
            success: true,
            data: fallbackData,
            receiptId: saveResult.receipt?.id,
            error: scanResult.error
          };
        } else {
          // Save offline
          const offlineReceiptId = await this.saveReceiptOffline(imageFile, fallbackData, 'OCR processing failed - manual entry required');
          return {
            success: true,
            data: fallbackData,
            receiptId: offlineReceiptId,
            error: scanResult.error
          };
        }
      }
    } catch (error) {
      console.error('Error in scanAndSaveReceipt:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process receipt'
      };
    }
  }

  /**
   * Save receipt to localStorage for offline use
   */
  private async saveReceiptOffline(imageFile: File, extractedData: ReceiptData, rawText?: string): Promise<string> {
    try {
      const receiptId = uuidv4();
      const imageData = await this.fileToBase64(imageFile);
      
      const offlineReceipt: OfflineReceipt = {
        id: receiptId,
        image_data: imageData,
        original_filename: imageFile.name,
        extracted_data: extractedData,
        raw_text: rawText,
        created_at: new Date().toISOString(),
        synced: false
      };

      localStorageUtils.addReceipt(offlineReceipt);
      return receiptId;
    } catch (error) {
      console.error('Error saving receipt offline:', error);
      throw error;
    }
  }

  /**
   * Link a saved receipt to an expense after the expense is created
   */
  async linkReceiptToExpense(receiptId: string, expenseId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // First try Supabase (for online receipts)
      const supabaseResult = await supabaseReceiptService.linkReceiptToExpense(receiptId, expenseId);
      
      if (supabaseResult.success) {
        return supabaseResult;
      }

      // If Supabase failed, try linking offline receipt
      try {
        localStorageUtils.linkReceiptToExpense(receiptId, expenseId);
        return { success: true };
      } catch {
        console.warn('Failed to link receipt in both online and offline storage');
        return {
          success: false,
          error: 'Failed to link receipt to expense'
        };
      }
    } catch (error) {
      console.error('Error linking receipt to expense:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to link receipt to expense'
      };
    }
  }
}

export const receiptService = new ReceiptService();
export type { ReceiptScanResult, ReceiptUploadResult };
