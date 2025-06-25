import { useState, useEffect, useRef } from 'react';
import { useAuth } from './hooks/useAuth';
import { useRecoveryMode } from './hooks/useRecoveryMode';
import { useTheme } from './hooks/useTheme';
import { expenseService } from './services/expenseService';
import ExpenseForm from './components/ExpenseForm';
import BulkExpenseForm from './components/BulkExpenseForm';
import ExpenseList from './components/ExpenseList';
import ExpenseSummary from './components/ExpenseSummary';
import ExpenseChart from './components/ExpenseChart';
import UnifiedAuth from './components/UnifiedAuth';
import UpdatePassword from './components/UpdatePassword';
import Profile from './components/Profile';
import Budget from './components/Budget';
import BudgetPieChart from './components/BudgetPieChart';
import ModeStatus from './components/ModeStatus';
import SyncStatus from './components/SyncStatus';
import './App.css';

function App() {
  const { user, loading, logout } = useAuth();
  const { isRecoveryMode, clearRecoveryMode } = useRecoveryMode();
  const { theme, toggleTheme } = useTheme();
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showBulkExpenseForm, setShowBulkExpenseForm] = useState(false);
  const [useOfflineMode, setUseOfflineMode] = useState(false);
  const [showSettingsDropdown, setShowSettingsDropdown] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showUpdatePassword, setShowUpdatePassword] = useState(false);
  const [highlightCategory, setHighlightCategory] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<'analytics' | 'expenses' | 'budget'>('analytics');
  const settingsDropdownRef = useRef<HTMLDivElement>(null);

  // Update expense service when offline mode changes
  useEffect(() => {
    expenseService.setOfflineMode(useOfflineMode);
  }, [useOfflineMode]);

  // Listen for sync completion to refresh UI
  useEffect(() => {
    const handleDataSync = (event: CustomEvent) => {
      console.log('App: Received dataSync event, refreshing UI...', event.detail);
      setRefreshTrigger(prev => prev + 1);
    };

    const handleDataSyncError = (event: CustomEvent) => {
      console.log('App: Received dataSyncError event:', event.detail);
      // Optionally refresh UI even on error in case some data was synced
      setRefreshTrigger(prev => prev + 1);
    };

    window.addEventListener('dataSync', handleDataSync as EventListener);
    window.addEventListener('dataSyncError', handleDataSyncError as EventListener);

    return () => {
      window.removeEventListener('dataSync', handleDataSync as EventListener);
      window.removeEventListener('dataSyncError', handleDataSyncError as EventListener);
    };
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (settingsDropdownRef.current && !settingsDropdownRef.current.contains(event.target as Node)) {
        setShowSettingsDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // No need to override auth view for recovery mode anymore
  // Recovery mode will show as overlay on main app

  const handleExpenseAdded = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const handleBulkExpensesAdded = () => {
    setRefreshTrigger(prev => prev + 1);
    setShowBulkExpenseForm(false);
  };

  const handleLogout = async () => {
    await logout();
  };

  const handleCategoryClick = (category: string) => {
    setHighlightCategory(category);
    // Scroll to the expense list section
    const expenseListElement = document.querySelector('.expense-list-container');
    if (expenseListElement) {
      expenseListElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    // Clear highlight after a few seconds
    setTimeout(() => {
      setHighlightCategory(null);
    }, 3000);
  };

  // Show loading spinner while checking authentication
  if (loading) {
    console.log('App - showing loading state');
    return (
      <div className="app">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  console.log('App render - states:', { 
    user: !!user, 
    isRecoveryMode, 
    loading,
    useOfflineMode
  });

  // Show authentication forms if user is not logged in (but NOT for recovery mode)
  if (!user && !isRecoveryMode && !useOfflineMode) {
    console.log('App - showing auth forms', { userExists: !!user, isRecoveryMode, useOfflineMode });
    return (
      <div className="app">
        {/* Global Theme Toggle - Always visible */}
        <button 
          className="global-theme-toggle"
          onClick={toggleTheme}
          title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        >
          {theme === 'light' ? '🌙' : '☀️'}
        </button>

        <header className="app-header">
          <h1>💰 ExpenseTracker</h1>
          <p>Track your daily expenses with ease</p>
        </header>
        
        <main className="app-main">
          <div className="auth-container">
            <div className="auth-mode-selector">
              <h3>Track Your Expenses</h3>
              <div className="auth-layout">
                <UnifiedAuth onSuccess={() => setUseOfflineMode(false)} />
                
                <div className="offline-option">
                  <button 
                    className="offline-mode-btn"
                    onClick={() => setUseOfflineMode(true)}
                  >
                    <span>📱</span>
                    <div>
                      <h4>Use Offline</h4>
                      <p>Track expenses without an account</p>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </main>
        
        <footer className="app-footer">
          <p>React + TypeScript + Supabase</p>
        </footer>
      </div>
    );
  }

  // Show main expense tracker for authenticated users OR users in offline mode
  console.log('App - showing main expense tracker', { userExists: !!user, isRecoveryMode, useOfflineMode });
  return (
    <div className="app">
      {/* Global Theme Toggle - Always visible */}
      <button 
        className="global-theme-toggle"
        onClick={toggleTheme}
        title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
      >
        {theme === 'light' ? '🌙' : '☀️'}
      </button>

      {/* Password Update Modal/Overlay for recovery mode */}
      {isRecoveryMode && (
        <div className="modal-overlay">
          <div className="modal-content">
            <UpdatePassword
              onPasswordUpdated={() => {
                // Clear recovery mode and continue with the app
                clearRecoveryMode();
              }}
              onCancel={() => {
                // Clear recovery mode and continue with the app
                clearRecoveryMode();
              }}
            />
          </div>
        </div>
      )}

      {/* Profile Modal */}
      {showProfile && (
        <Profile onClose={() => setShowProfile(false)} />
      )}

      {/* Update Password Modal */}
      {showUpdatePassword && (
        <UpdatePassword 
          onPasswordUpdated={() => setShowUpdatePassword(false)} 
          onCancel={() => setShowUpdatePassword(false)} 
        />
      )}

      <header className="app-header">
        <div className="header-content">
          <div>
            <h1>💰 ExpenseTracker</h1>
            <p>
              Welcome{user?.full_name ? `, ${user.full_name}` : ''}! 
              <span className="mode-indicator">
                {user ? ' (🌐 Online)' : ' (📱 Offline)'}
              </span>
            </p>
          </div>
          <div className="header-actions">
            {user ? (
              <div className="settings-dropdown" ref={settingsDropdownRef}>
                <button 
                  className="settings-btn"
                  onClick={() => setShowSettingsDropdown(!showSettingsDropdown)}
                >
                  ⚙️ Settings
                </button>
                {showSettingsDropdown && (
                  <div className="dropdown-menu">
                    <button 
                      className="dropdown-item"
                      onClick={() => {
                        setShowSettingsDropdown(false);
                        setShowProfile(true);
                      }}
                    >
                      👤 Profile
                    </button>
                    <button 
                      className="dropdown-item"
                      onClick={() => {
                        setShowSettingsDropdown(false);
                        setShowUpdatePassword(true);
                      }}
                    >
                      🔒 Update Password
                    </button>
                    <button 
                      className="dropdown-item logout-item"
                      onClick={() => {
                        setShowSettingsDropdown(false);
                        handleLogout();
                      }}
                    >
                      🚪 Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button 
                className="switch-mode-btn"
                onClick={() => setUseOfflineMode(false)}
              >
                🌐 Go Online
              </button>
            )}
          </div>
        </div>
      </header>
      
      <main className="app-main">
        <div className="app-container">
          <ModeStatus 
            isOnline={navigator.onLine} 
            isAuthenticated={!!user} 
          />
          
          <SyncStatus />
          
          {/* Navigation Tabs */}
          <nav className="page-navigation">
            <button 
              className={`nav-tab ${currentPage === 'analytics' ? 'active' : ''}`}
              onClick={() => setCurrentPage('analytics')}
            >
              📊 Analytics
            </button>
            <button 
              className={`nav-tab ${currentPage === 'expenses' ? 'active' : ''}`}
              onClick={() => setCurrentPage('expenses')}
            >
              ➕ Add Expenses
            </button>
            <button 
              className={`nav-tab ${currentPage === 'budget' ? 'active' : ''}`}
              onClick={() => setCurrentPage('budget')}
            >
              💵 Budget Overview
            </button>
          </nav>

          {/* Page Content Based on Current Page */}
          {currentPage === 'analytics' && (
            <div className="page-content analytics-page">
              <ExpenseChart refreshTrigger={refreshTrigger} />
              
              <ExpenseSummary 
                refreshTrigger={refreshTrigger} 
                onCategoryClick={handleCategoryClick}
              />
              
              <ExpenseList 
                refreshTrigger={refreshTrigger} 
                highlightCategory={highlightCategory}
              />
            </div>
          )}

          {currentPage === 'expenses' && (
            <div className="page-content expenses-page">
              {/* Expense Entry Section */}
              <div className="expense-entry-section">
                <div className="expense-form-header">
                  <h2>Add Expenses</h2>
                  <button 
                    className="bulk-expense-btn"
                    onClick={() => setShowBulkExpenseForm(true)}
                  >
                    📝 Add Multiple
                  </button>
                </div>
                <ExpenseForm onExpenseAdded={handleExpenseAdded} />
              </div>
              
              <ExpenseList 
                refreshTrigger={refreshTrigger} 
                highlightCategory={highlightCategory}
              />
            </div>
          )}

          {currentPage === 'budget' && (
            <div className="page-content budget-page">
              <BudgetPieChart refreshTrigger={refreshTrigger} />
              <Budget refreshTrigger={refreshTrigger} />
            </div>
          )}
        </div>
      </main>
      
      {/* Bulk Expense Form Modal */}
      {showBulkExpenseForm && (
        <BulkExpenseForm
          onExpensesAdded={handleBulkExpensesAdded}
          onClose={() => setShowBulkExpenseForm(false)}
        />
      )}
      
      <footer className="app-footer">
        <p>React + TypeScript + Supabase</p>
      </footer>
    </div>
  );
}

export default App;
