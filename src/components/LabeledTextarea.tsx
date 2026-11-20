import type { ChangeEvent } from 'react';
import FormControl from '@mui/material/FormControl';
import FormHelperText from '@mui/material/FormHelperText';
import FormLabel from '@mui/material/FormLabel';
import OutlinedInput from '@mui/material/OutlinedInput';

interface LabeledTextareaProps {
  id: string;
  name: string;
  label: string;
  value: string;
  onChange: (event: ChangeEvent<HTMLTextAreaElement>) => void;
  helper?: string;
  error?: string;
  placeholder?: string;
  maxLength?: number;
  minRows?: number;
}

export function LabeledTextarea({
  id,
  name,
  label,
  value,
  onChange,
  helper,
  error,
  placeholder,
  maxLength,
  minRows = 4,
}: LabeledTextareaProps) {
  const helperId = `${id}-helper`;
  const errorId = `${id}-error`;
  const describedBy = [helper ? helperId : null, error ? errorId : null].filter(Boolean).join(' ');
  return (
    <FormControl error={Boolean(error)} fullWidth sx={{ gap: 0.75 }}>
      <FormLabel htmlFor={id}>{label}</FormLabel>
      <OutlinedInput
        id={id}
        name={name}
        multiline
        minRows={minRows}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        inputProps={{
          maxLength,
          'aria-describedby': describedBy || undefined,
          'aria-invalid': Boolean(error),
        }}
        sx={{ alignItems: 'flex-start', py: 1.75, px: 2, '& textarea': { lineHeight: 1.45, p: 0 } }}
      />
      {helper ? (
        <FormHelperText id={helperId} sx={{ m: 0, color: 'text.secondary' }}>
          {helper}
        </FormHelperText>
      ) : null}
      {error ? (
        <FormHelperText id={errorId} sx={{ m: 0 }}>
          {error}
        </FormHelperText>
      ) : null}
    </FormControl>
  );
}
