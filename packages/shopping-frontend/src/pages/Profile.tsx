import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import type { User, Order, OrderItem } from '../services/api';
import { User as UserIcon, Calendar, ClipboardList, KeyRound, X } from 'lucide-react';

export const Profile: React.FC = () => {
  const id = new URLSearchParams(window.location.search).get('id') || '';
  const { updateProfile, isSupport, isAdmin } = useAuth();

  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Password Reset Modal States
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('john@example.com');
  const [resetPassword, setResetPassword] = useState('');
  const [resetConfirmPassword, setResetConfirmPassword] = useState('');
  const [resetMismatch, setResetMismatch] = useState(false);
  const [resetFailed, setResetFailed] = useState(false);
  const [resetNoPassword, setResetNoPassword] = useState(false);
  const [resetNoCorrectPassword, setResetNoCorrectPassword] = useState(false);
  const [resetNoConfirmPassword, setResetNoConfirmPassword] = useState(false);
  const [resetChanged, setResetChanged] = useState(false);

  // Form Fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);

  useEffect(() => {
    const fetchProfileAndOrders = async () => {
      if (!id) return;
      setLoading(true);
      setError(null);
      try {
        const data = await api.getUser(id);
        setProfileUser(data);
        setFirstName(data.firstName || '');
        setLastName(data.lastName || '');
        setEmail(data.email || '');
        setPhone(data.phone || '');
        setSelectedRoles(data.roles || []);
      } catch (err: any) {
        if (err.message.includes('401') || err.message.includes('Unauthorized')) {
          setError('UNAUTHORIZED');
        } else {
          setError('NOT FOUND');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchProfileAndOrders();
  }, [id]);

  useEffect(() => {
    const fetchOrders = async () => {
      setOrdersLoading(true);
      try {
        const data = await api.getOrders();
        // Filter orders for this user if not admin/support
        const userOrders = data.filter(order => order.userId === id);
        setOrders(userOrders);
      } catch (err) {
        console.error('Failed to load orders:', err);
      } finally {
        setOrdersLoading(false);
      }
    };
    if (id) {
      fetchOrders();
    }
  }, [id]);

  const handleRoleChange = (role: string) => {
    if (!isAdmin) return; // Only admin can edit roles
    setSelectedRoles((prev: string[]) =>
      prev.includes(role) ? prev.filter((r: string) => r !== role) : [...prev, role]
    );
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSupport) return;
    setSaving(true);
    try {
      await updateProfile({
        firstName,
        lastName,
        email,
        phone,
        roles: selectedRoles,
      });
      alert('Profile updated successfully!');
    } catch (err: any) {
      alert(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetMismatch(false);
    setResetFailed(false);
    setResetNoPassword(false);
    setResetNoCorrectPassword(false);
    setResetNoConfirmPassword(false);
    setResetChanged(false);

    if (!resetPassword) {
      setResetNoPassword(true);
      return;
    }
    if (resetPassword.length < 8) {
      setResetNoCorrectPassword(true);
      return;
    }
    if (!resetConfirmPassword) {
      setResetNoConfirmPassword(true);
      return;
    }
    if (resetPassword !== resetConfirmPassword) {
      setResetMismatch(true);
      return;
    }

    try {
      const res = await api.forgotPassword({ email: resetEmail, password: resetPassword });
      if (res && res.token) {
        localStorage.setItem('shoppyToken', res.token);
        setResetChanged(true);
        setResetPassword('');
        setResetConfirmPassword('');
      } else {
        setResetFailed(true);
      }
    } catch {
      setResetFailed(true);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <span>Loading profile...</span>
      </div>
    );
  }

  if (error || !profileUser) {
    return (
      <div className="empty-catalog">
        <h2>Profile Error</h2>
        <p>{error || 'User profile not found'}</p>
        <Link to="/shoppy" className="btn btn-primary mt-3">Back to Home</Link>
      </div>
    );
  }

  const isFormDisabled = isSupport;

  return (
    <div className="profile-page-grid">
      <div className="profile-form-section glass">
        <div className="profile-header-card">
          <div className="profile-avatar-large">
            <UserIcon size={40} className="avatar-icon" />
          </div>
          <h2 className="profile-fullname" data-cy="card-title">
            {profileUser.firstName} {profileUser.lastName}
          </h2>
          <span className="user-id-badge" id="userId">
            ID: {profileUser.id}
          </span>
        </div>

        <form onSubmit={handleUpdate} className="profile-form">
          <div className="form-group">
            <label htmlFor="profile-firstName" data-cy="profileFirstNameLabel">First Name</label>
            <input
              type="text"
              id="profile-firstName"
              data-cy="profileFirstName"
              className="form-control"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              disabled={isFormDisabled}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="profile-lastName" data-cy="profileLastNameLabel">Last Name</label>
            <input
              type="text"
              id="profile-lastName"
              data-cy="profileLastName"
              className="form-control"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              disabled={isFormDisabled}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="profile-email" data-cy="profileEmailLabel">Email</label>
            <input
              type="email"
              id="profile-email"
              data-cy="profileEmail"
              className="form-control"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isFormDisabled}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="profile-phone" data-cy="profilePhoneLabel">Phone (Optional)</label>
            <input
              type="tel"
              id="profile-phone"
              data-cy="profilePhone"
              className="form-control"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={isFormDisabled}
            />
          </div>

          {(isAdmin || isSupport) && (
            <div className="form-group" id="profile-roles">
              <label>Roles</label>
              <div className="roles-checkboxes">
                {['admin', 'support', 'customer'].map((role) => (
                  <label key={role} htmlFor={`${role}-role`} className="role-checkbox-label">
                    <input
                      type="checkbox"
                      id={`${role}-role`}
                      checked={selectedRoles.includes(role)}
                      onChange={() => handleRoleChange(role)}
                      disabled={!isAdmin} // Only admin can change roles
                    />
                    <span className="capitalize">{role}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="profile-actions-wrapper">
            <button
              type="submit"
              className="btn btn-primary btn-full"
              disabled={isFormDisabled || saving}
              data-cy="update-profile"
              id="update-profile"
            >
              {saving ? 'Saving...' : 'Update'}
            </button>
          </div>

          <div className="profile-forgot-pwd-box">
            <a
              href="javascript:void(0)"
              className="btn btn-secondary btn-full"
              data-cy="passwordResetLink"
              onClick={() => setIsResetOpen(true)}
            >
              <KeyRound size={16} />
              <span>Reset your password</span>
            </a>
          </div>
        </form>
      </div>

      <div className="profile-orders-section glass">
        <h2 className="section-title d-flex align-items-center gap-8">
          <ClipboardList size={22} />
          <span>Order History</span>
        </h2>

        {ordersLoading ? (
          <div className="loading-container p-4">
            <div className="spinner"></div>
            <span>Fetching your orders...</span>
          </div>
        ) : orders.length === 0 ? (
          <div className="empty-orders-state">
            <p>You have not placed any orders yet.</p>
          </div>
        ) : (
          <div className="orders-list">
            {orders.map((order: Order) => (
              <div key={order.orderId} className="order-history-card">
                <div className="order-history-header">
                  <div className="order-meta-left">
                    <div className="order-meta-item">
                      <Calendar size={14} />
                      <span>{new Date(order.date).toLocaleDateString()}</span>
                    </div>
                    <div className="order-id-txt" style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                      ID: {order.orderId}
                      {order.userName && ` | Customer: ${order.userName}`}
                      {order.email && ` | Email: ${order.email}`}
                      {order.phone && ` | Phone: ${order.phone}`}
                    </div>
                  </div>
                  <div className="order-meta-right">
                    <span className="order-total-lbl">Total Paid:</span>
                    <span className="order-total-val">${order.total?.toFixed(2)}</span>
                  </div>
                </div>
                <div className="order-items-table-wrapper">
                  <table className="order-items-table">
                    <thead>
                      <tr>
                        <th>Item Description</th>
                        <th>Qty</th>
                        <th>Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      {order.products.map((prod: OrderItem, i: number) => (
                        <tr key={i}>
                          <td>{prod.name}</td>
                          <td>{prod.quantity}</td>
                          <td>${prod.price?.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Password Reset Modal */}
      <div
        className={`overlay ${isResetOpen ? 'active' : ''}`}
        style={{ display: isResetOpen ? 'flex' : 'none' }}
        onClick={() => setIsResetOpen(false)}
        id="passwordResetModal"
      >
        <div
          className="modal-content glass"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="modal-header">
            <h5 className="modal-title" id="passwordResetTitle">Password Reset</h5>
            <button className="modal-close" onClick={() => setIsResetOpen(false)}>
              <X size={20} />
            </button>
          </div>
          <div className="modal-body">
            <form onSubmit={handlePasswordReset} id="passwordResetForm" className="auth-form">
              {resetMismatch && (
                <div className="alert alert-danger" id="passwordResetMismatch" role="alert">
                  Confirm password and password do not match
                </div>
              )}
              {resetFailed && (
                <div className="alert alert-danger" id="passwordResetFailed" role="alert">
                  Password reset failed
                </div>
              )}
              {resetNoPassword && (
                <div className="alert alert-danger" id="passwordResetNoPassword" role="alert">
                  Please enter your password
                </div>
              )}
              {resetNoCorrectPassword && (
                <div className="alert alert-danger" id="passwordResetNoCorrectPassword" role="alert">
                  Please enter a valid password
                </div>
              )}
              {resetNoConfirmPassword && (
                <div className="alert alert-danger" id="passwordResetNoConfirmPassword" role="alert">
                  Please confirm your password
                </div>
              )}
              {resetChanged && (
                <div className="alert alert-success" data-cy="passwordResetChanged" id="passwordResetChanged" role="alert">
                  Password successfully changed
                </div>
              )}
              <div className="form-group">
                <label htmlFor="passwordResetEmail">Email address</label>
                <input
                  type="email"
                  data-cy="passwordResetEmail"
                  className="form-control"
                  id="passwordResetEmail"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="passwordResetPassword">Password</label>
                <input
                  type="password"
                  data-cy="passwordResetPassword"
                  className="form-control"
                  id="passwordResetPassword"
                  value={resetPassword}
                  onChange={(e) => setResetPassword(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="passwordResetConfirmPassword">Confirm Password</label>
                <input
                  type="password"
                  data-cy="passwordResetConfirmPassword"
                  className="form-control"
                  id="passwordResetConfirmPassword"
                  value={resetConfirmPassword}
                  onChange={(e) => setResetConfirmPassword(e.target.value)}
                  required
                />
                <small className="form-text text-muted">Password should be minimum eight characters</small>
              </div>
              <div className="text-center">
                <button
                  type="submit"
                  id="passwordResetButton"
                  data-cy="passwordResetButton"
                  className="btn btn-primary btn-full"
                >
                  Reset
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
