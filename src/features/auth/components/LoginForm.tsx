import type { ChangeEvent, FormEvent, Ref } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import FormControl from '@mui/material/FormControl';
import FormHelperText from '@mui/material/FormHelperText';
import FormLabel from '@mui/material/FormLabel';
import OutlinedInput from '@mui/material/OutlinedInput';
import Typography from '@mui/material/Typography';

const EMAIL_INPUT_ID = 'login-email';
const EMAIL_ERROR_ID = 'login-email-error';

interface LoginFormProps {
  email: string;
  error: string | null;
  isSending: boolean;
  inputRef: Ref<HTMLInputElement>;
  onEmailChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
}

export function LoginForm({
  email,
  error,
  isSending,
  inputRef,
  onEmailChange,
  onSubmit,
}: LoginFormProps) {
  const hasError = error !== null;

  return (
    <Box
      component="form"
      noValidate
      onSubmit={onSubmit}
      aria-label="Connexion par lien magique"
      sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
    >
      <FormControl error={hasError} fullWidth sx={{ gap: 0.75 }}>
        <FormLabel htmlFor={EMAIL_INPUT_ID}>Votre email</FormLabel>
        <OutlinedInput
          id={EMAIL_INPUT_ID}
          type="email"
          name="email"
          autoComplete="email"
          placeholder="vous@exemple.fr"
          value={email}
          onChange={onEmailChange}
          inputRef={inputRef}
          inputProps={{
            inputMode: 'email',
            autoCapitalize: 'none',
            spellCheck: false,
            'aria-describedby': hasError ? EMAIL_ERROR_ID : undefined,
            'aria-invalid': hasError,
          }}
        />
        {hasError ? <FormHelperText id={EMAIL_ERROR_ID}>{error}</FormHelperText> : null}
      </FormControl>

      <Button
        type="submit"
        variant="contained"
        size="large"
        fullWidth
        disabled={isSending}
        aria-busy={isSending}
      >
        {isSending ? 'Envoi en cours…' : 'Recevoir mon lien de connexion'}
      </Button>

      <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
        Pas de mot de passe à retenir : on vous envoie un lien, vous cliquez, c’est tout.
      </Typography>
    </Box>
  );
}
