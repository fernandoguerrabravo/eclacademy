"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useCallback,
} from "react";

export interface CartItem {
  id: number; // id del CartItem
  courseId: number;
  slug: string;
  title: string;
  price: number;
  icon: string;
}

interface CartState {
  items: CartItem[];
  total: number;
  count: number;
}

interface CartContextType extends CartState {
  isOpen: boolean;
  loading: boolean;
  addItem: (courseId: number) => Promise<void>;
  removeItem: (courseId: number) => Promise<void>;
  clearCart: () => Promise<void>;
  openCart: () => void;
  closeCart: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<CartState>({
    items: [],
    total: 0,
    count: 0,
  });
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const applyCart = useCallback((cart: CartState) => {
    setState({
      items: cart.items ?? [],
      total: cart.total ?? 0,
      count: cart.count ?? 0,
    });
  }, []);

  // Carga inicial desde el servidor
  useEffect(() => {
    fetch("/api/cart")
      .then((r) => r.json())
      .then((data) => applyCart(data.cart))
      .catch(() => {});
  }, [applyCart]);

  const addItem = useCallback(
    async (courseId: number) => {
      setLoading(true);
      try {
        const res = await fetch("/api/cart", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ courseId }),
        });
        const data = await res.json();
        if (res.ok) {
          applyCart(data.cart);
          setIsOpen(true);
        }
      } finally {
        setLoading(false);
      }
    },
    [applyCart]
  );

  const removeItem = useCallback(
    async (courseId: number) => {
      setLoading(true);
      try {
        const res = await fetch(`/api/cart?courseId=${courseId}`, {
          method: "DELETE",
        });
        const data = await res.json();
        if (res.ok) applyCart(data.cart);
      } finally {
        setLoading(false);
      }
    },
    [applyCart]
  );

  const clearCart = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/cart", { method: "DELETE" });
      const data = await res.json();
      if (res.ok) applyCart(data.cart);
    } finally {
      setLoading(false);
    }
  }, [applyCart]);

  const openCart = useCallback(() => setIsOpen(true), []);
  const closeCart = useCallback(() => setIsOpen(false), []);

  return (
    <CartContext.Provider
      value={{
        ...state,
        isOpen,
        loading,
        addItem,
        removeItem,
        clearCart,
        openCart,
        closeCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error("useCart debe usarse dentro de CartProvider");
  }
  return ctx;
}
