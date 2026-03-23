import { useState } from 'react';
import './css/Awards.css';

const AWARDS = [
    { img: '/images/kfoAYees6j5aQbo3KvdJP8zFDp32ELMZ19A3kEGo.png', title: 'ClinicMaster 2024', org: 'Quality and Accreditation Institute', label: 'Save the Children' },
    { img: '/images/TXJ979qiSF3jKIfe8KMmhGDJQLDDKZYXjBeSdTsK.png', title: 'ClinicMaster 2024', org: 'Quality and Accreditation Institute', label: 'Save the Children' },
    { img: '/images/mbQ5U3Ylk0OPBxhJh1P0XDEGqIoitTSGlBVQu1Nt.png', title: 'ClinicMaster 2024', org: 'Quality and Accreditation Institute', label: 'Save the Children' },
    { img: '/images/Qg7HHkIkj3g3BtibwevUxTVicVjeJF1Pq0VvSqZR.png', title: 'ClinicMaster 2024', org: 'Quality and Accreditation Institute', label: 'Save the Children' },
    { img: '/images/W9jhEHAGM2wBpaWvYKP2cB2UpTjDuLJQNvBkElx0.png', title: 'ClinicMaster 2024', org: 'Quality and Accreditation Institute', label: 'Save the Children' },
    { img: '/images/wg1OkuMz1bJZQZDb06I6QCVJKqdG46Fspwax31YH.png', title: 'ClinicMaster 2024', org: 'Quality and Accreditation Institute', label: 'Save the Children' },
];

export default function Awards() {
    const [start, setStart] = useState(0);
    const visible = 3;

    const prev = () => setStart((s) => Math.max(0, s - 1));
    const next = () => setStart((s) => Math.min(AWARDS.length - visible, s + 1));

    return (
        <section className="cm-awards">
            <div className="home-container">
                <div className="cm-awards-grid">
                    <div className="cm-awards-head">
                        <h2 className="cm-section-title">Awards</h2>
                        <p>It is a long established fact that a reader will be distracted by the readable content of a page when looking at its layout.</p>
                    </div>
                    <div className="cm-awards-slider-wrap">
                        <div className="cm-awards-slider">
                            {AWARDS.slice(start, start + visible).map((a, i) => (
                                <div key={i} className="cm-award-card">
                                    <div className="cm-award-img">
                                        <img src={a.img} alt={a.title} />
                                    </div>
                                    <div className="cm-award-info">
                                        <h3>{a.title}</h3>
                                        <p>{a.org}</p>
                                        <a href="#" className="cm-award-link">{a.label}</a>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="cm-awards-nav">
                            <button onClick={prev} disabled={start === 0} className="cm-awards-btn" aria-label="Previous">
                                <img src="/images/arrow-left.svg" alt="prev" />
                            </button>
                            <button onClick={next} disabled={start >= AWARDS.length - visible} className="cm-awards-btn" aria-label="Next">
                                <img src="/images/arrow-right.svg" alt="next" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
