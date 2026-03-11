import { Box, TextField, Slider, Typography } from '@mui/material';

export default function PriceRangeInput({ value, min, max, onChange, disabled = false }) {
    const step = Math.max(1000, Math.round((max - min) / 100) * 1000);

    return (
        <Box>
            <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                Sizning narxingiz
            </Typography>

            <Box display="flex" gap={2} alignItems="center">
                <TextField
                    type="number"
                    size="small"
                    value={value}
                    onChange={(e) => {
                        const v = Number(e.target.value);
                        if (!isNaN(v)) onChange(v);
                    }}
                    disabled={disabled}
                    sx={{ width: 160 }}
                    InputProps={{
                        endAdornment: (
                            <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap', ml: 0.5 }}>
                                so'm
                            </Typography>
                        ),
                    }}
                    inputProps={{ min, max, step }}
                />

                <Box flex={1}>
                    <Slider
                        value={value}
                        min={min}
                        max={max}
                        step={step}
                        onChange={(_, v) => onChange(v)}
                        disabled={disabled}
                        valueLabelDisplay="auto"
                        valueLabelFormat={(v) => `${(v / 1000).toFixed(0)}K`}
                        size="small"
                    />
                    <Box display="flex" justifyContent="space-between" mt={-0.5}>
                        <Typography variant="caption" color="text.secondary">
                            {(min / 1000).toFixed(0)}K
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            {(max / 1000).toFixed(0)}K
                        </Typography>
                    </Box>
                </Box>
            </Box>
        </Box>
    );
}
