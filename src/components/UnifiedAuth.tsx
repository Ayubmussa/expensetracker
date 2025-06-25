import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import './UnifiedAuth.css';

type AuthMode = 'signin' | 'signup' | 'reset';

interface UnifiedAuthProps {
  onSuccess?: () => void;
}

const UnifiedAuth: React.FC<UnifiedAuthProps> = ({ onSuccess }) => {
  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const { login, register, resetPassword } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setMessage('');

    try {
      if (mode === 'signin') {
        if (!email || !password) {
          setError('Please fill in all fields');
          return;
        }
        const result = await login(email, password);
        if (result.success) {
          setMessage('Signed in successfully!');
          onSuccess?.();
        } else {
          setError(result.error || 'Sign in failed');
        }
      } else if (mode === 'signup') {
        if (!email || !password || !confirmPassword) {
          setError('Please fill in all fields');
          return;
        }
        if (password !== confirmPassword) {
          setError('Passwords do not match');
          return;
        }
        if (password.length < 6) {
          setError('Password must be at least 6 characters long');
          return;
        }
        const result = await register(email, password, confirmPassword, '');
        if (result.success) {
          setMessage('Account created successfully! Please check your email to verify your account.');
        } else {
          setError(result.error || 'Sign up failed');
        }
      } else if (mode === 'reset') {
        if (!email) {
          setError('Please enter your email address');
          return;
        }
        const result = await resetPassword(email);
        if (result.success) {
          setMessage('Password reset email sent! Check your inbox.');
        } else {
          setError(result.error || 'Password reset failed');
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setError('');
    setMessage('');
  };

  const switchMode = (newMode: AuthMode) => {
    setMode(newMode);
    resetForm();
  };

  return (
    <div className="unified-auth">
      <div className="auth-header">
        <h2>
          {mode === 'signin' && 'Sign In'}
          {mode === 'signup' && 'Sign Up'}
          {mode === 'reset' && 'Reset Password'}
        </h2>
        <p>
          {mode === 'signin' && 'Welcome back! Sign in to your account'}
          {mode === 'signup' && 'Create a new account to get started'}
          {mode === 'reset' && 'Enter your email to reset your password'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="auth-form">
        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            required
          />
        </div>

        {mode !== 'reset' && (
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />
          </div>
        )}

        {mode === 'signup' && (
          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm your password"
              required
            />
          </div>
        )}

        {error && <div className="error-message">{error}</div>}
        {message && <div className="success-message">{message}</div>}

        <button type="submit" disabled={isLoading} className="auth-submit-btn">
          {isLoading ? 'Loading...' : (
            <>
              {mode === 'signin' && 'Sign In'}
              {mode === 'signup' && 'Sign Up'}
              {mode === 'reset' && 'Send Reset Email'}
            </>
          )}
        </button>
      </form>

      <div className="auth-mode-switcher">
        {mode === 'signin' && (
          <>
            <p>
              Don't have an account?{' '}
              <button type="button" onClick={() => switchMode('signup')} className="link-btn">
                Sign up
              </button>
            </p>
            <p>
              Forgot your password?{' '}
              <button type="button" onClick={() => switchMode('reset')} className="link-btn">
                Reset it
              </button>
            </p>
          </>
        )}
        {mode === 'signup' && (
          <p>
            Already have an account?{' '}
            <button type="button" onClick={() => switchMode('signin')} className="link-btn">
              Sign in
            </button>
          </p>
        )}
        {mode === 'reset' && (
          <p>
            Remember your password?{' '}
            <button type="button" onClick={() => switchMode('signin')} className="link-btn">
              Sign in
            </button>
          </p>
        )}
      </div>
    </div>
  );
};

export default UnifiedAuth;
