import { useEffect, useRef } from 'react';

// Auto-scrolling single-row category strip. Items glide continuously (marquee),
// pause on hover/touch, and are clickable to filter. Items are duplicated so
// the loop is seamless. Used under the service-type nav on the clinic page.
export default function ClinicCategorySlider({ items, active, onSelect, allLabel = 'Barchasi' }) {
    const scrollRef = useRef(null);
    const pausedRef = useRef(false);

    // Continuous auto-scroll via rAF. When we pass the half-way point (items are
    // rendered twice) we subtract half the width → seamless infinite loop.
    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;
        let raf;
        const SPEED = 0.4; // px per frame (~24px/s)
        const step = () => {
            if (!pausedRef.current && el.scrollWidth > el.clientWidth) {
                el.scrollLeft += SPEED;
                const half = el.scrollWidth / 2;
                if (el.scrollLeft >= half) el.scrollLeft -= half;
            }
            raf = requestAnimationFrame(step);
        };
        raf = requestAnimationFrame(step);
        return () => cancelAnimationFrame(raf);
    }, [items]);

    if (!items || items.length === 0) return null;

    // Render twice for the seamless loop.
    const loop = [...items, ...items];

    const chip = (c, i, dup) => {
        const isActive = active === c.name;
        return (
            <button
                key={`${dup}-${c.name}-${i}`}
                type="button"
                className={`cdp-cat-chip ${isActive ? 'active' : ''}`}
                onClick={() => onSelect(isActive ? 'all' : c.name)}
            >
                {c.name}
                {c.count > 0 && <span className="cdp-cat-chip-count">{c.count}</span>}
            </button>
        );
    };

    return (
        <div className="cdp-cat-slider">
            <div
                className="cdp-cat-track"
                ref={scrollRef}
                onMouseEnter={() => { pausedRef.current = true; }}
                onMouseLeave={() => { pausedRef.current = false; }}
                onTouchStart={() => { pausedRef.current = true; }}
                onTouchEnd={() => { setTimeout(() => { pausedRef.current = false; }, 2500); }}
            >
                {/* "All" reset chip (not duplicated — lives at the very start) */}
                <button
                    type="button"
                    className={`cdp-cat-chip cdp-cat-chip--all ${active === 'all' ? 'active' : ''}`}
                    onClick={() => onSelect('all')}
                >
                    {allLabel}
                </button>
                {loop.map((c, i) => chip(c, i % items.length, i < items.length ? 'a' : 'b'))}
            </div>
            <style>{`
                .cdp-cat-slider { margin: 4px 0 14px; }
                .cdp-cat-track {
                    display: flex; gap: 9px; overflow-x: auto; padding: 4px 2px;
                    scrollbar-width: none; -ms-overflow-style: none;
                    scroll-behavior: auto;
                }
                .cdp-cat-track::-webkit-scrollbar { display: none; }
                .cdp-cat-chip {
                    flex-shrink: 0; display: inline-flex; align-items: center; gap: 7px;
                    padding: 9px 16px; border-radius: 999px; cursor: pointer;
                    background: #f1f5f9; color: #334155; border: 1.5px solid transparent;
                    font-size: 14px; font-weight: 700; white-space: nowrap; transition: all .15s;
                    font-family: inherit;
                }
                .cdp-cat-chip:hover { background: #fee2e2; color: #b91c1c; }
                .cdp-cat-chip.active {
                    background: #dc2626; color: #fff; border-color: #dc2626;
                    box-shadow: 0 4px 12px rgba(220,38,38,.28);
                }
                .cdp-cat-chip--all { background: #fff; border-color: #e2e8f0; }
                .cdp-cat-chip--all.active { background: #dc2626; color: #fff; border-color: #dc2626; }
                .cdp-cat-chip-count {
                    font-size: 11.5px; font-weight: 800; padding: 1px 8px; border-radius: 999px;
                    background: rgba(0,0,0,.07); color: inherit;
                }
                .cdp-cat-chip.active .cdp-cat-chip-count { background: rgba(255,255,255,.25); }
                @media (max-width: 480px) {
                    .cdp-cat-chip { padding: 8px 13px; font-size: 13px; }
                }
            `}</style>
        </div>
    );
}
