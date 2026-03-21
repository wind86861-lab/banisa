import { useState, useMemo } from 'react';
import { Loader2, Package, Search, RefreshCw } from 'lucide-react';
import { useCheckupPackages } from '../../hooks/useCheckupPackages';
import PackageCard from './PackageCard';

export default function CheckupPackagesTab() {
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const { data: packages, isLoading, isError, refetch } = useCheckupPackages();

    const activeCount = packages?.filter(p => p.clinicPackage?.isActive).length ?? 0;

    const filtered = useMemo(() => {
        if (!packages) return [];
        let list = [...packages];
        if (search.trim()) {
            const q = search.toLowerCase();
            list = list.filter(p => p.nameUz?.toLowerCase().includes(q) || p.nameRu?.toLowerCase().includes(q));
        }
        if (statusFilter === 'active') list = list.filter(p => p.clinicPackage?.isActive);
        else if (statusFilter === 'inactive') list = list.filter(p => !p.clinicPackage?.isActive);
        return list;
    }, [packages, search, statusFilter]);

    return (
        <div>
            <p className="ca-subtitle" style={{ marginBottom: 16 }}>
                Jami <strong>{packages?.length ?? 0}</strong> ta paket — <strong>{activeCount}</strong> ta faol
            </p>

            {/* Toolbar */}
            <div className="ca-toolbar" style={{ flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
                <div className="ca-search">
                    <Search size={16} className="ca-search-icon" />
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Paket nomi bo'yicha qidirish..."
                    />
                </div>
                <select
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value)}
                    style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-main)', fontSize: 13 }}
                >
                    <option value="all">Barchasi</option>
                    <option value="active">Faol</option>
                    <option value="inactive">Aktivlashtirilmagan</option>
                </select>
                <button className="ca-icon-btn" onClick={() => refetch()} title="Yangilash">
                    <RefreshCw size={16} />
                </button>
            </div>

            {isError && (
                <div style={{
                    padding: '12px 16px', borderRadius: 10, marginBottom: 16,
                    background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                    color: '#ef4444', fontSize: 13,
                }}>
                    Paketlarni yuklashda xatolik yuz berdi.
                </div>
            )}

            {isLoading ? (
                <div className="ca-loading"><Loader2 size={32} className="ca-spin" /><span>Yuklanmoqda...</span></div>
            ) : filtered.length === 0 ? (
                <div className="ca-empty">
                    <div className="ca-empty-icon"><Package size={36} /></div>
                    <h3>Checkup paketlar topilmadi</h3>
                    <p>Qidiruv yoki filtrni o'zgartiring.</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {filtered.map(pkg => (
                        <PackageCard key={pkg.id} package={pkg} />
                    ))}
                </div>
            )}
        </div>
    );
}
