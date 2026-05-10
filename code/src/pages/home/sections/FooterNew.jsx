import { Link } from 'react-router-dom';
import { Send, Instagram, Youtube, Facebook } from 'lucide-react';

export default function FooterNew() {
    return (
        <footer className="hn-footer">
            <div className="hn-foot-map">
                <iframe
                    src="https://www.google.com/maps/embed?pb=!1m14!1m12!1m3!1d191885.25394050797!2d69.13927085!3d41.2825064!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!5e0!3m2!1sen!2s!4v1715000000000!5m2!1sen!2s"
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    title="Banisa — Toshkent xaritasi"
                />
            </div>
            <div className="hn-container">
                <div className="hn-foot-grid">
                    <div className="hn-foot-brand">
                        <h3>🩺 BANISA</h3>
                        <p>O'zbekistonda tibbiyot xizmatlarini bron qilish platformasi. Tasdiqlangan klinikalar, oson bron, barcha turdagi to'lovlar.</p>
                        <div className="hn-foot-contact">
                            <div>📞 +998 71 200 00 00</div>
                            <div>✉ info@banisa.uz</div>
                        </div>
                    </div>

                    <div className="hn-foot-col">
                        <h4>Klinikalar</h4>
                        <ul>
                            <li><Link to="/klinikalar?region=tashkent_city">Toshkent</Link></li>
                            <li><Link to="/klinikalar?region=samarkand">Samarqand</Link></li>
                            <li><Link to="/klinikalar?region=bukhara">Buxoro</Link></li>
                            <li><Link to="/klinikalar">Barcha klinikalar</Link></li>
                        </ul>
                    </div>

                    <div className="hn-foot-col">
                        <h4>Xizmat</h4>
                        <ul>
                            <li><Link to="/xizmatlar?type=DIAGNOSTIC">Diagnostika</Link></li>
                            <li><Link to="/xizmatlar?type=SURGICAL">Jarrohlik</Link></li>
                            <li><Link to="/xizmatlar?type=CHECKUP">Checkup</Link></li>
                            <li><Link to="/xizmatlar?type=SANATORIUM">Sanatoriya</Link></li>
                        </ul>
                    </div>

                    <div className="hn-foot-col">
                        <h4>Yordam</h4>
                        <ul style={{ marginBottom: 16 }}>
                            <li><a href="mailto:info@banisa.uz">Aloqa</a></li>
                            <li><Link to="/user/appointments">Mening bronlarim</Link></li>
                            <li><Link to="/user/cart">Savat</Link></li>
                        </ul>
                        <div className="hn-foot-social">
                            <a href="https://t.me/banisa_uz" target="_blank" rel="noopener noreferrer" aria-label="Telegram">
                                <Send size={16} />
                            </a>
                            <a href="https://instagram.com/banisa.uz" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
                                <Instagram size={16} />
                            </a>
                            <a href="https://youtube.com/@banisa" target="_blank" rel="noopener noreferrer" aria-label="YouTube">
                                <Youtube size={16} />
                            </a>
                            <a href="https://facebook.com/banisa" target="_blank" rel="noopener noreferrer" aria-label="Facebook">
                                <Facebook size={16} />
                            </a>
                        </div>
                    </div>
                </div>

                <div className="hn-foot-bottom">
                    © {new Date().getFullYear()} Banisa · Barcha huquqlar himoyalangan
                </div>
            </div>
        </footer>
    );
}
