import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Box, Typography, IconButton, LinearProgress } from '@mui/material';
import { Upload, X, FileText, Image } from 'lucide-react';

const formatBytes = (bytes) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

export default function FileDropzone({
  label,
  accept,
  maxSize = 10 * 1024 * 1024,
  maxFiles = 1,
  value,
  onChange,
  error,
  helperText,
  hint,
}) {
  const files = value ? (Array.isArray(value) ? value : [value]) : [];

  const onDrop = useCallback((acceptedFiles, rejectedFiles) => {
    if (rejectedFiles.length > 0) {
      const err = rejectedFiles[0].errors[0];
      if (err.code === 'file-too-large') alert(`Fayl hajmi ${formatBytes(maxSize)} dan oshmasligi kerak`);
      else if (err.code === 'file-invalid-type') alert('Noto\'g\'ri fayl turi');
      return;
    }
    if (maxFiles === 1) {
      onChange(acceptedFiles[0]);
    } else {
      const combined = [...files, ...acceptedFiles].slice(0, maxFiles);
      onChange(combined);
    }
  }, [files, maxFiles, maxSize, onChange]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    maxSize,
    maxFiles,
    multiple: maxFiles > 1,
  });

  const removeFile = (idx) => {
    if (maxFiles === 1) {
      onChange(null);
    } else {
      const next = files.filter((_, i) => i !== idx);
      onChange(next.length > 0 ? next : null);
    }
  };

  const getFileIcon = (file) => {
    if (file.type.startsWith('image/')) return <Image size={20} color="#3E92CC" />;
    return <FileText size={20} color="#3E92CC" />;
  };

  return (
    <Box>
      {label && (
        <Typography variant="body2" fontWeight={600} sx={{ mb: 1, color: '#374151' }}>
          {label}
        </Typography>
      )}

      {files.length === 0 || maxFiles > 1 ? (
        <Box
          {...getRootProps()}
          sx={{
            border: `2px dashed ${error ? '#EF4444' : isDragActive ? '#3E92CC' : '#CBD5E1'}`,
            borderRadius: 3,
            p: 3,
            textAlign: 'center',
            cursor: 'pointer',
            bgcolor: isDragActive ? 'rgba(62,146,204,0.04)' : error ? 'rgba(239,68,68,0.02)' : '#FAFBFF',
            transition: 'all 0.2s ease',
            '&:hover': {
              borderColor: '#3E92CC',
              bgcolor: 'rgba(62,146,204,0.04)',
            },
          }}
        >
          <input {...getInputProps()} />
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
            <Box sx={{
              width: 48, height: 48, borderRadius: '50%',
              bgcolor: 'rgba(62,146,204,0.1)', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Upload size={22} color="#3E92CC" />
            </Box>
            <Typography variant="body2" fontWeight={600} color="#374151">
              {isDragActive ? 'Faylni bu yerga tashlang' : "Faylni tashlang yoki bosing"}
            </Typography>
            {hint && (
              <Typography variant="caption" color="text.secondary">{hint}</Typography>
            )}
            <Typography variant="caption" color="text.secondary">
              Maksimal: {formatBytes(maxSize)}
              {maxFiles > 1 && `, maksimal ${maxFiles} ta fayl`}
            </Typography>
          </Box>
        </Box>
      ) : null}

      {files.length > 0 && (
        <Box sx={{ mt: files.length > 0 && maxFiles > 1 ? 2 : 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
          {files.map((file, idx) => (
            <Box key={idx} sx={{
              display: 'flex', alignItems: 'center', gap: 2,
              p: 1.5, border: '1px solid #E2E8F0', borderRadius: 2,
              bgcolor: '#F8FAFF',
            }}>
              {file.type?.startsWith('image/') && file.preview ? (
                <Box
                  component="img"
                  src={file.preview || URL.createObjectURL(file)}
                  sx={{ width: 44, height: 44, borderRadius: 1, objectFit: 'cover' }}
                />
              ) : (
                <Box sx={{ width: 44, height: 44, borderRadius: 1, bgcolor: 'rgba(62,146,204,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {getFileIcon(file)}
                </Box>
              )}
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body2" fontWeight={500} noWrap>{file.name}</Typography>
                <Typography variant="caption" color="text.secondary">{formatBytes(file.size)}</Typography>
              </Box>
              <IconButton size="small" onClick={() => removeFile(idx)} sx={{ color: '#94A3B8', '&:hover': { color: '#EF4444' } }}>
                <X size={16} />
              </IconButton>
            </Box>
          ))}
        </Box>
      )}

      {error && (
        <Typography variant="caption" color="error" sx={{ mt: 0.5, display: 'block' }}>
          {helperText}
        </Typography>
      )}
      {!error && helperText && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
          {helperText}
        </Typography>
      )}
    </Box>
  );
}
