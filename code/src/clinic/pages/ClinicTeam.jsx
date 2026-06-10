import { useEffect, useMemo, useState } from 'react';
import { Plus, Phone, Trash2, ShieldCheck, LogOut, Loader2, X, AlertCircle, Users } from 'lucide-react';
import api from '../../shared/api/axios';
import './clinic-admin.css';

const fmtDate = (d) => {
    if (!d) return '—';
    try {
        return new Date(d).toLocaleDateString('uz-UZ', { day: '2-digit', month: 'short', year: '2-digit' });
    } catch { return '—'; }
};
const fmtRelative = (d) => {
    if (!d) return 'hech qachon';
    const diffMin = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
    if (diffMin < 1) return 'hozir';
    if (diffMin < 60) return `${diffMin} daq oldin`;
    const h = Math.floor(diffMin / 60);
    if (h < 24) return `${h} soat oldin`;
    return fmtDate(d);
};

const SYSTEM_ROLE_TONE = {
    OWNER:        { bg: 'rgba(99,102,241,0.12)', fg: '#6366f1' },
    MANAGER:      { bg: 'rgba(16,185,129,0.12)', fg: '#10b981' },
    RECEPTIONIST: { bg: 'rgba(245,158,11,0.12)', fg: '#f59e0b' },
    CASHIER:      { bg: 'rgba(14,165,233,0.12)', fg: '#0ea5e9' },
    DOCTOR:       { bg: 'rgba(236,72,153,0.12)', fg: '#ec4899' },
    ACCOUNTANT:   { bg: 'rgba(100,116,139,0.12)', fg: '#64748b' },
};

function RoleChip({ role }) {
    const tone = SYSTEM_ROLE_TONE[role?.name] || { bg: 'rgba(99,102,241,0.1)', fg: '#6366f1' };
    return (
        <span style={{
            padding: '3px 10px', borderRadius: 12,
            fontSize: 11, fontWeight: 700,
            background: tone.bg, color: tone.fg,
        }}>{role?.name || '—'}</span>
    );
}

