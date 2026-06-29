import React, {useEffect, useState} from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import {AddToCartModal} from './components/AddToCartModal';
import {AuthModal} from './components/AuthModal';
import {CartModal} from './components/CartModal';
import {Navbar} from './components/Navbar';
import {AuthProvider} from './context/AuthContext';
import {CartProvider} from './context/CartContext';

import { Landing } from './pages/Landing';
import { Home } from './pages/Home';
import { ProductDetails } from './pages/ProductDetails';
import { ProductManagement } from './pages/ProductManagement';
import { Profile } from './pages/Profile';
import { Orders } from './pages/Orders';
import { ResetPasswordFinish } from './pages/ResetPasswordFinish';
import { ResetPasswordInit } from './pages/ResetPasswordInit';

import type { Product } from './services/api';

import {useAuth} from './context/AuthContext';

const AppContent: React.FC = () => {
  const {user, loading} = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [searchQuery, setSearchQuery] = useState(() => {
    return new URLSearchParams(window.location.search).get('search') || '';
  });
  const [searchTrigger, setSearchTrigger] = useState(0);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [activeProductForCart, setActiveProductForCart] = useState<Product | null>(null);

  // Route guarding redirect to home if not logged in
  useEffect(() => {
    if (!loading && !user) {
      if (
        location.pathname.startsWith('/profile') ||
        location.pathname.startsWith('/orders') ||
        location.pathname.startsWith('/product-management')
      ) {
        navigate('/shoppy', { replace: true });
      }
    }
  }, [user, loading, location.pathname, navigate]);

  // Sync searchQuery when URL query parameter changes (e.g., navigating back)
  useEffect(() => {
    const query = new URLSearchParams(location.search).get('search') || '';
    setSearchQuery(query);
  }, [location.search]);

  const handleOpenAuth = (signUpState = false) => {
    setIsSignUp(signUpState);
    setIsAuthOpen(true);
  };

  const handleAddToCartClick = (product: Product) => {
    if (!user) {
      handleOpenAuth(false);
    } else {
      setActiveProductForCart(product);
    }
  };

  return (
    <div className="app-container">
      {location.pathname !== '/' && (
        <Navbar
          onOpenAuth={handleOpenAuth}
          onOpenCart={() => setIsCartOpen(true)}
          onSearch={(query) => {
            setSearchQuery(query);
            setSearchTrigger(prev => prev + 1);
          }}
        />
      )}

      <main>
        <Routes>
          <Route
            path="/"
            element={<Landing />}
          />
          <Route
            path="/shoppy"
            element={<Home searchQuery={searchQuery} searchTrigger={searchTrigger} onAddToCart={handleAddToCartClick} />}
          />
          <Route
            path="/shoppy.html"
            element={<Navigate to="/shoppy" replace />}
          />
          <Route
            path="/product"
            element={<ProductDetails onAddToCart={handleAddToCartClick} />}
          />
          <Route
            path="/product.html"
            element={<Navigate to="/product" replace />}
          />
          <Route
            path="/profile"
            element={
              !loading && !user ? (
                <Navigate to="/shoppy" replace />
              ) : (
                <Profile />
              )
            }
          />
          <Route
            path="/profile.html"
            element={<Navigate to="/profile" replace />}
          />
          <Route
            path="/orders"
            element={
              !loading && !user ? (
                <Navigate to="/shoppy" replace />
              ) : (
                <Orders />
              )
            }
          />
          <Route
            path="/product-management"
            element={
              !loading && !user ? (
                <Navigate to="/shoppy" replace />
              ) : (
                <ProductManagement />
              )
            }
          />
          <Route
            path="/product-management.html"
            element={<Navigate to="/product-management" replace />}
          />
          <Route
            path="/reset-password-init"
            element={<ResetPasswordInit />}
          />
          <Route
            path="/reset-password-init.html"
            element={<Navigate to="/reset-password-init" replace />}
          />
          <Route
            path="/reset-password-finish"
            element={<ResetPasswordFinish />}
          />
          <Route
            path="/reset-password-finish.html"
            element={<Navigate to="/reset-password-finish" replace />}
          />
          {/* Fallback */}
          <Route path="*" element={<Navigate to="/shoppy" replace />} />
        </Routes>
      </main>

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        initialIsSignUp={isSignUp}
      />

      <CartModal isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />

      <AddToCartModal
        product={activeProductForCart}
        isOpen={activeProductForCart !== null}
        onClose={() => setActiveProductForCart(null)}
      />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <CartProvider>
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </CartProvider>
    </AuthProvider>
  );
};

export default App;
