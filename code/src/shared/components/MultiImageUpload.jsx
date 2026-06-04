import { useRef, useState } from 'react';
import { Upload, X, Image as ImageIcon, Loader2, Plus } from 'lucide-react';
import api from '../api/axios';
import './multi-image-upload.css';

const resolveSrc = (url) => {
    if (!url) return null;
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    if (url.startsWith('/uploads')) {
        return `${window.location.origin === 'http://localhost:5173' ? 'http://localhost:5000' : ''}${url}`;
    }
    return url;
};

export default function MultiImageUpload({
    value = [],
    onChange,
    max = 3,
    label = "Qo'shimcha rasmlar",
    hint = '',
}) {
    const fileRef = useRef();
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');

    const images = Array.isArray(value) ? value : [];
    const remaining = Math.max(0, max - images.length);

    const handleFiles = async (e) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;
        if (files.some((f) => f.size > 5 * 1024 * 1024)) {
            setError("Har bir fayl 5 MB dan kichik bo'lishi kerak");
            return;
        }
        const toUpload = files.slice(0, remaining);
        if (toUpload.length === 0) return;

        setError('');
        setUploading(true);
        try {
            const uploaded = [];
            for (const file of toUpload) {
                const fd = new FormData();
                fd.append('image', file);
                const { data } = await api.post('/upload/image', fd, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
                if (data?.data?.url) uploaded.push(data.data.url);
            }
            onChange([...images, ...uploaded]);
        } catch (err) {
            setError(err?.response?.data?.message || err.message || "Yuklab bo'lmadi");
        } finally {
            setUploading(false);
            if (fileRef.current) fileRef.current.value = '';
        }
    };

    const removeAt = (idx) => {
        onChange(images.filter((_, i) => i !== idx));
    };

    const move = (from, to) => {
        if (to < 0 || to >= images.length) return;
        const next = [...images];
        const [item] = next.splice(from, 1);
        next.splice(to, 0, item);
        onChange(next);
    };

    return (
        <div className="miu">
            {label && (
                <div className="miu__head">
                    <span className="miu__label">{label}</span>
                    <span className="miu__count">{images.length} / {max}</span>
                </div>
            )}
            {hint && <div className="miu__hint">{hint}</div>}

            <div className="miu__grid">
                {images.map((url, idx) => (
                    <div key={idx} className="miu__tile">
                        <img src={resolveSrc(url)} alt={`Rasm ${idx + 1}`} />
                        <div className="miu__tile-overlay">
                            <button type="button" className="miu__tile-btn" onClick={() => removeAt(idx)} title="O'chirish">
                                <X size={14} />
                            </button>
                        </div>
                        <div className="miu__tile-order">
                            <button
                                type="button"
                                className="miu__tile-btn miu__tile-btn--sm"
                                onClick={() => move(idx, idx - 1)}
                                disabled={idx === 0}
                                title="Chapga"
                            >‹</button>
                            <span>{idx + 1}</span>
                            <button
                                type="button"
                                className="miu__tile-btn miu__tile-btn--sm"
                                onClick={() => move(idx, idx + 1)}
                                disabled={idx === images.length - 1}
                                title="O'ngga"
                            >›</button>
                        </div>
                    </div>
                ))}

                {remaining > 0 && (
                    <button
                        type="button"
                        className="miu__add"
                        onClick={() => fileRef.current?.click()}
                        disabled={uploading}
                    >
                        {uploading ? (
                            <Loader2 size={20} className="miu__spin" />
                        ) : (
                            <>
                                <Plus size={20} />
                                <span>Rasm qo'shish</span>
                                <span className="miu__add-hint">Yana {remaining} ta mumkin</span>
                            </>
                        )}
                    </button>
                )}
            </div>

            <input
                ref={fileRef}
                type="file"
                accept="image/*"
                multiple={max > 1}
                onChange={handleFiles}
                style={{ display: 'none' }}
            />

            {error && <div className="miu__error">{error}</div>}
        </div>
    );
}
