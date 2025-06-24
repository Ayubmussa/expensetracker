import React, { useEffect, useState } from 'react';
import { authService } from '../services/authService';
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

    checkUser();// Listen for auth changes
    const { data: { subscription } } = authService.onAuthStateChange((user: User | null) => {
      if (mounted) {
        clearTimeout(loadingTimeout);
        setAuthState(prev => ({
          ...prev,
          user,
          loading: false,
        }));
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
