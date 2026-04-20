import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import axiosInstance from '../shared/api/axios';
import { useUserAuth } from '../shared/auth/UserAuthContext';

const CartContext = createContext();

export const useCart = () => {
    const context = useContext(CartContext);
    if (!context) throw new Error('useCart must be used within CartProvider');
    return context;
};

const CART_STORAGE_PREFIX = 'banisa_cart_';
const getCartKey = (userId) => userId ? `${CART_STORAGE_PREFIX}${userId}` : null;

export const CartProvider = ({ children }) => {
    const { user } = useUserAuth();
    const [cart, setCart] = useState([]);
    const [loading, setLoading] = useState(false);
    const [cartCount, setCartCount] = useState(0);

    const abortControllerRef = useRef(null);
    const syncTimeoutRef = useRef(null);
    const prevUserIdRef = useRef(null);

    // Sync cart to localStorage whenever it changes (tied to user ID)
    useEffect(() => {
        const key = getCartKey(user?.id);
        if (!key) return;
        if (cart.length > 0) {
            localStorage.setItem(key, JSON.stringify(cart));
            const total = cart.reduce((sum, group) => sum + group.itemCount, 0);
            setCartCount(total);
        } else {
            localStorage.removeItem(key);
            setCartCount(0);
        }
    }, [cart, user?.id]);

    // Fetch cart from backend (only when user is logged in)
    const fetchCart = useCallback(async () => {
        if (!user) {
            setCart([]);
            setCartCount(0);
            return;
        }

        // Cancel previous request if still pending
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        abortControllerRef.current = new AbortController();

        try {
            setLoading(true);
            const response = await axiosInstance.get('/cart', {
                signal: abortControllerRef.current.signal
            });
            const cartData = response.data.data || [];
            setCart(cartData);
        } catch (error) {
            if (error.name === 'AbortError' || error.name === 'CanceledError') {
                return; // Request was cancelled, ignore
            }
            console.error('Savatni yuklashda xatolik:', error);
            // Keep localStorage data on error
        } finally {
            setLoading(false);
            abortControllerRef.current = null;
        }
    }, [user]);

    // Debounced background sync
    const scheduleSyncWithBackend = useCallback(() => {
        if (!user) return;

        if (syncTimeoutRef.current) {
            clearTimeout(syncTimeoutRef.current);
        }

        syncTimeoutRef.current = setTimeout(() => {
            fetchCart();
        }, 800);
    }, [user, fetchCart]);

    // Add to cart with optimistic update
    const addToCart = async (clinicId, serviceType, serviceId, quantity = 1) => {
        if (!user) {
            return { success: false, message: 'Iltimos, tizimga kiring' };
        }

        try {
            // Optimistic: increment count immediately
            setCartCount(prev => prev + quantity);

            await axiosInstance.post('/cart', { clinicId, serviceType, serviceId, quantity });

            // Schedule background sync
            scheduleSyncWithBackend();

            return { success: true, message: 'Savatga qo\'shildi!' };
        } catch (error) {
            console.error('Savatga qo\'shishda xatolik:', error);
            // Revert optimistic update
            setCartCount(prev => Math.max(0, prev - quantity));
            return { success: false, message: error.response?.data?.message || 'Xatolik yuz berdi' };
        }
    };

    // Remove from cart with optimistic update
    const removeFromCart = async (cartItemId) => {
        if (!user) return { success: false, message: 'Xatolik yuz berdi' };

        const itemToRemove = cart.flatMap(g => g.items).find(i => i.id === cartItemId);
        const removedQuantity = itemToRemove?.quantity || 0;
        const previousCart = [...cart];

        try {
            // Optimistic: remove item immediately
            setCart(prevCart => {
                return prevCart.map(group => {
                    const filteredItems = group.items.filter(item => item.id !== cartItemId);
                    return {
                        ...group,
                        items: filteredItems,
                        itemCount: filteredItems.reduce((sum, i) => sum + i.quantity, 0),
                        totalPrice: filteredItems.reduce((sum, i) => sum + (i.service?.priceRecommended || 0) * i.quantity, 0)
                    };
                }).filter(group => group.items.length > 0);
            });

            await axiosInstance.delete(`/cart/${cartItemId}`);

            return { success: true, message: 'Savatdan o\'chirildi' };
        } catch (error) {
            console.error('Savatdan o\'chirishda xatolik:', error);
            // Revert on error
            setCart(previousCart);
            return { success: false, message: 'Xatolik yuz berdi' };
        }
    };

    // Update quantity with optimistic update
    const updateQuantity = async (cartItemId, quantity) => {
        if (!user) return { success: false };

        const previousCart = [...cart];

        try {
            // Optimistic: update quantity immediately
            setCart(prevCart => {
                return prevCart.map(group => {
                    const updatedItems = group.items.map(item =>
                        item.id === cartItemId ? { ...item, quantity } : item
                    );
                    return {
                        ...group,
                        items: updatedItems,
                        itemCount: updatedItems.reduce((sum, i) => sum + i.quantity, 0),
                        totalPrice: updatedItems.reduce((sum, i) => sum + (i.service?.priceRecommended || 0) * i.quantity, 0)
                    };
                });
            });

            await axiosInstance.patch(`/cart/${cartItemId}/quantity`, { quantity });

            return { success: true };
        } catch (error) {
            console.error('Miqdorni yangilashda xatolik:', error);
            // Revert on error
            setCart(previousCart);
            return { success: false };
        }
    };

    // Clear cart with optimistic update
    const clearCart = async () => {
        if (!user) return { success: false, message: 'Xatolik yuz berdi' };

        const previousCart = [...cart];

        try {
            // Optimistic: clear immediately
            setCart([]);

            await axiosInstance.delete('/cart');

            return { success: true, message: 'Savat tozalandi' };
        } catch (error) {
            console.error('Savatni tozalashda xatolik:', error);
            // Revert on error
            setCart(previousCart);
            return { success: false, message: 'Xatolik yuz berdi' };
        }
    };

    // When user changes: load their cart from localStorage, then fetch from backend
    useEffect(() => {
        const currentUserId = user?.id || null;
        const prevUserId = prevUserIdRef.current;
        prevUserIdRef.current = currentUserId;

        if (currentUserId) {
            // User logged in — load their cached cart, then sync from backend
            const key = getCartKey(currentUserId);
            try {
                const savedCart = localStorage.getItem(key);
                if (savedCart) {
                    const cartData = JSON.parse(savedCart);
                    setCart(cartData);
                    setCartCount(cartData.reduce((sum, g) => sum + g.itemCount, 0));
                } else {
                    setCart([]);
                    setCartCount(0);
                }
            } catch {
                setCart([]);
                setCartCount(0);
            }
            fetchCart();
        } else {
            // User logged out — clear in-memory cart (localStorage stays per-user)
            setCart([]);
            setCartCount(0);
        }

        // Cleanup on unmount
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
            if (syncTimeoutRef.current) {
                clearTimeout(syncTimeoutRef.current);
            }
        };
    }, [user?.id, fetchCart]);

    return (
        <CartContext.Provider value={{
            cart,
            cartCount,
            loading,
            addToCart,
            removeFromCart,
            updateQuantity,
            clearCart,
            refreshCart: fetchCart,
        }}>
            {children}
        </CartContext.Provider>
    );
};
