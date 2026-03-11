import React, { useState } from 'react';
import {
  Box, Paper, Typography, Chip, Button, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, InputAdornment,
  CircularProgress, Alert, Grid, Skeleton,
} from '@mui/material';
import { Eye, CheckCircle, XCircle, Search, RefreshCw, Building2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tokenStorage } from '../shared/auth/tokenStorage';
import axiosInstance from '../shared/api/axios';

const API = '/auth/clinic-register';

const fetchRequests = async (status) => {
  const q = status && status !== 'ALL' ? `?status=${status}` : '';
  const { data } = await axiosInstance.get(`${API}/admin${q}`);
  return data;
};

const fetchById = async (id) => {
  const { data } = await axiosInstance.get(`${API}/admin/${id}`);
  return data;
};

const STATUS_CONFIG = {
  PENDING: { label: 'Kutilmoqda', color: 'warning' },
  IN_REVIEW: { label: "Ko'rib chiqilmoqda", color: 'info' },
  APPROVED: { label: 'Tasdiqlandi', color: 'success' },
  REJECTED: { label: 'Rad etildi', color: 'error' },
};

const CLINIC_TYPE_LABELS = {
  diagnostika_markazi: '🔬 Diagnostika markazi',
  poliklinika: '🏥 Poliklinika',
  kasalxona: '🏨 Kasalxona',
  ixtisoslashgan_markaz: '🎯 Ixtisoslashgan markaz',
  tish_klinikasi: '🦷 Tish klinikasi',
  sanatoriya: '🏖️ Sanatoriya',
};

