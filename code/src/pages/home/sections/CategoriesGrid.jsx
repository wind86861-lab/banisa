import { useNavigate } from 'react-router-dom';
import { Microscope, Stethoscope, ClipboardList, Leaf, ArrowRight } from 'lucide-react';

const ICON_MAP = {
    flask: Microscope,
    surgical: Stethoscope,
    clipboard: ClipboardList,
    leaf: Leaf,
};

const TYPE_TO_ROUTE = {
    diagnostic: 'DIAGNOSTIC',
    surgical: 'SURGICAL',
    checkup: 'CHECKUP',
    sanatorium: 'SANATORIUM',
};

export default function CategoriesGrid({ categories = [] }) {
    const navigate = useNavigate();

    if (!categories.length) return null;

    return (
        <section className="hn-section">
            <div className="hn-container">
                <div className="hn-section-head">
                    <div>
                        <h2 className="hn-section-title">Xizmat kategoriyalari</h2>
                        <p className="hn-section-sub">Sizga kerak bo'lgan xizmat turini tanlang</p>
                    </div>
                </div>

                <div className="hn-cats-grid">
                    {categories.map((c) => {
                        const Icon = ICON_MAP[c.icon] || Microscope;
                        return (
                            <button
                                key={c.id}
                                className={`hn-cat-card ${c.color}`}
                                onClick={() => navigate(`/xizmatlar?type=${TYPE_TO_ROUTE[c.id] || c.id}`)}
                            >
                                <div className="hn-cat-icon">
                                    <Icon size={26} color="#fff" />
                                </div>
                                <div className="hn-cat-name">{c.label}</div>
                                <div className="hn-cat-count">
                                    {c.count.toLocaleString('uz-UZ')}+ xizmat <ArrowRight size={14} />
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
