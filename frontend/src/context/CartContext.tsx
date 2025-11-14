import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { CartItem, DeliveryInfo } from '../types';

interface CartContextType {
  items: CartItem[];
  deliveryInfo: DeliveryInfo;
  addItem: (item: CartItem) => void;
  removeItem: (index: number) => void;
  updateQuantity: (index: number, quantity: number) => void;
  clearCart: () => void;
  setDeliveryInfo: (info: DeliveryInfo) => void;
  getTotalItems: () => number;
  getSubtotal: () => number;
  getDeliveryFee: () => number;
  getTotal: () => number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const raw = localStorage.getItem('cart_items');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [deliveryInfo, setDeliveryInfo] = useState<DeliveryInfo>({
    type: 'delivery',
  });

  const addItem = (item: CartItem) => {
    setItems((prev) => [...prev, item]);
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const updateQuantity = (index: number, quantity: number) => {
    if (quantity <= 0) {
      removeItem(index);
      return;
    }
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, quantity } : item))
    );
  };

  const clearCart = () => {
    setItems([]);
    try {
      localStorage.removeItem('cart_items');
    } catch {}
  };

  const getTotalItems = () => {
    return items.reduce((total, item) => total + item.quantity, 0);
  };

  const getSubtotal = () => {
    return items.reduce((total, item) => {
      const hasSize = item.size === 'slice' || item.size === 'half' || item.size === 'full';
      const basePrice = hasSize
        ? (item.size === 'slice'
            ? item.product.pricePerSlice
            : item.size === 'half'
            ? item.product.priceHalfTray
            : item.product.priceFullTray)
        : (item.product.pricePerSlice || item.product.priceHalfTray || item.product.priceFullTray);
      const extrasPrice = item.extras.reduce((sum, extra) => sum + extra.price, 0);
      return total + (basePrice + extrasPrice) * item.quantity;
    }, 0);
  };

  const getDeliveryFee = () => {
    // Regola aggiornata: consegna sempre 1,50€ per domicilio, 0€ per asporto
    return deliveryInfo.type === 'delivery' ? 1.5 : 0;
  };

  const getTotal = () => {
    return getSubtotal() + getDeliveryFee();
  };

  // Persistenza: salva gli articoli su localStorage ad ogni modifica
  useEffect(() => {
    try {
      localStorage.setItem('cart_items', JSON.stringify(items));
    } catch {}
  }, [items]);

  return (
    <CartContext.Provider
      value={{
        items,
        deliveryInfo,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        setDeliveryInfo,
        getTotalItems,
        getSubtotal,
        getDeliveryFee,
        getTotal,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within CartProvider');
  }
  return context;
};
