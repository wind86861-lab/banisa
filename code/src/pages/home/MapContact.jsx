import { MapPin, Phone, Mail, Clock } from 'lucide-react';
import './css/MapContact.css';

export default function MapContact() {
    return (
        <section className="cm-mapcontact">
            <div className="cm-mapcontact-map">
                <iframe
                    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2996.4354427143387!2d69.24070!3d41.29950!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x38ae8b0cc379e9c3%3A0xa5a9323b4aa5cb98!2sChilonzor%20tumani%2C%20Toshkent!5e0!3m2!1suz!2suz!4v1712000000000!5m2!1suz!2suz"
                    width="100%" height="100%" style={{ border: 0 }} allowFullScreen loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade" title="BANISA - Toshkent, Chilonzor"
                />
            </div>
            <div className="home-container cm-mapcontact-container">
                <div className="cm-mapcontact-card">
                    <h2>Get in Touch with us</h2>
                    <p>Reach out to us for expert support and personalized care.</p>
                    <div className="cm-mapcontact-items">
                        <div className="cm-mapcontact-item">
                            <div className="cm-mapcontact-icon">
                                <MapPin size={20} />
                            </div>
                            <div>
                                <h5>Address</h5>
                                <p>Toshkent shahri, Chilonzor tumani, 7-mavze</p>
                            </div>
                        </div>
                        <div className="cm-mapcontact-item">
                            <div className="cm-mapcontact-icon">
                                <Phone size={20} />
                            </div>
                            <div>
                                <h5>Biz bilan bog'laning</h5>
                                <p><a href="tel:+998711234567">+998 71 123 45 67</a></p>
                            </div>
                        </div>
                        <div className="cm-mapcontact-item">
                            <div className="cm-mapcontact-icon">
                                <Mail size={20} />
                            </div>
                            <div>
                                <h5>Elektron pochta</h5>
                                <p><a href="mailto:info@banisa.uz">info@banisa.uz</a></p>
                            </div>
                        </div>
                        <div className="cm-mapcontact-item">
                            <div className="cm-mapcontact-icon">
                                <Clock size={20} />
                            </div>
                            <div>
                                <h5>Ish vaqti</h5>
                                <p>Dush–Juma: 09:00–18:00 &nbsp;|&nbsp; Shan: 09:00–14:00</p>
                            </div>
                        </div>
                    </div>
                    <button className="cm-btn-teal cm-mapcontact-appt">
                        Appointment
                        <span><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg></span>
                    </button>
                </div>
            </div>
        </section>
    );
}
