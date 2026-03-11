import { Box, Typography, Skeleton, Alert } from '@mui/material';
import { useCheckupPackages } from '../../hooks/useCheckupPackages';
import PackageCard from './PackageCard';

function PackagesSkeleton() {
    return (
        <Box>
            {[...Array(3)].map((_, i) => (
                <Skeleton key={i} variant="rounded" height={120} sx={{ mb: 2 }} />
            ))}
        </Box>
    );
}

export default function CheckupPackagesTab() {
    const { data: packages, isLoading, isError } = useCheckupPackages();

    const activeCount = packages?.filter(p => p.clinicPackage?.isActive).length ?? 0;

    return (
        <Box>
            {packages && (
                <Typography variant="body2" color="text.secondary" mb={2}>
                    Jami <strong>{packages.length}</strong> ta paket — <strong>{activeCount}</strong> ta faol
                </Typography>
            )}

            {isError && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    Paketlarni yuklashda xatolik yuz berdi.
                </Alert>
            )}

            {isLoading ? (
                <PackagesSkeleton />
            ) : (
                packages?.map((pkg) => (
                    <PackageCard key={pkg.id} package={pkg} />
                ))
            )}

            {!isLoading && packages?.length === 0 && (
                <Typography color="text.secondary" align="center" py={6}>
                    Checkup paketlar topilmadi
                </Typography>
            )}
        </Box>
    );
}