export default function ClinicRegistrations() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState('ALL');
  const [selectedId, setSelectedId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);

  const { data: listData, isLoading, isError, refetch } = useQuery({
    queryKey: ['clinic-registrations', activeTab],
    queryFn: () => fetchRequests(activeTab),
  });

  const { data: detailData, isLoading: detailLoading } = useQuery({
    queryKey: ['clinic-registration-detail', selectedId],
    queryFn: () => fetchById(selectedId),
    enabled: !!selectedId && detailOpen,
  });

  const doAction = async (url, method = 'PATCH', body) => {
    const config = { method, url, data: body };
    const { data } = await axiosInstance(config);
    return data;
  };

  const reviewMutation = useMutation({ mutationFn: (id) => doAction(`${API}/admin/${id}/review`), onSuccess: () => qc.invalidateQueries(['clinic-registrations']) });
  const approveMutation = useMutation({ mutationFn: (id) => doAction(`${API}/admin/${id}/approve`), onSuccess: () => { qc.invalidateQueries(['clinic-registrations']); setDetailOpen(false); } });
  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }) => doAction(`${API}/admin/${id}/reject`, 'PATCH', { reason }),
    onSuccess: () => { qc.invalidateQueries(['clinic-registrations']); setRejectDialogOpen(false); setDetailOpen(false); setRejectReason(''); },
  });

  const [searchTerm, setSearchTerm] = useState('');
  const registrations = listData?.data || [];
  const filteredRegs = registrations.filter(r =>
    r.nameUz?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.adminEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.regionId?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const detail = detailData?.data;

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Klinika Arizalari</Typography>
          <Typography variant="body2" color="text.secondary">
            Ro'yxatdan o'tish arizalarini ko'rib chiqing va tasdiqlang
          </Typography>
        </Box>
        <Button startIcon={<RefreshCw size={16} />} variant="outlined" onClick={() => refetch()}>
          Yangilash
        </Button>
      </Box>

      {/* Status summary cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {['ALL', 'PENDING', 'IN_REVIEW', 'APPROVED', 'REJECTED'].map(s => {
          const count = s === 'ALL'
            ? (listData?.data?.length || 0)
            : (listData?.data?.filter(r => r.status === s).length || 0);
          const cfg = s === 'ALL'
            ? { label: 'Barchasi', color: '#64748B' }
            : { label: STATUS_CONFIG[s]?.label, color: { PENDING: '#F59E0B', IN_REVIEW: '#3E92CC', APPROVED: '#00C9A7', REJECTED: '#EF4444' }[s] };
          return (
            <Grid size={{ xs: 6, sm: 4, md: 2.4 }} key={s}>
              <Paper
                onClick={() => setActiveTab(s)}
                sx={{
                  p: 2, borderRadius: 3, cursor: 'pointer',
                  border: activeTab === s ? `2px solid ${cfg.color}` : '2px solid transparent',
                  bgcolor: activeTab === s ? `${cfg.color}10` : '#FAFBFF',
                  transition: 'all 0.15s',
                  '&:hover': { borderColor: cfg.color },
                }}
              >
                <Typography variant="h4" fontWeight={800} sx={{ color: cfg.color }}>{count}</Typography>
                <Typography variant="caption" color="text.secondary">{cfg.label}</Typography>
              </Paper>
            </Grid>
          );
        })}
      </Grid>

      {/* Search */}
      <TextField
        placeholder="Klinika, email yoki viloyat bo'yicha qidirish..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        size="small"
        fullWidth
        sx={{ mb: 2, maxWidth: 500 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Search size={16} />
            </InputAdornment>
          ),
        }}
      />

      {/* Error */}
      {isError && (
        <Alert severity="error" sx={{ mb: 2 }}>Ma'lumot yuklashda xatolik. Qayta urinib ko'ring.</Alert>
      )}

      {/* Loading skeleton */}
      {isLoading && (
        <Box>
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} variant="rounded" height={100} sx={{ mb: 1.5 }} />
          ))}
        </Box>
      )}

      {/* Registration cards */}
      {!isLoading && filteredRegs.map((reg) => (
        <Paper
          key={reg.id}
          variant="outlined"
          sx={{
            p: 2.5,
            mb: 1.5,
            display: 'flex',
            alignItems: 'flex-start',
            gap: 2,
            borderColor: reg.status === 'APPROVED' ? 'success.main' : 'divider',
            bgcolor: reg.status === 'APPROVED' ? 'action.selected' : 'background.paper',
            transition: 'all 0.2s',
            '&:hover': { boxShadow: 2 },
          }}
        >
          {/* Icon */}
          <Box sx={{ pt: 0.5, color: 'primary.main' }}>
            <Building2 size={20} />
          </Box>

          {/* Info */}
          <Box flex={1} minWidth={0}>
            <Box display="flex" alignItems="center" gap={1} mb={0.5}>
              <Typography variant="subtitle1" fontWeight={700} noWrap>
                {reg.nameUz}
              </Typography>
              <Chip
                label={STATUS_CONFIG[reg.status]?.label || reg.status}
                color={STATUS_CONFIG[reg.status]?.color || 'default'}
                size="small"
                sx={{ fontWeight: 600 }}
              />
            </Box>

            <Typography variant="body2" color="text.secondary" mb={0.5}>
              {CLINIC_TYPE_LABELS[reg.clinicType] || reg.clinicType}
            </Typography>

            <Box display="flex" flexWrap="wrap" gap={1.5} mt={1}>
              <Typography variant="caption" color="text.secondary">
                📧 {reg.adminEmail}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                📍 {reg.regionId}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                📅 {new Date(reg.createdAt).toLocaleDateString('uz-UZ')}
              </Typography>
            </Box>
          </Box>

          {/* Actions */}
          <Box display="flex" alignItems="center" gap={1} flexShrink={0} flexWrap="wrap">
            <Button
              size="small"
              variant="outlined"
              startIcon={<Eye size={14} />}
              onClick={() => { setSelectedId(reg.id); setDetailOpen(true); }}
            >
              Ko'rish
            </Button>

            {reg.status === 'PENDING' && (
              <Button
                size="small"
                variant="outlined"
                onClick={() => reviewMutation.mutate(reg.id)}
                disabled={reviewMutation.isPending}
              >
                Ko'rib chiq
              </Button>
            )}

            {(reg.status === 'PENDING' || reg.status === 'IN_REVIEW') && (
              <>
                <Button
                  size="small"
                  variant="contained"
                  color="success"
                  startIcon={<CheckCircle size={14} />}
                  onClick={() => approveMutation.mutate(reg.id)}
                  disabled={approveMutation.isPending}
                >
                  Tasdiqlash
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  color="error"
                  startIcon={<XCircle size={14} />}
                  onClick={() => { setSelectedId(reg.id); setRejectDialogOpen(true); }}
                >
                  Rad etish
                </Button>
              </>
            )}
          </Box>
        </Paper>
      ))}

      {/* Empty state */}
      {!isLoading && filteredRegs.length === 0 && (
        <Typography color="text.secondary" align="center" py={6}>
          {searchTerm ? 'Qidiruv natijalari topilmadi' : 'Arizalar topilmadi'}
        </Typography>
      )}

      {/* Detail dialog */}
      <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} maxWidth="md" fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ pb: 1 }}>
          <Typography variant="h6" fontWeight={700}>Ariza Tafsilotlari</Typography>
        </DialogTitle>
        <DialogContent dividers>
          {detailLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : detail ? (
            <Grid container spacing={2}>
              {[
                { label: 'Klinika nomi', value: detail.nameUz },
                { label: 'Klinika turi', value: CLINIC_TYPE_LABELS[detail.clinicType] || detail.clinicType },
                { label: 'Viloyat', value: detail.regionId },
                { label: 'Tuman', value: detail.districtId },
                { label: "Ko'cha", value: detail.streetAddress },
                { label: "To'liq manzil", value: detail.addressUz },
                { label: 'Asosiy telefon', value: detail.primaryPhone },
                { label: 'Email', value: detail.email },
                { label: 'Admin', value: `${detail.lastName} ${detail.firstName}` },
                { label: 'Admin email', value: detail.adminEmail },
                { label: 'Lavozim', value: detail.position },
                { label: 'Admin telefon', value: detail.adminPhone },
                { label: 'INN', value: detail.inn },
                { label: 'Yuridik nom', value: detail.legalName },
                { label: 'Litsenziya raqami', value: detail.licenseNumber },
                { label: 'Litsenziya muddati', value: detail.licenseExpiry },
                { label: 'Bank', value: detail.bankName },
                { label: 'Hisob raqami', value: detail.bankAccountNumber },
                { label: 'MFO', value: detail.mfo },
              ].map(({ label, value }) => (
                <Grid size={{ xs: 12, sm: 6 }} key={label}>
                  <Box sx={{ p: 1.5, bgcolor: '#F8FAFF', borderRadius: 2 }}>
                    <Typography variant="caption" color="text.secondary" display="block">{label}</Typography>
                    <Typography variant="body2" fontWeight={500}>{value || '—'}</Typography>
                  </Box>
                </Grid>
              ))}
              {detail.descriptionUz && (
                <Grid size={12}>
                  <Box sx={{ p: 1.5, bgcolor: '#F8FAFF', borderRadius: 2 }}>
                    <Typography variant="caption" color="text.secondary" display="block">Tavsif</Typography>
                    <Typography variant="body2">{detail.descriptionUz}</Typography>
                  </Box>
                </Grid>
              )}
              {detail.selectedServices && (
                <Grid size={12}>
                  <Box sx={{ p: 1.5, bgcolor: '#F8FAFF', borderRadius: 2 }}>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                      Tanlangan xizmatlar ({JSON.parse(typeof detail.selectedServices === 'string' ? detail.selectedServices : JSON.stringify(detail.selectedServices))?.length || 0} ta)
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {(Array.isArray(detail.selectedServices)
                        ? detail.selectedServices
                        : JSON.parse(detail.selectedServices || '[]')
                      ).map(s => (
                        <Chip key={s} label={s} size="small" sx={{ bgcolor: 'rgba(62,146,204,0.08)', color: '#3E92CC' }} />
                      ))}
                    </Box>
                  </Box>
                </Grid>
              )}
              {detail.logoUrl && (
                <Grid size={12}>
                  <Box sx={{ p: 1.5, bgcolor: '#F8FAFF', borderRadius: 2 }}>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>Logo</Typography>
                    <Box component="img" src={detail.logoUrl} alt="Logo"
                      sx={{ height: 80, borderRadius: 1, objectFit: 'contain', bgcolor: 'white', p: 1 }} />
                  </Box>
                </Grid>
              )}
              {detail.rejectionReason && (
                <Grid size={12}>
                  <Alert severity="error">
                    <Typography variant="body2" fontWeight={600}>Rad etish sababi:</Typography>
                    <Typography variant="body2">{detail.rejectionReason}</Typography>
                  </Alert>
                </Grid>
              )}
            </Grid>
          ) : null}
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={() => setDetailOpen(false)} variant="outlined" color="inherit">
            Yopish
          </Button>
          {detail?.status === 'PENDING' && (
            <Button variant="outlined"
              onClick={() => { reviewMutation.mutate(detail.id); setDetailOpen(false); }}>
              Ko'rib chiqishni boshlash
            </Button>
          )}
          {(detail?.status === 'PENDING' || detail?.status === 'IN_REVIEW') && (
            <>
              <Button variant="outlined" color="error"
                onClick={() => { setRejectDialogOpen(true); }}>
                Rad etish
              </Button>
              <Button variant="contained" color="success"
                onClick={() => approveMutation.mutate(detail.id)}
                disabled={approveMutation.isPending}>
                {approveMutation.isPending ? 'Tasdiqlanmoqda...' : 'Tasdiqlash'}
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>

      {/* Reject dialog */}
      <Dialog open={rejectDialogOpen} onClose={() => setRejectDialogOpen(false)} maxWidth="sm" fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle>Arizani Rad Etish</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Rad etish sababini kiriting. Bu sabab klinikaga email orqali yuboriladi.
          </Typography>
          <TextField
            label="Rad etish sababi *"
            multiline rows={4}
            fullWidth
            value={rejectReason}
            onChange={e => setRejectReason(e.target.value)}
            placeholder="Masalan: Taqdim etilgan hujjatlar to'liq emas. Litsenziya raqami noto'g'ri..."
          />
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={() => setRejectDialogOpen(false)} variant="outlined" color="inherit">
            Bekor qilish
          </Button>
          <Button
            variant="contained" color="error"
            disabled={!rejectReason.trim() || rejectMutation.isPending}
            onClick={() => rejectMutation.mutate({ id: selectedId, reason: rejectReason })}>
            {rejectMutation.isPending ? 'Yuborilmoqda...' : 'Rad Etish'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
