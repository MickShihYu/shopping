import React, { useState, useEffect } from 'react';
import { X, ShoppingCart, Trash2 } from 'lucide-react';
import type { Product } from '../services/api';
import { useCart } from '../context/CartContext';

interface AddToCartModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
}

export const AddToCartModal: React.FC<AddToCartModalProps> = ({ product, isOpen, onClose }) => {
  const { cartItems, addToCart, removeFromCart, updateQuantity } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [lastProduct, setLastProduct] = useState<Product | null>(null);

  useEffect(() => {
    if (product) {
      setLastProduct(product);
    }
  }, [product]);

  // Check if item is already in cart
  const cartItem = lastProduct
    ? cartItems.find((item) => item.productId === lastProduct.productId)
    : null;

  useEffect(() => {
    setQuantity(1);
  }, [lastProduct]);

  if (!lastProduct) return null;

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      if (cartItem) {
        await updateQuantity(lastProduct.productId, quantity);
      } else {
        await addToCart(lastProduct.productId, lastProduct.name, quantity);
      }
      onClose();
    } catch {
      alert('Error updating cart');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemove = async () => {
    if (!cartItem) return;
    setSubmitting(true);
    try {
      await removeFromCart(lastProduct.productId);
      onClose();
    } catch {
      alert('Error removing item from cart');
    } finally {
      setSubmitting(false);
    }
  };

  const totalPrice = lastProduct.price * quantity;
  const formattedTotalPrice = new Intl.NumberFormat('en-US', {
    maximumSignificantDigits: 3,
  }).format(totalPrice);

  return (
    <div
      className={`overlay ${isOpen ? 'active' : ''}`}
      style={{ display: isOpen ? 'flex' : 'none' }}
      onClick={onClose}
    >
      <div
        className="modal-content glass add-to-cart-modal"
        onClick={(e) => e.stopPropagation()}
        id="addToCartModal"
      >
        <div className="modal-header">
          <img id="productImage" src={lastProduct.image} alt={lastProduct.name} className="add-to-cart-img" />
          <h4 id="productName" className="modal-title">{lastProduct.name}</h4>
          <h5 className="modal-title">$<span id="productPrice">{formattedTotalPrice}</span></h5>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          <form className="form-inline" style={{ justifyContent: 'center', flexDirection: 'column', gap: '12px' }} onSubmit={(e) => e.preventDefault()}>
            <input type="hidden" id="unformattedPrice" value={lastProduct.price} />
            <input type="hidden" id="productId" value={lastProduct.productId} />
            <input type="hidden" id="itemQuantity" value={quantity} />
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <label style={{ fontWeight: 600 }}>Quantity</label>
              
              <div className="shopee-input-quantity" id="quantity-spinner" data-id={lastProduct.productId}>
                <button
                  type="button"
                  aria-label="Decrease"
                  className="suQW3X"
                  disabled={quantity <= 1 || submitting}
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                >
                  <svg enableBackground="new 0 0 10 10" viewBox="0 0 10 10" x="0" y="0" className="shopee-svg-icon">
                    <polygon points="4.5 4.5 3.5 4.5 0 4.5 0 5.5 3.5 5.5 4.5 5.5 10 5.5 10 4.5"></polygon>
                  </svg>
                </button>
                
                <input
                  className="suQW3X u00pLG R1imlW"
                  type="text"
                  role="spinbutton"
                  aria-live="assertive"
                  aria-valuenow={quantity}
                  value={quantity}
                  readOnly
                />
                
                <button
                  type="button"
                  aria-label="Increase"
                  className="suQW3X"
                  disabled={(lastProduct.inventory !== undefined && quantity >= lastProduct.inventory) || submitting}
                  onClick={() => setQuantity((q) => q + 1)}
                >
                  <svg enableBackground="new 0 0 10 10" viewBox="0 0 10 10" x="0" y="0" className="shopee-svg-icon icon-plus-sign">
                    <polygon points="10 4.5 5.5 4.5 5.5 0 4.5 0 4.5 4.5 0 4.5 0 5.5 4.5 5.5 4.5 10 5.5 10 5.5 5.5 10 5.5"></polygon>
                  </svg>
                </button>
              </div>

              {lastProduct.inventory !== undefined && (
                <span style={{ fontSize: '0.9rem', color: '#9ca3af', fontWeight: 500 }}>
                  (Stock: {lastProduct.inventory})
                </span>
              )}
            </div>

            {lastProduct.inventory !== undefined && quantity >= lastProduct.inventory && (
              <div style={{ color: '#ef4444', fontSize: '0.85rem', fontWeight: 600, marginTop: '4px' }}>
                Reached purchase limit
              </div>
            )}
          </form>
        </div>

        <div className="modal-footer" style={{ justifyContent: 'center', display: 'flex', gap: '10px' }}>
          <button
            onClick={handleRemove}
            className={`btn btn-secondary ${!cartItem ? 'disabled' : ''}`}
            disabled={!cartItem || submitting}
            id="removeFromCartButton"
            data-cy="removeFromCartButton"
            data-id={lastProduct.productId}
          >
            <Trash2 size={16} />
            <span>Remove from Cart</span>
          </button>
          
          <button
            onClick={handleConfirm}
            className="btn btn-primary"
            disabled={submitting}
            id="confirmAddToCartButton"
            data-cy="confirmAddToCartButton"
          >
            <ShoppingCart size={16} />
            <span>{cartItem ? 'Update Cart' : 'Confirm'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
