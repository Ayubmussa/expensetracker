import { useState, useEffect } from 'react';
import { supabase } from '../config/supabase';

export const useRecoveryMode = () => {
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);

  useEffect(() => {
    console.log('useRecoveryMode - initializing');
    
    // Check URL parameters first
    const checkInitialParams = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const accessToken = urlParams.get('access_token');
      const type = urlParams.get('type');
      
      console.log('useRecoveryMode - Initial URL check:', {
        accessToken: !!accessToken,
        type,
        fullUrl: window.location.href
      });

      if (accessToken && type === 'recovery') {
        console.log('useRecoveryMode - Recovery mode detected from URL');
        setIsRecoveryMode(true);
      }
      setHasChecked(true);
    };

    checkInitialParams();

    // Listen for auth state changes - this catches when Supabase processes the callback
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('useRecoveryMode - Auth state change:', event, !!session);
      
      if (event === 'PASSWORD_RECOVERY') {
        console.log('useRecoveryMode - PASSWORD_RECOVERY event detected');
        setIsRecoveryMode(true);
      } else if (event === 'SIGNED_OUT') {
        console.log('useRecoveryMode - User signed out, clearing recovery mode');
        setIsRecoveryMode(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const clearRecoveryMode = () => {
    console.log('useRecoveryMode - clearing recovery mode');
    setIsRecoveryMode(false);
    // Clear URL parameters
    const url = new URL(window.location.href);
    url.search = '';
    window.history.replaceState({}, document.title, url.pathname);
  };

  return {
    isRecoveryMode,
    hasChecked,
    clearRecoveryMode
  };
};
