import React from 'react';
import { useCart } from '../contexts/CartContext';
import { ShoppingCart, Trash2, Plus, Minus, X, MapPin, Phone, Package, ArrowRight, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './CartPage.css';

const CartPage = () => {
    const { cart, loading, removeFromCart, updateQuantity, clearCart } = useCart();
    const navigate = useNavigate();

    const handleRemove = async (itemId) => {
        const result = await removeFromCart(itemId);
        if (!result.success) {
            alert(result.message);
        }
    };

    const handleUpdateQuantity = async (itemId, newQuantity) => {
        if (newQuantity < 1) return;
        await updateQuantity(itemId, newQuantity);
    };

    const handleClearCart = async () => {
        if (!window.confirm('Savatdagi barcha xizmatlarni o\'chirmoqchimisiz?')) return;
        const result = await clearCart();
        if (result.success) {
            alert(result.message);
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
            <div className="cart-empty">
                <div className="empty-icon">
                    <ShoppingCart size={80} />
                </div>
                <h2>Savatingiz bo'sh</h2>
                <p>Xizmatlarni ko'rish va savatga qo'shish uchun katalogga o'ting</p>
                <button onClick={() => navigate('/xizmatlar')} className="btn-primary">
                    <Package size={20} />
                    Xizmatlarni ko'rish
                </button>
            </div>
        );
    }

    const grandTotal = cart.reduce((sum, group) => sum + group.totalPrice, 0);
    const totalItems = cart.reduce((sum, group) => sum + group.itemCount, 0);

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
                    <button onClick={handleClearCart} className="btn-clear-cart">
                        <Trash2 size={18} />
                        Hammasini o'chirish
                    </button>
                </div>

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
                                                    <span className="price">{((item.service?.priceRecommended || 0) * item.quantity).toLocaleString()} UZS</span>
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
                                <div className="summary-divider"></div>
                                <div className="summary-row total">
                                    <span>Jami to'lov:</span>
                                    <span className="grand-total">{grandTotal.toLocaleString()} UZS</span>
                                </div>
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
