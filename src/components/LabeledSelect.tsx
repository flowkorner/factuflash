import type { ChangeEvent } from 'react';
import FormControl from '@mui/material/FormControl';
import FormHelperText from '@mui/material/FormHelperText';
import FormLabel from '@mui/material/FormLabel';
import NativeSelect from '@mui/material/NativeSelect';
import OutlinedInput from '@mui/material/OutlinedInput';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface LabeledSelectProps {
  id: string;
  name: string;
  label: string;
  value: string;
  options: readonly SelectOption[];
  onChange: (event: ChangeEvent<HTMLSelectElement>) => void;
  error?: string;
}

/** Liste native (la plus pratique au doigt sur téléphone), libellé au-dessus. */
export function LabeledSelect({
  id,
  name,
  label,
  value,
  options,
  onChange,
  error,
}: LabeledSelectProps) {
  const errorId = `${id}-error`;
  return (
    <FormControl error={Boolean(error)} fullWidth sx={{ gap: 0.75 }}>
      <FormLabel htmlFor={id}>{label}</FormLabel>
      <NativeSelect
        value={value}
        onChange={onChange}
        input={<OutlinedInput />}
        inputProps={{
          id,
          name,
          'aria-describedby': error ? errorId : undefined,
          'aria-invalid': Boolean(error),
        }}
        sx={{
          '& select': {
            height: 54,
            boxSizing: 'border-box',
            py: 0,
            display: 'flex',
            alignItems: 'center',
          },
        }}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
      </NativeSelect>
      {error ? (
        <FormHelperText id={errorId} sx={{ m: 0 }}>
          {error}
        </FormHelperText>
      ) : null}
    </FormControl>
  );
}
