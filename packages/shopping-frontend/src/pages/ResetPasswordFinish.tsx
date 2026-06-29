import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { Lock, Save, AlertCircle, CheckCircle2 } from 'lucide-react';

export const ResetPasswordFinish: React.FC = () => {
  const resetKey = new URLSearchParams(window.location.search).get('resetKey') || '';
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  
  const [mismatch, setMismatch] = useState(false);
  const [invalid, setInvalid] = useState(false);
  const [failed, setFailed] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMismatch(false);
    setInvalid(false);
    setFailed(false);
    setSuccess(false);

    if (password !== confirmPassword) {
      setMismatch(true);
      return;
    }

    if (!password || password.length < 8) {
      setInvalid(true);
      return;
    }

    if (!resetKey) {
      setFailed(true);
      setErrorMsg('Password reset key is missing from URL');
      return;
    }

    setLoading(true);
    try {
      await api.passwordResetFinish({
        resetKey,
        password,
        confirmPassword,
      });
      setSuccess(true);
    } catch (err: any) {
      setFailed(true);
      setErrorMsg(err.message || 'Error resetting password. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-card-container">
      <div className="auth-card glass" id="resetPasswordFinish">
        <h2 className="modal-title" data-cy="card-title">Complete password reset</h2>

        {mismatch && (
          <div className="alert alert-danger" id="passwordResetFinishMismatch">
            <AlertCircle size={16} />
            <span>Password and confirmation password do not match</span>
          </div>
        )}

        {invalid && (
          <div className="alert alert-danger" id="passwordResetFinishInvalid">
            <AlertCircle size={16} />
            <span>Password must be minimum of 8 characters</span>
          </div>
        )}

        {failed && (
          <div className="alert alert-danger" id="passwordResetFinishFailed">
            <AlertCircle size={16} />
            <span>{errorMsg}</span>
          </div>
        )}

        {success ? (
          <div className="alert alert-success d-flex flex-column gap-12 align-items-center" id="passwordResetFinishSuccess">
            <div className="d-flex align-items-center gap-12">
              <CheckCircle2 size={16} />
              <span>Your password has been successfully changed.</span>
            </div>
            <Link to="/shoppy" className="btn btn-primary btn-sm mt-2">Go to Catalog</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label htmlFor="reset-password" data-cy="resetPasswordFinishPasswordLabel">New password</label>
              <div className="input-icon-wrapper">
                <Lock size={16} className="input-icon" />
                <input
                  type="password"
                  id="reset-password"
                  data-cy="resetPasswordFinishPassword"
                  className="form-control pad-icon"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="reset-confirm" data-cy="resetPasswordFinishConfirmPasswordLabel">Confirm password</label>
              <div className="input-icon-wrapper">
                <Lock size={16} className="input-icon" />
                <input
                  type="password"
                  id="reset-confirm"
                  data-cy="resetPasswordFinishConfirmPassword"
                  className="form-control pad-icon"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <div id="finish-resetPassword">
              <button type="submit" className="btn btn-primary btn-full" disabled={loading} data-cy="finish-resetPassword">
                <Save size={16} />
                <span>{loading ? 'Saving...' : 'Reset'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
