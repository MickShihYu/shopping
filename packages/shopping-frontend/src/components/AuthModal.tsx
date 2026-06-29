import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { X, Mail, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialIsSignUp?: boolean;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, initialIsSignUp = false }) => {
  const { login, signUp } = useAuth();
  const [isSignUp, setIsSignUp] = useState(initialIsSignUp);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');

  // Sync isSignUp when modal opens with initial state
  useEffect(() => {
    if (isOpen) {
      setIsSignUp(initialIsSignUp);
      setError(null);
    }
  }, [isOpen, initialIsSignUp]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      if (isSignUp) {
        if (!firstName || !lastName || !email || !password) {
          throw new Error('All fields are required');
        }
        if (password.length < 8) {
          throw new Error('Password must be at least 8 characters');
        }
        await signUp({ firstName, lastName, phone, email, password });
      } else {
        if (!email || !password) {
          throw new Error('Email and password are required');
        }
        await login({ email, password });
      }
      onClose();
      // 登入或註冊成功後重新載入頁面，以確保所有資料與狀態都重新刷新
      window.location.reload();
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className={`overlay ${isOpen ? 'active' : ''}`}
      style={{ display: isOpen ? 'flex' : 'none' }}
      onClick={onClose}
      data-cy={isSignUp ? 'signUpModal' : 'logInModal'}
    >
      <div
        className="modal-content glass"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2 className="modal-title" data-cy={isSignUp ? 'signUpTitle' : 'logInTitle'}>
            {isSignUp ? 'Shoppy Sign Up' : 'Shoppy Log In'}
          </h2>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {error && <div className="alert alert-danger">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form" id={isSignUp ? 'signUpForm' : 'logInForm'}>
          {isSignUp && (
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="firstName">First Name</label>
                <input
                  type="text"
                  id="firstName"
                  data-cy="firstName"
                  className="form-control"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="lastName">Last Name</label>
                <input
                  type="text"
                  id="lastName"
                  data-cy="lastName"
                  className="form-control"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                />
              </div>
              <div className="form-group" style={{ marginTop: '15px' }}>
                <label htmlFor="phone">Phone Number (Optional)</label>
                <input
                  type="tel"
                  id="phone"
                  data-cy="phone"
                  className="form-control"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="authEmail">Email Address</label>
            <div className="input-icon-wrapper">
              <Mail size={16} className="input-icon" />
              <input
                type="email"
                id={isSignUp ? 'signUpEmail' : 'logInEmail'}
                data-cy={isSignUp ? 'signUpEmail' : 'logInEmail'}
                className="form-control pad-icon"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="authPassword">Password</label>
            <div className="input-icon-wrapper">
              <Lock size={16} className="input-icon" />
              <input
                type="password"
                id={isSignUp ? 'signUpPassword' : 'logInPassword'}
                data-cy={isSignUp ? 'signUpPassword' : 'logInPassword'}
                className="form-control pad-icon"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>
            {isSignUp && (
              <small className="form-text text-muted">
                Password should be minimum eight characters
              </small>
            )}
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-full"
            disabled={submitting}
            data-cy={isSignUp ? 'signUpButton' : 'logInButton'}
            id={isSignUp ? 'signUpButton' : 'logInButton'}
          >
            {submitting ? 'Please wait...' : isSignUp ? 'Sign Up' : 'Log In'}
          </button>

          {!isSignUp && (
            <div className="auth-footer-link">
              <Link to="/reset-password-init" className="forgot-pwd-link">
                Forgot your password?
              </Link>
            </div>
          )}

          <div className="auth-toggle">
            {isSignUp ? (
              <p>
                Already have an account?{' '}
                <button type="button" onClick={() => setIsSignUp(false)} className="toggle-btn">
                  Log In
                </button>
              </p>
            ) : (
              <p>
                New to Shoppy?{' '}
                <button type="button" onClick={() => setIsSignUp(true)} className="toggle-btn">
                  Sign Up
                </button>
              </p>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
