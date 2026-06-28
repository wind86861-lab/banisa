import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Heart, ArrowRight, Trash2, Search, Check, X } from 'lucide-react';
import api from '../../shared/api/axios';
import { fmtSum } from '../../shared/utils/format';
import TopBar from '../../pages/home/TopBar';
import Navigation from '../../pages/home/Navigation';
import Footer from '../../pages/home/Footer';
import BanisaLoader from '../../shared/components/BanisaLoader';
import './css/UserFavoritesPage.css';

export default function UserFavoritesPage() {
    const qc = useQueryClient();
    const navigate = useNavigate();
    // Per-card "are you sure?" confirm: lets a stray tap on the trash icon
    // require a second confirm tap before the favorite disappears. Tracks
    // the favoriteId currently pending confirmation; null = nothing.
    const [confirmId, setConfirmId] = useState(null);

    const { data: items = [], isLoading } = useQuery({
        queryKey: ['user', 'favorites'],
        queryFn: async () => {
            const res = await api.get('/user/favorites');
            return res.data?.data || [];
        },
    });

    const removeMut = useMutation({
        mutationFn: async (favoriteId) => api.delete(`/user/favorites/${favoriteId}`),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['user', 'favorites'] }),
    });

    const byCategory = useMemo(() => {
        const g = {};
        items.forEach(it => {
            const k = it.service.category || 'Boshqa';
            (g[k] ||= []).push(it);
        });
        return g;
    }, [items]);

    return (
        <div className="home-page">
            <TopBar />
            <Navigation />
            <main className="uf-main">
                <header className="uf-header">
                    <div>
                        <h1><Heart size={22} className="uf-h-icon" /> Sevimlilar</h1>
                        <p>Saqlangan xizmatlaringiz — qaytib ko'rib chiqing yoki bevosita bron qiling.</p>
                    </div>
                    <Link to="/xizmatlar" className="uf-explore-btn">
                        Yangi xizmatlar <ArrowRight size={16} />
                    </Link>
                </header>

                {isLoading ? (
                    <BanisaLoader message="Sevimlilar yuklanmoqda..." />
                ) : items.length === 0 ? (
                    <div className="uf-empty">
                        <Heart size={48} className="uf-empty-icon" />
                        <h3>Hali sevimli xizmatlar yo'q</h3>
                        <p>Xizmat sahifasida yurak ikonkasini bosib saqlab qo'ying — bu yerda ro'yxat paydo bo'ladi.</p>
                        <Link to="/xizmatlar" className="uf-explore-btn">
                            <Search size={16} /> Xizmatlarni ko'rish
                        </Link>
                    </div>
                ) : (
                    <div className="uf-groups">
                        {Object.entries(byCategory).map(([cat, list]) => (
                            <section key={cat} className="uf-group">
                                <h2>{cat} <span>{list.length}</span></h2>
                                <div className="uf-grid">
                                    {list.map(it => (
                                        <article key={it.favoriteId} className="uf-card">
                                            {confirmId === it.favoriteId ? (
                                                <div className="uf-card-confirm">
                                                    <button
                                                        className="uf-card-confirm-yes"
                                                        onClick={() => {
                                                            removeMut.mutate(it.favoriteId, {
                                                                onSettled: () => setConfirmId(null),
                                                            });
                                                        }}
                                                        title="Tasdiqlash"
                                                    >
                                                        <Check size={14} />
                                                    </button>
                                                    <button
                                                        className="uf-card-confirm-no"
                                                        onClick={() => setConfirmId(null)}
                                                        title="Bekor qilish"
                                                    >
                                                        <X size={14} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <button
                                                    className="uf-card-remove"
                                                    onClick={() => setConfirmId(it.favoriteId)}
                                                    title="Sevimlilardan olib tashlash"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            )}
                                            <h3>{it.service.title}</h3>
                                            <p>{it.service.desc || 'Tavsif yo\'q'}</p>
                                            <div className="uf-card-foot">
                                                <strong>{fmtSum(it.service.price)} <span>so'm</span></strong>
                                                <button
                                                    className="uf-book-btn"
                                                    onClick={() => navigate(`/xizmatlar/${it.serviceId}`)}
                                                >
                                                    Ko'rish
                                                </button>
                                            </div>
                                        </article>
                                    ))}
                                </div>
                            </section>
                        ))}
                    </div>
                )}
            </main>
            <Footer />
        </div>
    );
}
