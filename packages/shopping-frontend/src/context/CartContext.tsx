import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import type { CartItem } from '../services/api';
import { useAuth } from './AuthContext';

interface RichCartItem extends CartItem {
  price?: number;
  image?: string;
  inventory?: number;
}

interface CartContextType {
  cartItems: RichCartItem[];
  loading: boolean;
  addToCart: (productId: string, name: string, quantity: number) => Promise<void>;
  removeFromCart: (productId: string) => Promise<void>;
  removeMultipleFromCart: (productIds: string[]) => Promise<void>;
  updateQuantity: (productId: string, quantity: number) => Promise<void>;
  checkout: (items: RichCartItem[], phone?: string, email?: string) => Promise<void>;
  refreshCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [cartItems, setCartItems] = useState<RichCartItem[]>([]);
  const [loading, setLoading] = useState(false);

  const refreshCart = useCallback(async () => {
    if (!user) {
      setCartItems([]);
      return;
    }
    setLoading(true);
    try {
      const cart = await api.getShoppingCartItems();
      if (cart && cart.items) {
        // Resolve prices, images, and inventory for items
        const richItems: RichCartItem[] = await Promise.all(
          cart.items.map(async (item) => {
            try {
              const product = await api.getProduct(item.productId);
              return {
                ...item,
                price: product.price,
                image: product.image,
                inventory: product.inventory,
              };
            } catch {
              return item;
            }
          })
        );
        setCartItems(richItems);
      } else {
        setCartItems([]);
      }
    } catch {
      setCartItems([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refreshCart();
  }, [refreshCart]);

  const addToCart = async (productId: string, name: string, quantity: number) => {
    if (!user) throw new Error('Must be logged in');
    await api.addToCart({ productId, quantity, name });
    await refreshCart();
  };

  const updateQuantity = async (productId: string, quantity: number) => {
    if (!user) return;
    const updated = cartItems.map((item) =>
      item.productId === productId ? { ...item, quantity } : item
    );
    await api.updateCart(
      updated.map(({ productId: pid, quantity: q, name }) => ({ productId: pid, quantity: q, name }))
    );
    await refreshCart();
  };

  const removeFromCart = async (productId: string) => {
    if (!user) return;
    const updated = cartItems.filter((item) => item.productId !== productId);
    await api.updateCart(
      updated.map(({ productId: pid, quantity: q, name }) => ({ productId: pid, quantity: q, name }))
    );
    await refreshCart();
  };

  const removeMultipleFromCart = async (productIds: string[]) => {
    if (!user) return;
    const updated = cartItems.filter((item) => !productIds.includes(item.productId));
    await api.updateCart(
      updated.map(({ productId: pid, quantity: q, name }) => ({ productId: pid, quantity: q, name }))
    );
    await refreshCart();
  };

  const checkout = async (items: RichCartItem[], phone?: string, email?: string) => {
    if (!user) return;
    const total = items.reduce((acc, item) => acc + (item.price || 0) * item.quantity, 0);
    // Create the order on backend with only selected items
    await api.makeOrder({
      fullName: `${user.firstName} ${user.lastName}`,
      phone: phone || '',
      email: email || user.email,
      products: items.map(({ productId, quantity, name, price }) => ({
        productId,
        quantity,
        name,
        price: price || 0,
      })),
      total,
    });
    // Remove only the checked-out items from the cart (keep unselected ones)
    const checkedOutIds = new Set(items.map((i) => i.productId));
    const remaining = cartItems.filter((item) => !checkedOutIds.has(item.productId));
    if (remaining.length === 0) {
      await api.deleteShoppingCart();
    } else {
      await api.updateCart(
        remaining.map(({ productId, quantity, name }) => ({ productId, quantity, name }))
      );
    }
    setCartItems(remaining);

    // Dispatch a custom event to notify components to refresh product stock info
    window.dispatchEvent(new Event('products-updated'));
  };

  return (
    <CartContext.Provider
      value={{
        cartItems,
        loading,
        addToCart,
        removeFromCart,
        removeMultipleFromCart,
        updateQuantity,
        checkout,
        refreshCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
