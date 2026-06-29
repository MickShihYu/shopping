import React, { useState, useEffect } from 'react';
import { X, Trash2, ShoppingBag } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

interface CartModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CartModal: React.FC<CartModalProps> = ({ isOpen, onClose }) => {
  const { cartItems, updateQuantity, removeMultipleFromCart, checkout } = useCart();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [checkingOut, setCheckingOut] = useState(false);
  const { user } = useAuth();
  const [phone, setPhone] = useState(user?.phone || '');
  const [email, setEmail] = useState(user?.email || '');

  useEffect(() => {
    if (isOpen && user) {
      setPhone(user.phone || '');
      setEmail(user.email || '');
    }
  }, [isOpen, user]);

  const handleCheckboxChange = (productId: string) => {
    setSelectedIds((prev) =>
      prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId]
    );
  };

  const handleRemoveSelected = async () => {
    if (selectedIds.length === 0) return;
    await removeMultipleFromCart(selectedIds);
    setSelectedIds([]);
  };

  const selectedItems = cartItems.filter((item) => selectedIds.includes(item.productId));

  const handleCheckout = async () => {
    if (selectedIds.length === 0) {
      alert('Please select at least one item to checkout.');
      return;
    }

    setCheckingOut(true);

    // --- Frontend Validation Check ---
    for (const item of selectedItems) {
      try {
        const product = await api.getProduct(item.productId);
        if (!product) {
          alert(`Product "${item.name}" does not exist anymore.`);
          setCheckingOut(false);
          return;
        }
        if (!product.isActive) {
          alert(`Product "${item.name}" is no longer available (not active).`);
          setCheckingOut(false);
          return;
        }
        if (product.inventory !== undefined && product.inventory < item.quantity) {
          alert(`Insufficient stock for product "${item.name}". Available: ${product.inventory}, Requested: ${item.quantity}.`);
          setCheckingOut(false);
          return;
        }
      } catch (err: any) {
        alert(`Failed to verify product "${item.name}": ${err.message}`);
        setCheckingOut(false);
        return;
      }
    }
    // ---------------------------------

    try {
      await checkout(selectedItems, phone, email);
      setSelectedIds([]);
      onClose();
    } catch (e: any) {
      alert(e.message || 'Checkout failed, please try again.');
      window.location.reload();
    } finally {
      setCheckingOut(false);
    }
  };

  const total = selectedItems.reduce((acc, item) => acc + (item.price || 0) * item.quantity, 0);
  const formattedTotal = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(total);

  return (
    <div
      className={`overlay ${isOpen ? 'active' : ''}`}
      style={{ display: isOpen ? 'flex' : 'none' }}
      onClick={onClose}
    >
      <div
        className="modal-content glass cart-modal"
        onClick={(e) => e.stopPropagation()}
        data-cy="shoppingCart"
      >
        <div className="modal-header">
          <h2 className="modal-title d-flex align-items-center gap-8">
            <ShoppingBag size={22} />
            <span>Shopping Cart</span>
          </h2>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {cartItems.length === 0 ? (
          <div className="cart-empty-state">
            <p>Your cart is currently empty.</p>
          </div>
        ) : (
          <>
            <ul className="cart-items-list list-group" data-cy="list-group">
              {cartItems.map((item) => (
                <li
                  key={item.productId}
                  className="cart-item-row list-group-item d-flex justify-content-between align-items-center item-in-cart"
                  id={`list-${item.productId}`}
                >
                  <span className="cart-item-left-section">
                    <input
                      type="checkbox"
                      className="cart-item-checkbox"
                      data-cy="cartItem"
                      name="cartItem"
                      data-id={item.productId}
                      checked={selectedIds.includes(item.productId)}
                      onChange={() => handleCheckboxChange(item.productId)}
                    />

                    {item.image && (
                      <img src={item.image} alt={item.name} className="cart-item-img details-img" />
                    )}

                    <div className="cart-item-info">
                      <h5 className="cart-item-name card-title" data-cy="card-title">{item.name}</h5>
                    </div>
                  </span>

                  <span className="cart-item-right-section">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <h6 style={{ margin: 0 }}>{item.price ? `$${item.price.toFixed(2)}` : '—'}</h6>
                      <div className="cart-item-quantity-wrapper">
                        <div className="shopee-input-quantity">
                          <button
                            type="button"
                            aria-label="Decrease"
                            className="suQW3X"
                            disabled={item.quantity <= 1}
                            onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                          >
                            <svg enableBackground="new 0 0 10 10" viewBox="0 0 10 10" className="shopee-svg-icon">
                              <polygon points="4.5 4.5 3.5 4.5 0 4.5 0 5.5 3.5 5.5 4.5 5.5 10 5.5 10 4.5"></polygon>
                            </svg>
                          </button>
                          <input
                            className="suQW3X u00pLG R1imlW"
                            type="text"
                            role="spinbutton"
                            value={item.quantity}
                            readOnly
                          />
                          <button
                            type="button"
                            aria-label="Increase"
                            className="suQW3X"
                            disabled={item.inventory !== undefined && item.quantity >= item.inventory}
                            onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                          >
                            <svg enableBackground="new 0 0 10 10" viewBox="0 0 10 10" className="shopee-svg-icon icon-plus-sign">
                              <polygon points="10 4.5 5.5 4.5 5.5 0 4.5 0 4.5 4.5 0 4.5 0 5.5 4.5 5.5 4.5 10 5.5 10 5.5 5.5 10 5.5"></polygon>
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                    {item.inventory !== undefined && (
                      <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                        Stock: {item.inventory}
                      </span>
                    )}
                    {item.inventory !== undefined && item.quantity >= item.inventory && (
                      <span style={{ color: '#ef4444', fontSize: '0.75rem', fontWeight: 600 }}>
                        Reached purchase limit
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ul>

            <div className="cart-summary-section">
              <div className="cart-total-row">
                <span>Selected Total:</span>
                <span className="cart-total-price">{formattedTotal}</span>
              </div>

              <div className="cart-customer-info" style={{ marginTop: '16px', marginBottom: '16px' }}>
                <h6 style={{ marginBottom: '12px' }}>Customer Info (Optional)</h6>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <input
                    type="tel"
                    className="form-control"
                    placeholder="Phone Number"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                  <input
                    type="email"
                    className="form-control"
                    placeholder="Email (defaults to account email)"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="cart-actions-row">
                <button
                  onClick={handleRemoveSelected}
                  className={`btn btn-secondary btn-full btn-sm ${selectedIds.length === 0 ? 'disabled' : ''}`}
                  disabled={selectedIds.length === 0}
                  data-cy="removeItemsButton"
                  id="removeItemsButton"
                >
                  <Trash2 size={16} />
                  <span>Remove from Cart</span>
                </button>

                <button
                  onClick={handleCheckout}
                  className="btn btn-primary btn-full"
                  disabled={checkingOut || selectedIds.length === 0}
                  data-cy="checkOutButton"
                  id="checkOutButton"
                >
                  {checkingOut ? (
                    <>
                      <span className="spinner-border spinner-border-sm"></span>
                      <span>Processing...</span>
                    </>
                  ) : (
                    <span>Checkout</span>
                  )}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
