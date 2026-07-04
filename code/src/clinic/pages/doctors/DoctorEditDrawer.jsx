import { useState, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
    X, Loader2, Search, UserPlus, AlertTriangle, CheckCircle2,
    Building2, Stethoscope, ArrowRight,
    User as UserIcon, Award, GraduationCap, BriefcaseMedical, Scissors,
    BookOpen, Camera, FileText, Upload,
} from 'lucide-react';
import api from '../../../shared/api/axios';
import ImageUpload from '../../../shared/components/ImageUpload';
import MultiImageUpload from '../../../shared/components/MultiImageUpload';

// Qualification grade labels — free-form in the API, controlled list in
// the UI to keep dropdown values consistent across clinics.
const CATEGORY_OPTIONS = [
    { value: '', label: '— Tanlanmagan —' },
    { value: 'OLIY', label: 'Oliy toifa' },
    { value: 'BIRINCHI', label: 'Birinchi toifa' },
    { value: 'IKKINCHI', label: 'Ikkinchi toifa' },
    { value: 'YOSH_MUTAXASSIS', label: 'Yosh mutaxassis' },
];

// Section header used to break the wide form into discoverable groups.
function Section({ icon: Icon, title, subtitle, children }) {
    return (
        <div className="cdocs-section">
            <div className="cdocs-section__head">
                <span className="cdocs-section__icon"><Icon size={15} /></span>
                <div>
                    <div className="cdocs-section__title">{title}</div>
                    {subtitle && <div className="cdocs-section__sub">{subtitle}</div>}
                </div>
            </div>
            <div className="cdocs-section__body">{children}</div>
        </div>
    );
}

// Chip input — Enter / comma commits a chip. Used for treatedDiseases
// and surgicalProcedures. Clinic admin types short labels, patient sees
// them as a tag cloud on the profile page.
function ChipInput({ value, onChange, placeholder, max = 30 }) {
    const [draft, setDraft] = useState('');
    const list = Array.isArray(value) ? value : [];

    const commit = () => {
        const t = draft.trim();
        if (!t) return;
        if (list.length >= max) return;
        if (list.includes(t)) { setDraft(''); return; }
        onChange([...list, t]);
        setDraft('');
    };

    const remove = (i) => onChange(list.filter((_, idx) => idx !== i));

    return (
        <div className="cdocs-chips-input">
            <div className="cdocs-chips-input__row">
                <input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ',') {
                            e.preventDefault();
                            commit();
                        }
                    }}
                    placeholder={placeholder}
                    maxLength={80}
                />
                <button type="button" className="cdocs-chips-input__add" onClick={commit} disabled={!draft.trim()}>
                    + Qo'shish
                </button>
            </div>
            {list.length > 0 && (
                <div className="cdocs-chips-input__list">
                    {list.map((item, i) => (
                        <span key={`${item}-${i}`} className="cdocs-chip-tag">
                            {item}
                            <button type="button" onClick={() => remove(i)} aria-label="O'chirish">
                                <X size={11} />
                            </button>
                        </span>
                    ))}
                </div>
            )}
            <div className="cdocs-field__hint">
                Enter yoki vergul bilan ajrating. {list.length}/{max}
            </div>
        </div>
    );
}

