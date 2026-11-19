import type { ChangeEvent } from 'react';
import Box from '@mui/material/Box';
import FormControl from '@mui/material/FormControl';
import FormHelperText from '@mui/material/FormHelperText';
import FormLabel from '@mui/material/FormLabel';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import Typography from '@mui/material/Typography';
import type { VatMode } from '../domain/types';

interface VatOption {
  value: VatMode;
  id: string;
  title: string;
  detail: string;
}

const OPTIONS: readonly VatOption[] = [
  {
    value: 'subject',
    id: 'company-vat-subject',
    title: 'Je facture la TVA',
    detail: 'Vous choisirez le taux sur chaque ligne : 20 %, 10 % ou 5,5 %.',
  },
  {
    value: 'franchise',
    id: 'company-vat-franchise',
    title: 'TVA non applicable',
    detail: 'Micro-entreprise en franchise : la mention légale s’ajoute toute seule.',
  },
];

interface VatModeFieldProps {
  value: VatMode | '';
  vatNumber: string | null;
  error?: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
}

export function VatModeField({ value, vatNumber, error, onChange }: VatModeFieldProps) {
  return (
    <FormControl component="fieldset" error={Boolean(error)} sx={{ gap: 1.25 }}>
      <FormLabel
        component="legend"
        sx={{
          fontSize: 17,
          fontWeight: 600,
          color: 'text.primary',
          mb: 1.25,
          '&.Mui-focused': { color: 'text.primary' },
        }}
      >
        TVA
      </FormLabel>
      <RadioGroup
        name="vatMode"
        value={value}
        onChange={onChange}
        aria-describedby={error ? 'company-vat-error' : undefined}
        sx={{ gap: 1.25 }}
      >
        {OPTIONS.map((option) => {
          const selected = option.value === value;
          return (
            <Box
              key={option.value}
              component="label"
              htmlFor={option.id}
              sx={{
                display: 'flex',
                gap: 1,
                alignItems: 'flex-start',
                p: 1.25,
                bgcolor: 'background.paper',
                borderRadius: '14px',
                cursor: 'pointer',
                border: selected ? 2 : 1,
                borderColor: selected ? 'primary.main' : 'divider',
              }}
            >
              <Radio value={option.value} id={option.id} sx={{ p: 0.75 }} />
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, pt: 0.75 }}>
                <Typography component="span" sx={{ fontSize: 16, fontWeight: 600 }}>
                  {option.title}
                </Typography>
                <Typography component="span" variant="body2" color="text.secondary">
                  {option.detail}
                </Typography>
                {option.value === 'subject' && selected && vatNumber ? (
                  <Typography component="span" variant="body2" sx={{ fontWeight: 600 }}>
                    Votre n° de TVA intracommunautaire : {vatNumber}
                  </Typography>
                ) : null}
              </Box>
            </Box>
          );
        })}
      </RadioGroup>
      {error ? (
        <FormHelperText id="company-vat-error" sx={{ m: 0 }}>
          {error}
        </FormHelperText>
      ) : null}
    </FormControl>
  );
}
