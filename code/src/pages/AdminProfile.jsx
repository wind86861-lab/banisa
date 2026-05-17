import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
    Box, Typography, Grid, Paper, TextField, Button, Avatar, Divider,
    CircularProgress, Alert, Snackbar
} from '@mui/material';
import { Camera, Save, Lock, User as UserIcon } from 'lucide-react';
import { adminApi } from '../services/api';
import BanisaLoader from '../shared/components/BanisaLoader';
import './AdminProfile.css';

const profileSchema = z.object({
    firstName: z.string().min(2, "Ism kamida 2ta harf bo'lishi kerak"),
    lastName: z.string().min(2, "Familiya kamida 2ta harf bo'lishi kerak"),
    email: z.string().email("Noto'g'ri email manzil"),
    phone: z.string().optional(),
});

const passwordSchema = z.object({
    currentPassword: z.string().min(6, "Parol kamida 6ta belgidan iborat bo'lishi kerak"),
    newPassword: z.string().min(6, "Yangi parol kamida 6ta belgidan iborat bo'lishi kerak"),
    confirmPassword: z.string().min(6, "Parolni tasdiqlash majburiy"),
}).refine((data) => data.newPassword === data.confirmPassword, {
    message: "Parollar mos kelmadi",
    path: ["confirmPassword"],
});

