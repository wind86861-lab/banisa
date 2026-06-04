import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
    X, Loader2, Search, UserPlus, Phone, AlertTriangle,
    CheckCircle2, Building2, Stethoscope, ArrowRight,
} from 'lucide-react';
import api from '../../../shared/api/axios';
import ImageUpload from '../../../shared/components/ImageUpload';
import MultiImageUpload from '../../../shared/components/MultiImageUpload';

function NewDoctorForm({ onCancel, onCreated, initial }) {
    const isEdit = !!initial?.doctorClinicId;
    const d = initial?.doctor || {};

    const [firstName, setFirstName] = useState(d.firstName || '');
    const [lastName, setLastName] = useState(d.lastName || '');
    const [specialtyId, setSpecialtyId] = useState(d.specialtyId || '');
    const [phone, setPhone] = useState(d.phone || '');
    const [email, setEmail] = useState(d.email || '');
    const [photoUrl, setPhotoUrl] = useState(d.photoUrl || '');
    const [photoUrls, setPhotoUrls] = useState(Array.isArray(d.photoUrls) ? d.photoUrls : []);
    const [bio, setBio] = useState(d.bio || '');
    const [yearsExperience, setYearsExperience] = useState(d.yearsExperience ?? '');
    const [consultationPrice, setConsultationPrice] = useState(initial?.consultationPrice ?? 0);
    const [roomNumber, setRoomNumber] = useState(initial?.roomNumber || '');

    const { data: specs = [] } = useQuery({
        queryKey: ['public', 'specialties'],
        queryFn: async () => (await api.get('/public/specialties')).data?.data?.items ?? [],
    });

    const save = useMutation({
        mutationFn: async () => {
            if (isEdit) {
                // Update doctor profile (only first clinic can edit globally — server enforces)
                await api.patch(`/clinic/doctors/${initial.doctorClinicId}/profile`, {
                    firstName, lastName, specialtyId: specialtyId || null,
                    phone: phone || null, email: email || null,
                    photoUrl: photoUrl || null, photoUrls, bio: bio || null,
                    yearsExperience: yearsExperience === '' ? null : Number(yearsExperience),
                });
                // Update attachment (price/room)
                await api.patch(`/clinic/doctors/${initial.doctorClinicId}`, {
                    consultationPrice: Number(consultationPrice) || 0,
                    roomNumber: roomNumber || null,
                });
                return true;
            }
            return (await api.post('/clinic/doctors', {
                firstName, lastName, specialtyId: specialtyId || null,
                phone: phone || null, email: email || null,
                photoUrl: photoUrl || null, photoUrls, bio: bio || null,
                yearsExperience: yearsExperience === '' ? null : Number(yearsExperience),
                consultationPrice: Number(consultationPrice) || 0,
                roomNumber: roomNumber || null,
            })).data;
        },
        onSuccess: onCreated,
    });

    const canSubmit = firstName.trim().length >= 2 && lastName.trim().length >= 2;

    return (
        <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="cdocs-field">
                    <label>Ism *</label>
                    <input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Bahodir" />
                </div>
                <div className="cdocs-field">
                    <label>Familiya *</label>
                    <input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Karimov" />
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

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="cdocs-field">
                    <label>Telefon</label>
                    <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+998 90 123 45 67" />
                </div>
                <div className="cdocs-field">
                    <label>Email</label>
                    <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="doctor@example.com" />
                </div>
            </div>

            <div className="cdocs-field">
                <ImageUpload
                    value={photoUrl}
                    onChange={setPhotoUrl}
                    label="Asosiy foto (avatar)"
                    hint="Bemorlar avval shu rasmni ko'radi"
                />
            </div>

            <div className="cdocs-field">
                <MultiImageUpload
                    value={photoUrls}
                    onChange={setPhotoUrls}
                    max={3}
                    label="Qo'shimcha rasmlar"
                    hint="Doktor profili sahifasida galereya bo'lib ko'rinadi (3 tagacha)"
                />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <div className="cdocs-field">
                    <label>Tajriba (yil)</label>
                    <input
                        type="number"
                        value={yearsExperience}
                        onChange={(e) => setYearsExperience(e.target.value)}
                        placeholder="10"
                    />
                </div>
                <div className="cdocs-field">
                    <label>Konsultatsiya (so'm)</label>
                    <input
                        type="number"
                        value={consultationPrice}
                        onChange={(e) => setConsultationPrice(e.target.value)}
                        placeholder="100000"
                    />
                </div>
                <div className="cdocs-field">
                    <label>Xona</label>
                    <input value={roomNumber} onChange={(e) => setRoomNumber(e.target.value)} placeholder="305" />
                </div>
            </div>

            <div className="cdocs-field">
                <label>Bio</label>
                <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    rows={3}
                    placeholder="Tajriba, ilmiy darajalar, sohadagi yutuqlar..."
                />
            </div>

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
    const [room, setRoom] = useState('');

    const lookup = useMutation({
        mutationFn: async () => (await api.post('/clinic/doctors/lookup', { phone })).data?.data,
        onSuccess: (data) => setSearched(data),
    });

    const attach = useMutation({
        mutationFn: async () => (await api.post('/clinic/doctors', {
            doctorId: searched.doctor.id,
            consultationPrice: Number(price) || 0,
            roomNumber: room || null,
        })).data,
        onSuccess: onAttached,
    });

    return (
        <>
            <div className="cdocs-field">
                <label>Telefon raqami orqali qidirish</label>
                <div style={{ display: 'flex', gap: 8 }}>
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
                    Maksimum 3 klinikada faol bo'lishi mumkin.
                </div>
            </div>

            {lookup.isError && (
                <div className="cdocs-error">
                    <AlertTriangle size={14} /> Qidirishda xato
                </div>
            )}

            {searched && !searched.found && (
                <div className="cdocs-empty" style={{ padding: 30 }}>
                    <Search size={36} color="#cbd5e1" />
                    <div style={{ marginTop: 10, fontWeight: 700, color: '#0f172a' }}>Topilmadi</div>
                    <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                        Bu telefon raqami bilan doktor ro'yxatdan o'tmagan
                    </div>
                </div>
            )}

            {searched?.found && (
                <>
                    <div className="cdocs-found">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            {searched.doctor.photoUrl ? (
                                <img src={searched.doctor.photoUrl} alt="" style={{ width: 50, height: 50, borderRadius: 12, objectFit: 'cover' }} />
                            ) : (
                                <div style={{ width: 50, height: 50, borderRadius: 12, background: '#06b6d4', color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 800 }}>
                                    {searched.doctor.firstName[0]}{searched.doctor.lastName[0]}
                                </div>
                            )}
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: 800, fontSize: 15 }}>
                                    {searched.doctor.firstName} {searched.doctor.lastName}
                                </div>
                                <div style={{ fontSize: 12, color: '#64748b', display: 'flex', gap: 6, alignItems: 'center' }}>
                                    <Stethoscope size={11} /> {searched.doctor.specialtyName || 'Mutaxassislik yo\'q'}
                                </div>
                            </div>
                        </div>

                        <div style={{ marginTop: 12, fontSize: 12, color: '#64748b' }}>
                            <Building2 size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                            Hozir {searched.doctor.clinicCount} klinikada faol:
                            <div style={{ marginTop: 4, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                {searched.doctor.clinics.map((c) => (
                                    <span key={c.clinicId} className="cdocs-chip">{c.clinicName}</span>
                                ))}
                            </div>
                        </div>

                        {searched.doctor.alreadyHere ? (
                            <div className="cdocs-error" style={{ marginTop: 12 }}>
                                <AlertTriangle size={14} /> Bu doktor allaqachon sizning klinikangizda
                            </div>
                        ) : searched.doctor.clinicCount >= 3 ? (
                            <div className="cdocs-error" style={{ marginTop: 12 }}>
                                <AlertTriangle size={14} /> Limit oshib ketgan ({searched.doctor.clinicCount}/3)
                            </div>
                        ) : null}
                    </div>

                    {!searched.doctor.alreadyHere && searched.doctor.clinicCount < 3 && (
                        <>
                            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12, marginTop: 12 }}>
                                <div className="cdocs-field">
                                    <label>Sizning konsultatsiya narxingiz (so'm)</label>
                                    <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="100000" />
                                </div>
                                <div className="cdocs-field">
                                    <label>Xona</label>
                                    <input value={room} onChange={(e) => setRoom(e.target.value)} placeholder="305" />
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
