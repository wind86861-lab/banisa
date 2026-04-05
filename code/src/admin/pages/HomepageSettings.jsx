import { useState, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Save, Loader2, CheckCircle, Layout, Phone, Image as ImageIcon, Users, Star, HelpCircle, Award, BookOpen, AlignLeft, Globe, Grid, Upload, X, Eye, EyeOff, ChevronRight, Palette, FileText, Link as LinkIcon, ExternalLink } from 'lucide-react';
import axiosInstance from '../../shared/api/axios';
import './HomepageSettings.css';

const SECTIONS = [
    { key: 'navigation', label: 'Navigation', icon: <Globe size={16} />, color: '#8b5cf6' },
    { key: 'topbar', label: 'Top Bar', icon: <Phone size={16} />, color: '#06b6d4' },
    { key: 'hero', label: 'Hero', icon: <Layout size={16} />, color: '#3b82f6' },
    { key: 'services', label: 'Services', icon: <Grid size={16} />, color: '#10b981' },
    { key: 'stats', label: 'Stats', icon: <Star size={16} />, color: '#f59e0b' },
    { key: 'why_choose_us', label: 'Why Choose Us', icon: <CheckCircle size={16} />, color: '#ef4444' },
    { key: 'doctors', label: 'Doctors', icon: <Users size={16} />, color: '#6366f1' },
    { key: 'testimonials', label: 'Testimonials', icon: <Star size={16} />, color: '#ec4899' },
    { key: 'how_it_works', label: 'How It Works', icon: <AlignLeft size={16} />, color: '#14b8a6' },
    { key: 'faq', label: 'FAQ', icon: <HelpCircle size={16} />, color: '#f97316' },
    { key: 'awards', label: 'Awards', icon: <Award size={16} />, color: '#84cc16' },
    { key: 'blog', label: 'Blog', icon: <BookOpen size={16} />, color: '#a855f7' },
    { key: 'footer', label: 'Footer', icon: <AlignLeft size={16} />, color: '#64748b' },
    { key: 'legal_docs', label: 'Huquqiy Hujjatlar', icon: <FileText size={16} />, color: '#dc2626' },
];

const Field = ({ label, name, value, onChange, type = 'text', placeholder = '', hint = '' }) => (
    <div className="hps-field">
        <label className="hps-label">{label}</label>
        {hint && <span className="hps-hint">{hint}</span>}
        {type === 'textarea' ? (
            <textarea className="hps-input hps-textarea" name={name} value={value || ''} onChange={onChange} placeholder={placeholder} rows={3} />
        ) : (
            <input className="hps-input" type={type} name={name} value={value || ''} onChange={onChange} placeholder={placeholder} />
        )}
    </div>
);

