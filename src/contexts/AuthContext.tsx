import React, { useEffect, useState, useRef } from 'react';
import { authService } from '../services/authService';
import { expenseService } from '../services/expenseService';
import { AuthContext, type AuthContextType } from './AuthContext';
import type { AuthState, User } from '../types';

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
  });
  const previousUserRef = useRef<User | null>(null);

  useEffect(() => {
    let mounted = true;

    // Shorter timeout since we want to allow offline usage quickly
    const loadingTimeout = setTimeout(() => {
      if (mounted) {
        console.log('Auth loading timeout - enabling offline mode');
        setAuthState(prev => ({ ...prev, loading: false }));
      }
    }, 3000); // Reduced to 3 seconds for better offline experience

    // Check for existing session
    const checkUser = async () => {
      try {
        // Only check auth if we're online
        if (!navigator.onLine) {
          if (mounted) {
            clearTimeout(loadingTimeout);
            setAuthState({
              user: null,
              loading: false,
              error: null, // No error for offline mode
            });
          }
          return;
        }

        const { user, error } = await authService.getCurrentUser();
        if (mounted) {
          clearTimeout(loadingTimeout);
          setAuthState({
            user,
            loading: false,
            error: error,
          });
        }
      } catch {
        if (mounted) {
          clearTimeout(loadingTimeout);
          // Don't treat auth failure as an error - allow offline usage
          setAuthState({
            user: null,
            loading: false,
            error: null, // Removed error to allow offline usage
          });
        }
      }
    };

    checkUser();    // Listen for auth changes
    const { data: { subscription } } = authService.onAuthStateChange(async (user: User | null) => {
      if (mounted) {
        clearTimeout(loadingTimeout);
        const previousUser = previousUserRef.current;
        previousUserRef.current = user;
        
        setAuthState(prev => ({
          ...prev,
          user,
          loading: false,
        }));

        // If user just logged in (was null, now has user), try to sync offline data
        if (user && !previousUser) {
          console.log('User authenticated, checking for offline data to sync...');
          try {
            // Small delay to ensure auth state is fully set
            setTimeout(async () => {
              try {
                const hasUnsynced = await expenseService.hasUnsyncedData();
                if (hasUnsynced) {
                  console.log('Found unsynced data, triggering sync...');
                  await expenseService.manualSync();
                }
              } catch (error) {
                console.log('Auto-sync after login failed:', error);
              }
            }, 1000);
          } catch (error) {
            console.log('Error checking for unsynced data:', error);
          }
        }
      }
    });

    return () => {
      mounted = false;
      clearTimeout(loadingTimeout);
      subscription.unsubscribe();
    };
  }, []);
  const login = async (email: string, password: string) => {
    setAuthState(prev => ({ ...prev, loading: true, error: null }));
    
    const { user, error } = await authService.login({ email, password });
    
    if (error) {
      setAuthState(prev => ({ ...prev, loading: false, error }));
      return { success: false, error };
    }

    setAuthState({ user, loading: false, error: null });
    
    // Trigger sync after successful login
    if (user) {
      setTimeout(async () => {
        try {
          const hasUnsynced = await expenseService.hasUnsyncedData();
          if (hasUnsynced) {
            console.log('Login successful, syncing offline data...');
            await expenseService.manualSync();
          }
        } catch (error) {
          console.log('Post-login sync failed:', error);
        }
      }, 500);
    }
    
    return { success: true };
  };

  const register = async (email: string, password: string, confirmPassword: string, fullName: string) => {
    setAuthState(prev => ({ ...prev, loading: true, error: null }));
    
    const { user, error } = await authService.register({ 
      email, 
      password, 
      confirmPassword, 
      fullName 
    });
    
    if (error) {
      setAuthState(prev => ({ ...prev, loading: false, error }));
      return { success: false, error };
    }

    setAuthState({ user, loading: false, error: null });
    return { success: true };
  };

  const logout = async () => {
    setAuthState(prev => ({ ...prev, loading: true }));
    
    await authService.logout();
    
    setAuthState({ user: null, loading: false, error: null });
  };
  const resetPassword = async (email: string) => {
    const { error } = await authService.resetPassword({ email });
    
    if (error) {
      return { success: false, error };
    }

    return { success: true };
  };

  const updatePassword = async (newPassword: string) => {
    const { error } = await authService.updatePassword(newPassword);
    
    if (error) {
      return { success: false, error };
    }

    return { success: true };
  };

  const value: AuthContextType = {
    ...authState,
    login,
    register,
    logout,
    resetPassword,
    updatePassword,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
