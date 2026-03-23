import { Phone, Mail, CalendarCheck, Clock, CreditCard } from 'lucide-react';
import './css/TopBar.css';

export default function TopBar() {
    return (
        <div className="cm-topbar">
            <div className="home-container cm-topbar-inner">
                <div className="cm-topbar-item">
                    <div className="cm-topbar-icon pink"><Phone size={18} /></div>
                    <div>
                        <div className="cm-topbar-label">Aloqa</div>
                        <div className="cm-topbar-value">+998 71 123 45 67</div>
                    </div>
                </div>
                <div className="cm-topbar-item">
                    <div className="cm-topbar-icon blue"><Mail size={18} /></div>
                    <div>
                        <div className="cm-topbar-label">Email</div>
                        <div className="cm-topbar-value">info@banisa.uz</div>
                    </div>
                </div>
                <div className="cm-topbar-item">
                    <div className="cm-topbar-icon green"><CalendarCheck size={18} /></div>
                    <div>
                        <div className="cm-topbar-label">Onlayn Navbat</div>
                        <div className="cm-topbar-value">Hozir Oling</div>
                    </div>
                </div>
                <div className="cm-topbar-item">
                    <div className="cm-topbar-icon navy"><Clock size={18} /></div>
                    <div>
                        <div className="cm-topbar-label">Qo'llab-quvvatlash</div>
                        <div className="cm-topbar-value">24/7 Yordam</div>
                    </div>
                </div>
                <div className="cm-topbar-item">
                    <div className="cm-topbar-icon purple"><CreditCard size={18} /></div>
                    <div>
                        <div className="cm-topbar-label">To'lov</div>
                        <div className="cm-topbar-value">Onlayn To'lov</div>
                    </div>
                </div>
            </div>
        </div>
    );
}