// Single credential-document uploader (PDF or image). Posts to the
// CLINIC_ADMIN-scoped /upload/clinic-doc endpoint and stores the returned URL.
// Used for diplomas + category/degree/title certificates.
function DocUpload({ value, onChange, label, hint }) {
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState('');
    const inputRef = useRef(null);

    const pick = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setErr('');
        setBusy(true);
        try {
            const fd = new FormData();
            fd.append('file', file);
            const { data } = await api.post('/upload/clinic-doc', fd, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            const url = data?.data?.url;
            if (url) onChange(url);
            else setErr('Yuklashda xato');
        } catch (e2) {
            setErr(e2?.response?.data?.message || 'Yuklashda xato');
        } finally {
            setBusy(false);
            if (inputRef.current) inputRef.current.value = '';
        }
    };

    const fileName = value ? decodeURIComponent(value.split('/').pop()) : '';

    return (
        <div className="cdocs-field">
            {label && <label>{label}</label>}
            {value ? (
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px',
                    border: '1px solid #e2e8f0', borderRadius: 8, background: '#f8fafc', fontSize: 13,
                }}>
                    <FileText size={15} color="#0d9488" />
                    <a href={value} target="_blank" rel="noreferrer" style={{ color: '#0f766e', textDecoration: 'none', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {fileName}
                    </a>
                    <button type="button" onClick={() => onChange(null)} aria-label="O'chirish"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex' }}>
                        <X size={14} />
                    </button>
                </div>
            ) : (
                <button type="button" onClick={() => inputRef.current?.click()} disabled={busy}
                    style={{
                        display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
                        border: '1px dashed #cbd5e1', borderRadius: 8, background: '#fff',
                        color: '#475569', fontSize: 13, cursor: busy ? 'default' : 'pointer', width: '100%',
                    }}>
                    {busy ? <Loader2 size={14} className="cdocs-spin" /> : <Upload size={14} />}
                    {busy ? 'Yuklanmoqda...' : 'Fayl yuklash (PDF yoki rasm)'}
                </button>
            )}
            <input ref={inputRef} type="file" accept=".pdf,image/*" style={{ display: 'none' }} onChange={pick} />
            {err
                ? <div className="cdocs-field__hint" style={{ color: '#ef4444' }}>{err}</div>
                : hint && <div className="cdocs-field__hint">{hint}</div>}
        </div>
    );
}

