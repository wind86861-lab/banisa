import { useState } from 'react';
import {
    Box, Paper, Typography, Button, Chip, Collapse, List, ListItem,
    ListItemText, CircularProgress, Alert,
} from '@mui/material';
import { ChevronDown, Circle, CircleCheckBig, Package2 } from 'lucide-react';
import { useActivatePackage, useUpdatePackage, useDeactivatePackage } from '../../hooks/useCheckupPackages';
import PriceRangeInput from './PriceRangeInput';

const fmt = (n) => n?.toLocaleString('uz-UZ') ?? '—';

export default function PackageCard({ package: pkg }) {
    const isActivated = !!pkg.clinicPackage?.isActive;
    const [expanded, setExpanded] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [price, setPrice] = useState(pkg.clinicPackage?.clinicPrice ?? pkg.priceMin);
    const [error, setError] = useState(null);

    const activateMutation = useActivatePackage();
    const updateMutation = useUpdatePackage();
    const deactivateMutation = useDeactivatePackage();

    const loading = activateMutation.isPending || updateMutation.isPending || deactivateMutation.isPending;

    const handleActivate = () => {
        setError(null);
        activateMutation.mutate(
            { packageId: pkg.id, clinicPrice: price },
            {
                onError: (err) => setError(err?.response?.data?.error?.message ?? 'Xatolik yuz berdi'),
            },
        );
    };

    const handleUpdate = () => {
        setError(null);
        updateMutation.mutate(
            { id: pkg.clinicPackage.id, clinicPrice: price },
            { onSuccess: () => setIsEditing(false) },
        );
    };

    const handleDeactivate = () => {
        deactivateMutation.mutate(pkg.clinicPackage.id);
    };

    return (
        <Paper
            variant="outlined"
            sx={{
                p: 2.5,
                mb: 2,
                borderColor: isActivated ? 'success.main' : 'divider',
                bgcolor: isActivated ? 'action.selected' : 'background.paper',
                transition: 'border-color 0.2s',
            }}
        >
            <Box display="flex" alignItems="flex-start" gap={2}>
                {/* Status icon */}
                <Box sx={{ pt: 0.5, color: isActivated ? 'success.main' : 'text.disabled' }}>
                    {isActivated
                        ? <CircleCheckBig size={18} />
                        : <Circle size={18} />
                    }
                </Box>

                {/* Main content */}
                <Box flex={1} minWidth={0}>
                    <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
                        <Typography variant="subtitle1" fontWeight={700}>
                            {pkg.nameUz}
                        </Typography>
                        <Chip label={pkg.category} size="small" variant="outlined" />
                    </Box>

                    {pkg.nameRu && (
                        <Typography variant="body2" color="text.secondary">
                            {pkg.nameRu}
                        </Typography>
                    )}

                    {pkg.shortDescription && (
                        <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
                            {pkg.shortDescription}
                        </Typography>
                    )}

                    {/* Items toggle */}
                    <Button
                        size="small"
                        startIcon={<Package2 size={16} />}
                        endIcon={
                            <ChevronDown
                                size={16}
                                style={{
                                    transform: expanded ? 'rotate(180deg)' : 'none',
                                    transition: 'transform 0.2s',
                                }}
                            />
                        }
                        onClick={() => setExpanded(v => !v)}
                        sx={{ mt: 1, px: 0 }}
                    >
                        {pkg.items?.length || 0} ta xizmat tarkibi
                    </Button>

                    <Collapse in={expanded}>
                        <List dense disablePadding sx={{ pl: 1, mt: 0.5 }}>
                            {(pkg.items || []).map((item) => (
                                <ListItem key={item.id} disableGutters sx={{ py: 0.25 }}>
                                    <ListItemText
                                        primary={
                                            <Typography variant="body2">
                                                ✓ {item.serviceName}
                                                {item.quantity > 1 && ` ×${item.quantity}`}
                                            </Typography>
                                        }
                                    />
                                </ListItem>
                            ))}
                        </List>
                    </Collapse>

                    {/* Price range info */}
                    <Typography variant="caption" color="text.secondary" display="block" mt={1}>
                        Super Admin narxi: {fmt(pkg.priceMin)} – {fmt(pkg.priceMax)} so'm
                        &nbsp;·&nbsp; Tavsiya: {fmt(pkg.recommendedPrice)} so'm
                    </Typography>

                    {/* Price input — always visible; disabled only when activated and not editing */}
                    <Box mt={2}>
                        <PriceRangeInput
                            value={price}
                            min={pkg.priceMin}
                            max={pkg.priceMax}
                            onChange={setPrice}
                            disabled={isActivated && !isEditing}
                        />
                    </Box>

                    {error && (
                        <Alert severity="error" sx={{ mt: 1.5 }} onClose={() => setError(null)}>
                            {error}
                        </Alert>
                    )}
                </Box>

                {/* Actions */}
                <Box display="flex" flexDirection="column" gap={1} alignItems="flex-end" flexShrink={0}>
                    {loading && <CircularProgress size={20} />}

                    {!isActivated ? (
                        <Button
                            variant="contained"
                            size="small"
                            color="success"
                            onClick={handleActivate}
                            disabled={loading}
                        >
                            Aktivlashtirish
                        </Button>
                    ) : isEditing ? (
                        <>
                            <Button
                                variant="contained"
                                size="small"
                                onClick={handleUpdate}
                                disabled={loading}
                            >
                                Saqlash
                            </Button>
                            <Button size="small" onClick={() => setIsEditing(false)} disabled={loading}>
                                Bekor
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button size="small" onClick={() => setIsEditing(true)}>
                                Tahrirlash
                            </Button>
                            <Button
                                size="small"
                                color="error"
                                onClick={handleDeactivate}
                                disabled={loading}
                            >
                                O'chirish
                            </Button>
                        </>
                    )}
                </Box>
            </Box>
        </Paper>
    );
}
