import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { User, Mail, Phone, Edit2, Save, X } from 'lucide-react';
import api from '../../shared/api/axios';

/**
 * User Profile Page
 * Allows users to view and edit their profile information
 */
export default function UserProfile() {
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
    });

    const queryClient = useQueryClient();

    // Fetch user profile
    const { data: profile, isLoading } = useQuery({
        queryKey: ['user', 'profile'],
        queryFn: async () => {
            const res = await api.get('/user/profile');
            return res.data.data;
        },
        onSuccess: (data) => {
            setFormData({
                firstName: data.firstName || '',
                lastName: data.lastName || '',
                email: data.email || '',
            });
        },
    });

    // Update profile mutation
    const updateMutation = useMutation({
        mutationFn: async (data) => {
            const res = await api.put('/user/profile', data);
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['user', 'profile']);
            setIsEditing(false);
        },
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        updateMutation.mutate(formData);
    };

    const handleCancel = () => {
        setFormData({
            firstName: profile?.firstName || '',
            lastName: profile?.lastName || '',
            email: profile?.email || '',
        });
        setIsEditing(false);
    };

    if (isLoading) {
        return (
            <div style={{ padding: 40, textAlign: 'center' }}>
                <div className="spinner"></div>
                <p>Yuklanmoqda...</p>
            </div>
        );
    }

    return (
        <div style={{ maxWidth: 800, margin: '0 auto', padding: 20 }}>
            <div style={{
                background: 'var(--bg-card)',
                borderRadius: 16,
                padding: 32,
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            }}>
                {/* Header */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 32,
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <div style={{
                            width: 64,
                            height: 64,
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, #00c9a7 0%, #845ec2 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontSize: 24,
                            fontWeight: 700,
                        }}>
                            {profile?.firstName?.[0] || profile?.phone?.[0] || 'U'}
                        </div>
                        <div>
                            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>
                                {profile?.firstName || profile?.lastName
                                    ? `${profile.firstName || ''} ${profile.lastName || ''}`.trim()
                                    : 'Foydalanuvchi'}
                            </h1>
                            <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: 14 }}>
                                {profile?.role === 'PATIENT' ? 'Bemor' : profile?.role}
                            </p>
                        </div>
                    </div>

                    {!isEditing && (
                        <button
                            onClick={() => setIsEditing(true)}
                            style={{
                                padding: '10px 20px',
                                borderRadius: 8,
                                border: '1px solid var(--color-primary)',
                                background: 'transparent',
                                color: 'var(--color-primary)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                fontSize: 14,
                                fontWeight: 500,
                            }}
                        >
                            <Edit2 size={16} />
                            Tahrirlash
                        </button>
                    )}
                </div>

                {/* Profile Form */}
                <form onSubmit={handleSubmit}>
                    <div style={{ display: 'grid', gap: 20 }}>
                        {/* Phone (read-only) */}
                        <div>
                            <label style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                fontSize: 13,
                                fontWeight: 500,
                                marginBottom: 8,
                                color: 'var(--text-main)',
                            }}>
                                <Phone size={16} />
                                Telefon raqami
                            </label>
                            <input
                                type="tel"
                                value={profile?.phone || ''}
                                disabled
                                style={{
                                    width: '100%',
                                    padding: '12px 16px',
                                    borderRadius: 8,
                                    border: '1px solid var(--border-color)',
                                    fontSize: 14,
                                    background: 'var(--bg-main)',
                                    color: 'var(--text-muted)',
                                    cursor: 'not-allowed',
                                }}
                            />
                        </div>

                        {/* First Name */}
                        <div>
                            <label style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                fontSize: 13,
                                fontWeight: 500,
                                marginBottom: 8,
                                color: 'var(--text-main)',
                            }}>
                                <User size={16} />
                                Ism
                            </label>
                            <input
                                type="text"
                                value={formData.firstName}
                                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                                disabled={!isEditing}
                                placeholder="Ismingizni kiriting"
                                style={{
                                    width: '100%',
                                    padding: '12px 16px',
                                    borderRadius: 8,
                                    border: '1px solid var(--border-color)',
                                    fontSize: 14,
                                    background: isEditing ? 'var(--bg-card)' : 'var(--bg-main)',
                                    color: 'var(--text-main)',
                                }}
                            />
                        </div>

                        {/* Last Name */}
                        <div>
                            <label style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                fontSize: 13,
                                fontWeight: 500,
                                marginBottom: 8,
                                color: 'var(--text-main)',
                            }}>
                                <User size={16} />
                                Familiya
                            </label>
                            <input
                                type="text"
                                value={formData.lastName}
                                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                                disabled={!isEditing}
                                placeholder="Familiyangizni kiriting"
                                style={{
                                    width: '100%',
                                    padding: '12px 16px',
                                    borderRadius: 8,
                                    border: '1px solid var(--border-color)',
                                    fontSize: 14,
                                    background: isEditing ? 'var(--bg-card)' : 'var(--bg-main)',
                                    color: 'var(--text-main)',
                                }}
                            />
                        </div>

                        {/* Email */}
                        <div>
                            <label style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                fontSize: 13,
                                fontWeight: 500,
                                marginBottom: 8,
                                color: 'var(--text-main)',
                            }}>
                                <Mail size={16} />
                                Email
                            </label>
                            <input
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                disabled={!isEditing}
                                placeholder="email@example.com"
                                style={{
                                    width: '100%',
                                    padding: '12px 16px',
                                    borderRadius: 8,
                                    border: '1px solid var(--border-color)',
                                    fontSize: 14,
                                    background: isEditing ? 'var(--bg-card)' : 'var(--bg-main)',
                                    color: 'var(--text-main)',
                                }}
                            />
                        </div>
                    </div>

                    {/* Action Buttons */}
                    {isEditing && (
                        <div style={{
                            display: 'flex',
                            gap: 12,
                            marginTop: 24,
                            justifyContent: 'flex-end',
                        }}>
                            <button
                                type="button"
                                onClick={handleCancel}
                                disabled={updateMutation.isPending}
                                style={{
                                    padding: '10px 20px',
                                    borderRadius: 8,
                                    border: '1px solid var(--border-color)',
                                    background: 'transparent',
                                    color: 'var(--text-main)',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 8,
                                    fontSize: 14,
                                    fontWeight: 500,
                                }}
                            >
                                <X size={16} />
                                Bekor qilish
                            </button>
                            <button
                                type="submit"
                                disabled={updateMutation.isPending}
                                style={{
                                    padding: '10px 20px',
                                    borderRadius: 8,
                                    border: 'none',
                                    background: 'var(--color-primary)',
                                    color: 'white',
                                    cursor: updateMutation.isPending ? 'not-allowed' : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 8,
                                    fontSize: 14,
                                    fontWeight: 500,
                                    opacity: updateMutation.isPending ? 0.6 : 1,
                                }}
                            >
                                <Save size={16} />
                                {updateMutation.isPending ? 'Saqlanmoqda...' : 'Saqlash'}
                            </button>
                        </div>
                    )}
                </form>

                {/* Profile Stats */}
                <div style={{
                    marginTop: 32,
                    paddingTop: 24,
                    borderTop: '1px solid var(--border-color)',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                    gap: 16,
                }}>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
                            Holat
                        </div>
                        <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-primary)' }}>
                            {profile?.status === 'APPROVED' ? 'Tasdiqlangan' : profile?.status}
                        </div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
                            Ro'yxatdan o'tgan
                        </div>
                        <div style={{ fontSize: 16, fontWeight: 600 }}>
                            {new Date(profile?.createdAt).toLocaleDateString('uz-UZ')}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
