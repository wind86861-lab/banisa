import { useState } from 'react';
import {
    Box, Paper, Typography, TextField, Checkbox, FormControlLabel,
    Button, CircularProgress, Alert,
} from '@mui/material';
import { useUpdateWorkingHours } from '../../hooks/useServiceSettings';

const DAYS = [
    { key: 'monday',    label: 'Dushanba' },
    { key: 'tuesday',   label: 'Seshanba'  },
    { key: 'wednesday', label: 'Chorshanba' },
    { key: 'thursday',  label: 'Payshanba' },
    { key: 'friday',    label: 'Juma'      },
    { key: 'saturday',  label: 'Shanba'    },
    { key: 'sunday',    label: 'Yakshanba' },
];

const DEFAULT_DAY = { start: '08:00', end: '20:00', isDayOff: false };

export default function WorkingHoursEditor({ workingHours }) {
    const [hours,   setHours]   = useState(workingHours ?? {});
    const [success, setSuccess] = useState(false);

    const updateMutation = useUpdateWorkingHours();

    const setDay = (key, patch) =>
        setHours(prev => ({ ...prev, [key]: { ...(prev[key] ?? DEFAULT_DAY), ...patch } }));

    const handleSave = () => {
        setSuccess(false);
        updateMutation.mutate(hours, {
            onSuccess: () => setSuccess(true),
        });
    };

    return (
        <Paper variant="outlined" sx={{ p: 2.5 }}>
            {DAYS.map(({ key, label }) => {
                const day = hours[key] ?? DEFAULT_DAY;
                return (
                    <Box
                        key={key}
                        display="flex"
                        alignItems="center"
                        gap={2}
                        mb={1.5}
                        flexWrap="wrap"
                    >
                        <Typography sx={{ width: 110, flexShrink: 0 }}>{label}</Typography>

                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={!!day.isDayOff}
                                    onChange={(e) => setDay(key, { isDayOff: e.target.checked })}
                                    size="small"
                                />
                            }
                            label="Dam olish"
                            sx={{ m: 0, width: 120, flexShrink: 0 }}
                        />

                        {!day.isDayOff && (
                            <>
                                <TextField
                                    type="time"
                                    size="small"
                                    value={day.start ?? '08:00'}
                                    onChange={(e) => setDay(key, { start: e.target.value })}
                                    sx={{ width: 130 }}
                                    inputProps={{ step: 300 }}
                                />
                                <Typography color="text.secondary">—</Typography>
                                <TextField
                                    type="time"
                                    size="small"
                                    value={day.end ?? '20:00'}
                                    onChange={(e) => setDay(key, { end: e.target.value })}
                                    sx={{ width: 130 }}
                                    inputProps={{ step: 300 }}
                                />
                            </>
                        )}
                    </Box>
                );
            })}

            {success && (
                <Alert severity="success" sx={{ mt: 1, mb: 1.5 }} onClose={() => setSuccess(false)}>
                    Ish vaqti saqlandi
                </Alert>
            )}

            <Button
                variant="contained"
                onClick={handleSave}
                disabled={updateMutation.isPending}
                startIcon={updateMutation.isPending ? <CircularProgress size={16} /> : null}
                sx={{ mt: 1 }}
            >
                Saqlash
            </Button>
        </Paper>
    );
}