export default function AdminProfile() {
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [passwordSaving, setPasswordSaving] = useState(false);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

    const {
        control,
        handleSubmit,
        reset,
        formState: { errors }
    } = useForm({
        resolver: zodResolver(profileSchema),
        defaultValues: {
            firstName: '',
            lastName: '',
            email: '',
            phone: '',
        }
    });

    const {
        control: passwordControl,
        handleSubmit: handlePasswordSubmit,
        reset: resetPassword,
        formState: { errors: passwordErrors }
    } = useForm({
        resolver: zodResolver(passwordSchema),
        defaultValues: {
            currentPassword: '',
            newPassword: '',
            confirmPassword: '',
        }
    });

    useEffect(() => {
        const fetchProfile = async () => {
            setLoading(true);
            try {
                // To be implemented in api.js
                const data = await adminApi.getProfile();
                reset({
                    firstName: data.firstName || '',
                    lastName: data.lastName || '',
                    email: data.email || '',
                    phone: data.phone || '',
                });
            } catch (error) {
                console.error("Profilni yuklashda xatolik:", error);
                // Fallback for UI testing
                reset({
                    firstName: 'Jhon',
                    lastName: 'Doe',
                    email: 'admin@banisa.uz',
                    phone: '+998901234567',
                });
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, [reset]);

    const onProfileSave = async (data) => {
        setSaving(true);
        try {
            await adminApi.updateProfile(data);
            setSnackbar({ open: true, message: 'Profil muvaffaqiyatli saqlandi!', severity: 'success' });
        } catch (error) {
            setSnackbar({ open: true, message: "Profilni saqlashda xatolik yuz berdi", severity: 'error' });
        } finally {
            setSaving(false);
        }
    };

    const onPasswordSave = async (data) => {
        setPasswordSaving(true);
        try {
            await adminApi.updatePassword(data);
            setSnackbar({ open: true, message: 'Parol muvaffaqiyatli o\'zgartirildi!', severity: 'success' });
            resetPassword();
        } catch (error) {
            setSnackbar({ open: true, message: "Parolni o'zgartirishda xatolik yuz berdi", severity: 'error' });
        } finally {
            setPasswordSaving(false);
        }
    };

    const handleCloseSnackbar = () => setSnackbar({ ...snackbar, open: false });

    if (loading) {
        return <BanisaLoader message="Profil yuklanmoqda..." />;
    }

    return (
        <Box className="premium-page-container fade-in" sx={{ p: 4, maxWidth: '1200px', mx: 'auto' }}>
            <Box className="page-header" sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                    <Typography variant="h4" fontWeight={700} color="#1e293b" sx={{ letterSpacing: '-0.5px' }}>
                        Profil Sozlamalari
                    </Typography>
                    <Typography variant="body1" color="#64748b" sx={{ mt: 0.5 }}>
                        Shaxsiy ma'lumotlar va xavfsizlik sozlamalarini boshqaring
                    </Typography>
                </Box>
            </Box>

            <Grid container spacing={4}>
                {/* Profile Overview Card */}
                <Grid item xs={12} md={4}>
                    <Paper className="premium-card profile-overview-card" elevation={0} sx={{ p: 4, textAlign: 'center', borderRadius: 4, bgcolor: '#ffffff' }}>
                        <Box sx={{ position: 'relative', display: 'inline-block', mb: 2 }}>
                            <Avatar
                                src="https://medicare-dashboard-template.multipurposethemes.com/bs5/images/avatar/1.jpg"
                                sx={{ width: 120, height: 120, border: '4px solid #f1f5f9', boxShadow: '0 4px 14px rgba(0,0,0,0.05)' }}
                            />
                            <IconButton color="primary" sx={{ position: 'absolute', bottom: 0, right: 0, bgcolor: '#ffffff', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', '&:hover': { bgcolor: '#f8fafc' } }}>
                                <Camera size={18} />
                            </IconButton>
                        </Box>
                        <Typography variant="h6" fontWeight={600} color="#1e293b">Admin Jhon Doe</Typography>
                        <Typography variant="body2" color="#64748b" sx={{ mb: 3 }}>Administrator</Typography>

                        <Divider sx={{ my: 2 }} />

                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5, color: '#475569' }}>
                            <UserIcon size={18} />
                            <Typography variant="body2" fontWeight={500}>admin@banisa.uz</Typography>
                        </Box>
                    </Paper>
                </Grid>

                {/* Edit Profile & Security Forms */}
                <Grid item xs={12} md={8}>
                    <Grid container spacing={4}>
                        {/* Personal Information */}
                        <Grid item xs={12}>
                            <Paper className="premium-card" elevation={0} sx={{ p: 4, borderRadius: 4, bgcolor: '#ffffff' }}>
                                <Typography variant="h6" fontWeight={600} color="#1e293b" sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <UserIcon size={20} color="#3b82f6" />
                                    Shaxsiy Ma'lumotlar
                                </Typography>
                                <form onSubmit={handleSubmit(onProfileSave)}>
                                    <Grid container spacing={3}>
                                        <Grid item xs={12} sm={6}>
                                            <Controller
                                                name="firstName"
                                                control={control}
                                                render={({ field }) => (
                                                    <TextField {...field} fullWidth label="Ism" variant="outlined" error={!!errors.firstName} helperText={errors.firstName?.message} />
                                                )}
                                            />
                                        </Grid>
                                        <Grid item xs={12} sm={6}>
                                            <Controller
                                                name="lastName"
                                                control={control}
                                                render={({ field }) => (
                                                    <TextField {...field} fullWidth label="Familiya" variant="outlined" error={!!errors.lastName} helperText={errors.lastName?.message} />
                                                )}
                                            />
                                        </Grid>
                                        <Grid item xs={12} sm={6}>
                                            <Controller
                                                name="email"
                                                control={control}
                                                render={({ field }) => (
                                                    <TextField {...field} fullWidth label="Elektron pochta" variant="outlined" error={!!errors.email} helperText={errors.email?.message} />
                                                )}
                                            />
                                        </Grid>
                                        <Grid item xs={12} sm={6}>
                                            <Controller
                                                name="phone"
                                                control={control}
                                                render={({ field }) => (
                                                    <TextField {...field} fullWidth label="Telefon raqam" variant="outlined" error={!!errors.phone} helperText={errors.phone?.message} />
                                                )}
                                            />
                                        </Grid>
                                        <Grid item xs={12}>
                                            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                                                <Button type="submit" variant="contained" disabled={saving} startIcon={<Save size={18} />} sx={{ textTransform: 'none', px: 4, py: 1.2, borderRadius: 2, boxShadow: '0 4px 12px rgba(59,130,246,0.3)' }}>
                                                    {saving ? 'Saqlanmoqda...' : 'O\'zgarishlarni saqlash'}
                                                </Button>
                                            </Box>
                                        </Grid>
                                    </Grid>
                                </form>
                            </Paper>
                        </Grid>

                        {/* Security Settings */}
                        <Grid item xs={12}>
                            <Paper className="premium-card" elevation={0} sx={{ p: 4, borderRadius: 4, bgcolor: '#ffffff' }}>
                                <Typography variant="h6" fontWeight={600} color="#1e293b" sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Lock size={20} color="#ef4444" />
                                    Xavfsizlik & Parol
                                </Typography>
                                <form onSubmit={handlePasswordSubmit(onPasswordSave)}>
                                    <Grid container spacing={3}>
                                        <Grid item xs={12}>
                                            <Controller
                                                name="currentPassword"
                                                control={passwordControl}
                                                render={({ field }) => (
                                                    <TextField {...field} type="password" fullWidth label="Joriy parol" variant="outlined" error={!!passwordErrors.currentPassword} helperText={passwordErrors.currentPassword?.message} />
                                                )}
                                            />
                                        </Grid>
                                        <Grid item xs={12} sm={6}>
                                            <Controller
                                                name="newPassword"
                                                control={passwordControl}
                                                render={({ field }) => (
                                                    <TextField {...field} type="password" fullWidth label="Yangi parol" variant="outlined" error={!!passwordErrors.newPassword} helperText={passwordErrors.newPassword?.message} />
                                                )}
                                            />
                                        </Grid>
                                        <Grid item xs={12} sm={6}>
                                            <Controller
                                                name="confirmPassword"
                                                control={passwordControl}
                                                render={({ field }) => (
                                                    <TextField {...field} type="password" fullWidth label="Parolni tasdiqlang" variant="outlined" error={!!passwordErrors.confirmPassword} helperText={passwordErrors.confirmPassword?.message} />
                                                )}
                                            />
                                        </Grid>
                                        <Grid item xs={12}>
                                            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                                                <Button type="submit" variant="contained" color="error" disabled={passwordSaving} startIcon={<Lock size={18} />} sx={{ textTransform: 'none', px: 4, py: 1.2, borderRadius: 2, boxShadow: '0 4px 12px rgba(239,68,68,0.3)' }}>
                                                    {passwordSaving ? 'Yangilanmoqda...' : 'Parolni yangilash'}
                                                </Button>
                                            </Box>
                                        </Grid>
                                    </Grid>
                                </form>
                            </Paper>
                        </Grid>
                    </Grid>
                </Grid>
            </Grid>

            {/* Notifications Snackbar */}
            <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={handleCloseSnackbar} anchorOrigin={{ vertical: 'top', horizontal: 'right' }}>
                <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%', borderRadius: 2, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
}
