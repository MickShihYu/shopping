import {AlertCircle, CheckCircle2, Mail, Send} from 'lucide-react';
import React, {useState} from 'react';
import {api} from '../services/api';

export const ResetPasswordInit: React.FC = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [invalidEmail, setInvalidEmail] = useState(false);
  const [failed, setFailed] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const validateEmail = (emailStr: string) => {
    const re =
      /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(emailStr).toLowerCase());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setInvalidEmail(false);
    setFailed(false);
    setSuccess(false);

    if (!validateEmail(email)) {
      setInvalidEmail(true);
      return;
    }

    setLoading(true);
    try {
      await api.passwordResetInit({email});
      setSuccess(true);
    } catch (err: any) {
      setFailed(true);
      setErrorMsg(err.message || 'Failed to initiate password reset. Try again later.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-card-container">
      <div className="auth-card glass" id="resetPasswordInit">
        <h2 className="modal-title" data-cy="card-title">Reset your password</h2>

        {invalidEmail && (
          <div className="alert alert-danger" id="passwordResetInitInvalidEmail">
            <AlertCircle size={16} />
            <span>Please enter a valid email address</span>
          </div>
        )}

        {failed && (
          <div className="alert alert-danger" id="passwordResetInitFailed">
            <AlertCircle size={16} />
            <span>{errorMsg}</span>
          </div>
        )}

        {success ? (
          <div className="alert alert-success" id="passwordResetInitSuccess">
            <CheckCircle2 size={16} />
            <span>An email has been sent to your inbox with instructions on how to reset your password</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="auth-form">
            <p id="resetPasswordInitInstructions" className="text-secondary">
              Enter the email address you used to register your account:
            </p>

            <div className="form-group">
              <label htmlFor="reset-email" data-cy="resetPasswordInitEmailLabel">Email address</label>
              <div className="input-icon-wrapper">
                <Mail size={16} className="input-icon" />
                <input
                  type="email"
                  id="reset-email"
                  data-cy="resetPasswordInitEmail"
                  className="form-control pad-icon"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                className="btn btn-primary btn-full"
                disabled={loading}
                data-cy="init-resetPassword"
                id="init-resetPassword"
              >
                <Send size={16} />
                <span>{loading ? 'Sending...' : 'Send'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
