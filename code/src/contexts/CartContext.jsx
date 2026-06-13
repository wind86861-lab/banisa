import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import axiosInstance from '../shared/api/axios';
import { useUserAuth } from '../shared/auth/UserAuthContext';

const CartContext = createContext();

export const useCart = () => {
    const context = useContext(CartContext);
    if (!context) throw new Error('useCart must be used within CartProvider');
    return context;
};

export const CartProvider = ({ children }) => {
    const { user } = useUserAuth();
    const [cart, setCart] = useState([]);
    const [loading, setLoading] = useState(false);
    const [cartCount, setCartCount] = useState(0);
    const [addingToCart, setAddingToCart] = useState(false);

    const userRef = useRef(user);
    useEffect(() => { userRef.current = user; }, [user]);

    // Ref mirror of addingToCart — React state updates aren't observable to
    // the next microtask, so two rapid clicks (e.g. on the same xizmatlar
    // grid before the first finishes) can both clear the `addingToCart`
    // closure guard. The ref flips synchronously and stops that race.
    const addingRef = useRef(false);

    // Compute cartCount from cart array
    const computeCount = (cartData) => {
        return (cartData || []).reduce((sum, group) => sum + (group.itemCount || 0), 0);
    };

    // ─── FETCH CART FROM BACKEND ──────────────────────────────────────
    // Simple: GET /cart → set state. No abort controller magic.
    const fetchCart = useCallback(async () => {
        if (!userRef.current) {
            setCart([]);
            setCartCount(0);
            return [];
        }
        try {
            setLoading(true);
            const res = await axiosInstance.get('/cart');
            const data = res.data.data || [];
            setCart(data);
            setCartCount(computeCount(data));
            return data;
        } catch (err) {
            if (err.name === 'CanceledError' || err.name === 'AbortError') return cart;
            console.error('Cart fetch error:', err);
            return cart;
        } finally {
            setLoading(false);
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // ─── ADD TO CART ──────────────────────────────────────────────────
    // Dead simple: POST to backend, then fetch fresh cart. No optimistic nonsense.
    //
    // userRef (not closure-captured `user`) so a Mini App auth that just
    // resolved INSIDE the click handler is visible here — without this the
    // caller's await waitForUser() would set the user, but addToCart would
    // still see the stale null from the render that bound this function.
    const addToCart = async (clinicId, serviceType, serviceId, quantity = 1) => {
        if (!userRef.current) {
            return { success: false, message: 'Iltimos, tizimga kiring' };
        }
        if (addingRef.current || addingToCart) {
            return { success: false, message: 'Iltimos, kuting...' };
        }

        // Temporary policy: cart may only hold items from one clinic at a time.
        // Backend enforces this too; this is just a friendlier client-side guard.
        const existingClinic = cart.find(g => g.clinic?.id && g.clinic.id !== clinicId);
        if (existingClinic) {
            return {
                success: false,
                message: `Savatingizda allaqachon boshqa klinika ("${existingClinic.clinic.nameUz || existingClinic.clinic.name || ''}") xizmatlari bor. Bir vaqtning o'zida faqat bitta klinikadan bron qilish mumkin.`,
            };
        }

        addingRef.current = true;
        setAddingToCart(true);
        try {
            await axiosInstance.post('/cart', { clinicId, serviceType, serviceId, quantity });
            // POST succeeded — now fetch real cart state from backend
            await fetchCart();
            return { success: true, message: 'Savatga qo\'shildi!' };
        } catch (error) {
            console.error('Add to cart error:', error);
            const status = error.response?.status;
            const code = error.response?.data?.error?.code;
            const raw = error.response?.data?.error?.message
                || error.response?.data?.message
                || '';

            // The /cart endpoint is patient-only. If the caller is signed
            // in as a clinic admin (or has no session at all) Express
            // returns "Permission denied", which is opaque to a patient
            // staring at a service card. Translate it.
            let msg;
            if (status === 403 || code === 'FORBIDDEN' || /permission denied/i.test(raw)) {
                msg = "Bron qilish uchun bemor sifatida tizimga kiring";
            } else if (status === 401) {
                msg = "Iltimos, tizimga kiring";
            } else {
                msg = raw || 'Xatolik yuz berdi';
            }
            return { success: false, message: msg };
        } finally {
            addingRef.current = false;
            setAddingToCart(false);
        }
    };

    // ─── REMOVE FROM CART ─────────────────────────────────────────────
    const removeFromCart = async (cartItemId) => {
        if (!user) return { success: false, message: 'Xatolik yuz berdi' };
        const prev = [...cart];
        try {
            // Optimistic remove
            setCart(c => {
                const updated = c.map(g => {
                    const items = g.items.filter(i => i.id !== cartItemId);
                    return { ...g, items, itemCount: items.reduce((s, i) => s + i.quantity, 0), totalPrice: items.reduce((s, i) => s + (i.service?.priceRecommended || 0) * i.quantity, 0) };
                }).filter(g => g.items.length > 0);
                setCartCount(computeCount(updated));
                return updated;
            });
            await axiosInstance.delete(`/cart/${cartItemId}`);
            return { success: true, message: 'Savatdan o\'chirildi' };
        } catch (error) {
            console.error('Remove from cart error:', error);
            setCart(prev);
            setCartCount(computeCount(prev));
            return { success: false, message: 'Xatolik yuz berdi' };
        }
    };

    // ─── UPDATE QUANTITY ──────────────────────────────────────────────
    const updateQuantity = async (cartItemId, quantity) => {
        if (!user) return { success: false };
        const prev = [...cart];
        try {
            setCart(c => {
                const updated = c.map(g => {
                    const items = g.items.map(i => i.id === cartItemId ? { ...i, quantity } : i);
                    return { ...g, items, itemCount: items.reduce((s, i) => s + i.quantity, 0), totalPrice: items.reduce((s, i) => s + (i.service?.priceRecommended || 0) * i.quantity, 0) };
                });
                setCartCount(computeCount(updated));
                return updated;
            });
            await axiosInstance.patch(`/cart/${cartItemId}/quantity`, { quantity });
            return { success: true };
        } catch (error) {
            console.error('Update quantity error:', error);
            setCart(prev);
            setCartCount(computeCount(prev));
            return { success: false };
        }
    };

    // ─── CLEAR CART ───────────────────────────────────────────────────
    const clearCart = async () => {
        if (!user) return { success: false, message: 'Xatolik yuz berdi' };
        const prev = [...cart];
        try {
            setCart([]);
            setCartCount(0);
            await axiosInstance.delete('/cart');
            return { success: true, message: 'Savat tozalandi' };
        } catch (error) {
            console.error('Clear cart error:', error);
            setCart(prev);
            setCartCount(computeCount(prev));
            return { success: false, message: 'Xatolik yuz berdi' };
        }
    };

    // ─── ON USER CHANGE: fetch cart from backend ──────────────────────
    useEffect(() => {
        if (user?.id) {
            fetchCart();
        } else {
            setCart([]);
            setCartCount(0);
        }
    }, [user?.id, fetchCart]);

    return (
        <CartContext.Provider value={{
            cart,
            cartCount,
            loading,
            addingToCart,
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
