import { Phone, Mail, CalendarCheck, Clock, CreditCard } from 'lucide-react';
import { useHomepageSettings } from '../../hooks/useHomepageSettings';
import './css/TopBar.css';

export default function TopBar() {
    const { data } = useHomepageSettings();
    const s = data?.topbar || {};

    const phone = s.phone || '+998 71 123 45 67';
    const email = s.email || 'info@banisa.uz';
    const appointmentLabel = s.appointmentLabel || 'Onlayn Navbat';
    const appointmentValue = s.appointmentValue || 'Hozir Oling';
    const workingHours = s.workingHours || 'Dush–Juma: 09:00–18:00';

    return (
        <div className="cm-topbar">
            <div className="home-container cm-topbar-inner">
                <div className="cm-topbar-item">
                    <div className="cm-topbar-icon pink"><Phone size={18} /></div>
                    <div>
                        <div className="cm-topbar-label">Aloqa</div>
                        <div className="cm-topbar-value">{phone}</div>
                    </div>
                </div>
                <div className="cm-topbar-item">
                    <div className="cm-topbar-icon blue"><Mail size={18} /></div>
                    <div>
                        <div className="cm-topbar-label">Email</div>
                        <div className="cm-topbar-value">{email}</div>
                    </div>
                </div>
                <div className="cm-topbar-item">
                    <div className="cm-topbar-icon green"><CalendarCheck size={18} /></div>
                    <div>
                        <div className="cm-topbar-label">{appointmentLabel}</div>
                        <div className="cm-topbar-value">{appointmentValue}</div>
                    </div>
                </div>
                <div className="cm-topbar-item">
                    <div className="cm-topbar-icon navy"><Clock size={18} /></div>
                    <div>
                        <div className="cm-topbar-label">Qo'llab-quvvatlash</div>
                        <div className="cm-topbar-value">{workingHours}</div>
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
