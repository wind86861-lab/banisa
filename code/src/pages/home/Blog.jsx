import { ArrowUpRight, ArrowRight } from 'lucide-react';
import { useHomepageSettings } from '../../hooks/useHomepageSettings';
import './css/Blog.css';

const DEFAULT_POSTS = [
    { title: 'The Skincare Routine That Works Expert Tips.', date: 'July 6, 2025', img: 'https://themes.w3cms.in/clinicmaster/medical/public/storage/blog-images/1751608546_img1.png' },
    { title: 'The Art of Managing Business and Patient Care', date: 'July 9, 2025', img: 'https://themes.w3cms.in/clinicmaster/medical/public/storage/blog-images/1752045034_img1.png' },
    { title: 'Strategies for Balancing Business Demands...', date: 'July 9, 2025', img: '' },
    { title: 'Effective Healthcare Tips', date: 'July 9, 2025', img: 'https://themes.w3cms.in/clinicmaster/medical/public/storage/blog-images/1752668668_Frame.jpg' },
];

export default function Blog() {
    const { data } = useHomepageSettings();
    const s = data?.blog || {};

    const badge = s.badge || 'Health Blog';
    const title = s.title || 'Stay Informed with Our Latest Health Blogs';
    const posts = (s.posts && s.posts.length) ? s.posts : DEFAULT_POSTS;
    const p = posts;

    return (
        <section className="cm-blog">
            <div className="home-container">
                <div className="cm-section-header">
                    <div>
                        <span className="cm-section-badge">{badge}</span>
                        <h2 className="cm-section-title">{title}</h2>
                    </div>
                    <button className="cm-btn-teal">View All <ArrowRight size={16} /></button>
                </div>
                <div className="cm-blog-grid">
                    <div className="cm-blog-card cm-blog-card--sm" style={p[0]?.img ? { backgroundImage: `url('${p[0].img}')` } : {}}>
                        <div className="cm-blog-info cm-blog-info--bottom">
                            <div className="cm-blog-half">
                                <div className="cm-blog-date">{p[0]?.date}</div>
                                <h3 className="cm-blog-title">{p[0]?.title}</h3>
                            </div>
                            <div className="cm-blog-footer">
                                <button className="cm-blog-read-btn">Read More <ArrowRight size={14} /></button>
                            </div>
                        </div>
                    </div>
                    <div className="cm-blog-card cm-blog-card--lg cm-blog-overlay" style={p[1]?.img ? { backgroundImage: `url('${p[1].img}')` } : {}}>
                        <div className="cm-blog-info">
                            <div className="cm-blog-date">{p[1]?.date}</div>
                            <div className="cm-blog-footer">
                                <h3 className="cm-blog-title">{p[1]?.title}</h3>
                                <button className="cm-blog-arrow-btn" aria-label="Read more"><ArrowUpRight size={18} /></button>
                            </div>
                        </div>
                    </div>
                    <div className="cm-blog-col">
                        <div className={`cm-blog-card cm-blog-card--xs cm-blog-overlay${!p[2]?.img ? ' cm-blog-no-img' : ''}`} style={p[2]?.img ? { backgroundImage: `url('${p[2].img}')` } : {}}>
                            <div className="cm-blog-info">
                                <div className="cm-blog-date">{p[2]?.date}</div>
                                <h3 className="cm-blog-title">{p[2]?.title}</h3>
                                <div className="cm-blog-footer">
                                    <button className="cm-blog-arrow-btn" aria-label="Read more"><ArrowUpRight size={18} /></button>
                                </div>
                            </div>
                        </div>
                        <div className="cm-blog-card cm-blog-card--xs cm-blog-overlay" style={p[3]?.img ? { backgroundImage: `url('${p[3].img}')` } : {}}>
                            <div className="cm-blog-info">
                                <div className="cm-blog-date">{p[3]?.date}</div>
                                <div className="cm-blog-footer">
                                    <h3 className="cm-blog-title">{p[3]?.title}</h3>
                                    <button className="cm-blog-arrow-btn" aria-label="Read more"><ArrowUpRight size={18} /></button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
