import type { ChangeEvent, HTMLInputAutoCompleteAttribute, HTMLInputTypeAttribute } from 'react';
import FormControl from '@mui/material/FormControl';
import FormHelperText from '@mui/material/FormHelperText';
import FormLabel from '@mui/material/FormLabel';
import OutlinedInput from '@mui/material/OutlinedInput';

type InputMode = 'text' | 'email' | 'tel' | 'numeric';

interface LabeledInputProps {
  id: string;
  name: string;
  label: string;
  value: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  error?: string;
  helper?: string;
  placeholder?: string;
  type?: HTMLInputTypeAttribute;
  inputMode?: InputMode;
  autoComplete?: HTMLInputAutoCompleteAttribute;
  maxLength?: number;
}

/** Libellé au-dessus du champ (comme la maquette), aide et erreur reliées au champ. */
export function LabeledInput({
  id,
  name,
  label,
  value,
  onChange,
  error,
  helper,
  placeholder,
  type = 'text',
  inputMode,
  autoComplete,
  maxLength,
}: LabeledInputProps) {
  const helperId = `${id}-helper`;
  const errorId = `${id}-error`;
  const describedBy = [helper ? helperId : null, error ? errorId : null].filter(Boolean).join(' ');

  return (
    <FormControl error={Boolean(error)} fullWidth sx={{ gap: 0.75 }}>
      <FormLabel htmlFor={id}>{label}</FormLabel>
      <OutlinedInput
        id={id}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
        inputProps={{
          inputMode,
          maxLength,
          'aria-describedby': describedBy || undefined,
          'aria-invalid': Boolean(error),
        }}
      />
      {helper ? (
        <FormHelperText id={helperId} error={false} sx={{ m: 0, color: 'text.secondary' }}>
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
