import { useState } from 'react';
import { useAuth } from './hooks/useAuth';
import { useRecoveryMode } from './hooks/useRecoveryMode';
import ExpenseForm from './components/ExpenseForm';
import BulkExpenseForm from './components/BulkExpenseForm';
import ExpenseList from './components/ExpenseList';
import ExpenseSummary from './components/ExpenseSummary';
import Login from './components/Login';
import Register from './components/Register';
import ResetPassword from './components/ResetPassword';
import UpdatePassword from './components/UpdatePassword';
// import SupabaseTest from './components/SupabaseTest';
import './App.css';

type AuthView = 'login' | 'register' | 'reset' | 'update-password';

function App() {
  const { user, loading, logout } = useAuth();
  const { isRecoveryMode, clearRecoveryMode } = useRecoveryMode();
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [authView, setAuthView] = useState<AuthView>('login');
  const [showBulkExpenseForm, setShowBulkExpenseForm] = useState(false);

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
    setAuthView('login');
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
    authView, 
    loading 
  });

  // Show authentication forms if user is not logged in (but NOT for recovery mode)
  if (!user && !isRecoveryMode) {
    console.log('App - showing auth forms', { userExists: !!user, isRecoveryMode });
    return (
      <div className="app">
        <header className="app-header">
          <h1>💰 ExpenseTracker</h1>
          <p>Track your daily expenses with ease</p>
        </header>
        
        <main className="app-main">
          <div className="auth-container">
            {/* <SupabaseTest /> Temporarily disabled to reduce console errors */}
            {authView === 'login' && (
              <Login
                onSwitchToRegister={() => setAuthView('register')}
                onSwitchToReset={() => setAuthView('reset')}
              />
            )}
            {authView === 'register' && (
              <Register
                onSwitchToLogin={() => setAuthView('login')}
              />
            )}
            {authView === 'reset' && (
              <ResetPassword
                onSwitchToLogin={() => setAuthView('login')}
              />
            )}
          </div>
        </main>
        
        <footer className="app-footer">
          <p>Built with React + TypeScript + Supabase</p>
        </footer>
      </div>
    );
  }

  // Show main expense tracker for authenticated users OR users in recovery mode
  console.log('App - showing main expense tracker', { userExists: !!user, isRecoveryMode });
  return (
    <div className="app">
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

      <header className="app-header">
        <div className="header-content">
          <div>
            <h1>💰 ExpenseTracker</h1>
            <p>Welcome{user ? `, ${user.email}` : ''}!</p>
          </div>
          {user && (
            <button className="logout-btn" onClick={handleLogout}>
              Logout
            </button>
          )}
        </div>
      </header>
      
      <main className="app-main">
        <div className="app-container">
          <ExpenseSummary refreshTrigger={refreshTrigger} />
          
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
          
          <ExpenseList refreshTrigger={refreshTrigger} />
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
        <p>Built with React + TypeScript + Supabase</p>
      </footer>
    </div>
  );
}

export default App;
