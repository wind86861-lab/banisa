import React, { useEffect, useState } from 'react';
import { FileText, Upload, Check, Loader2, ExternalLink } from 'lucide-react';
import axiosInstance from '../../shared/api/axios';

const resolvePdfUrl = (url) => {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    if (url.startsWith('/uploads')) {
        const origin = window.location.origin === 'http://localhost:5173' ? 'http://localhost:5000' : '';
        return `${origin}${url}`;
    }
    return url;
};

const fmtDate = (iso) => {
    if (!iso) return '—';
    try {
        return new Date(iso).toLocaleString('uz-UZ', {
            year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
        });
    } catch { return iso; }
};

export default function OfertaPage() {
    const [versions, setVersions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');
    const [versionLabel, setVersionLabel] = useState('');
    const [file, setFile] = useState(null);

    const load = async () => {
        try {
            const { data } = await axiosInstance.get('/oferta/admin');
            setVersions(data.data || []);
        } catch (e) {
            setError(e.response?.data?.message || 'Yuklab bo\'lmadi');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!file) { setError('PDF fayl tanlang'); return; }
        if (!versionLabel.trim()) { setError('Versiya nomini kiriting (masalan, 1.0 yoki 2026-05-31)'); return; }
        if (file.size > 20 * 1024 * 1024) { setError('Fayl 20 MB dan katta bo\'lmasligi kerak'); return; }
        if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
            setError('Faqat PDF fayl yuklash mumkin'); return;
        }
        setError('');
        setUploading(true);
        try {
            const fd = new FormData();
            fd.append('file', file);
            const up = await axiosInstance.post('/upload/pdf', fd, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            const fileUrl = up.data?.data?.url;
            if (!fileUrl) throw new Error('Yuklab bo\'lmadi');
            await axiosInstance.post('/oferta/admin', {
                version: versionLabel.trim(),
                fileUrl,
                fileName: file.name,
            });
            setFile(null); setVersionLabel('');
            await load();
        } catch (e) {
            setError(e.response?.data?.message || e.message || 'Xatolik');
        } finally {
            setUploading(false);
        }
    };

    const activate = async (id) => {
        try {
            await axiosInstance.post(`/oferta/admin/${id}/activate`);
            await load();
        } catch (e) {
            alert(e.response?.data?.message || 'Xatolik');
        }
    };

    return (
        <div style={{ padding: 24, maxWidth: 900 }}>
            <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 10 }}>
                <FileText size={26} /> Ommaviy oferta
            </h1>
            <p style={{ color: '#64748b', fontSize: 14, marginBottom: 24 }}>
                Bemorlar buyurtma berish vaqtida faol versiya bilan tanishib rozi bo'lishadi. Yangi PDF yuklasangiz, oldingisi avtomatik nofaol bo'ladi.
            </p>

            {/* Upload card */}
            <form onSubmit={handleSubmit} style={{
                background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14,
                padding: 20, marginBottom: 24, display: 'flex', flexDirection: 'column', gap: 14,
            }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Yangi versiya yuklash</h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>Versiya nomi *</label>
                    <input
                        type="text"
                        value={versionLabel}
                        onChange={e => setVersionLabel(e.target.value)}
                        placeholder="masalan, 1.0 yoki 2026-05-31"
                        style={{
                            padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 8,
                            fontSize: 14, outline: 'none',
                        }}
                    />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>PDF fayl (maks. 20 MB) *</label>
                    <input
                        type="file"
                        accept="application/pdf,.pdf"
                        onChange={e => setFile(e.target.files?.[0] || null)}
                        style={{ fontSize: 14 }}
                    />
                    {file && (
                        <span style={{ fontSize: 12, color: '#64748b' }}>
                            {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                        </span>
                    )}
                </div>

                {error && (
                    <div style={{
                        padding: '8px 12px', background: '#fee2e2', border: '1px solid #fca5a5',
                        borderRadius: 8, color: '#991b1b', fontSize: 13,
                    }}>{error}</div>
                )}

                <button
                    type="submit"
                    disabled={uploading || !file || !versionLabel.trim()}
                    style={{
                        alignSelf: 'flex-start',
                        display: 'inline-flex', alignItems: 'center', gap: 8,
                        padding: '10px 18px',
                        background: uploading ? '#94a3b8' : '#00BDE0',
                        color: '#fff', border: 'none', borderRadius: 10,
                        fontSize: 14, fontWeight: 700,
                        cursor: uploading ? 'not-allowed' : 'pointer',
                    }}
                >
                    {uploading ? <Loader2 size={16} className="ca-spin" /> : <Upload size={16} />}
                    {uploading ? 'Yuklanmoqda...' : 'Yangi versiyani yuklash va faol qilish'}
                </button>
            </form>

            {/* Versions list */}
            <h3 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 700 }}>Barcha versiyalar</h3>
            {loading ? (
                <div style={{ color: '#64748b' }}>Yuklanmoqda...</div>
            ) : versions.length === 0 ? (
                <div style={{
                    padding: 20, background: '#f8fafc', border: '1px dashed #cbd5e1',
                    borderRadius: 10, textAlign: 'center', color: '#64748b',
                }}>
                    Hozircha bironta versiya yo'q. Birinchisini yuklang.
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {versions.map(v => (
                        <div key={v.id} style={{
                            display: 'flex', alignItems: 'center', gap: 14,
                            padding: 14,
                            background: '#fff', border: '1px solid #e2e8f0',
                            borderLeft: v.isActive ? '4px solid #16a34a' : '1px solid #e2e8f0',
                            borderRadius: 10,
                        }}>
                            <FileText size={20} style={{ color: '#64748b', flexShrink: 0 }} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700 }}>
                                    v{v.version}
                                    {v.isActive && (
                                        <span style={{
                                            display: 'inline-flex', alignItems: 'center', gap: 3,
                                            padding: '2px 8px', background: '#dcfce7', color: '#166534',
                                            borderRadius: 999, fontSize: 11, fontWeight: 700,
                                        }}>
                                            <Check size={11} /> Faol
                                        </span>
                                    )}
                                </div>
                                <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                                    {v.fileName || ''} · Yuklangan: {fmtDate(v.uploadedAt)}
                                </div>
                            </div>
                            <a
                                href={resolvePdfUrl(v.fileUrl)}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                    display: 'inline-flex', alignItems: 'center', gap: 5,
                                    fontSize: 13, color: '#00BDE0', textDecoration: 'none', fontWeight: 600,
                                }}
                            >
                                Ko'rish <ExternalLink size={13} />
                            </a>
                            {!v.isActive && (
                                <button
                                    onClick={() => activate(v.id)}
                                    style={{
                                        padding: '6px 12px', background: '#f1f5f9', border: '1px solid #cbd5e1',
                                        borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', color: '#0f172a',
                                    }}
                                >
                                    Faollashtirish
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
