import { ArrowUpRight, ArrowRight } from 'lucide-react';
import './css/Blog.css';

const POSTS = [
    {
        id: 1, size: 'sm', date: 'July 6, 2025',
        title: 'The Skincare Routine That Works Expert Tips.',
        bg: 'https://themes.w3cms.in/clinicmaster/medical/public/storage/blog-images/1751608546_img1.png',
        overlay: false,
    },
    {
        id: 2, size: 'lg', date: 'July 9, 2025',
        title: 'The Art of Managing Business and Patient Care',
        bg: 'https://themes.w3cms.in/clinicmaster/medical/public/storage/blog-images/1752045034_img1.png',
        overlay: true,
    },
    {
        id: 3, size: 'xs', date: 'July 9, 2025',
        title: 'Strategies for Balancing Business Demands...',
        bg: null, overlay: true,
    },
    {
        id: 4, size: 'xs', date: 'July 9, 2025',
        title: 'Effective Healthcare Tips',
        bg: 'https://themes.w3cms.in/clinicmaster/medical/public/storage/blog-images/1752668668_Frame.jpg',
        overlay: true,
    },
];

export default function Blog() {
    return (
        <section className="cm-blog">
            <div className="home-container">
                <div className="cm-section-header">
                    <div>
                        <span className="cm-section-badge">Health Blog</span>
                        <h2 className="cm-section-title">Stay Informed with Our<br />Latest Health Blogs</h2>
                    </div>
                    <button className="cm-btn-teal">
                        View All
                        <ArrowRight size={16} />
                    </button>
                </div>
                <div className="cm-blog-grid">
                    <div className="cm-blog-card cm-blog-card--sm" style={POSTS[0].bg ? { backgroundImage: `url('${POSTS[0].bg}')` } : {}}>
                        <div className="cm-blog-info cm-blog-info--bottom">
                            <div className="cm-blog-half">
                                <div className="cm-blog-date">{POSTS[0].date}</div>
                                <h3 className="cm-blog-title">{POSTS[0].title}</h3>
                            </div>
                            <div className="cm-blog-footer">
                                <button className="cm-blog-read-btn">
                                    Read More <ArrowRight size={14} />
                                </button>
                            </div>
                        </div>
                    </div>
                    <div className="cm-blog-card cm-blog-card--lg cm-blog-overlay" style={{ backgroundImage: `url('${POSTS[1].bg}')` }}>
                        <div className="cm-blog-info">
                            <div className="cm-blog-date">{POSTS[1].date}</div>
                            <div className="cm-blog-footer">
                                <h3 className="cm-blog-title">{POSTS[1].title}</h3>
                                <button className="cm-blog-arrow-btn" aria-label="Read more">
                                    <ArrowUpRight size={18} />
                                </button>
                            </div>
                        </div>
                    </div>
                    <div className="cm-blog-col">
                        <div className="cm-blog-card cm-blog-card--xs cm-blog-overlay cm-blog-no-img">
                            <div className="cm-blog-info">
                                <div className="cm-blog-date">{POSTS[2].date}</div>
                                <h3 className="cm-blog-title">{POSTS[2].title}</h3>
                                <div className="cm-blog-footer">
                                    <button className="cm-blog-arrow-btn" aria-label="Read more">
                                        <ArrowUpRight size={18} />
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div className="cm-blog-card cm-blog-card--xs cm-blog-overlay" style={{ backgroundImage: `url('${POSTS[3].bg}')` }}>
                            <div className="cm-blog-info">
                                <div className="cm-blog-date">{POSTS[3].date}</div>
                                <div className="cm-blog-footer">
                                    <h3 className="cm-blog-title">{POSTS[3].title}</h3>
                                    <button className="cm-blog-arrow-btn" aria-label="Read more">
                                        <ArrowUpRight size={18} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
