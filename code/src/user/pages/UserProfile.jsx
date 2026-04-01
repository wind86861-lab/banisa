import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { User, Mail, Phone, Edit2, Save, X, ChevronRight, LogOut } from 'lucide-react';
import api from '../../shared/api/axios';
import { useUserAuth } from '../../shared/auth/UserAuthContext';
import TopBar from '../../pages/home/TopBar';
import Navigation from '../../pages/home/Navigation';
import Footer from '../../pages/home/Footer';
import './css/UserProfile.css';

export default function UserProfile() {
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
    });

    const queryClient = useQueryClient();
    const { updateUserState, logout } = useUserAuth();

    const { data: profile, isLoading } = useQuery({
        queryKey: ['user', 'profile'],
        queryFn: async () => {
            const res = await api.get('/user/profile');
            return res.data.data;
        },
    });

    useEffect(() => {
        if (profile) {
            setFormData({
                firstName: profile.firstName || '',
                lastName: profile.lastName || '',
                email: profile.email || '',
            });
        }
    }, [profile]);

    const updateMutation = useMutation({
        mutationFn: async (data) => {
            const res = await api.put('/user/profile', data);
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['user', 'profile'] });
            updateUserState({ firstName: formData.firstName, lastName: formData.lastName });
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
            <div className="home-page">
                <TopBar />
                <Navigation />
                <div style={{ padding: 80, textAlign: 'center', minHeight: '60vh' }}>
                    <p>Yuklanmoqda...</p>
                </div>
                <Footer />
            </div>
        );
    }

    return (
        <div className="home-page">
            <TopBar />
            <Navigation />
            <main className="home-container up-main">
                {/* Breadcrumb */}
                <div className="up-breadcrumb">
                    <Link to="/user/dashboard">Dashboard</Link>
                    <ChevronRight size={16} />
                    <span>Profil</span>
                </div>

                {/* Page Header */}
                <h1 className="up-title">Mening Profilim</h1>

                {/* Profile Card */}
                <div className="up-card up-profile-card">
                    <div className="up-profile-left">
                        <div className="up-profile-avatar">
                            {profile?.firstName?.[0]?.toUpperCase() || 'U'}
                        </div>
                        <div className="up-profile-info">
                            <h2>{profile?.firstName || ''} {profile?.lastName || ''}</h2>
                            <div className="up-profile-badge">Bemor</div>
                            <div className="up-profile-phone">
                                <Phone size={14} />
                                {profile?.phone}
                            </div>
                        </div>
                    </div>
                    {!isEditing && (
                        <button className="up-edit-btn" onClick={() => setIsEditing(true)}>
                            <Edit2 size={16} />
                            Tahrirlash
                        </button>
                    )}
                </div>

                {/* Info Form */}
                <div className="up-card">
                    <h3 className="up-card-title">Shaxsiy ma'lumotlar</h3>
                    <form onSubmit={handleSubmit} className="up-form">
                        <div className="up-form-grid">
                            <div className="up-form-group">
                                <label>
                                    <User size={16} />
                                    Ism
                                </label>
                                <input
                                    type="text"
                                    value={formData.firstName}
                                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                                    disabled={!isEditing}
                                    placeholder="Ismingizni kiriting"
                                />
                            </div>
                            <div className="up-form-group">
                                <label>
                                    <User size={16} />
                                    Familiya
                                </label>
                                <input
                                    type="text"
                                    value={formData.lastName}
                                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                                    disabled={!isEditing}
                                    placeholder="Familiyangizni kiriting"
                                />
                            </div>
                            <div className="up-form-group">
                                <label>
                                    <Mail size={16} />
                                    Email
                                </label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    disabled={!isEditing}
                                    placeholder="email@example.com"
                                />
                            </div>
                            <div className="up-form-group">
                                <label>
                                    <Phone size={16} />
                                    Telefon raqami
                                </label>
                                <input
                                    type="tel"
                                    value={profile?.phone || ''}
                                    disabled
                                />
                            </div>
                        </div>

                        {isEditing && (
                            <div className="up-form-actions">
                                <button type="button" onClick={handleCancel} className="up-btn-cancel" disabled={updateMutation.isPending}>
                                    <X size={16} />
                                    Bekor qilish
                                </button>
                                <button type="submit" className="up-btn-save" disabled={updateMutation.isPending}>
                                    <Save size={16} />
                                    {updateMutation.isPending ? 'Saqlanmoqda...' : 'Saqlash'}
                                </button>
                            </div>
                        )}
                    </form>
                </div>

                {/* Account Info */}
                <div className="up-card">
                    <h3 className="up-card-title">Hisob ma'lumotlari</h3>
                    <div className="up-info-grid">
                        <div className="up-info-item">
                            <span className="up-info-label">Holat</span>
                            <span className="up-info-badge up-info-badge-active">Faol</span>
                        </div>
                        <div className="up-info-item">
                            <span className="up-info-label">Ro'yxatdan o'tgan</span>
                            <span className="up-info-value">
                                {new Date(profile?.createdAt).toLocaleDateString('uz-UZ')}
                            </span>
                        </div>
                        <div className="up-info-item">
                            <span className="up-info-label">ID</span>
                            <span className="up-info-value up-info-mono">{profile?.id}</span>
                        </div>
                    </div>
                </div>

                {/* Danger Zone */}
                <div className="up-card up-danger-card">
                    <h3 className="up-card-title up-danger-title">Xavfli zona</h3>
                    <button className="up-logout-btn" onClick={logout}>
                        <LogOut size={18} />
                        Tizimdan chiqish
                    </button>
                </div>
            </main>
            <Footer />
        </div>
    );
}
