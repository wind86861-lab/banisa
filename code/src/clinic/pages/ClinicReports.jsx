import { BarChart2, TrendingUp, DollarSign, Users, Calendar } from 'lucide-react';
import './clinic-admin.css';

const COMING_FEATURES = [
    { icon: <TrendingUp size={20} />, label: 'Daromad grafiği', desc: 'Kunlik, haftalik va oylik daromad' },
    { icon: <Calendar size={20} />, label: 'Bronlar statistikasi', desc: 'Bronlar soni va holati bo\'yicha' },
    { icon: <Users size={20} />, label: 'Bemor tahlili', desc: 'Yangi va qayta kelgan bemorlar' },
    { icon: <DollarSign size={20} />, label: 'Xizmat samaradorligi', desc: 'Eng mashhur xizmatlar ro\'yxati' },
];

export default function ClinicReports() {
    return (
        <div>
            <div className="ca-header">
                <div>
                    <h1 className="ca-title">Hisobotlar</h1>
                    <p className="ca-subtitle">Klinika faoliyati tahlili va statistikasi</p>
                </div>
            </div>

            <div className="ca-empty" style={{ marginBottom: 28 }}>
                <div className="ca-empty-icon">
                    <BarChart2 size={36} />
                </div>
                <h3>Hisobotlar moduli tayyorlanmoqda</h3>
                <p>
                    Klinikangiz faoliyatini chuqur tahlil qilish imkoniyati tez kunda
                    sizga taqdim etiladi.
                </p>
            </div>

            <div className="ca-cards-grid">
                {COMING_FEATURES.map((f, i) => (
                    <div key={i} className="ca-card" style={{ cursor: 'default', opacity: 0.7 }}>
                        <div className="ca-card-header">
                            <div
                                className="ca-card-icon"
                                style={{ background: 'rgba(0,201,167,0.1)', color: '#00C9A7' }}
                            >
                                {f.icon}
                            </div>
                            <span className="ca-badge primary" style={{ fontSize: 10 }}>Tez kunda</span>
                        </div>
                        <div className="ca-card-title">{f.label}</div>
                        <div className="ca-card-meta">{f.desc}</div>
                    </div>
                ))}
            </div>
        </div>
    );
}