function NewDoctorForm({ onCancel, onCreated, initial }) {
    const isEdit = !!initial?.doctorClinicId;
    const d = initial?.doctor || {};

    const [firstName, setFirstName] = useState(d.firstName || '');
    const [lastName, setLastName] = useState(d.lastName || '');
    const [middleName, setMiddleName] = useState(d.middleName || '');
    const [specialtyId, setSpecialtyId] = useState(d.specialtyId || '');
    const [category, setCategory] = useState(d.category || '');
    const [academicDegree, setAcademicDegree] = useState(d.academicDegree || '');
    const [academicTitle, setAcademicTitle] = useState(d.academicTitle || '');
    // Education (diplomas) + credential documents.
    const [bachelorSpecialty, setBachelorSpecialty] = useState(d.bachelorSpecialty || '');
    const [bachelorDiplomaUrl, setBachelorDiplomaUrl] = useState(d.bachelorDiplomaUrl || '');
    const [masterSpecialty, setMasterSpecialty] = useState(d.masterSpecialty || '');
    const [masterDiplomaUrl, setMasterDiplomaUrl] = useState(d.masterDiplomaUrl || '');
    const [categoryDocUrl, setCategoryDocUrl] = useState(d.categoryDocUrl || '');
    const [academicDegreeDocUrl, setAcademicDegreeDocUrl] = useState(d.academicDegreeDocUrl || '');
    const [academicTitleDocUrl, setAcademicTitleDocUrl] = useState(d.academicTitleDocUrl || '');
    const [treatedDiseases, setTreatedDiseases] = useState(
        Array.isArray(d.treatedDiseases) ? d.treatedDiseases : [],
    );
    const [surgicalProcedures, setSurgicalProcedures] = useState(
        Array.isArray(d.surgicalProcedures) ? d.surgicalProcedures : [],
    );
    const [photoUrl, setPhotoUrl] = useState(d.photoUrl || '');
    const [photoUrls, setPhotoUrls] = useState(Array.isArray(d.photoUrls) ? d.photoUrls : []);
    const [bio, setBio] = useState(d.bio || '');
    const [yearsExperience, setYearsExperience] = useState(d.yearsExperience ?? '');
    const [consultationPrice, setConsultationPrice] = useState(initial?.consultationPrice ?? 0);

    const { data: specs = [] } = useQuery({
        queryKey: ['public', 'specialties'],
        queryFn: async () => (await api.get('/public/specialties')).data?.data?.items ?? [],
    });

    // The doctor profile payload — shared between create and update so the
    // two paths can't drift on a field rename.
    const profilePayload = () => ({
        firstName, lastName,
        middleName: middleName.trim() || null,
        specialtyId: specialtyId || null,
        photoUrl: photoUrl || null,
        photoUrls,
        bio: bio || null,
        yearsExperience: yearsExperience === '' ? null : Number(yearsExperience),
        category: category || null,
        academicDegree: academicDegree.trim() || null,
        academicTitle: academicTitle.trim() || null,
        bachelorSpecialty: bachelorSpecialty.trim() || null,
        bachelorDiplomaUrl: bachelorDiplomaUrl || null,
        masterSpecialty: masterSpecialty.trim() || null,
        masterDiplomaUrl: masterDiplomaUrl || null,
        categoryDocUrl: categoryDocUrl || null,
        academicDegreeDocUrl: academicDegreeDocUrl || null,
        academicTitleDocUrl: academicTitleDocUrl || null,
        treatedDiseases,
        surgicalProcedures,
    });

    const save = useMutation({
        mutationFn: async () => {
            if (isEdit) {
                await api.patch(`/clinic/doctors/${initial.doctorClinicId}/profile`, profilePayload());
                await api.patch(`/clinic/doctors/${initial.doctorClinicId}`, {
                    consultationPrice: Number(consultationPrice) || 0,
                });
                return true;
            }
            return (await api.post('/clinic/doctors', {
                ...profilePayload(),
                consultationPrice: Number(consultationPrice) || 0,
            })).data;
        },
        onSuccess: onCreated,
    });

    const canSubmit = firstName.trim().length >= 2 && lastName.trim().length >= 2;
    // Lit up the surgical-procedures hint only when the selected specialty
    // actually looks like a surgical one — keeps the field discoverable
    // for surgeons without nagging dermatologists about it.
    const selectedSpec = specs.find((s) => s.id === specialtyId);
    const isSurgicalSpec = String(selectedSpec?.nameUz || '').toLowerCase().includes('jarroh');

    return (
        <>
            {/* ── Asosiy ma'lumot ── */}
            <Section
                icon={UserIcon}
                title="Asosiy ma'lumot"
                subtitle="Doktorning ismi va mutaxassisligi"
            >
                <div className="cdocs-grid-3">
                    <div className="cdocs-field">
                        <label>Familiya *</label>
                        <input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Karimov" />
                    </div>
                    <div className="cdocs-field">
                        <label>Ism *</label>
                        <input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Bahodir" />
                    </div>
                    <div className="cdocs-field">
                        <label>Otasining ismi</label>
                        <input value={middleName} onChange={(e) => setMiddleName(e.target.value)} placeholder="Akmalovich" />
                    </div>
                </div>

                <div className="cdocs-field">
                    <label>Mutaxassislik</label>
                    <select value={specialtyId} onChange={(e) => setSpecialtyId(e.target.value)}>
                        <option value="">— Tanlang —</option>
                        {specs.map((s) => (
                            <option key={s.id} value={s.id}>{s.nameUz}</option>
                        ))}
                    </select>
                    <div className="cdocs-field__hint">
                        Ro'yxat super-admin tomonidan boshqariladi. Kerakli mutaxassislik bo'lmasa — admin'ga murojaat qiling.
                    </div>
                </div>
            </Section>

            {/* ── Ta'lim / Diplomlar ── */}
            <Section
                icon={GraduationCap}
                title="Ta'lim / Diplomlar"
                subtitle="Bakalavr va magistr mutaxassisligi — matnни qo'lda yozing, diplomni yuklang"
            >
                <div className="cdocs-grid-2">
                    <div className="cdocs-field">
                        <label>Bakalavr mutaxassisligi</label>
                        <input
                            value={bachelorSpecialty}
                            onChange={(e) => setBachelorSpecialty(e.target.value)}
                            placeholder="Davolash ishi"
                        />
                        <DocUpload
                            value={bachelorDiplomaUrl}
                            onChange={setBachelorDiplomaUrl}
                            hint="Bakalavr diplomi (PDF/rasm)"
                        />
                    </div>
                    <div className="cdocs-field">
                        <label>Magistr mutaxassisligi</label>
                        <input
                            value={masterSpecialty}
                            onChange={(e) => setMasterSpecialty(e.target.value)}
                            placeholder="Kardiologiya"
                        />
                        <DocUpload
                            value={masterDiplomaUrl}
                            onChange={setMasterDiplomaUrl}
                            hint="Magistr diplomi (ixtiyoriy)"
                        />
                    </div>
                </div>
            </Section>

            {/* ── Ilmiy va kasbiy daraja ── */}
            <Section
                icon={Award}
                title="Ilmiy va kasbiy daraja"
                subtitle="Toifa, ilmiy daraja va unvon — bemorlar profilda ko'radi"
            >
                <div className="cdocs-grid-2">
                    <div className="cdocs-field">
                        <label><Award size={12} /> Toifa</label>
                        <select value={category} onChange={(e) => setCategory(e.target.value)}>
                            {CATEGORY_OPTIONS.map((o) => (
                                <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                        </select>
                        <DocUpload
                            value={categoryDocUrl}
                            onChange={setCategoryDocUrl}
                            hint="Toifa guvohnomasi (ixtiyoriy — PDF/rasm)"
                        />
                    </div>
                    <div className="cdocs-field">
                        <label>Tajriba (yil)</label>
                        <input
                            type="number"
                            value={yearsExperience}
                            onChange={(e) => setYearsExperience(e.target.value)}
                            placeholder="10"
                        />
                    </div>
                </div>

                <div className="cdocs-grid-2">
                    <div className="cdocs-field">
                        <label>Ilmiy darajasi</label>
                        <input
                            value={academicDegree}
                            onChange={(e) => setAcademicDegree(e.target.value)}
                            placeholder="Tibbiyot fanlari nomzodi"
                        />
                        <div className="cdocs-field__hint">
                            Masalan: <i>Tibbiyot fanlari nomzodi</i>, <i>Tibbiyot fanlari doktori</i>
                        </div>
                        <DocUpload
                            value={academicDegreeDocUrl}
                            onChange={setAcademicDegreeDocUrl}
                            hint="Ilmiy daraja diplomi/hujjati (ixtiyoriy)"
                        />
                    </div>
                    <div className="cdocs-field">
                        <label>Ilmiy unvoni</label>
                        <input
                            value={academicTitle}
                            onChange={(e) => setAcademicTitle(e.target.value)}
                            placeholder="Dotsent"
                        />
                        <div className="cdocs-field__hint">
                            Masalan: <i>Dotsent</i>, <i>Professor</i>
                        </div>
                        <DocUpload
                            value={academicTitleDocUrl}
                            onChange={setAcademicTitleDocUrl}
                            hint="Ilmiy unvon hujjati (ixtiyoriy)"
                        />
                    </div>
                </div>
            </Section>

            {/* ── Klinik xizmatlar ── */}
            <Section
                icon={BriefcaseMedical}
                title="Klinik xizmatlar"
                subtitle="Davolanadigan kasalliklar va jarrohliklar — bemor qidiruvi shu yerdan keladi"
            >
                <div className="cdocs-field">
                    <label><BriefcaseMedical size={12} /> Davolanadigan kasalliklar</label>
                    <ChipInput
                        value={treatedDiseases}
                        onChange={setTreatedDiseases}
                        placeholder="Masalan: yurak ishemiyasi, gipertoniya..."
                        max={40}
                    />
                </div>

                <div className="cdocs-field">
                    <label><Scissors size={12} /> Jarrohliklar (faqat jarrohlar uchun)</label>
                    <ChipInput
                        value={surgicalProcedures}
                        onChange={setSurgicalProcedures}
                        placeholder="Masalan: appendektomiya, gernioplastika..."
                        max={40}
                    />
                    <div className="cdocs-field__hint">
                        {isSurgicalSpec
                            ? "Jarrohlik mutaxassislari uchun — bemor qidiruvi shu ro'yxatdan keladi."
                            : "Jarrohlik mutaxassislari uchun foydali. Boshqa shifokorlar bo'sh qoldirishi mumkin."}
                    </div>
                </div>
            </Section>

            {/* ── Profil va bio ── */}
            <Section
                icon={Camera}
                title="Profil rasmi va biografiya"
                subtitle="Bemorlar avval shu rasmlarni va matnni ko'radi"
            >
                <ImageUpload
                    value={photoUrl}
                    onChange={setPhotoUrl}
                    label="Asosiy foto (avatar)"
                    hint="Bemorlar avval shu rasmni ko'radi"
                />

                <div className="cdocs-field">
                    <MultiImageUpload
                        value={photoUrls}
                        onChange={setPhotoUrls}
                        max={3}
                        label="Qo'shimcha rasmlar"
                        hint="Doktor profili sahifasida galereya bo'lib ko'rinadi (3 tagacha)"
                    />
                </div>

                <div className="cdocs-field">
                    <label><BookOpen size={12} /> Bio</label>
                    <textarea
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        rows={3}
                        placeholder="Tajriba, sohadagi yutuqlar, ish uslubi..."
                    />
                </div>
            </Section>

            {/* ── Klinikada ── */}
            <Section
                icon={Building2}
                title="Shu klinikadagi sozlamalar"
                subtitle="Konsultatsiya narxi — har klinika alohida"
            >
                <div className="cdocs-field">
                    <label>Konsultatsiya narxi (so'm)</label>
                    <input
                        type="number"
                        value={consultationPrice}
                        onChange={(e) => setConsultationPrice(e.target.value)}
                        placeholder="100000"
                    />
                </div>
            </Section>

            {save.isError && (
                <div className="cdocs-error">
                    <AlertTriangle size={14} />
                    {save.error?.response?.data?.message || 'Saqlashda xato'}
                </div>
            )}

            <div className="cdocs-drawer__foot">
                <button className="cdocs-btn" onClick={onCancel}>Bekor</button>
                <button
                    className="cdocs-btn cdocs-btn--primary"
                    onClick={() => save.mutate()}
                    disabled={save.isPending || !canSubmit}
                >
                    {save.isPending ? <Loader2 size={14} className="cdocs-spin" /> : <CheckCircle2 size={14} />}
                    {isEdit ? 'Saqlash' : "Qo'shish"}
                </button>
            </div>
        </>
    );
}

function AttachExisting({ onAttached, onCancel }) {
    const [phone, setPhone] = useState('');
    const [searched, setSearched] = useState(null);
    const [price, setPrice] = useState(0);

    const lookup = useMutation({
        mutationFn: async () => (await api.post('/clinic/doctors/lookup', { phone })).data?.data,
        onSuccess: (data) => setSearched(data),
    });

    const attach = useMutation({
        mutationFn: async () => (await api.post('/clinic/doctors', {
            doctorId: searched.doctor.id,
            consultationPrice: Number(price) || 0,
        })).data,
        onSuccess: onAttached,
    });

    return (
        <>
            <div className="cdocs-field">
                <label>Telefon raqami orqali qidirish</label>
                <div className="cdocs-attach-search">
                    <input
                        value={phone}
                        onChange={(e) => { setPhone(e.target.value); setSearched(null); }}
                        placeholder="+998 90 123 45 67"
                    />
                    <button
                        className="cdocs-btn cdocs-btn--primary"
                        onClick={() => lookup.mutate()}
                        disabled={lookup.isPending || phone.trim().length < 5}
                    >
                        {lookup.isPending ? <Loader2 size={14} className="cdocs-spin" /> : <Search size={14} />}
                        Qidirish
                    </button>
                </div>
                <div className="cdocs-field__hint">
                    Doktor boshqa klinikada allaqachon ro'yxatdan o'tgan bo'lsa — uni shu yerda qo'shing.
                    Telefon raqami faqat ichki qidiruv uchun ishlatiladi; bemor ko'rmaydi.
                    Maksimum 3 klinikada faol bo'lishi mumkin.
                </div>
            </div>

            {lookup.isError && (
                <div className="cdocs-error">
                    <AlertTriangle size={14} /> Qidirishda xato
                </div>
            )}

            {searched && !searched.found && (
                <div className="cdocs-empty cdocs-attach-empty">
                    <Search size={36} color="#cbd5e1" />
                    <div className="cdocs-attach-empty__title">Topilmadi</div>
                    <div className="cdocs-attach-empty__hint">
                        Bu telefon raqami bilan doktor ro'yxatdan o'tmagan
                    </div>
                </div>
            )}

            {searched?.found && (
                <>
                    <div className="cdocs-found">
                        <div className="cdocs-found__head">
                            {searched.doctor.photoUrl ? (
                                <img src={searched.doctor.photoUrl} alt="" className="cdocs-found__photo" />
                            ) : (
                                <div className="cdocs-found__initials">
                                    {searched.doctor.firstName[0]}{searched.doctor.lastName[0]}
                                </div>
                            )}
                            <div className="cdocs-found__title-block">
                                <div className="cdocs-found__name">
                                    {searched.doctor.firstName} {searched.doctor.lastName}
                                </div>
                                <div className="cdocs-found__spec">
                                    <Stethoscope size={11} /> {searched.doctor.specialtyName || 'Mutaxassislik yo\'q'}
                                </div>
                            </div>
                        </div>

                        <div className="cdocs-found__clinics">
                            <Building2 size={12} className="cdocs-found__clinics-icon" />
                            Hozir {searched.doctor.clinicCount} klinikada faol:
                            <div className="cdocs-found__chips">
                                {searched.doctor.clinics.map((c) => (
                                    <span key={c.clinicId} className="cdocs-chip">{c.clinicName}</span>
                                ))}
                            </div>
                        </div>

                        {searched.doctor.alreadyHere ? (
                            <div className="cdocs-error cdocs-found__error">
                                <AlertTriangle size={14} /> Bu doktor allaqachon sizning klinikangizda
                            </div>
                        ) : searched.doctor.clinicCount >= 3 ? (
                            <div className="cdocs-error cdocs-found__error">
                                <AlertTriangle size={14} /> Limit oshib ketgan ({searched.doctor.clinicCount}/3)
                            </div>
                        ) : null}
                    </div>

                    {!searched.doctor.alreadyHere && searched.doctor.clinicCount < 3 && (
                        <>
                            <div className="cdocs-attach-config">
                                <div className="cdocs-field">
                                    <label>Sizning konsultatsiya narxingiz (so'm)</label>
                                    <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="100000" />
                                </div>
                            </div>
                            {attach.isError && (
                                <div className="cdocs-error">
                                    <AlertTriangle size={14} />
                                    {attach.error?.response?.data?.message || 'Qo\'shishda xato'}
                                </div>
                            )}
                        </>
                    )}
                </>
            )}

            <div className="cdocs-drawer__foot">
                <button className="cdocs-btn" onClick={onCancel}>Bekor</button>
                <button
                    className="cdocs-btn cdocs-btn--primary"
                    onClick={() => attach.mutate()}
                    disabled={
                        attach.isPending ||
                        !searched?.found ||
                        searched.doctor.alreadyHere ||
                        searched.doctor.clinicCount >= 3
                    }
                >
                    {attach.isPending ? <Loader2 size={14} className="cdocs-spin" /> : <ArrowRight size={14} />}
                    Klinikamga qo'shish
                </button>
            </div>
        </>
    );
}

export default function DoctorEditDrawer({ row, onClose, onSaved }) {
    const isEdit = !!row;
    const [mode, setMode] = useState('new'); // new | existing

    return (
        <>
            <motion.div
                className="cdocs-drawer-bg"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
            />
            <motion.aside
                className="cdocs-drawer"
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'tween', duration: 0.28 }}
            >
                <div className="cdocs-drawer__head">
                    <div>
                        <div className="cdocs-drawer__title">
                            <UserPlus size={18} />
                            {isEdit ? 'Doktor tahrirlash' : 'Yangi doktor'}
                        </div>
                        {!isEdit && (
                            <div className="cdocs-tabs">
                                <button
                                    className={mode === 'new' ? 'cdocs-tab--on' : ''}
                                    onClick={() => setMode('new')}
                                >
                                    Yangi yaratish
                                </button>
                                <button
                                    className={mode === 'existing' ? 'cdocs-tab--on' : ''}
                                    onClick={() => setMode('existing')}
                                >
                                    Mavjud doktorni qo'shish
                                </button>
                            </div>
                        )}
                    </div>
                    <button className="cdocs-icon-btn" onClick={onClose}><X size={20} /></button>
                </div>

                <div className="cdocs-drawer__body">
                    {isEdit || mode === 'new' ? (
                        <NewDoctorForm initial={row} onCancel={onClose} onCreated={onSaved} />
                    ) : (
                        <AttachExisting onAttached={onSaved} onCancel={onClose} />
                    )}
                </div>
            </motion.aside>
        </>
    );
}
