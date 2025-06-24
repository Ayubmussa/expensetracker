import React, { useState, useEffect } from 'react';
import { expenseService } from '../services/expenseService';
import { useAuth } from '../hooks/useAuth';
import './SyncStatus.css';

interface SyncResult {
  success: boolean;
  syncedExpenses: number;
  syncedCategories: number;
  errors: string[];
}

const SyncStatus: React.FC = () => {
  const { user } = useAuth();
  const [hasUnsyncedData, setHasUnsyncedData] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [syncMessage, setSyncMessage] = useState<string>('');

  // Check for unsynced data periodically
  useEffect(() => {
    const checkUnsyncedData = async () => {
      if (!user) {
        setHasUnsyncedData(false);
        return;
      }

      setIsChecking(true);
      try {
        const hasUnsynced = await expenseService.hasUnsyncedData();
        setHasUnsyncedData(hasUnsynced);
        
        const lastSync = expenseService.getLastSyncTimestamp();
        setLastSyncTime(lastSync);
      } catch (error) {
        console.error('Error checking unsynced data:', error);
      } finally {
        setIsChecking(false);
      }
    };

    checkUnsyncedData();
    
    // Check every 30 seconds when user is authenticated
    const interval = user ? setInterval(checkUnsyncedData, 30000) : null;
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [user]);

  // Listen for sync events
  useEffect(() => {
    const handleDataSync = (event: CustomEvent) => {
      const result: SyncResult = event.detail;
      setSyncStatus('success');
      setSyncMessage(`Synced ${result.syncedExpenses} expenses and ${result.syncedCategories} categories`);
      setHasUnsyncedData(false);
      setLastSyncTime(new Date().toISOString());
      
      // Clear success message after 5 seconds
      setTimeout(() => {
        setSyncStatus('idle');
        setSyncMessage('');
      }, 5000);
    };

    const handleDataSyncError = (event: CustomEvent) => {
      const errors: string[] = event.detail;
      setSyncStatus('error');
      setSyncMessage(`Sync failed: ${errors.join(', ')}`);
      
      // Clear error message after 10 seconds
      setTimeout(() => {
        setSyncStatus('idle');
        setSyncMessage('');
      }, 10000);
    };

    window.addEventListener('dataSync', handleDataSync as EventListener);
    window.addEventListener('dataSyncError', handleDataSyncError as EventListener);

    return () => {
      window.removeEventListener('dataSync', handleDataSync as EventListener);
      window.removeEventListener('dataSyncError', handleDataSyncError as EventListener);
    };
  }, []);

  const handleManualSync = async () => {
    if (!user || isSyncing) return;

    setIsSyncing(true);
    setSyncStatus('idle');
    setSyncMessage('');

    try {
      const result = await expenseService.manualSync();
      
      if (result.success) {
        setSyncStatus('success');
        setSyncMessage(`Synced ${result.syncedExpenses} expenses and ${result.syncedCategories} categories`);
        setHasUnsyncedData(false);
        setLastSyncTime(new Date().toISOString());
      } else {
        setSyncStatus('error');
        setSyncMessage(`Sync failed: ${result.errors.join(', ')}`);
      }
    } catch (error) {
      setSyncStatus('error');
      setSyncMessage(`Sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSyncing(false);
      
      // Clear message after some time
      setTimeout(() => {
        setSyncStatus('idle');
        setSyncMessage('');
      }, syncStatus === 'error' ? 10000 : 5000);
    }
  };

  const formatSyncTime = (timestamp: string | null) => {
    if (!timestamp) return 'Never';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hours ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} days ago`;
  };

  // Don't show for offline users
  if (!user) return null;
  
  // Don't show if we're still checking initially
  if (isChecking && !hasUnsyncedData && !lastSyncTime) return null;

  return (
    <div className={`sync-status ${syncStatus}`}>
      <div className="sync-status-content">
        {hasUnsyncedData && (
          <div className="sync-indicator">
            <span className="sync-icon">⏳</span>
            <span className="sync-text">You have unsynced offline data</span>
            <button 
              className="sync-button"
              onClick={handleManualSync}
              disabled={isSyncing}
            >
              {isSyncing ? '🔄 Syncing...' : '🔄 Sync Now'}
            </button>
          </div>
        )}
        
        {syncMessage && (
          <div className={`sync-message ${syncStatus}`}>
            <span className="sync-message-icon">
              {syncStatus === 'success' ? '✅' : '❌'}
            </span>
            <span className="sync-message-text">{syncMessage}</span>
          </div>
        )}
        
        {!hasUnsyncedData && !syncMessage && lastSyncTime && (
          <div className="sync-info">
            <span className="sync-icon">✅</span>
            <span className="sync-text">Last sync: {formatSyncTime(lastSyncTime)}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default SyncStatus;
