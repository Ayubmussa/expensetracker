import { supabase, TABLES } from '../config/supabase';
import { localStorageUtils } from '../utils/localStorage';
import { supabaseReceiptService } from './supabaseReceiptService';
import type { Category } from '../types';

export interface SyncResult {
  success: boolean;
  syncedExpenses: number;
  syncedCategories: number;
  syncedReceipts: number;
  errors: string[];
}

class SyncService {
  private isSyncing = false;

  async syncOfflineDataToOnline(): Promise<SyncResult> {
    if (this.isSyncing) {
      console.log('Sync already in progress, skipping...');
      return {
        success: false,
        syncedExpenses: 0,
        syncedCategories: 0,
        syncedReceipts: 0,
        errors: ['Sync already in progress']
      };
    }

    this.isSyncing = true;
    const result: SyncResult = {
      success: true,
      syncedExpenses: 0,
      syncedCategories: 0,
      syncedReceipts: 0,
      errors: []
    };

    try {
      // Check if user is authenticated
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        result.success = false;
        result.errors.push('User not authenticated');
        return result;
      }

      console.log('Starting offline data sync for user:', user.id);

      // Sync expenses
      await this.syncExpenses(result);

      // Sync categories
      await this.syncCategories(result);

      // Sync receipts
      await this.syncReceipts(result);      // If sync was successful, optionally clear local data or mark as synced
      if (result.success && result.errors.length === 0) {
        console.log('Sync completed successfully:', result);
        // Clean up synced data from localStorage to avoid duplicates
        await this.cleanupSyncedData(result);
        // Mark as synced
        this.markDataAsSynced();
        console.log('Post-sync cleanup completed');
      } else {
        console.log('Sync completed with some errors:', result);
      }

    } catch (error) {
      console.error('Sync error:', error);
      result.success = false;
      result.errors.push(`Sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      this.isSyncing = false;
    }

    return result;
  }
  private async syncExpenses(result: SyncResult): Promise<void> {
    try {
      const localExpenses = localStorageUtils.getExpenses();
      if (localExpenses.length === 0) {
        console.log('No offline expenses to sync');
        return;
      }

      console.log(`Syncing ${localExpenses.length} offline expenses...`);

      // Get current user ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Get existing online expenses to avoid duplicates
      const { data: existingExpenses, error: fetchError } = await supabase
        .from(TABLES.EXPENSES)
        .select('id');

      if (fetchError) {
        throw fetchError;
      }

      const existingIds = new Set(existingExpenses?.map(e => e.id) || []);
        // Filter out expenses that already exist online and add proper user_id
      const expensesToSync = localExpenses
        .filter(expense => !existingIds.has(expense.id))
        .map(expense => ({
          ...expense,
          user_id: user.id // Replace any placeholder user_id with actual user ID
        }));

      if (expensesToSync.length === 0) {
        console.log('All offline expenses already exist online');
        return;
      }

      console.log(`Syncing ${expensesToSync.length} new expenses to database...`);

      // Batch insert expenses
      const { error: insertError } = await supabase
        .from(TABLES.EXPENSES)
        .insert(expensesToSync);

      if (insertError) {
        throw insertError;
      }

      result.syncedExpenses = expensesToSync.length;
      console.log(`Successfully synced ${expensesToSync.length} expenses`);

    } catch (error) {
      console.error('Error syncing expenses:', error);
      result.success = false;
      result.errors.push(`Expense sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async syncCategories(result: SyncResult): Promise<void> {
    try {
      const localCategories = localStorageUtils.getCategories();
      
      // Filter out default categories (they should already exist or be handled separately)
      const customCategories = localCategories.filter(cat => 
        !this.isDefaultCategory(cat)
      );

      if (customCategories.length === 0) {
        console.log('No custom categories to sync');
        return;
      }

      console.log(`Syncing ${customCategories.length} custom categories...`);

      // Get existing online categories to avoid duplicates
      const { data: existingCategories, error: fetchError } = await supabase
        .from(TABLES.CATEGORIES)
        .select('id, name');

      if (fetchError) {
        throw fetchError;
      }

      const existingIds = new Set(existingCategories?.map(c => c.id) || []);
      const existingNames = new Set(existingCategories?.map(c => c.name) || []);
      
      // Filter out categories that already exist online (by ID or name)
      const categoriesToSync = customCategories.filter(category => 
        !existingIds.has(category.id) && !existingNames.has(category.name)
      );

      if (categoriesToSync.length === 0) {
        console.log('All custom categories already exist online');
        return;
      }

      console.log(`Syncing ${categoriesToSync.length} new categories to database...`);

      // Batch insert categories
      const { error: insertError } = await supabase
        .from(TABLES.CATEGORIES)
        .insert(categoriesToSync);

      if (insertError) {
        throw insertError;
      }

      result.syncedCategories = categoriesToSync.length;
      console.log(`Successfully synced ${categoriesToSync.length} categories`);

    } catch (error) {
      console.error('Error syncing categories:', error);
      result.success = false;
      result.errors.push(`Category sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async syncReceipts(result: SyncResult): Promise<void> {
    try {
      const unsyncedReceipts = localStorageUtils.getUnsyncedReceipts();
      if (unsyncedReceipts.length === 0) {
        console.log('No offline receipts to sync');
        return;
      }

      console.log(`Syncing ${unsyncedReceipts.length} offline receipts...`);

      // Get current user ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const syncedReceiptIds: string[] = [];

      for (const offlineReceipt of unsyncedReceipts) {
        try {
          // Convert base64 back to File for upload
          const imageBlob = await this.base64ToBlob(offlineReceipt.image_data);
          const imageFile = new File([imageBlob], offlineReceipt.original_filename, {
            type: imageBlob.type || 'image/jpeg'
          });

          // Upload to Supabase
          const saveResult = await supabaseReceiptService.processAndSaveReceipt(
            imageFile,
            user.id,
            offlineReceipt.extracted_data,
            offlineReceipt.raw_text
          );

          if (saveResult.success && saveResult.receipt) {
            // If this receipt was linked to an offline expense, we need to link it to the online expense
            if (offlineReceipt.expense_id) {
              // Try to find the corresponding online expense by matching data
              const { data: onlineExpenses } = await supabase
                .from(TABLES.EXPENSES)
                .select('id, amount, description, date')
                .eq('user_id', user.id)
                .eq('amount', offlineReceipt.extracted_data.amount)
                .eq('description', offlineReceipt.extracted_data.description)
                .eq('date', offlineReceipt.extracted_data.date);

              if (onlineExpenses && onlineExpenses.length > 0) {
                // Link to the first matching expense
                await supabaseReceiptService.linkReceiptToExpense(
                  saveResult.receipt.id,
                  onlineExpenses[0].id
                );
              }
            }

            syncedReceiptIds.push(offlineReceipt.id);
            result.syncedReceipts++;
            console.log(`Successfully synced receipt: ${offlineReceipt.id}`);
          } else {
            console.error(`Failed to sync receipt ${offlineReceipt.id}:`, saveResult.error);
            result.errors.push(`Failed to sync receipt ${offlineReceipt.original_filename}: ${saveResult.error}`);
          }
        } catch (receiptError) {
          console.error(`Error syncing receipt ${offlineReceipt.id}:`, receiptError);
          result.errors.push(`Failed to sync receipt ${offlineReceipt.original_filename}: ${receiptError instanceof Error ? receiptError.message : 'Unknown error'}`);
        }
      }

      // Mark successfully synced receipts as synced in localStorage
      if (syncedReceiptIds.length > 0) {
        localStorageUtils.markReceiptsAsSynced(syncedReceiptIds);
        console.log(`Marked ${syncedReceiptIds.length} receipts as synced`);
      }

    } catch (error) {
      console.error('Error syncing receipts:', error);
      result.success = false;
      result.errors.push(`Receipt sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Convert base64 data URL to Blob
   */
  private async base64ToBlob(base64Data: string): Promise<Blob> {
    const response = await fetch(base64Data);
    return await response.blob();
  }

  private isDefaultCategory(category: Category): boolean {
    // Check if this is one of the default categories
    const defaultCategoryNames = [
      'Food & Dining',
      'Transportation', 
      'Shopping',
      'Entertainment',
      'Bills & Utilities',
      'Healthcare',
      'Education',
      'Other'
    ];
    return defaultCategoryNames.includes(category.name);
  }

  private markDataAsSynced(): void {
    try {
      const timestamp = new Date().toISOString();
      localStorage.setItem('last_sync_timestamp', timestamp);
      console.log('Data marked as synced at:', timestamp);
    } catch (error) {
      console.error('Error marking data as synced:', error);
    }
  }

  getLastSyncTimestamp(): string | null {
    try {
      return localStorage.getItem('last_sync_timestamp');
    } catch (error) {
      console.error('Error getting last sync timestamp:', error);
      return null;
    }
  }
  async hasUnsyncedData(): Promise<boolean> {
    try {
      const localExpenses = localStorageUtils.getExpenses();
      const localCategories = localStorageUtils.getCategories();
      
      // Check if we have local data and user is authenticated
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      // If we have no local data, no unsynced data
      if (localExpenses.length === 0 && localCategories.length === 0) {
        return false;
      }

      // Check if local expenses exist online
      let hasUnsyncedExpenses = false;
      if (localExpenses.length > 0) {
        const { data: onlineExpenses } = await supabase
          .from(TABLES.EXPENSES)
          .select('id');
        
        if (onlineExpenses) {
          const onlineExpenseIds = new Set(onlineExpenses.map(e => e.id));
          hasUnsyncedExpenses = localExpenses.some(expense => !onlineExpenseIds.has(expense.id));
        } else {
          hasUnsyncedExpenses = true; // If we can't check online, assume we have unsynced data
        }
      }

      // Check if local custom categories exist online
      let hasUnsyncedCategories = false;
      const customCategories = localCategories.filter(cat => !this.isDefaultCategory(cat));
      if (customCategories.length > 0) {
        const { data: onlineCategories } = await supabase
          .from(TABLES.CATEGORIES)
          .select('id, name');
        
        if (onlineCategories) {
          const onlineCategoryIds = new Set(onlineCategories.map(c => c.id));
          const onlineCategoryNames = new Set(onlineCategories.map(c => c.name.toLowerCase()));
          hasUnsyncedCategories = customCategories.some(category => 
            !onlineCategoryIds.has(category.id) && 
            !onlineCategoryNames.has(category.name.toLowerCase())
          );
        } else {
          hasUnsyncedCategories = true; // If we can't check online, assume we have unsynced data
        }
      }
      
      return hasUnsyncedExpenses || hasUnsyncedCategories;
    } catch (error) {
      console.error('Error checking for unsynced data:', error);
      // If we can't check, assume we might have unsynced data
      const localExpenses = localStorageUtils.getExpenses();
      const localCategories = localStorageUtils.getCategories();
      const customCategories = localCategories.filter(cat => !this.isDefaultCategory(cat));
      return localExpenses.length > 0 || customCategories.length > 0;
    }
  }

  private async cleanupSyncedData(syncResult: SyncResult): Promise<void> {
    try {
      // Only cleanup if we actually synced some data
      if (syncResult.syncedExpenses === 0 && syncResult.syncedCategories === 0 && syncResult.syncedReceipts === 0) {
        return;
      }

      console.log('Cleaning up synced data from localStorage...');

      // Get current data
      const localExpenses = localStorageUtils.getExpenses();
      const localCategories = localStorageUtils.getCategories();

      // Get current user ID for filtering
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // If we synced expenses, get the current online expenses to know which ones to remove
      if (syncResult.syncedExpenses > 0) {
        const { data: onlineExpenses } = await supabase
          .from(TABLES.EXPENSES)
          .select('id');

        if (onlineExpenses) {
          const onlineExpenseIds = new Set(onlineExpenses.map(e => e.id));
          // Keep only expenses that are not synced
          const remainingExpenses = localExpenses.filter(expense => 
            !onlineExpenseIds.has(expense.id)
          );
          localStorageUtils.saveExpenses(remainingExpenses);
          console.log(`Cleaned up ${localExpenses.length - remainingExpenses.length} synced expenses from localStorage`);
        }
      }

      // If we synced categories, get the current online categories to know which ones to remove
      if (syncResult.syncedCategories > 0) {
        const { data: onlineCategories } = await supabase
          .from(TABLES.CATEGORIES)
          .select('id, name');

        if (onlineCategories) {
          const onlineCategoryIds = new Set(onlineCategories.map(c => c.id));
          const onlineCategoryNames = new Set(onlineCategories.map(c => c.name.toLowerCase()));
          
          // Keep only categories that are not synced (not in online by ID or name)
          const remainingCategories = localCategories.filter(category => 
            !onlineCategoryIds.has(category.id) && 
            !onlineCategoryNames.has(category.name.toLowerCase())
          );
          localStorageUtils.saveCategories(remainingCategories);
          console.log(`Cleaned up ${localCategories.length - remainingCategories.length} synced categories from localStorage`);
        }
      }

      // Clean up synced receipts
      if (syncResult.syncedReceipts > 0) {
        const localReceipts = localStorageUtils.getReceipts();
        const remainingReceipts = localReceipts.filter(receipt => !receipt.synced);
        localStorageUtils.saveReceipts(remainingReceipts);
        console.log(`Cleaned up ${localReceipts.length - remainingReceipts.length} synced receipts from localStorage`);
      }

    } catch (error) {
      console.error('Error cleaning up synced data:', error);
      // Don't fail the sync process if cleanup fails
    }
  }
}

export const syncService = new SyncService();
