import React, { useRef, useState } from 'react';
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import axiosInstance from '../api/axios';

const resolveSrc = (url) => {
    if (!url) return null;
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    if (url.startsWith('/uploads')) return `${window.location.origin === 'http://localhost:5173' ? 'http://localhost:5000' : ''}${url}`;
    return url;
};

export default function ImageUpload({ value, onChange, label = 'Rasm', hint = '' }) {
    const fileRef = useRef();
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');

    const handleFile = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) {
            setError("Fayl 5 MB dan katta bo'lmasligi kerak");
            return;
        }
        setError('');
        setUploading(true);
        try {
            const fd = new FormData();
            fd.append('image', file);
            const { data } = await axiosInstance.post('/upload/image', fd, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            onChange(data.data.url);
        } catch (err) {
            setError(err?.response?.data?.message || err.message || "Yuklab bo'lmadi");
        } finally {
            setUploading(false);
            if (fileRef.current) fileRef.current.value = '';
        }
    };

    const src = resolveSrc(value);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {label && <label style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>{label}</label>}
            {hint && <span style={{ fontSize: 12, color: '#6b7280' }}>{hint}</span>}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {src ? (
                    <div style={{ position: 'relative', width: 96, height: 96, borderRadius: 8, overflow: 'hidden', border: '1px solid #e5e7eb', background: '#f9fafb' }}>
                        <img src={src} alt={label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                        <button
                            type="button"
                            onClick={() => onChange('')}
                            style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', borderRadius: '50%', width: 22, height: 22, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                            <X size={12} />
                        </button>
                    </div>
                ) : (
                    <div style={{ width: 96, height: 96, borderRadius: 8, border: '1px dashed #d1d5db', background: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>
                        <ImageIcon size={28} />
                    </div>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display: 'none' }} />
                    <button
                        type="button"
                        onClick={() => fileRef.current?.click()}
                        disabled={uploading}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: uploading ? '#9ca3af' : '#6366f1', color: 'white', border: 'none', borderRadius: 6, cursor: uploading ? 'wait' : 'pointer', fontSize: 13, fontWeight: 500 }}
                    >
                        {uploading ? <Loader2 size={14} className="spin" /> : <Upload size={14} />}
                        {uploading ? 'Yuklanmoqda...' : (value ? 'Almashtirish' : 'Rasm yuklash')}
                    </button>
                    <span style={{ fontSize: 11, color: '#6b7280' }}>JPG, PNG, WEBP — max 5 MB</span>
                </div>
            </div>
            {error && <span style={{ fontSize: 12, color: '#dc2626' }}>{error}</span>}
        </div>
    );
}
