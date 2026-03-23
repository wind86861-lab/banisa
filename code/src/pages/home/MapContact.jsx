import { MapPin, Phone, Mail, Clock } from 'lucide-react';
import './css/MapContact.css';

export default function MapContact() {
    return (
        <section className="cm-mapcontact">
            <div className="cm-mapcontact-map">
                <iframe
                    src="https://www.google.com/maps/embed?pb=!1m14!1m12!1m3!1d28891.193971348785!2d75.8546432!3d25.1559936!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!5e0!3m2!1sen!2sin!4v1719221707984!5m2!1sen!2sin"
                    width="100%" height="100%" style={{ border: 0 }} allowFullScreen loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade" title="Clinic Location"
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
                                <p>234 Oak Drive, Villagetown, USA</p>
                            </div>
                        </div>
                        <div className="cm-mapcontact-item">
                            <div className="cm-mapcontact-icon">
                                <Phone size={20} />
                            </div>
                            <div>
                                <h5>Contact Us</h5>
                                <p><a href="tel:11234567890">1 123 456 7890</a></p>
                            </div>
                        </div>
                        <div className="cm-mapcontact-item">
                            <div className="cm-mapcontact-icon">
                                <Mail size={20} />
                            </div>
                            <div>
                                <h5>Send us a Mail</h5>
                                <p><a href="mailto:sales@dexignzone.com">sales@dexignzone.com</a></p>
                            </div>
                        </div>
                        <div className="cm-mapcontact-item">
                            <div className="cm-mapcontact-icon">
                                <Clock size={20} />
                            </div>
                            <div>
                                <h5>Opening Time</h5>
                                <p>Mon-Thu: 8:00am-5:00pm Fri: 8:00am-1:00pm</p>
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
