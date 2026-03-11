import { useState, useMemo, useEffect } from 'react';
import {
    Box, TextField, InputAdornment, FormControlLabel, Checkbox,
    Typography, Skeleton, Alert,
} from '@mui/material';
import { Search, FolderKanban } from 'lucide-react';
import { useClinicServices } from '../../hooks/useClinicServices';
import ServiceCard from './ServiceCard';

function ServicesSkeleton() {
    return (
        <Box>
            {[...Array(4)].map((_, i) => (
                <Skeleton key={i} variant="rounded" height={72} sx={{ mb: 1.5 }} />
            ))}
        </Box>
    );
}

export default function DiagnosticServicesTab() {
    const [search, setSearch] = useState('');
    const [onlyActive, setOnlyActive] = useState(false);

    const debouncedSearch = useDebounce(search, 300);

    const { data: services, isLoading, isError } = useClinicServices({
        search: debouncedSearch || undefined,
        onlyActive,
    });

    const grouped = useMemo(() => {
        if (!services) return {};
        return services.reduce((acc, svc) => {
            const cat = svc.category?.nameUz ?? 'Boshqa';
            if (!acc[cat]) acc[cat] = [];
            acc[cat].push(svc);
            return acc;
        }, {});
    }, [services]);

    const totalActive = services?.filter(s => s.clinicService?.isActive).length ?? 0;

    return (
        <Box>
            {/* Toolbar */}
            <Box display="flex" gap={2} alignItems="center" flexWrap="wrap" mb={2}>
                <TextField
                    placeholder="Xizmat nomi bo'yicha qidirish..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    size="small"
                    sx={{ flex: 1, minWidth: 220 }}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <Search size={16} />
                            </InputAdornment>
                        ),
                    }}
                />
                <FormControlLabel
                    control={
                        <Checkbox
                            checked={onlyActive}
                            onChange={(e) => setOnlyActive(e.target.checked)}
                            size="small"
                        />
                    }
                    label="Faqat faol xizmatlar"
                    sx={{ m: 0 }}
                />
            </Box>

            {/* Stats */}
            {services && (
                <Typography variant="body2" color="text.secondary" mb={2}>
                    Jami <strong>{services.length}</strong> ta xizmat — <strong>{totalActive}</strong> ta faol
                </Typography>
            )}

            {isError && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    Xizmatlarni yuklashda xatolik yuz berdi.
                </Alert>
            )}

            {isLoading ? (
                <ServicesSkeleton />
            ) : (
                Object.entries(grouped).map(([categoryName, categoryServices]) => (
                    <Box key={categoryName} sx={{ mb: 4 }}>
                        <Box display="flex" alignItems="center" gap={1} mb={1.5}>
                            <FolderKanban size={16} />
                            <Typography variant="subtitle1" fontWeight={700}>
                                {categoryName}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                ({categoryServices.length} ta)
                            </Typography>
                        </Box>

                        {categoryServices.map((svc) => (
                            <ServiceCard key={svc.id} service={svc} />
                        ))}
                    </Box>
                ))
            )}

            {!isLoading && services?.length === 0 && (
                <Typography color="text.secondary" align="center" py={6}>
                    Xizmatlar topilmadi
                </Typography>
            )}
        </Box>
    );
}

// Simple debounce hook
function useDebounce(value, delay) {
    const [debounced, setDebounced] = useState(value);
    useEffect(() => {
        const timer = setTimeout(() => setDebounced(value), delay);
        return () => clearTimeout(timer);
    }, [value, delay]);
    return debounced;
}
