import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import type { ResetPasswordData } from '../types';
import './Auth.css';

interface ResetPasswordProps {
  onSwitchToLogin: () => void;
}

const ResetPassword: React.FC<ResetPasswordProps> = ({ onSwitchToLogin }) => {
  const { resetPassword } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [formData, setFormData] = useState<ResetPasswordData>({
    email: '',
  });
  const [errors, setErrors] = useState<Partial<ResetPasswordData>>({});
  const [authError, setAuthError] = useState<string>('');
  const [success, setSuccess] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  const validateForm = (): boolean => {
    const newErrors: Partial<ResetPasswordData> = {};

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setSuccess(false);

    if (!validateForm()) return;

    setLoading(true);
    const result = await resetPassword(formData.email);
    setLoading(false);
    
    if (!result.success && result.error) {
      setAuthError(result.error);
    } else if (result.success) {
      setSuccess(true);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear errors when user starts typing
    if (errors[name as keyof ResetPasswordData]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
    if (authError) {
      setAuthError('');
    }
  };

  if (success) {
    return (
      <div className="auth-container">
        <button
          type="button"
          onClick={toggleTheme}
          className="theme-toggle-btn"
          title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        >
          {theme === 'light' ? '🌙' : '☀️'}
        </button>
        
        <div className="auth-card">
          <div className="auth-header">
            <div className="auth-header-content">
              <h2>Check Your Email</h2>
              <p>We've sent you a password reset link. Please check your email and follow the instructions to reset your password.</p>
            </div>
          </div>
          
          <div className="auth-success">
            <div className="success-icon">📧</div>
            <p>Password reset email sent to <strong>{formData.email}</strong></p>
            <p className="success-note">
              Don't see the email? Check your spam folder or try again with a different email address.
            </p>
          </div>

          <div className="auth-footer">
            <p>
              Remember your password?{' '}
              <button
                type="button"
                onClick={onSwitchToLogin}
                className="link-button"
              >
                Sign in
              </button>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <button
        type="button"
        onClick={toggleTheme}
        className="theme-toggle-btn"
        title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
      >
        {theme === 'light' ? '🌙' : '☀️'}
      </button>
      
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-header-content">
            <h2>Reset Password</h2>
            <p>Enter your email address and we'll send you a link to reset your password</p>
          </div>
        </div>

        {authError && (
          <div className="auth-error">
            {authError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="Enter your email"
              className={errors.email ? 'error' : ''}
              disabled={loading}
            />
            {errors.email && <span className="error-message">{errors.email}</span>}
          </div>

          <button
            type="submit"
            className="auth-button"
            disabled={loading}
          >
            {loading ? 'Sending Reset Link...' : 'Send Reset Link'}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            Remember your password?{' '}
            <button
              type="button"
              onClick={onSwitchToLogin}
              className="link-button"
              disabled={loading}
            >
              Sign in
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
