import { Star, Trash2, Loader2 } from 'lucide-react';
import ImageUploadZone from './ImageUploadZone';
import {
    useUploadServiceImage,
    useDeleteServiceImage,
    useSetPrimaryImage,
} from '../../hooks/useServiceCustomization';
import '../../pages/clinic-admin.css';

export default function CustomizationImagesTab({ clinicServiceId, images }) {
    const uploadMut = useUploadServiceImage();
    const deleteMut = useDeleteServiceImage();
    const primaryMut = useSetPrimaryImage();

    const handleUpload = async (file) => {
        await uploadMut.mutateAsync({ clinicServiceId, file });
    };

    const handleDelete = async (imageId) => {
        if (!confirm("Rasmni o'chirmoqchimisiz?")) return;
        await deleteMut.mutateAsync({ clinicServiceId, imageId });
    };

    const handleSetPrimary = async (imageId) => {
        await primaryMut.mutateAsync({ clinicServiceId, imageId });
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
                Xizmat uchun rasmlar yuklang (maksimum 5 ta). Birinchi rasm asosiy rasm sifatida ishlatiladi.
            </p>

            <ImageUploadZone
                onUpload={handleUpload}
                disabled={images.length >= 5}
                isLoading={uploadMut.isPending}
            />

            {images.length > 0 && (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                    gap: 12,
                }}>
                    {images.map((image) => (
                        <div
                            key={image.id}
                            style={{
                                borderRadius: 10,
                                overflow: 'hidden',
                                border: image.isPrimary
                                    ? '2px solid var(--color-primary)'
                                    : '1px solid var(--border-color)',
                                background: 'var(--bg-card)',
                            }}
                        >
                            <div style={{
                                width: '100%',
                                height: 120,
                                background: '#1a1a2e',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                overflow: 'hidden',
                            }}>
                                <img
                                    src={image.url}
                                    alt={image.alt || 'Service image'}
                                    style={{
                                        width: '100%',
                                        height: '100%',
                                        objectFit: 'cover',
                                    }}
                                    onError={(e) => {
                                        e.target.style.display = 'none';
                                    }}
                                />
                            </div>
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '6px 8px',
                            }}>
                                <button
                                    className="ca-icon-btn"
                                    title={image.isPrimary ? 'Asosiy rasm' : 'Asosiy qilish'}
                                    onClick={() => handleSetPrimary(image.id)}
                                    disabled={primaryMut.isPending}
                                    style={{
                                        color: image.isPrimary ? '#FFD700' : 'var(--text-muted)',
                                    }}
                                >
                                    <Star size={16} fill={image.isPrimary ? '#FFD700' : 'none'} />
                                </button>
                                {image.isPrimary && (
                                    <span style={{ fontSize: 10, color: 'var(--color-primary)' }}>Asosiy</span>
                                )}
                                <button
                                    className="ca-icon-btn danger"
                                    title="O'chirish"
                                    onClick={() => handleDelete(image.id)}
                                    disabled={deleteMut.isPending}
                                >
                                    {deleteMut.isPending
                                        ? <Loader2 size={14} className="ca-spin" />
                                        : <Trash2 size={14} />}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {images.length === 0 && (
                <div style={{
                    textAlign: 'center',
                    padding: 24,
                    color: 'var(--text-muted)',
                    fontSize: 13,
                }}>
                    Hali rasmlar yuklanmagan
                </div>
            )}
        </div>
    );
}
