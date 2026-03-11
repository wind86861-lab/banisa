import { useState } from 'react';
import {
    Box, Paper, Typography, Button, Chip, CircularProgress,
} from '@mui/material';
import { Circle, CircleCheckBig, Clock3, Settings2, Sparkles } from 'lucide-react';
import { useActivateService, useDeactivateService } from '../../hooks/useClinicServices';
import ServiceCustomizationDrawer from './ServiceCustomizationDrawer';

const fmt = (n) => n?.toLocaleString('uz-UZ') ?? '—';

export default function ServiceCard({ service }) {
    const isActivated = !!service.clinicService?.isActive;
    const hasCustomization = service.clinicService?.hasCustomization;
    const [confirm, setConfirm] = useState(false);
    const [customizeOpen, setCustomizeOpen] = useState(false);

    const activateMutation = useActivateService();
    const deactivateMutation = useDeactivateService();

    const handleActivate = () => {
        activateMutation.mutate(service.id, { onSuccess: () => setConfirm(false) });
    };

    const handleDeactivate = () => {
        if (!confirm) { setConfirm(true); return; }
        deactivateMutation.mutate(service.id, { onSuccess: () => setConfirm(false) });
    };

    const loading = activateMutation.isPending || deactivateMutation.isPending;

    return (
        <>
            <Paper
                variant="outlined"
                sx={{
                    p: 2,
                    mb: 1.5,
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 2,
                    bgcolor: isActivated ? 'action.selected' : 'background.paper',
                    borderColor: isActivated ? 'success.main' : 'divider',
                    transition: 'border-color 0.2s, background-color 0.2s',
                }}
            >
                {/* Status icon */}
                <Box sx={{ pt: 0.5, color: isActivated ? 'success.main' : 'text.disabled' }}>
                    {isActivated
                        ? <CircleCheckBig size={18} />
                        : <Circle size={18} />
                    }
                </Box>

                {/* Info */}
                <Box flex={1} minWidth={0}>
                    <Box display="flex" alignItems="center" gap={0.75}>
                        <Typography variant="subtitle2" fontWeight={600} noWrap>
                            {service.clinicService?.displayNameUz || service.nameUz}
                        </Typography>
                        {hasCustomization && (
                            <Sparkles size={14} style={{ color: '#FFD700', flexShrink: 0 }} />
                        )}
                        {service.clinicService?.isHighlighted && (
                            <Chip label="Mashhur" size="small" color="warning" sx={{ height: 20, fontSize: 10 }} />
                        )}
                    </Box>
                    {service.nameRu && (
                        <Typography variant="caption" color="text.secondary" display="block">
                            {service.clinicService?.displayNameRu || service.nameRu}
                        </Typography>
                    )}

                    <Box display="flex" flexWrap="wrap" gap={1} mt={0.75}>
                        <Chip
                            label={`${fmt(service.priceMin)} – ${fmt(service.priceMax)} so'm`}
                            size="small"
                            variant="outlined"
                            color="primary"
                        />
                        {service.durationMinutes > 0 && (
                            <Chip
                                icon={<Clock3 size={14} />}
                                label={`${service.durationMinutes} daq`}
                                size="small"
                                variant="outlined"
                            />
                        )}
                        {service.clinicService?.customCategory && (
                            <Chip
                                label={service.clinicService.customCategory}
                                size="small"
                                color="secondary"
                            />
                        )}
                        {(service.clinicService?.tags || []).slice(0, 3).map(tag => (
                            <Chip key={tag} label={tag} size="small" variant="outlined" sx={{ height: 22, fontSize: 11 }} />
                        ))}
                    </Box>

                    {service.shortDescription && (
                        <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
                            {service.clinicService?.displayDescriptionUz || service.shortDescription}
                        </Typography>
                    )}
                </Box>

                {/* Actions */}
                <Box display="flex" alignItems="center" gap={1} flexShrink={0}>
                    {loading && <CircularProgress size={20} />}

                    {!isActivated ? (
                        <Button
                            variant="contained"
                            size="small"
                            onClick={handleActivate}
                            disabled={loading}
                            color="success"
                        >
                            Aktivlashtirish
                        </Button>
                    ) : confirm ? (
                        <>
                            <Button
                                variant="contained"
                                color="error"
                                size="small"
                                onClick={handleDeactivate}
                                disabled={loading}
                            >
                                Ha, o'chirish
                            </Button>
                            <Button size="small" onClick={() => setConfirm(false)} disabled={loading}>
                                Bekor
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button
                                variant={hasCustomization ? 'outlined' : 'contained'}
                                size="small"
                                startIcon={<Settings2 size={14} />}
                                onClick={() => setCustomizeOpen(true)}
                                color="info"
                            >
                                {hasCustomization ? 'Tahrirlash' : 'Moslashtirish'}
                            </Button>
                            <Button
                                variant="outlined"
                                color="error"
                                size="small"
                                onClick={handleDeactivate}
                                disabled={loading}
                            >
                                O'chirish
                            </Button>
                        </>
                    )}
                </Box>
            </Paper>

            <ServiceCustomizationDrawer
                open={customizeOpen}
                onClose={() => setCustomizeOpen(false)}
                service={service}
            />
        </>
    );
}
