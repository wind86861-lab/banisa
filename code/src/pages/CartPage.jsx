import React, { useState } from 'react';
import { useCart } from '../contexts/CartContext';
import { ShoppingCart, Trash2, Plus, Minus, X, MapPin, Phone, Package, ArrowRight, ArrowLeft, Building2, ChevronRight, Activity, Stethoscope, Leaf, Heart, AlertCircle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import TopBar from './home/TopBar';
import Navigation from './home/Navigation';
import Footer from './home/Footer';
import './CartPage.css';

const QUICK_CATS = [
    { id: 'diagnostika', label: 'Diagnostika', Icon: Activity, color: '#00BDE0' },
    { id: 'operatsiya', label: 'Operatsiya', Icon: Stethoscope, color: '#e74c3c' },
    { id: 'sanatoriya', label: 'Sanatoriya', Icon: Leaf, color: '#27ae60' },
    { id: 'checkup', label: 'Checkup', Icon: Package, color: '#9b59b6' },
];

const CartPage = () => {
    const { cart, loading, removeFromCart, updateQuantity, clearCart } = useCart();
    const navigate = useNavigate();
    const [confirmingClear, setConfirmingClear] = useState(false);
    const [opError, setOpError] = useState('');

    const handleRemove = async (itemId) => {
        setOpError('');
        const result = await removeFromCart(itemId);
        if (!result.success) {
            setOpError(result.message);
        }
    };

    const handleUpdateQuantity = async (itemId, newQuantity) => {
        if (newQuantity < 1) return;
        setOpError('');
        const result = await updateQuantity(itemId, newQuantity);
        if (result && result.success === false) {
            setOpError('Miqdorni o\'zgartirib bo\'lmadi');
        }
    };

    const handleClearCart = async () => {
        setOpError('');
        const result = await clearCart();
        setConfirmingClear(false);
        if (!result.success) {
            setOpError(result.message);
        }
    };

    const handleCheckout = () => {
        navigate('/user/cart-checkout');
    };

    if (loading) {
        return (
            <div className="cart-loading">
                <div className="spinner"></div>
                <p>Yuklanmoqda...</p>
            </div>
        );
    }

    if (cart.length === 0) {
        return (
            <div className="cart-page">
                <TopBar />
                <Navigation />
                <main className="cart-empty-wrap">
                    <div className="cart-empty-hero">
                        <div className="cart-empty-icon-ring">
                            <div className="cart-empty-icon">
                                <ShoppingCart size={56} strokeWidth={1.6} />
                            </div>
                        </div>
                        <h1 className="cart-empty-title">Savatingiz hozircha bo'sh</h1>
                        <p className="cart-empty-sub">
                            Tibbiy xizmatni tanlab, savatga qo'shing. Bir nechta klinikadan bir vaqtda band qilishingiz mumkin.
                        </p>
                        <div className="cart-empty-ctas">
                            <button onClick={() => navigate('/xizmatlar')} className="cart-empty-cta primary">
                                <Package size={18} />
                                Xizmatlarni ko'rish
                                <ArrowRight size={16} />
                            </button>
                            <button onClick={() => navigate('/klinikalar')} className="cart-empty-cta secondary">
                                <Building2 size={18} />
                                Klinikalar ro'yxati
                            </button>
                        </div>
                    </div>

                    <section className="cart-empty-cats">
                        <h3 className="cart-empty-cats-title">Mashhur kategoriyalar</h3>
                        <div className="cart-empty-cats-grid">
                            {QUICK_CATS.map(c => (
                                <Link
                                    key={c.id}
                                    to={`/xizmatlar/category/${c.id}`}
                                    className="cart-empty-cat-card"
                                    style={{ '--cat-color': c.color }}
                                >
                                    <div className="cart-empty-cat-icon">
                                        <c.Icon size={24} />
                                    </div>
                                    <span className="cart-empty-cat-label">{c.label}</span>
                                    <ChevronRight size={16} className="cart-empty-cat-arrow" />
                                </Link>
                            ))}
                        </div>
                    </section>

                    <div className="cart-empty-quicklinks">
                        <Link to="/user/appointments" className="cart-empty-quicklink">
                            <Heart size={16} /> Mening buyurtmalarim
                        </Link>
                        <Link to="/user/favorites" className="cart-empty-quicklink">
                            <Heart size={16} /> Saqlanganlar
                        </Link>
                    </div>
                </main>
                <Footer />
            </div>
        );
    }

    const grandTotal = cart.reduce((sum, group) => sum + group.totalPrice, 0);
    const totalItems = cart.reduce((sum, group) => sum + group.itemCount, 0);
    const totalSavings = cart.reduce((sum, group) => {
        return sum + group.items.reduce((gSum, item) => {
            const orig = item.service?.originalPrice || 0;
            const eff = item.service?.priceRecommended || 0;
            return gSum + (orig > eff ? (orig - eff) * item.quantity : 0);
        }, 0);
    }, 0);

    return (
        <div className="cart-page">
            <div className="cart-container">
                <div className="cart-header">
                    <button onClick={() => navigate('/xizmatlar')} className="btn-back">
                        <ArrowLeft size={20} />
                        Orqaga
                    </button>
                    <div className="header-left">
                        <ShoppingCart size={32} />
                        <div>
                            <h1>Savat</h1>
                            <p className="cart-summary">{totalItems} ta xizmat, {cart.length} ta klinika</p>
                        </div>
                    </div>
                    <button onClick={() => setConfirmingClear(true)} className="btn-clear-cart">
                        <Trash2 size={18} />
                        Hammasini o'chirish
                    </button>
                </div>

                {opError && (
                    <div className="cart-op-error">
                        <AlertCircle size={16} /> {opError}
                        <button type="button" onClick={() => setOpError('')} aria-label="Yopish"><X size={14} /></button>
                    </div>
                )}

                {confirmingClear && (
                    <div className="cart-confirm-overlay" onClick={() => setConfirmingClear(false)}>
                        <div className="cart-confirm-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
                            <h3>Savatni tozalashni tasdiqlaysizmi?</h3>
                            <p>Savatdagi barcha xizmatlar o'chiriladi. Bu amalni qaytarib bo'lmaydi.</p>
                            <div className="cart-confirm-actions">
                                <button type="button" className="cart-confirm-cancel" onClick={() => setConfirmingClear(false)}>
                                    Yo'q, qoldirish
                                </button>
                                <button type="button" className="cart-confirm-danger" onClick={handleClearCart}>
                                    Ha, o'chirish
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <div className="cart-content">
                    <div className="cart-items-section">
                        {cart.map((clinicGroup) => (
                            <div key={clinicGroup.clinic.id} className="clinic-group">
                                <div className="clinic-header">
                                    <div className="clinic-info-wrapper">
                                        {clinicGroup.clinic.logoUrl && (
                                            <img
                                                src={clinicGroup.clinic.logoUrl}
                                                alt={clinicGroup.clinic.nameUz}
                                                className="clinic-logo"
                                            />
                                        )}
                                        <div className="clinic-details">
                                            <h3>{clinicGroup.clinic.nameUz}</h3>
                                            <div className="clinic-meta">
                                                {clinicGroup.clinic.address && (
                                                    <span className="meta-item">
                                                        <MapPin size={14} />
                                                        {clinicGroup.clinic.address}
                                                    </span>
                                                )}
                                                {clinicGroup.clinic.phone && (
                                                    <span className="meta-item">
                                                        <Phone size={14} />
                                                        {clinicGroup.clinic.phone}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="clinic-total">
                                        <span className="total-label">Jami:</span>
                                        <span className="total-price">{clinicGroup.totalPrice.toLocaleString()} UZS</span>
                                        <span className="item-count">{clinicGroup.itemCount} ta xizmat</span>
                                    </div>
                                </div>

                                <div className="clinic-services">
                                    {clinicGroup.items.map((item) => (
                                        <div key={item.id} className="cart-item">
                                            <div className="item-main">
                                                {item.service?.imageUrl && (
                                                    <img
                                                        src={item.service.imageUrl}
                                                        alt={item.service.nameUz}
                                                        className="service-img"
                                                    />
                                                )}
                                                <div className="service-info">
                                                    <h4>{item.service?.nameUz}</h4>
                                                    {item.service?.category && (
                                                        <p className="service-category">{item.service.category.nameUz}</p>
                                                    )}
                                                    <p className="service-desc">{item.service?.shortDescription}</p>
                                                    <span className={`service-type-badge ${item.serviceType.toLowerCase()}`}>
                                                        {item.serviceType === 'DIAGNOSTIC' && 'Diagnostika'}
                                                        {item.serviceType === 'SURGICAL' && 'Operatsiya'}
                                                        {item.serviceType === 'SANATORIUM' && 'Sanatoriya'}
                                                        {item.serviceType === 'CHECKUP' && 'Checkup Paket'}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="item-actions">
                                                <div className="quantity-controls">
                                                    <button
                                                        onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                                                        disabled={item.quantity <= 1}
                                                        className="qty-btn"
                                                    >
                                                        <Minus size={16} />
                                                    </button>
                                                    <span className="quantity">{item.quantity}</span>
                                                    <button
                                                        onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                                                        className="qty-btn"
                                                    >
                                                        <Plus size={16} />
                                                    </button>
                                                </div>

                                                <div className="item-price">
                                                    {item.service?.discountPercent > 0 && (
                                                        <span className="discount-badge" style={{
                                                            display: 'inline-block',
                                                            background: '#e11d48',
                                                            color: '#fff',
                                                            fontSize: 11,
                                                            fontWeight: 700,
                                                            padding: '2px 8px',
                                                            borderRadius: 999,
                                                            marginBottom: 4,
                                                        }}>
                                                            -{item.service.discountPercent}% chegirma
                                                        </span>
                                                    )}
                                                    <span className="price">{((item.service?.priceRecommended || 0) * item.quantity).toLocaleString()} UZS</span>
                                                    {item.service?.originalPrice > 0 && (
                                                        <span className="unit-price" style={{
                                                            textDecoration: 'line-through',
                                                            color: '#94a3b8',
                                                        }}>
                                                            {(item.service.originalPrice * item.quantity).toLocaleString()} UZS
                                                        </span>
                                                    )}
                                                    {item.service?.discountPercent > 0 && item.service?.originalPrice > 0 && (
                                                        <span style={{
                                                            fontSize: 12,
                                                            fontWeight: 700,
                                                            color: '#16a34a',
                                                            marginTop: 2,
                                                        }}>
                                                            ✓ {((item.service.originalPrice - item.service.priceRecommended) * item.quantity).toLocaleString()} so'm tejadingiz
                                                        </span>
                                                    )}
                                                    {item.quantity > 1 && (
                                                        <span className="unit-price">
                                                            {item.service?.priceRecommended?.toLocaleString()} UZS × {item.quantity}
                                                        </span>
                                                    )}
                                                </div>

                                                <button
                                                    className="btn-remove"
                                                    onClick={() => handleRemove(item.id)}
                                                    title="O'chirish"
                                                >
                                                    <X size={20} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="cart-sidebar">
                        <div className="order-summary">
                            <h3>Buyurtma xulosasi</h3>

                            <div className="summary-details">
                                <div className="summary-row">
                                    <span>Xizmatlar soni:</span>
                                    <span>{totalItems} ta</span>
                                </div>
                                <div className="summary-row">
                                    <span>Klinikalar:</span>
                                    <span>{cart.length} ta</span>
                                </div>
                                {totalSavings > 0 && (
                                    <div className="summary-row" style={{ color: '#16a34a', fontWeight: 700 }}>
                                        <span>Tejamingiz:</span>
                                        <span>-{totalSavings.toLocaleString()} UZS</span>
                                    </div>
                                )}
                                <div className="summary-divider"></div>
                                <div className="summary-row total">
                                    <span>Jami to'lov:</span>
                                    <span className="grand-total">{grandTotal.toLocaleString()} UZS</span>
                                </div>
                                {totalSavings > 0 && (
                                    <div style={{
                                        marginTop: 8,
                                        padding: '8px 12px',
                                        background: 'rgba(22,163,74,0.1)',
                                        borderRadius: 8,
                                        fontSize: 13,
                                        fontWeight: 700,
                                        color: '#16a34a',
                                        textAlign: 'center',
                                    }}>
                                        ✓ Chegirma tufayli {totalSavings.toLocaleString()} so'm tejadingiz
                                    </div>
                                )}
                            </div>

                            <button onClick={handleCheckout} className="btn-checkout">
                                Buyurtma berish
                                <ArrowRight size={20} />
                            </button>

                            <div className="checkout-note">
                                <p>✓ Xavfsiz to'lov</p>
                                <p>✓ Tez xizmat ko'rsatish</p>
                                <p>✓ Professional mutaxassislar</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CartPage;
