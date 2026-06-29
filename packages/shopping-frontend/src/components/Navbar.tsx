import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, LogOut, Search, Settings } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

interface NavbarProps {
  onOpenAuth: (isSignUp?: boolean) => void;
  onOpenCart: () => void;
  onSearch: (query: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenAuth, onOpenCart, onSearch }) => {
  const { user, logout, isAdmin, isSupport } = useAuth();
  const { cartItems } = useCart();
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchQuery);
    navigate(`/shoppy?search=${encodeURIComponent(searchQuery)}`);
  };

  const cartCount = cartItems.length;

  return (
    <nav className="navbar glass">
      <div className="navbar-container">
        <Link to="/shoppy" className="navbar-logo" data-cy="logo">
          Shoppy
        </Link>

        <div className="navbar-links">
          <Link to="/shoppy" className="nav-link-item">
            Home
          </Link>
          
          {(isAdmin || isSupport) && (
            <Link to="/product-management" className="nav-link-item" data-cy="productsMenu">
              <Settings size={18} />
              <span>Products</span>
            </Link>
          )}

          {user && !isAdmin && !isSupport && (
            <>
              <Link to="/orders" className="nav-link-item" data-cy="ordersMenu">
                Orders
              </Link>
              <button className="nav-cart-btn" onClick={onOpenCart} data-cy="shoppingCartLink">
                <ShoppingCart size={20} />
                <span>Cart</span>
                {cartCount > 0 && (
                  <span className="cart-badge" id="itemsInCart">
                    {cartCount}
                  </span>
                )}
              </button>
            </>
          )}
        </div>

        <form onSubmit={handleSearchSubmit} className="search-form">
          <div className="search-input-wrapper">
            <input
              type="text"
              className="search-input"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              data-cy="search"
            />
            <button type="submit" className="search-btn" data-cy="searchButton">
              <Search size={16} />
            </button>
          </div>
        </form>

        <div className="navbar-auth">
          {user ? (
            <div className="user-profile-menu">
              <Link to={`/profile?id=${user.id}`} className="user-info" data-cy="user">
                <img src="/user.png" alt="Profile" className="user-avatar" onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }} />
                <span className="user-name">{user.firstName} {user.lastName}</span>
              </Link>
              <button onClick={logout} className="logout-btn" data-cy="logOut">
                <LogOut size={16} />
                <span>Log Out</span>
              </button>
            </div>
          ) : (
            <div className="auth-buttons">
              <button className="btn btn-secondary btn-sm" onClick={() => onOpenAuth(false)} data-cy="logIn">
                Log In
              </button>
              <button className="btn btn-primary btn-sm" onClick={() => onOpenAuth(true)} data-cy="signUp">
                Sign Up
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};
