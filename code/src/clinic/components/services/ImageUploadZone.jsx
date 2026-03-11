import { useRef, useState } from 'react';
import { Upload, Loader2 } from 'lucide-react';
import '../../pages/clinic-admin.css';

export default function ImageUploadZone({ onUpload, disabled, isLoading }) {
    const inputRef = useRef(null);
    const [dragOver, setDragOver] = useState(false);

    const handleFiles = (files) => {
        if (!files?.length || disabled) return;
        const file = files[0];
        // Validate type
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
            alert('Faqat JPEG, PNG yoki WebP formatlar qabul qilinadi');
            return;
        }
        // Validate size (5MB)
        if (file.size > 5 * 1024 * 1024) {
            alert('Rasm hajmi 5 MB dan oshmasligi kerak');
            return;
        }
        onUpload(file);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setDragOver(false);
        handleFiles(e.dataTransfer.files);
    };

    return (
        <div
            style={{
                border: `2px dashed ${dragOver ? 'var(--color-primary)' : 'var(--border-color)'}`,
                borderRadius: 10,
                padding: '28px 20px',
                textAlign: 'center',
                cursor: disabled ? 'not-allowed' : 'pointer',
                opacity: disabled ? 0.5 : 1,
                background: dragOver ? 'rgba(0,201,167,0.05)' : 'transparent',
                transition: 'all 0.2s',
            }}
            onClick={() => !disabled && inputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
        >
            <input
                ref={inputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                style={{ display: 'none' }}
                onChange={(e) => handleFiles(e.target.files)}
            />
            {isLoading ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                    <Loader2 size={28} className="ca-spin" style={{ color: 'var(--color-primary)' }} />
                    <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Yuklanmoqda...</span>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                    <Upload size={28} style={{ color: 'var(--text-muted)' }} />
                    <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                        {disabled
                            ? 'Maksimum 5 ta rasm yuklangan'
                            : 'Rasm yuklash uchun bosing yoki shu yerga tashlang'}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        JPEG, PNG, WebP — maks 5 MB
                    </span>
                </div>
            )}
        </div>
    );
}
