import Button from '@mui/material/Button';
import LogoutIcon from '@mui/icons-material/Logout';
import { signOut } from '../actions/signOut';

/** Formulaire + Server Action : fonctionne même sans JavaScript. */
export function SignOutButton() {
  return (
    <form action={signOut}>
      <Button
        type="submit"
        variant="text"
        startIcon={<LogoutIcon />}
        sx={{ color: 'text.secondary' }}
      >
        Se déconnecter
      </Button>
    </form>
  );
}
