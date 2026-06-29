import React from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, Eye } from 'lucide-react';
import type { Product } from '../services/api';
import { useAuth } from '../context/AuthContext';

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onAddToCart }) => {
  const { isAdmin, isSupport } = useAuth();
  
  const formattedPrice = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(product.price);

  const isCartDisabled = isAdmin || isSupport;

  return (
    <div className="product-card glass-interactive" data-cy="card" id={`card-${product.productId}`}>
      <div className="product-image-container">
        <img
          src={product.image}
          alt={product.name}
          className="product-card-img"
          loading="lazy"
        />
        <div className="product-card-overlay">
          <Link to={`/product?id=${product.productId}`} className="btn btn-secondary btn-sm card-overlay-btn">
            <Eye size={16} />
            <span>View Details</span>
          </Link>
        </div>
      </div>
      
      <div className="product-card-body">
        <h3 className="product-card-title" data-cy="card-title">
          {product.name}
        </h3>
        <p className="product-card-price">{formattedPrice}</p>
        <p className="product-card-desc">{product.description}</p>
        {product.inventory !== undefined && (
          <p className="product-card-stock" style={{ fontSize: '0.85rem', color: product.inventory < 5 ? '#f43f5e' : '#10b981', fontWeight: 600, marginTop: '4px' }}>
            {product.inventory < 5 ? `Only ${product.inventory} left!` : `In stock: ${product.inventory}`}
          </p>
        )}
        
        <div className="product-card-actions action-buttons" data-cy="action-buttons">
          <button
            onClick={() => onAddToCart(product)}
            className={`btn btn-primary btn-sm addToCartButton cart-action-button add-to-cart ${isCartDisabled ? 'disabled' : ''}`}
            disabled={isCartDisabled}
            data-cy="addToCartButton"
            data-id={product.productId}
            data-name={product.name}
            data-price={formattedPrice}
            data-unformattedprice={product.price}
            data-image={product.image}
          >
            <ShoppingCart size={16} />
            <span>Add to Cart</span>
          </button>
          
          <Link
            to={`/product?id=${product.productId}`}
            className="btn btn-secondary btn-sm"
          >
            Details
          </Link>
        </div>
      </div>
    </div>
  );
};
