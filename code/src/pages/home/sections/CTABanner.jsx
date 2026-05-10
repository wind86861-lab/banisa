import { MessageCircle, Phone, Headphones } from 'lucide-react';

export default function CTABanner() {
    return (
        <div className="hn-container">
            <div className="hn-cta">
                <div className="hn-cta-icon">
                    <Headphones size={28} color="#fff" />
                </div>
                <h2 className="hn-cta-title">Savol bormi? Biz yordamga tayyormiz</h2>
                <p className="hn-cta-sub">
                    Mutaxassislar 24/7 javob beradi — qo'ng'iroq qiling yoki yozing
                </p>
                <div className="hn-cta-actions">
                    <a className="hn-cta-btn" href="tel:+998712000000">
                        <Phone size={16} /> +998 71 200 00 00
                    </a>
                    <a
                        className="hn-cta-btn outline"
                        href="https://t.me/banisa_uz"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        <MessageCircle size={16} /> Telegram'da yozish
                    </a>
                </div>
            </div>
        </div>
    );
}
