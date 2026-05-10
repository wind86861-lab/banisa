import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

// Map common service names to emoji icons (light heuristic, falls back to default)
function pickIcon(name = '') {
    const n = name.toLowerCase();
    if (n.includes('mrt') || n.includes('mri') || n.includes('miya')) return '🧠';
    if (n.includes('kardio') || n.includes('yurak') || n.includes('ekg')) return '❤️';
    if (n.includes('qon') || n.includes('analiz')) return '🔬';
    if (n.includes('stomat') || n.includes('tish') || n.includes('dental')) return '🦷';
    if (n.includes('ko\'z') || n.includes('koz') || n.includes('eye')) return '👁';
    if (n.includes('rentgen') || n.includes('xray') || n.includes('rentg')) return '🩻';
    if (n.includes('uzi') || n.includes('ultra') || n.includes('doppler')) return '🌊';
    if (n.includes('ginek') || n.includes('homil')) return '🤰';
    if (n.includes('endoskop') || n.includes('endoskopi')) return '🔍';
    if (n.includes('siydik')) return '💧';
    if (n.includes('biopsi') || n.includes('biop')) return '🧬';
    if (n.includes('konsult')) return '👨‍⚕️';
    return '🩺';
}

export default function PopularServices({ services = [] }) {
    const navigate = useNavigate();

    if (!services.length) return null;

    return (
        <section className="hn-section">
            <div className="hn-container">
                <div className="hn-section-head">
                    <div>
                        <h2 className="hn-section-title">🩺 Ommabop xizmatlar</h2>
                        <p className="hn-section-sub">Eng ko'p qidiriladigan tibbiy xizmatlar</p>
                    </div>
                    <a className="hn-link-all" onClick={() => navigate('/xizmatlar')} style={{ cursor: 'pointer' }}>
                        Hammasi <ArrowRight size={14} />
                    </a>
                </div>

                <div className="hn-pop-grid">
                    {services.slice(0, 6).map((s) => (
                        <button
                            key={s.id}
                            className="hn-pop-tile"
                            onClick={() => navigate(`/xizmatlar/${s.id}`)}
                        >
                            <div className="hn-pop-tile-icon">{pickIcon(s.nameUz)}</div>
                            <div className="hn-pop-tile-name">{s.nameUz}</div>
                            <div className="hn-pop-tile-count">{s.clinicCount} klinikada</div>
                        </button>
                    ))}
                </div>
            </div>
        </section>
    );
}
