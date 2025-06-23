import React, { useState, useEffect } from 'react';
import { authService } from '../services/authService';
import './Auth.css';

interface UpdatePasswordProps {
  onPasswordUpdated: () => void;
  onCancel: () => void;
}

const UpdatePassword: React.FC<UpdatePasswordProps> = ({ onPasswordUpdated, onCancel }) => {
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<{ password?: string; confirmPassword?: string }>({});
  const [authError, setAuthError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [success, setSuccess] = useState<boolean>(false);

  // Check if user has a recovery session (from password reset link)
  useEffect(() => {
    console.log('UpdatePassword component mounted');
    const checkRecoverySession = async () => {
      // This will be true if user came from a password reset link
      const urlParams = new URLSearchParams(window.location.search);
      const accessToken = urlParams.get('access_token');
      const refreshToken = urlParams.get('refresh_token');
      const type = urlParams.get('type');
      
      console.log('UpdatePassword - URL params:', { 
        accessToken: !!accessToken, 
        refreshToken: !!refreshToken, 
        type,
        fullUrl: window.location.href 
      });
      
      if (!accessToken || type !== 'recovery') {
        // If no recovery tokens, this component shouldn't be shown
        console.warn('No valid recovery session found');
      } else {
        console.log('Valid recovery session detected - UpdatePassword component ready');
      }
    };

    checkRecoverySession();
  }, []);

  const validateForm = (): boolean => {
    const newErrors: { password?: string; confirmPassword?: string } = {};

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters long';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');

    if (!validateForm()) return;

    setLoading(true);
    try {
      console.log('Updating password...');
      
      // Use the auth service for password update
      const { error } = await authService.updatePassword(formData.password);

      if (error) {
        console.error('Password update failed:', error);
        setAuthError(error);      } else {
        console.log('Password updated successfully');
        setSuccess(true);
        
        // Don't sign out the user - let them continue using the app
        setTimeout(() => {
          console.log('Returning to app...');
          onPasswordUpdated();
        }, 2000);
      }
    } catch (error) {
      console.error('Unexpected error during password update:', error);
      setAuthError((error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (errors[name as keyof typeof errors]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };
  if (success) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <h2>✅ Password Updated Successfully</h2>
            <p>Your password has been updated successfully!</p>
          </div>
            <div className="success-message">
            <p>You can now continue using the app with your new password.</p>
            <p>Returning to the app...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="auth-card">        <div className="auth-header">
          <h2>� Password Reset Required</h2>
          <p>Please set a new password to continue using the app.</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {authError && (
            <div className="error-message">
              {authError}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="password">New Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              className={errors.password ? 'error' : ''}
              placeholder="Enter your new password"
              disabled={loading}
            />
            {errors.password && <span className="error-text">{errors.password}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm New Password</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleInputChange}
              className={errors.confirmPassword ? 'error' : ''}
              placeholder="Confirm your new password"
              disabled={loading}
            />
            {errors.confirmPassword && <span className="error-text">{errors.confirmPassword}</span>}
          </div>

          <div className="form-actions">
            <button
              type="submit"
              className="auth-button primary"
              disabled={loading}
            >
              {loading ? 'Updating...' : 'Update Password'}
            </button>
              <button
              type="button"
              className="auth-button secondary"
              onClick={onCancel}
              disabled={loading}
            >
              Skip for Now
            </button>
          </div>
        </form>        <div className="auth-footer">
          <p>
            Changed your mind?{' '}
            <button 
              className="link-button" 
              onClick={onCancel}
              disabled={loading}
            >
              Continue to App
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default UpdatePassword;
