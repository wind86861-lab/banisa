import { Box, Typography, Skeleton, Alert } from '@mui/material';
import { CalendarDays, Clock3 } from 'lucide-react';
import { useWorkingHours, useQueueSettings } from '../../hooks/useServiceSettings';
import WorkingHoursEditor from './WorkingHoursEditor';
import QueueSettingsForm from './QueueSettingsForm';

export default function ServiceSettingsTab() {
    const { data: workingHours, isLoading: loadingHours, isError: hoursError } = useWorkingHours();
    const { data: queueSettings, isLoading: loadingQueue, isError: queueError } = useQueueSettings();

    return (
        <Box>
            {/* Working Hours */}
            <Box display="flex" alignItems="center" gap={1} mb={2}>
                <CalendarDays size={18} />
                <Typography variant="h6" fontWeight={600}>
                    Ish vaqti
                </Typography>
            </Box>

            {hoursError && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    Ish vaqtini yuklashda xatolik.
                </Alert>
            )}
            {loadingHours
                ? <Skeleton variant="rounded" height={280} sx={{ mb: 4 }} />
                : <WorkingHoursEditor workingHours={workingHours} />
            }

            {/* Queue Settings */}
            <Box display="flex" alignItems="center" gap={1} mt={4} mb={2}>
                <Clock3 size={18} />
                <Typography variant="h6" fontWeight={600}>
                    Navbat sozlamalari
                </Typography>
            </Box>

            {queueError && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    Navbat sozlamalarini yuklashda xatolik.
                </Alert>
            )}
            {loadingQueue
                ? <Skeleton variant="rounded" height={120} />
                : <QueueSettingsForm queueSettings={queueSettings} />
            }
        </Box>
    );
}
