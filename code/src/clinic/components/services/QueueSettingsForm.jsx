import { useState } from 'react';
import {
    Box, Paper, TextField, MenuItem, Button, CircularProgress, Alert,
} from '@mui/material';
import { useUpdateQueueSettings } from '../../hooks/useServiceSettings';

const DEFAULT_SETTINGS = {
    patientsPerSlot:     2,
    slotDurationMinutes: 30,
    bufferMinutes:       15,
};

export default function QueueSettingsForm({ queueSettings }) {
    const [settings, setSettings] = useState(queueSettings ?? DEFAULT_SETTINGS);
    const [success,  setSuccess]  = useState(false);

    const updateMutation = useUpdateQueueSettings();

    const set = (key, val) => setSettings(prev => ({ ...prev, [key]: val }));

    const handleSave = () => {
        setSuccess(false);
        updateMutation.mutate(settings, {
            onSuccess: () => setSuccess(true),
        });
    };

    return (
        <Paper variant="outlined" sx={{ p: 2.5 }}>
            <Box display="flex" gap={2} flexWrap="wrap" mb={2}>
                <TextField
                    select
                    label="Bir vaqtda bemorlar soni"
                    value={settings.patientsPerSlot}
                    onChange={(e) => set('patientsPerSlot', Number(e.target.value))}
                    size="small"
                    sx={{ width: 220 }}
                >
                    {[1, 2, 3, 4, 5].map((n) => (
                        <MenuItem key={n} value={n}>{n} ta bemor</MenuItem>
                    ))}
                </TextField>

                <TextField
                    select
                    label="Har bir slot uchun vaqt"
                    value={settings.slotDurationMinutes}
                    onChange={(e) => set('slotDurationMinutes', Number(e.target.value))}
                    size="small"
                    sx={{ width: 220 }}
                >
                    {[15, 30, 45, 60].map((n) => (
                        <MenuItem key={n} value={n}>{n} daqiqa</MenuItem>
                    ))}
                </TextField>

                <TextField
                    select
                    label="Buffer vaqt"
                    value={settings.bufferMinutes}
                    onChange={(e) => set('bufferMinutes', Number(e.target.value))}
                    size="small"
                    sx={{ width: 220 }}
                >
                    {[0, 15, 30].map((n) => (
                        <MenuItem key={n} value={n}>
                            {n === 0 ? 'Buffer yo\'q' : `${n} daqiqa`}
                        </MenuItem>
                    ))}
                </TextField>
            </Box>

            {success && (
                <Alert severity="success" sx={{ mb: 1.5 }} onClose={() => setSuccess(false)}>
                    Navbat sozlamalari saqlandi
                </Alert>
            )}

            <Button
                variant="contained"
                onClick={handleSave}
                disabled={updateMutation.isPending}
                startIcon={updateMutation.isPending ? <CircularProgress size={16} /> : null}
            >
                Saqlash
            </Button>
        </Paper>
    );
}
