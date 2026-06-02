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

    const handleActivateClick = (pkg) => {
        setActivationForm({ pkg, clinicPrice: pkg.recommendedPrice, customNotes: '' });
    };

    const handleEditClick = (activatedPkg) => {
        setActivationForm({
            pkg: activatedPkg.package,
            clinicPrice: activatedPkg.clinicPrice,
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

    const submitActivation = () => {
        if (!activationForm.clinicPrice || Number(activationForm.clinicPrice) <= 0) {
            alert('Narx kiritilishi shart');
            return;
        }

        if (activationForm.isEdit) {
            updateMutation.mutate({
                id: activationForm.id,
                data: { clinicPrice: activationForm.clinicPrice, customNotes: activationForm.customNotes }
            }, {
                onSuccess: () => setActivationForm(null)
            });
        } else {
            activateMutation.mutate({
                packageId: activationForm.pkg.id,
                clinicPrice: activationForm.clinicPrice,
                customNotes: activationForm.customNotes
            }, {
                onSuccess: () => setActivationForm(null)
            });
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
            <Dialog open={!!activationForm} onClose={() => setActivationForm(null)} maxWidth="sm" fullWidth>
                {activationForm && (
                    <>
                        <DialogTitle>Paketni {activationForm.isEdit ? "Tahrirlash" : "Faollashtirish"}</DialogTitle>
                        <DialogContent>
                            <Box sx={{ p: 2, bgcolor: '#f8fafc', mb: 3, borderRadius: 1 }}>
                                <Typography variant="subtitle1" fontWeight={600}>{activationForm.pkg.nameUz}</Typography>
                                <Typography variant="body2" color="text.secondary">Tavsiya etilgan narx: <b>{activationForm.pkg.recommendedPrice?.toLocaleString()} UZS</b></Typography>
                                <Typography variant="body2" color="warning.main">
                                    Narx chegarasi: {activationForm.pkg.priceMin?.toLocaleString()} UZS dan {activationForm.pkg.priceMax?.toLocaleString()} UZS gacha
                                </Typography>
                            </Box>

                            <TextField
                                fullWidth
                                label="Klinika Narxi (UZS)"
                                type="number"
                                sx={{ mb: 2 }}
                                value={activationForm.clinicPrice}
                                onChange={(e) => setActivationForm({ ...activationForm, clinicPrice: Number(e.target.value) })}
                            />

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
