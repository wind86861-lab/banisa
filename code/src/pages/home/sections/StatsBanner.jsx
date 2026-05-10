import { Building2, Stethoscope, Star, CheckCircle2 } from 'lucide-react';

export default function StatsBanner({ stats }) {
    if (!stats) return null;

    const items = [
        {
            icon: Building2,
            num: stats.clinicCount,
            label: 'Tasdiqlangan klinika',
        },
        {
            icon: Stethoscope,
            num: stats.serviceCount,
            label: 'Mavjud xizmat',
        },
        {
            icon: Star,
            num: stats.averageRating > 0 ? `${stats.averageRating.toFixed(1)}/5` : '—',
            label: "O'rtacha reyting",
        },
        {
            icon: CheckCircle2,
            num: stats.completedAppointmentCount,
            label: 'Tugallangan bron',
        },
    ];

    return (
        <div className="hn-container">
            <div className="hn-stats-section">
                <div className="hn-stats-row">
                    {items.map((it, i) => {
                        const Icon = it.icon;
                        return (
                            <div className="hn-stat" key={i}>
                                <div className="hn-stat-icon"><Icon size={22} /></div>
                                <div className="hn-stat-num">
                                    {typeof it.num === 'number'
                                        ? `${it.num.toLocaleString('uz-UZ')}+`
                                        : it.num}
                                </div>
                                <div className="hn-stat-label">{it.label}</div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
