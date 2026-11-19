import type { ChangeEvent } from 'react';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import FormHelperText from '@mui/material/FormHelperText';
import Typography from '@mui/material/Typography';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import { colors } from '@/theme/tokens';
import { LOGO_MIME_TYPES } from '../domain/validation';

const ACCEPT = LOGO_MIME_TYPES.join(',');

interface LogoFieldProps {
  inputId: string;
  previewUrl: string | null;
  error?: string;
  onSelect: (event: ChangeEvent<HTMLInputElement>) => void;
  onRemove: () => void;
}

export function LogoField({ inputId, previewUrl, error, onSelect, onRemove }: LogoFieldProps) {
  const helperId = `${inputId}-helper`;
  const errorId = `${inputId}-error`;

  return (
    <Box
      component="section"
      aria-labelledby="company-logo-title"
      sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}
    >
      <Typography id="company-logo-title" component="h2" sx={{ fontSize: 17, fontWeight: 600 }}>
        Logo{' '}
        <Typography
          component="span"
          sx={{ fontSize: 15, fontWeight: 400, color: 'text.secondary' }}
        >
          (facultatif)
        </Typography>
      </Typography>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Avatar
          variant="rounded"
          src={previewUrl ?? undefined}
          alt={previewUrl ? 'Aperçu de votre logo' : undefined}
          sx={{
            width: 72,
            height: 72,
            borderRadius: '14px',
            bgcolor: colors.primarySoft,
            color: 'primary.main',
            border: 1,
            borderColor: 'divider',
            '& img': { objectFit: 'contain', bgcolor: 'background.paper' },
          }}
        >
          <ImageOutlinedIcon aria-hidden="true" />
        </Avatar>

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          <Button
            component="label"
            htmlFor={inputId}
            variant="outlined"
            sx={{
              '&:focus-within': { outline: 2, outlineColor: 'primary.main', outlineOffset: 2 },
            }}
          >
            {previewUrl ? 'Changer' : 'Choisir une image'}
            <Box
              component="input"
              id={inputId}
              type="file"
              accept={ACCEPT}
              onChange={onSelect}
              aria-describedby={[helperId, error ? errorId : null].filter(Boolean).join(' ')}
              sx={{
                position: 'absolute',
                width: '1px',
                height: '1px',
                overflow: 'hidden',
                clip: 'rect(0 0 0 0)',
                whiteSpace: 'nowrap',
              }}
            />
          </Button>
          {previewUrl ? (
            <Button variant="text" onClick={onRemove} sx={{ color: 'text.secondary' }}>
              Retirer
            </Button>
          ) : null}
        </Box>
      </Box>

      <FormHelperText id={helperId} sx={{ m: 0, color: 'text.secondary' }}>
        PNG, JPG ou WebP, 2 Mo maximum. Il apparaîtra en haut de vos devis.
      </FormHelperText>
      {error ? (
        <FormHelperText id={errorId} error sx={{ m: 0 }}>
          {error}
        </FormHelperText>
      ) : null}
    </Box>
  );
}
