import { supabase, TABLES, STORAGE_BUCKETS } from '../config/supabase';
import type { Receipt, ReceiptData } from '../types';

class SupabaseReceiptService {
  
  /**
   * Upload receipt image to Supabase Storage
   */
  async uploadReceiptImage(file: File, userId: string): Promise<{ success: boolean; imageUrl?: string; error?: string }> {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

      const { error } = await supabase.storage
        .from(STORAGE_BUCKETS.RECEIPTS)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        throw error;
      }

      // Get public URL for the uploaded image
      const { data: { publicUrl } } = supabase.storage
        .from(STORAGE_BUCKETS.RECEIPTS)
        .getPublicUrl(fileName);

      return {
        success: true,
        imageUrl: publicUrl
      };

    } catch (error) {
      console.error('Error uploading receipt image:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to upload image'
      };
    }
  }

  /**
   * Save receipt metadata and extracted data to database
   */
  async saveReceipt(
    userId: string,
    imageUrl: string,
    originalFilename: string,
    extractedData: ReceiptData,
    rawText?: string,
    expenseId?: string
  ): Promise<{ success: boolean; receipt?: Receipt; error?: string }> {
    try {
      const { data, error } = await supabase
        .from(TABLES.RECEIPTS)
        .insert({
          user_id: userId,
          expense_id: expenseId,
          image_url: imageUrl,
          original_filename: originalFilename,
          extracted_data: extractedData,
          raw_text: rawText,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      return {
        success: true,
        receipt: data as Receipt
      };

    } catch (error) {
      console.error('Error saving receipt:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save receipt'
      };
    }
  }

  /**
   * Get all receipts for a user
   */
  async getUserReceipts(userId: string): Promise<{ success: boolean; receipts?: Receipt[]; error?: string }> {
    try {
      const { data, error } = await supabase
        .from(TABLES.RECEIPTS)
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return {
        success: true,
        receipts: data as Receipt[]
      };

    } catch (error) {
      console.error('Error fetching receipts:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch receipts'
      };
    }
  }

  /**
   * Get receipts for a specific expense
   */
  async getReceiptsForExpense(expenseId: string): Promise<{ success: boolean; receipts?: Receipt[]; error?: string }> {
    try {
      const { data, error } = await supabase
        .from(TABLES.RECEIPTS)
        .select('*')
        .eq('expense_id', expenseId)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return {
        success: true,
        receipts: data as Receipt[]
      };

    } catch (error) {
      console.error('Error fetching expense receipts:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch expense receipts'
      };
    }
  }

  /**
   * Update receipt with expense ID after expense is created
   */
  async linkReceiptToExpense(receiptId: string, expenseId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from(TABLES.RECEIPTS)
        .update({ 
          expense_id: expenseId,
          updated_at: new Date().toISOString()
        })
        .eq('id', receiptId);

      if (error) {
        throw error;
      }

      return { success: true };

    } catch (error) {
      console.error('Error linking receipt to expense:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to link receipt to expense'
      };
    }
  }

  /**
   * Delete receipt and its image
   */
  async deleteReceipt(receiptId: string, userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // First get the receipt to get the image URL
      const { data: receipt, error: fetchError } = await supabase
        .from(TABLES.RECEIPTS)
        .select('image_url')
        .eq('id', receiptId)
        .eq('user_id', userId)
        .single();

      if (fetchError) {
        throw fetchError;
      }

      // Extract file path from URL for storage deletion
      const urlParts = receipt.image_url.split('/');
      const filePath = urlParts.slice(-2).join('/'); // Get "userId/filename.ext"

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from(STORAGE_BUCKETS.RECEIPTS)
        .remove([filePath]);

      if (storageError) {
        console.warn('Error deleting image from storage:', storageError);
        // Continue with database deletion even if storage deletion fails
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from(TABLES.RECEIPTS)
        .delete()
        .eq('id', receiptId)
        .eq('user_id', userId);

      if (dbError) {
        throw dbError;
      }

      return { success: true };

    } catch (error) {
      console.error('Error deleting receipt:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete receipt'
      };
    }
  }

  /**
   * Complete receipt processing: upload image, process with OCR, save to database
   */
  async processAndSaveReceipt(
    file: File,
    userId: string,
    extractedData: ReceiptData,
    rawText?: string
  ): Promise<{ success: boolean; receipt?: Receipt; error?: string }> {
    try {
      // Upload image to storage
      const uploadResult = await this.uploadReceiptImage(file, userId);
      if (!uploadResult.success || !uploadResult.imageUrl) {
        throw new Error(uploadResult.error || 'Failed to upload image');
      }

      // Save receipt metadata to database
      const saveResult = await this.saveReceipt(
        userId,
        uploadResult.imageUrl,
        file.name,
        extractedData,
        rawText
      );

      if (!saveResult.success) {
        // If database save fails, try to clean up the uploaded image
        const urlParts = uploadResult.imageUrl.split('/');
        const filePath = urlParts.slice(-2).join('/');
        await supabase.storage
          .from(STORAGE_BUCKETS.RECEIPTS)
          .remove([filePath]);

        throw new Error(saveResult.error || 'Failed to save receipt');
      }

      return saveResult;

    } catch (error) {
      console.error('Error processing and saving receipt:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process receipt'
      };
    }
  }
}

export const supabaseReceiptService = new SupabaseReceiptService();