export default function ClinicTeam() {
    const [members, setMembers] = useState([]);
    const [roles, setRoles] = useState([]);
    const [me, setMe] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [inviteOpen, setInviteOpen] = useState(false);
    const [inviteForm, setInviteForm] = useState({ phone: '', roleId: '', firstName: '', lastName: '' });
    const [inviting, setInviting] = useState(false);

    const [busyUserId, setBusyUserId] = useState(null);

    const refresh = async () => {
        setLoading(true);
        setError('');
        try {
            const [m, r, mine] = await Promise.all([
                api.get('/clinic/team/members'),
                api.get('/clinic/team/roles'),
                api.get('/clinic/team/me'),
            ]);
            setMembers(m.data.data || []);
            setRoles(r.data.data || []);
            setMe(mine.data.data || null);
        } catch (e) {
            setError(e?.response?.data?.error?.message || e?.response?.data?.message || 'Yuklashda xato');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { refresh(); }, []);

    const myPerms = useMemo(() => new Set(me?.permissions || []), [me]);
    const canInvite = myPerms.has('TEAM_INVITE');
    const canRoleChange = myPerms.has('TEAM_ROLE_CHANGE');
    const canRemove = myPerms.has('TEAM_REMOVE');

    const handleInvite = async () => {
        setInviting(true);
        try {
            await api.post('/clinic/team/invite', inviteForm);
            setInviteOpen(false);
            setInviteForm({ phone: '', roleId: '', firstName: '', lastName: '' });
            await refresh();
        } catch (e) {
            alert(e?.response?.data?.error?.message || 'Taklif yuborilmadi');
        } finally { setInviting(false); }
    };

    const handleRoleChange = async (userId, roleId) => {
        setBusyUserId(userId);
        try {
            await api.patch(`/clinic/team/members/${userId}`, { roleId });
            await refresh();
        } catch (e) {
            alert(e?.response?.data?.error?.message || 'Rol o\'zgartirilmadi');
        } finally { setBusyUserId(null); }
    };

    const handleRemove = async (userId) => {
        if (!window.confirm('Bu a\'zoni klinikadan o\'chirishni xohlaysizmi?')) return;
        setBusyUserId(userId);
        try {
            await api.delete(`/clinic/team/members/${userId}`);
            await refresh();
        } catch (e) {
            alert(e?.response?.data?.error?.message || 'A\'zo o\'chirilmadi');
        } finally { setBusyUserId(null); }
    };

    const handleLeave = async () => {
        if (!window.confirm('Klinikadan chiqib ketishni xohlaysizmi?')) return;
        try {
            await api.post('/clinic/team/leave');
            window.location.href = '/login';
        } catch (e) {
            alert(e?.response?.data?.error?.message || 'Chiqib ketib bo\'lmadi');
        }
    };

    if (loading) {
        return (
            <div className="ca-page">
                <div className="ca-loading"><Loader2 size={32} className="ca-spin" /> Yuklanmoqda...</div>
            </div>
        );
    }

    return (
        <div className="ca-page">
            <div className="ca-page-head">
                <div>
                    <h1 className="ca-page-title"><Users size={22} /> Jamoa</h1>
                    <p className="ca-page-sub">Klinika a'zolari va ularning rollari</p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    {canInvite && (
                        <button className="ca-btn-primary" onClick={() => setInviteOpen(true)}>
                            <Plus size={16} /> Taklif qilish
                        </button>
                    )}
                    <button className="ca-btn-secondary" onClick={handleLeave} title="Klinikadan chiqish">
                        <LogOut size={16} /> Chiqish
                    </button>
                </div>
            </div>

            {error && (
                <div style={{
                    padding: '10px 14px', borderRadius: 8,
                    background: 'rgba(239,68,68,0.08)', color: '#ef4444',
                    display: 'flex', gap: 8, alignItems: 'center', marginBottom: 14,
                }}>
                    <AlertCircle size={16} /> {error}
                </div>
            )}

            <div style={{ background: 'var(--bg-card)', borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ background: 'var(--bg-main)', textAlign: 'left' }}>
                            <th style={th}>A'zo</th>
                            <th style={th}>Telefon</th>
                            <th style={th}>Rol</th>
                            <th style={th}>Qo'shilgan</th>
                            <th style={th}>So'nggi faollik</th>
                            <th style={{ ...th, textAlign: 'right' }}>Amallar</th>
                        </tr>
                    </thead>
                    <tbody>
                        {members.map(m => {
                            const isMe = me?.membershipId && me?.userId === m.userId;
                            const isSystemRole = m.role?.isSystem;
                            const showRoleSelect = canRoleChange && !isMe;
                            const showRemove = canRemove && !isMe;
                            const fullName = [m.firstName, m.lastName].filter(Boolean).join(' ') || '—';
                            return (
                                <tr key={m.membershipId} style={{ borderTop: '1px solid var(--border-color)', opacity: m.isActive ? 1 : 0.45 }}>
                                    <td style={td}>
                                        <strong>{fullName}</strong>
                                        {isMe && <span style={{ marginLeft: 6, fontSize: 10, color: 'var(--color-primary)' }}>(siz)</span>}
                                    </td>
                                    <td style={td}>
                                        <a href={`tel:${m.phone}`} style={{ color: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                            <Phone size={12} /> {m.phone}
                                        </a>
                                    </td>
                                    <td style={td}>
                                        {showRoleSelect ? (
                                            <select
                                                value={m.role?.id}
                                                disabled={busyUserId === m.userId}
                                                onChange={e => handleRoleChange(m.userId, e.target.value)}
                                                style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border-color)', background: 'var(--bg-card)' }}
                                            >
                                                {roles.map(r => (
                                                    <option key={r.id} value={r.id}>{r.name}</option>
                                                ))}
                                            </select>
                                        ) : (
                                            <RoleChip role={m.role} />
                                        )}
                                    </td>
                                    <td style={td}>{fmtDate(m.joinedAt)}</td>
                                    <td style={td}>{fmtRelative(m.lastSeenAt)}</td>
                                    <td style={{ ...td, textAlign: 'right' }}>
                                        {!m.isActive && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Nofaol</span>}
                                        {showRemove && m.isActive && (
                                            <button
                                                className="ca-icon-btn danger"
                                                disabled={busyUserId === m.userId}
                                                title="O'chirish"
                                                onClick={() => handleRemove(m.userId)}
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                        {members.length === 0 && (
                            <tr><td colSpan={6} style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>A'zo yo'q</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* My role + permissions */}
            {me && (
                <div style={{ marginTop: 20, padding: 14, background: 'var(--bg-card)', borderRadius: 10, border: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <ShieldCheck size={16} color="var(--color-primary)" />
                        <strong>Sizning rolingiz:</strong> <RoleChip role={{ name: me.roleName }} />
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        Ruxsatlar: {me.permissions?.length || 0} ta
                    </div>
                </div>
            )}

            {/* Invite modal */}
            {inviteOpen && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
                }}>
                    <div style={{ background: 'var(--bg-card)', padding: 24, borderRadius: 12, width: 380, maxWidth: '92vw' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <h3 style={{ margin: 0 }}>Yangi a'zo qo'shish</h3>
                            <button className="ca-icon-btn" onClick={() => setInviteOpen(false)}><X size={16} /></button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <div className="ca-form-group">
                                <label>Telefon raqami *</label>
                                <input
                                    type="tel" autoFocus required
                                    value={inviteForm.phone}
                                    onChange={e => setInviteForm({ ...inviteForm, phone: e.target.value })}
                                    placeholder="+998 90 123 45 67"
                                />
                            </div>
                            <div className="ca-form-group">
                                <label>Ism (ixtiyoriy)</label>
                                <input
                                    type="text"
                                    value={inviteForm.firstName}
                                    onChange={e => setInviteForm({ ...inviteForm, firstName: e.target.value })}
                                />
                            </div>
                            <div className="ca-form-group">
                                <label>Familiya (ixtiyoriy)</label>
                                <input
                                    type="text"
                                    value={inviteForm.lastName}
                                    onChange={e => setInviteForm({ ...inviteForm, lastName: e.target.value })}
                                />
                            </div>
                            <div className="ca-form-group">
                                <label>Rol *</label>
                                <select
                                    required
                                    value={inviteForm.roleId}
                                    onChange={e => setInviteForm({ ...inviteForm, roleId: e.target.value })}
                                >
                                    <option value="">Rolni tanlang...</option>
                                    {roles.filter(r => r.name !== 'OWNER').map(r => (
                                        <option key={r.id} value={r.id}>{r.name}{r.description ? ` — ${r.description}` : ''}</option>
                                    ))}
                                </select>
                            </div>
                            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 6 }}>
                                <button className="ca-btn-secondary" onClick={() => setInviteOpen(false)} disabled={inviting}>Bekor</button>
                                <button
                                    className="ca-btn-primary"
                                    onClick={handleInvite}
                                    disabled={inviting || !inviteForm.phone || !inviteForm.roleId}
                                >
                                    {inviting ? <><Loader2 size={14} className="ca-spin" /> Yuborilmoqda...</> : 'Taklif qilish'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

const th = { padding: '12px 14px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' };
const td = { padding: '12px 14px', fontSize: 13 };
