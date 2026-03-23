import './css/AppointmentCTA.css';

export default function AppointmentCTA() {
    return (
        <section className="cm-cta">
            <div className="home-container">
                <div className="cm-cta-grid">
                    <div className="cm-cta-media">
                        <img src="/images/1752042973.img3.png" alt="Appointment" />
                    </div>
                    <div className="cm-cta-form-wrap">
                        <div className="cm-cta-vertical">Appointment Now</div>
                        <div className="cm-cta-form-body">
                            <div className="cm-cta-title-head">
                                <h2 className="cm-cta-form-title">Make An <span>Appointment</span> Apply For Treatments</h2>
                            </div>
                            <form className="cm-cta-form" onSubmit={e => e.preventDefault()}>
                                <div className="cm-cta-row">
                                    <div className="cm-float-field">
                                        <input type="text" id="cta-fname" className="cm-float-input" placeholder=" " />
                                        <label htmlFor="cta-fname">First Name</label>
                                    </div>
                                    <div className="cm-float-field">
                                        <input type="text" id="cta-lname" className="cm-float-input" placeholder=" " />
                                        <label htmlFor="cta-lname">Last Name</label>
                                    </div>
                                </div>
                                <div className="cm-cta-row">
                                    <div className="cm-float-field">
                                        <input type="email" id="cta-email" className="cm-float-input" placeholder=" " />
                                        <label htmlFor="cta-email">Your Email</label>
                                    </div>
                                    <div className="cm-float-field">
                                        <input type="tel" id="cta-phone" className="cm-float-input" placeholder=" " />
                                        <label htmlFor="cta-phone">Phone Number</label>
                                    </div>
                                </div>
                                <div className="cm-float-field">
                                    <textarea id="cta-msg" className="cm-float-input cm-float-textarea" placeholder=" " rows={5}></textarea>
                                    <label htmlFor="cta-msg">Message</label>
                                </div>
                                <button type="submit" className="cm-btn-white cm-cta-submit">
                                    Submit Now
                                    <span className="cm-cta-submit-arrow">
                                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <line x1="5" y1="12" x2="19" y2="12" />
                                            <polyline points="12 5 19 12 12 19" />
                                        </svg>
                                    </span>
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
