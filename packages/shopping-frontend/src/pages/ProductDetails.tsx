import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ShoppingCart } from 'lucide-react';
import { api } from '../services/api';
import type { Product } from '../services/api';
import { useAuth } from '../context/AuthContext';

interface ProductDetailsProps {
  onAddToCart: (product: Product) => void;
}

export const ProductDetails: React.FC<ProductDetailsProps> = ({ onAddToCart }) => {
  const id = new URLSearchParams(window.location.search).get('id') || '';
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isAdmin, isSupport } = useAuth();

  useEffect(() => {
    const fetchProduct = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const data = await api.getProduct(id);
        setProduct(data);
      } catch (err: any) {
        setError(err.message || 'Product not found');
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();

    window.addEventListener('products-updated', fetchProduct);
    return () => {
      window.removeEventListener('products-updated', fetchProduct);
    };
  }, [id]);

  // Very very simple YML "parser" translated to React elements
  const renderDetails = (detailsString: string) => {
    if (!detailsString) return null;

    const elements: React.ReactNode[] = [];

    detailsString.split(/\n/g).forEach((line, index) => {
      if (line.startsWith('-')) {
        const items = line.split('-').filter(Boolean);
        elements.push(
          <ul key={`ul-${index}`} className="product-details-list">
            {items.map((item, i) => (
              <li key={`li-${index}-${i}`}>{item.trim()}</li>
            ))}
          </ul>
        );
      } else {
        if (line.trim()) {
          elements.push(<p key={`p-${index}`} className="product-details-para">{line}</p>);
        }
      }
    });

    return <div className="product-details-text">{elements}</div>;
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <span>Loading product details...</span>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="empty-catalog">
        <h2>Error Loading Product</h2>
        <p>{error || 'Product not found'}</p>
        <Link to="/shoppy" className="btn btn-secondary mt-3">
          <ArrowLeft size={16} />
          <span>Back to Catalog</span>
        </Link>
      </div>
    );
  }

  const formattedPrice = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(product.price);

  const isCartDisabled = isAdmin || isSupport;

  return (
    <div className="product-details-container" id={`details-${product.productId}`}>
      <Link to="/shoppy" className="back-link">
        <ArrowLeft size={16} />
        <span>Back to Catalog</span>
      </Link>

      <div className="product-details-grid glass">
        <div className="product-details-image-section">
          <img src={product.image} alt={product.name} className="product-details-img" />
        </div>

        <div className="product-details-info-section">
          <div className="product-details-header">
            <h1 className="product-details-title" data-cy="card-title">
              {product.name}
            </h1>
            <p className="product-details-price">{formattedPrice}</p>
          </div>

          <div className="product-details-description">
            <h3>Description</h3>
            <p>{product.description}</p>
            {product.inventory !== undefined && (
              <p className="product-card-stock" style={{ fontSize: '0.9rem', color: product.inventory < 5 ? '#f43f5e' : '#10b981', fontWeight: 600, marginTop: '8px' }}>
                {product.inventory < 5 ? `Only ${product.inventory} items left in stock!` : `In stock: ${product.inventory}`}
              </p>
            )}
          </div>

          {product.details && (
            <div className="product-details-specs">
              <h3>Specifications & Details</h3>
              {renderDetails(product.details)}
            </div>
          )}

          <div className="product-details-actions">
            <button
              onClick={() => onAddToCart(product)}
              className={`btn btn-primary addToCartButton cart-action-button add-to-cart ${isCartDisabled ? 'disabled' : ''}`}
              disabled={isCartDisabled}
              data-cy="addToCartButton"
              data-id={product.productId}
              data-name={product.name}
              data-price={formattedPrice}
              data-unformattedprice={product.price}
              data-image={product.image}
            >
              <ShoppingCart size={18} />
              <span>Add to Cart</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