const UploadField = ({ label, name, value, onValueChange, hint = '' }) => {
    const [uploading, setUploading] = useState(false);
    const [showUrl, setShowUrl] = useState(false);
    const fileRef = useRef();

    const handleFile = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const fd = new FormData();
        fd.append('image', file);
        setUploading(true);
        try {
            const { data } = await axiosInstance.post('/upload/image', fd, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            onValueChange(data.data.url);
        } catch (err) {
            alert('Upload failed: ' + (err?.response?.data?.message || err.message));
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="hps-field">
            <label className="hps-label">{label}</label>
            {hint && <span className="hps-hint">{hint}</span>}
            <div className="hps-upload-row">
                {value ? (
                    <div className="hps-upload-preview">
                        <img src={value} alt={label} onError={e => e.target.style.display = 'none'} />
                        <button type="button" className="hps-upload-remove" onClick={() => onValueChange('')}>
                            <X size={12} />
                        </button>
                    </div>
                ) : (
                    <div className="hps-upload-empty"><ImageIcon size={24} color="#9ca3af" /></div>
                )}
                <div className="hps-upload-controls">
                    <button
                        type="button"
                        className="hps-upload-btn"
                        onClick={() => fileRef.current.click()}
                        disabled={uploading}
                    >
                        {uploading ? <Loader2 size={14} className="spin" /> : <Upload size={14} />}
                        {uploading ? 'Yuklanmoqda...' : 'Rasm yuklash'}
                    </button>
                    <button
                        type="button"
                        className="hps-url-toggle"
                        onClick={() => setShowUrl(p => !p)}
                    >
                        {showUrl ? <EyeOff size={13} /> : <Eye size={13} />}
                        URL
                    </button>
                </div>
                {showUrl && (
                    <input
                        className="hps-input hps-url-input"
                        type="text"
                        value={value || ''}
                        onChange={e => onValueChange(e.target.value)}
                        placeholder="/images/filename.webp yoki https://..."
                    />
                )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />
        </div>
    );
};

const PdfUploadField = ({ label, name, value, onValueChange, hint = '' }) => {
    const [uploading, setUploading] = useState(false);
    const fileRef = useRef();

    const handleFile = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const fd = new FormData();
        fd.append('file', file);
        setUploading(true);
        try {
            const { data } = await axiosInstance.post('/upload/pdf', fd, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            onValueChange(data.data.url);
        } catch (err) {
            alert('Upload failed: ' + (err?.response?.data?.message || err.message));
        } finally {
            setUploading(false);
            if (fileRef.current) fileRef.current.value = '';
        }
    };

    return (
        <div className="hps-field">
            <label className="hps-label">{label}</label>
            {hint && <span className="hps-hint">{hint}</span>}
            <div className="hps-pdf-row">
                <div className="hps-pdf-preview">
                    {value ? (
                        <a href={value} target="_blank" rel="noopener noreferrer" className="hps-pdf-link">
                            <FileText size={16} /> PDF Fayl yuklangan
                            <ExternalLink size={12} style={{ marginLeft: 4 }} />
                        </a>
                    ) : (
                        <span className="hps-pdf-empty"><FileText size={16} /> Fayl yuklanmagan</span>
                    )}
                </div>
                <div className="hps-upload-controls">
                    <button
                        type="button"
                        className="hps-upload-btn"
                        onClick={() => fileRef.current.click()}
                        disabled={uploading}
                    >
                        {uploading ? <Loader2 size={14} className="spin" /> : <Upload size={14} />}
                        {uploading ? 'Yuklanmoqda...' : 'PDF yuklash'}
                    </button>
                    {value && (
                        <button type="button" className="hps-url-toggle" onClick={() => onValueChange('')}>
                            <X size={13} /> O'chirish
                        </button>
                    )}
                </div>
                <input
                    className="hps-input hps-url-input"
                    type="text"
                    value={value || ''}
                    onChange={e => onValueChange(e.target.value)}
                    placeholder="/uploads/docs/file.pdf yoki https://..."
                    style={{ marginTop: 6 }}
                />
            </div>
            <input ref={fileRef} type="file" accept="application/pdf,.pdf" style={{ display: 'none' }} onChange={handleFile} />
        </div>
    );
};

const ArrayField = ({ label, value = [], onChange, fields }) => {
    const update = (i, key, val) => {
        const next = value.map((item, idx) => idx === i ? { ...item, [key]: val } : item);
        onChange(next);
    };
    const add = () => onChange([...value, fields.reduce((a, f) => ({ ...a, [f.name]: '' }), {})]);
    const remove = (i) => onChange(value.filter((_, idx) => idx !== i));

    return (
        <div className="hps-array-field">
            <div className="hps-array-header">
                <label className="hps-label">{label}</label>
                <button type="button" className="hps-add-btn" onClick={add}>+ Qo'shish</button>
            </div>
            {value.map((item, i) => (
                <div key={i} className="hps-array-item">
                    <div className="hps-item-head">
                        <span className="hps-item-num">#{i + 1}</span>
                        <button type="button" className="hps-remove-btn" onClick={() => remove(i)}><X size={13} /> O'chirish</button>
                    </div>
                    {fields.map(f => (
                        f.type === 'image'
                            ? <UploadField key={f.name} label={f.label} name={f.name} value={item[f.name]} onValueChange={val => update(i, f.name, val)} />
                            : f.type === 'textarea'
                                ? <Field key={f.name} label={f.label} name={f.name} value={item[f.name]} onChange={e => update(i, f.name, e.target.value)} type="textarea" />
                                : <Field key={f.name} label={f.label} name={f.name} value={item[f.name]} onChange={e => update(i, f.name, e.target.value)} />
                    ))}
                </div>
            ))}
        </div>
    );
};

const SectionForm = ({ section, data, onSave, saving }) => {
    const [form, setForm] = useState(data || {});

    const handle = (e) => setForm(p => ({ ...p, [e.target.name]: e.target.value }));
    const handleArr = (key) => (val) => setForm(p => ({ ...p, [key]: val }));

    const submit = (e) => { e.preventDefault(); onSave(form); };

    const f = form;

    return (
        <form className="hps-form" onSubmit={submit}>
            {section === 'navigation' && <>
                <Field label="Site Name" name="siteName" value={f.siteName} onChange={handle} placeholder="BANISA" />
                <Field label="Site Tagline" name="siteTagline" value={f.siteTagline} onChange={handle} placeholder="Hospital Booking System" />
                <Field label="Logo Background Color" name="logoColor" value={f.logoColor} onChange={handle} type="color" hint="Icon orqa fon rangi" />
                <UploadField label="Custom Logo Image" name="logoUrl" value={f.logoUrl} onValueChange={v => setForm(p => ({ ...p, logoUrl: v }))} hint="Rasm yuklansa — rang o'rniga shu rasm ko'rinadi" />
            </>}

            {section === 'topbar' && <>
                <Field label="Phone" name="phone" value={f.phone} onChange={handle} />
                <Field label="Email" name="email" value={f.email} onChange={handle} />
                <Field label="Appointment Label" name="appointmentLabel" value={f.appointmentLabel} onChange={handle} />
                <Field label="Appointment Value" name="appointmentValue" value={f.appointmentValue} onChange={handle} />
                <Field label="Working Hours" name="workingHours" value={f.workingHours} onChange={handle} />
            </>}

            {section === 'services' && <>
                <Field label="Section Badge" name="badge" value={f.badge} onChange={handle} placeholder="Our Services" />
                <Field label="Section Title" name="title" value={f.title} onChange={handle} placeholder="Start Feeling Your Best" />
                <Field label="Section Subtitle" name="subtitle" value={f.subtitle} onChange={handle} placeholder="Explore Our Wellness Services" />
            </>}

            {section === 'hero' && <>
                <Field label="Emergency Badge Text" name="badge" value={f.badge} onChange={handle} />
                <Field label="Title Line 1" name="title1" value={f.title1} onChange={handle} />
                <Field label="Title Line 2" name="title2" value={f.title2} onChange={handle} />
                <Field label="Title Highlight Word" name="titleHighlight" value={f.titleHighlight} onChange={handle} />
                <Field label="Description" name="description" value={f.description} onChange={handle} type="textarea" />
                <UploadField label="Background Image" name="bgImage" value={f.bgImage} onValueChange={v => setForm(p => ({ ...p, bgImage: v }))} />
                <Field label="Appointment Button Text" name="appointmentBtnText" value={f.appointmentBtnText} onChange={handle} placeholder="Xizmatlarimiz" />
                <Field label="Appointment Button Link" name="appointmentBtnLink" value={f.appointmentBtnLink} onChange={handle} placeholder="/xizmatlar" />
                <Field label="Video Button Text" name="videoBtnText" value={f.videoBtnText} onChange={handle} placeholder="Watch Now" />
                <Field label="YouTube Video URL" name="videoUrl" value={f.videoUrl} onChange={handle} placeholder="https://youtube.com/watch?v=..." />
                <UploadField label="Chat Avatar Image" name="chatAvatar" value={f.chatAvatar} onValueChange={v => setForm(p => ({ ...p, chatAvatar: v }))} />
                <Field label="Chat Title" name="chatTitle" value={f.chatTitle} onChange={handle} />
                <Field label="Chat Email" name="chatEmail" value={f.chatEmail} onChange={handle} />
            </>}

            {section === 'stats' && <>
                <Field label="Booking Text" name="bookingText" value={f.bookingText} onChange={handle} />
                <Field label="Specialists Count" name="specialists" value={f.specialists} onChange={handle} />
                <Field label="Patients Count" name="patients" value={f.patients} onChange={handle} />
                <Field label="Awards Count" name="awards" value={f.awards} onChange={handle} />
                <UploadField label="Background Image" name="bgImage" value={f.bgImage} onValueChange={v => setForm(p => ({ ...p, bgImage: v }))} />
                <ArrayField
                    label="Avatar Images (4)"
                    value={f.avatars || []}
                    onChange={handleArr('avatars')}
                    fields={[{ name: 'url', label: 'Avatar Image', type: 'image' }]}
                />
            </>}

            {section === 'why_choose_us' && <>
                <Field label="Badge" name="badge" value={f.badge} onChange={handle} />
                <Field label="Title" name="title" value={f.title} onChange={handle} />
                <Field label="Years Experienced" name="yearsExperienced" value={f.yearsExperienced} onChange={handle} />
                <UploadField label="Section Image" name="image" value={f.image} onValueChange={v => setForm(p => ({ ...p, image: v }))} />
                <UploadField label="Background Image" name="bgImage" value={f.bgImage} onValueChange={v => setForm(p => ({ ...p, bgImage: v }))} />
                <ArrayField
                    label="Reasons"
                    value={f.reasons || []}
                    onChange={handleArr('reasons')}
                    fields={[
                        { name: 'title', label: 'Title' },
                        { name: 'desc', label: 'Description', type: 'textarea' },
                    ]}
                />
            </>}

            {section === 'doctors' && <>
                <Field label="Badge" name="badge" value={f.badge} onChange={handle} />
                <Field label="Title" name="title" value={f.title} onChange={handle} />
                <ArrayField
                    label="Doctors"
                    value={f.doctors || []}
                    onChange={handleArr('doctors')}
                    fields={[
                        { name: 'name', label: 'Name' },
                        { name: 'specialty', label: 'Specialty' },
                        { name: 'img', label: 'Doctor Photo', type: 'image' },
                    ]}
                />
            </>}

            {section === 'testimonials' && <>
                <Field label="Badge" name="badge" value={f.badge} onChange={handle} />
                <Field label="Title" name="title" value={f.title} onChange={handle} />
                <UploadField label="Section Image" name="image" value={f.image} onValueChange={v => setForm(p => ({ ...p, image: v }))} />
                <ArrayField
                    label="Reviews"
                    value={f.reviews || []}
                    onChange={handleArr('reviews')}
                    fields={[
                        { name: 'name', label: 'Name' },
                        { name: 'role', label: 'Role' },
                        { name: 'rating', label: 'Rating (1-5)' },
                        { name: 'comment', label: 'Comment', type: 'textarea' },
                        { name: 'img', label: 'Photo URL', type: 'image' },
                    ]}
                />
            </>}

            {section === 'how_it_works' && <>
                <Field label="Badge" name="badge" value={f.badge} onChange={handle} />
                <Field label="Title" name="title" value={f.title} onChange={handle} />
                <Field label="Description" name="description" value={f.description} onChange={handle} type="textarea" />
                <UploadField label="Section Image" name="image" value={f.image} onValueChange={v => setForm(p => ({ ...p, image: v }))} />
                <Field label="Specialists Count" name="specialists" value={f.specialists} onChange={handle} />
                <Field label="Patients Count" name="patients" value={f.patients} onChange={handle} />
                <ArrayField
                    label="Steps"
                    value={f.steps || []}
                    onChange={handleArr('steps')}
                    fields={[{ name: 'title', label: 'Step Title' }]}
                />
            </>}

            {section === 'faq' && <>
                <Field label="Badge" name="badge" value={f.badge} onChange={handle} />
                <Field label="Title" name="title" value={f.title} onChange={handle} />
                <Field label="Description" name="description" value={f.description} onChange={handle} type="textarea" />
                <Field label="Phone" name="phone" value={f.phone} onChange={handle} />
                <UploadField label="Section Image" name="image" value={f.image} onValueChange={v => setForm(p => ({ ...p, image: v }))} />
                <ArrayField
                    label="FAQs"
                    value={f.faqs || []}
                    onChange={handleArr('faqs')}
                    fields={[
                        { name: 'q', label: 'Question' },
                        { name: 'a', label: 'Answer', type: 'textarea' },
                    ]}
                />
            </>}

            {section === 'awards' && <>
                <Field label="Badge" name="badge" value={f.badge} onChange={handle} />
                <Field label="Title" name="title" value={f.title} onChange={handle} />
                <Field label="Description" name="description" value={f.description} onChange={handle} type="textarea" />
                <ArrayField
                    label="Awards"
                    value={f.awards || []}
                    onChange={handleArr('awards')}
                    fields={[
                        { name: 'title', label: 'Award Title' },
                        { name: 'org', label: 'Organization' },
                        { name: 'label', label: 'Link Label' },
                        { name: 'img', label: 'Image URL', type: 'image' },
                    ]}
                />
            </>}

            {section === 'blog' && <>
                <Field label="Badge" name="badge" value={f.badge} onChange={handle} />
                <Field label="Title" name="title" value={f.title} onChange={handle} />
                <ArrayField
                    label="Blog Posts"
                    value={f.posts || []}
                    onChange={handleArr('posts')}
                    fields={[
                        { name: 'title', label: 'Post Title' },
                        { name: 'category', label: 'Category' },
                        { name: 'date', label: 'Date' },
                        { name: 'excerpt', label: 'Excerpt', type: 'textarea' },
                        { name: 'img', label: 'Image URL', type: 'image' },
                    ]}
                />
            </>}

            {section === 'legal_docs' && (
                <div className="hps-legal-section">
                    <div className="hps-legal-info">
                        <FileText size={18} color="#dc2626" />
                        <p>Quyidagi hujjatlarni PDF formatda yuklang. Foydalanuvchilar ro'yxatdan o'tish jarayonida bu hujjatlar bilan tanishib, rozilik bildirishlari talab qilinadi.</p>
                    </div>
                    <PdfUploadField
                        label="Foydalanish Shartlari (Terms of Use)"
                        name="termsUrl"
                        value={f.termsUrl}
                        onValueChange={v => setForm(p => ({ ...p, termsUrl: v }))}
                        hint="Klinikalar ro'yxatdan o'tishda ko'rinadigan shartlar"
                    />
                    <PdfUploadField
                        label="Maxfiylik Siyosati (Privacy Policy)"
                        name="privacyUrl"
                        value={f.privacyUrl}
                        onValueChange={v => setForm(p => ({ ...p, privacyUrl: v }))}
                        hint="Ma'lumotlar maxfiyligiga oid siyosat hujjati"
                    />
                    <PdfUploadField
                        label="Oferta (Public Offer Agreement)"
                        name="ofertaUrl"
                        value={f.ofertaUrl}
                        onValueChange={v => setForm(p => ({ ...p, ofertaUrl: v }))}
                        hint="Foydalanuvchilar uchun ommaviy oferta shartnomasi"
                    />
                </div>
            )}

            {section === 'footer' && <>
                <Field label="Description" name="description" value={f.description} onChange={handle} type="textarea" />
                <Field label="Tagline" name="tagline" value={f.tagline} onChange={handle} />
                <Field label="Phone" name="phone" value={f.phone} onChange={handle} />
                <Field label="Email" name="email" value={f.email} onChange={handle} />
                <Field label="Working Hours" name="workingHours" value={f.workingHours} onChange={handle} />
                <Field label="Address" name="address" value={f.address} onChange={handle} />
                <Field label="Map Latitude" name="mapLat" value={f.mapLat} onChange={handle} />
                <Field label="Map Longitude" name="mapLng" value={f.mapLng} onChange={handle} />
                <UploadField label="Footer Logo" name="logo" value={f.logo} onValueChange={v => setForm(p => ({ ...p, logo: v }))} />
            </>}

            <div className="hps-actions">
                <button type="submit" className="hps-save-btn" disabled={saving}>
                    {saving ? <Loader2 size={16} className="spin" /> : <Save size={16} />}
                    {saving ? 'Saqlanmoqda...' : 'Saqlash'}
                </button>
            </div>
        </form>
    );
};

export { UploadField };

export default function HomepageSettings() {
    const [activeTab, setActiveTab] = useState('topbar');
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(null);
    const queryClient = useQueryClient();

    const { data, isLoading } = useQuery({
        queryKey: ['homepage-settings'],
        queryFn: async () => {
            const { data } = await axiosInstance.get('/homepage');
            return data.data;
        },
        staleTime: 1000 * 60,
    });

    const handleSave = async (content) => {
        setSaving(true);
        try {
            await axiosInstance.put(`/homepage/${activeTab}`, content);
            queryClient.invalidateQueries({ queryKey: ['homepage-settings'] });
            setSaved(activeTab);
            setTimeout(() => setSaved(null), 3000);
        } catch (err) {
            console.error(err);
        } finally {
            setSaving(false);
        }
    };

    const activeSection = SECTIONS.find(s => s.key === activeTab);

    return (
        <div className="hps-container">
            <div className="hps-header">
                <div className="hps-header-left">
                    <div className="hps-header-icon">
                        <Globe size={22} color="#fff" />
                    </div>
                    <div>
                        <h1 className="hps-title">Homepage CMS</h1>
                        <p className="hps-subtitle">Bosh sahifaning barcha bo'limlarini boshqaring</p>
                    </div>
                </div>
                <a href="/" target="_blank" rel="noopener noreferrer" className="hps-preview-btn">
                    <Eye size={15} /> Saytni ko'rish
                </a>
            </div>

            <div className="hps-layout">
                <aside className="hps-sidebar">
                    <div className="hps-sidebar-label">Bo'limlar</div>
                    {SECTIONS.map(s => (
                        <button
                            key={s.key}
                            className={`hps-tab${activeTab === s.key ? ' active' : ''}${saved === s.key ? ' saved' : ''}`}
                            onClick={() => setActiveTab(s.key)}
                            style={activeTab === s.key ? { '--tab-color': s.color } : {}}
                        >
                            <span className="hps-tab-icon" style={{ color: s.color }}>{s.icon}</span>
                            <span>{s.label}</span>
                            {saved === s.key
                                ? <CheckCircle size={13} className="hps-saved-icon" />
                                : <ChevronRight size={13} className="hps-tab-arrow" />
                            }
                        </button>
                    ))}
                </aside>

                <main className="hps-main">
                    <div className="hps-section-header">
                        <div className="hps-section-header-left">
                            <div className="hps-section-icon" style={{ background: activeSection?.color + '18', color: activeSection?.color }}>
                                {activeSection?.icon}
                            </div>
                            <div>
                                <h2>{activeSection?.label}</h2>
                                <p className="hps-section-desc">Bu bo'lim uchun matn va rasmlarni tahrirlang</p>
                            </div>
                        </div>
                        {saved === activeTab && (
                            <span className="hps-saved-badge">
                                <CheckCircle size={14} /> Saqlandi!
                            </span>
                        )}
                    </div>

                    {isLoading ? (
                        <div className="hps-loading">
                            <Loader2 size={32} className="spin" style={{ color: activeSection?.color }} />
                            <span>Yuklanmoqda...</span>
                        </div>
                    ) : (
                        <SectionForm
                            key={activeTab}
                            section={activeTab}
                            data={data?.[activeTab]}
                            onSave={handleSave}
                            saving={saving}
                        />
                    )}
                </main>
            </div>
        </div>
    );
}
