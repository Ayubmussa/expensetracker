import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import type { LoginData } from '../types';
import './Auth.css';

interface LoginProps {
  onSwitchToRegister: () => void;
  onSwitchToReset: () => void;
}

const Login: React.FC<LoginProps> = ({ onSwitchToRegister, onSwitchToReset }) => {
  const { login, loading } = useAuth();
  const [formData, setFormData] = useState<LoginData>({
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState<Partial<LoginData>>({});
  const [authError, setAuthError] = useState<string>('');

  const validateForm = (): boolean => {
    const newErrors: Partial<LoginData> = {};

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');

    if (!validateForm()) return;

    const result = await login(formData.email, formData.password);
    
    if (!result.success && result.error) {
      setAuthError(result.error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear errors when user starts typing
    if (errors[name as keyof LoginData]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
    if (authError) {
      setAuthError('');
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h2>Welcome Back</h2>
          <p>Sign in to your account to continue tracking your expenses</p>
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

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              placeholder="Enter your password"
              className={errors.password ? 'error' : ''}
              disabled={loading}
            />
            {errors.password && <span className="error-message">{errors.password}</span>}
          </div>

          <button
            type="submit"
            className="auth-button"
            disabled={loading}
          >
            {loading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        <div className="auth-links">
          <button
            type="button"
            onClick={onSwitchToReset}
            className="link-button"
            disabled={loading}
          >
            Forgot your password?
          </button>
        </div>

        <div className="auth-footer">
          <p>
            Don't have an account?{' '}
            <button
              type="button"
              onClick={onSwitchToRegister}
              className="link-button"
              disabled={loading}
            >
              Sign up
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
