import React, { useState } from 'react';
import {
    useClinicAvailablePackages,
    useClinicActivatedPackages,
    useActivateClinicPackage,
    useUpdateClinicPackage,
    useDeleteCheckupPackage // Wait, Clinic uses deactivate
} from '../features/checkup-packages/hooks/useCheckupPackages';
import { DataGrid } from '@mui/x-data-grid';
import {
    Box, Button, Typography, Chip, IconButton, Tooltip,
    Dialog, DialogTitle, DialogContent, DialogActions, TextField, Tabs, Tab
} from '@mui/material';
import {
    CheckCircle, ShieldAlert, Edit3, Archive, PlayCircle
} from 'lucide-react';
import { checkupPackagesApi } from '../features/checkup-packages/api/checkupPackagesApi';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import './CheckupPackages.css';

const CATEGORY_MAP = {
    BASIC: { label: 'Bazaviy', color: 'primary' },
    SPECIALIZED: { label: 'Ixtisoslashgan', color: 'secondary' },
    AGE_BASED: { label: 'Yosh guruhi', color: 'success' }
};

export default function ClinicCheckupPackages() {
    const [tab, setTab] = useState(0);
    const [activationForm, setActivationForm] = useState(null);

    const { data: available, isLoading: loadingAvailable } = useClinicAvailablePackages();
    const { data: activated, isLoading: loadingActivated } = useClinicActivatedPackages();

    const activateMutation = useActivateClinicPackage();
    const updateMutation = useUpdateClinicPackage();
    const queryClient = useQueryClient();

    const deactivateMutation = useMutation({
        mutationFn: checkupPackagesApi.deactivateForClinic,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['clinic-activated-packages'] });
            queryClient.invalidateQueries({ queryKey: ['clinic-available-packages'] });
        }
    });

    // Seed the per-item price map from admin's defaults (servicePrice) so the
    // clinic sees something to start tweaking instead of blank inputs.
    const seedItemPrices = (items, existingMap) => {
        const out = {};
        for (const it of items || []) {
            const fromExisting = existingMap?.[it.id];
            out[it.id] = typeof fromExisting === 'number'
                ? fromExisting
                : Number(it.servicePrice || 0);
        }
        return out;
    };

    const handleActivateClick = (pkg) => {
        const itemPrices = seedItemPrices(pkg.items, null);
        setActivationForm({ pkg, itemPrices, customNotes: '' });
    };

    const handleEditClick = (activatedPkg) => {
        const items = activatedPkg.package?.items || [];
        const itemPrices = seedItemPrices(items, activatedPkg.itemPrices || null);
        setActivationForm({
            pkg: activatedPkg.package,
            itemPrices,
            customNotes: activatedPkg.customNotes || '',
            isEdit: true,
            id: activatedPkg.id
        });
    };

    const handleDeactivate = (id) => {
        if (window.confirm("Rostdan ham ushbu paketni nofaol qilmoqchimisiz? U mijozlarga ko'rinmaydi.")) {
            deactivateMutation.mutate(id);
        }
    };

    // Derived total — sum(price × qty) over every item the clinic priced.
    const computeTotal = (form) => {
        if (!form) return 0;
        const items = form.pkg?.items || [];
        let sum = 0;
        for (const it of items) {
            const p = Number(form.itemPrices?.[it.id] ?? 0);
            const q = it.quantity || 1;
            if (Number.isFinite(p) && p > 0) sum += p * q;
        }
        return sum;
    };

    const submitActivation = () => {
        const items = activationForm.pkg?.items || [];
        if (!items.length) {
            alert('Paketda xizmatlar topilmadi');
            return;
        }
        const missing = items.filter(it => {
            const p = Number(activationForm.itemPrices?.[it.id] ?? 0);
            return !p || p <= 0;
        });
        if (missing.length > 0) {
            alert(`Iltimos, har bir xizmat uchun narx kiriting (${missing.length} ta xizmat narxsiz)`);
            return;
        }

        const itemPrices = {};
        for (const it of items) {
            itemPrices[it.id] = Number(activationForm.itemPrices[it.id]);
        }
        const clinicPrice = computeTotal(activationForm);

        const payload = { itemPrices, clinicPrice, customNotes: activationForm.customNotes };

        if (activationForm.isEdit) {
            updateMutation.mutate({
                id: activationForm.id,
                data: payload
            }, { onSuccess: () => setActivationForm(null) });
        } else {
            activateMutation.mutate({
                packageId: activationForm.pkg.id,
                ...payload
            }, { onSuccess: () => setActivationForm(null) });
        }
    };

    const availableColumns = [
        { field: 'nameUz', headerName: 'Paket Nomi', flex: 1, renderCell: (p) => <Typography fontWeight={500}>{p.value}</Typography> },
        { field: 'category', headerName: 'Kategoriya', width: 150, renderCell: (p) => <Chip label={CATEGORY_MAP[p.value]?.label} color={CATEGORY_MAP[p.value]?.color} size="small" /> },
        { field: 'recommendedPrice', headerName: 'Tavsiya Narx', width: 140, renderCell: (p) => <Typography fontWeight={600} color="primary">{p.value?.toLocaleString()} UZS</Typography> },
        {
            field: 'limits',
            headerName: 'Narx chegarasi',
            width: 180,
            renderCell: (p) => <Typography variant="body2" color="text.secondary">{p.row.priceMin?.toLocaleString()} - {p.row.priceMax?.toLocaleString()}</Typography>
        },
        {
            field: 'actions', headerName: 'Amallar', width: 150, sortable: false,
            renderCell: (params) => (
                <Button size="small" variant="contained" color="success" startIcon={<PlayCircle size={16} />} onClick={() => handleActivateClick(params.row)}>
                    Faollashtirish
                </Button>
            )
        }
    ];

    const activeColumns = [
        { field: 'packageName', headerName: 'Paket Nomi', flex: 1, valueGetter: (p) => p.row.package?.nameUz, renderCell: (p) => <Typography fontWeight={500}>{p.value}</Typography> },
        { field: 'category', headerName: 'Kategoriya', width: 150, valueGetter: (p) => p.row.package?.category, renderCell: (p) => <Chip label={CATEGORY_MAP[p.value]?.label} color={CATEGORY_MAP[p.value]?.color} size="small" /> },
        { field: 'clinicPrice', headerName: 'Belgilangan Narx', width: 150, renderCell: (p) => <Typography fontWeight={600} color="#10b981">{p.value?.toLocaleString()} UZS</Typography> },
        { field: 'bookingCount', headerName: 'Buyurtmalar', width: 120, renderCell: (p) => <Chip label={`${p.value} ta`} size="small" variant="outlined" /> },
        { field: 'isActive', headerName: 'Status', width: 120, renderCell: (p) => <Chip label={p.value ? 'Faol' : 'Nofaol'} color={p.value ? 'success' : 'default'} size="small" /> },
        {
            field: 'actions', headerName: 'Amallar', width: 150, sortable: false,
            renderCell: (params) => (
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Tooltip title="Narxni o'zgartirish">
                        <IconButton size="small" color="primary" onClick={() => handleEditClick(params.row)}>
                            <Edit3 size={18} />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Nofaol qilish">
                        <IconButton size="small" color="warning" onClick={() => handleDeactivate(params.row.id)}>
                            <Archive size={18} />
                        </IconButton>
                    </Tooltip>
                </Box>
            )
        }
    ];

    return (
        <div className="packages-container">
            <div className="packages-header">
                <div className="header-title">
                    <div className="icon-box" style={{ backgroundColor: '#ecfdf5' }}>
                        <CheckCircle size={24} color="#10b981" />
                    </div>
                    <div>
                        <h1>Klinika Checkup Paketlari</h1>
                        <p>Klinika admin panel - Diagnostika paketlarini yoqish va narx belgilash</p>
                    </div>
                </div>
            </div>

            <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'white', px: 2, pt: 1, borderRadius: '12px 12px 0 0' }}>
                <Tabs value={tab} onChange={(e, v) => setTab(v)}>
                    <Tab label={`Sizning Paketlaringiz (${activated?.length || 0})`} />
                    <Tab label={`Barcha Paketlar (${available?.length || 0})`} />
                </Tabs>
            </Box>

            <div className="packages-grid-container" style={{ borderRadius: '0 0 12px 12px' }}>
                {tab === 0 && (
                    <DataGrid
                        rows={activated || []}
                        columns={activeColumns}
                        loading={loadingActivated}
                        autoHeight
                        disableRowSelectionOnClick
                        sx={{ border: 'none' }}
                    />
                )}
                {tab === 1 && (
                    <DataGrid
                        rows={available || []}
                        columns={availableColumns}
                        loading={loadingAvailable}
                        autoHeight
                        disableRowSelectionOnClick
                        sx={{ border: 'none' }}
                    />
                )}
            </div>

            {/* Activation Form Modal */}
            <Dialog open={!!activationForm} onClose={() => setActivationForm(null)} maxWidth="md" fullWidth>
                {activationForm && (
                    <>
                        <DialogTitle>Paketni {activationForm.isEdit ? "Tahrirlash" : "Faollashtirish"}</DialogTitle>
                        <DialogContent>
                            <Box sx={{ p: 2, bgcolor: '#f8fafc', mb: 3, borderRadius: 1 }}>
                                <Typography variant="subtitle1" fontWeight={600}>{activationForm.pkg.nameUz}</Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Admin tavsiya narxi: <b>{activationForm.pkg.recommendedPrice?.toLocaleString()} UZS</b>
                                </Typography>
                                <Typography variant="body2" color="warning.main">
                                    Narx chegarasi: {activationForm.pkg.priceMin?.toLocaleString()} – {activationForm.pkg.priceMax?.toLocaleString()} UZS
                                </Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                                    Har bir xizmat uchun o'zingizning narxingizni kiriting. Umumiy narx avtomatik hisoblanadi.
                                </Typography>
                            </Box>

                            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
                                Xizmatlar va narxlar ({activationForm.pkg.items?.length || 0} ta)
                            </Typography>

                            <Box sx={{
                                border: '1px solid #e2e8f0',
                                borderRadius: 2,
                                overflow: 'hidden',
                                mb: 2,
                            }}>
                                <Box sx={{
                                    display: 'grid',
                                    gridTemplateColumns: '1fr 70px 180px',
                                    gap: 1,
                                    px: 2, py: 1.25,
                                    bgcolor: '#f8fafc',
                                    fontSize: 12,
                                    fontWeight: 700,
                                    color: '#475569',
                                    textTransform: 'uppercase',
                                    letterSpacing: 0.4,
                                }}>
                                    <span>Xizmat</span>
                                    <span style={{ textAlign: 'center' }}>Soni</span>
                                    <span style={{ textAlign: 'right' }}>Klinika narxi (UZS)</span>
                                </Box>
                                {(activationForm.pkg.items || []).map((item) => {
                                    const price = activationForm.itemPrices?.[item.id] ?? '';
                                    return (
                                        <Box key={item.id} sx={{
                                            display: 'grid',
                                            gridTemplateColumns: '1fr 70px 180px',
                                            gap: 1,
                                            alignItems: 'center',
                                            px: 2, py: 1.25,
                                            borderTop: '1px solid #e2e8f0',
                                        }}>
                                            <Box sx={{ minWidth: 0 }}>
                                                <Typography variant="body2" fontWeight={500} sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    {item.serviceName}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    Admin narxi: {Number(item.servicePrice || 0).toLocaleString()} UZS
                                                </Typography>
                                            </Box>
                                            <Typography variant="body2" sx={{ textAlign: 'center', color: '#475569' }}>
                                                ×{item.quantity || 1}
                                            </Typography>
                                            <TextField
                                                size="small"
                                                type="number"
                                                value={price}
                                                onChange={(e) => setActivationForm({
                                                    ...activationForm,
                                                    itemPrices: {
                                                        ...(activationForm.itemPrices || {}),
                                                        [item.id]: e.target.value === '' ? '' : Number(e.target.value),
                                                    },
                                                })}
                                                inputProps={{ min: 0, style: { textAlign: 'right' } }}
                                                sx={{ '& input': { fontWeight: 600 } }}
                                            />
                                        </Box>
                                    );
                                })}
                            </Box>

                            <Box sx={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                p: 2,
                                bgcolor: '#ecfdf5',
                                borderRadius: 2,
                                mb: 2,
                                border: '1px solid #a7f3d0',
                            }}>
                                <Typography variant="body2" fontWeight={600} color="#065f46">
                                    Jami klinika narxi (avtomatik):
                                </Typography>
                                <Typography variant="h6" fontWeight={800} color="#10b981">
                                    {computeTotal(activationForm).toLocaleString()} UZS
                                </Typography>
                            </Box>

                            <TextField
                                fullWidth
                                label="Qo'shimcha izoh (Mijozlarga ko'rinadi)"
                                multiline
                                rows={3}
                                value={activationForm.customNotes}
                                onChange={(e) => setActivationForm({ ...activationForm, customNotes: e.target.value })}
                            />
                        </DialogContent>
                        <DialogActions sx={{ p: 3 }}>
                            <Button onClick={() => setActivationForm(null)} color="inherit" sx={{ textTransform: 'none' }}>Bekor qilish</Button>
                            <Button
                                variant="contained"
                                color="success"
                                onClick={submitActivation}
                                disabled={activateMutation.isPending || updateMutation.isPending}
                                sx={{ textTransform: 'none' }}
                            >
                                {activationForm.isEdit ? 'Saqlash' : 'Faollashtirish'}
                            </Button>
                        </DialogActions>
                    </>
                )}
            </Dialog>
        </div>
    );
}
