import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import AddIcon from '@mui/icons-material/Add';
import { MobileScreen } from '@/components/MobileScreen';
import { SignOutButton } from '@/features/auth/components/SignOutButton';
import { CompleteCompanyNotice } from './CompleteCompanyNotice';
import { QuotesEmptyState } from './QuotesEmptyState';
import { QuotesHeader } from './QuotesHeader';

interface QuotesScreenProps {
  hasCompany: boolean;
}

export function QuotesScreen({ hasCompany }: QuotesScreenProps) {
  return (
    <MobileScreen
      header={<QuotesHeader subtitle="Votre premier devis en 2 minutes" />}
      footer={
        // Écran « Nouveau devis » : ticket suivant.
        <Button variant="contained" size="large" fullWidth disabled startIcon={<AddIcon />}>
          Nouveau devis
          <Box component="span" sx={{ ml: 1, fontSize: 14, fontWeight: 500 }}>
            · bientôt
          </Box>
        </Button>
      }
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2, pb: 3 }}>
        {hasCompany ? null : <CompleteCompanyNotice />}
        <QuotesEmptyState />
        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          <SignOutButton />
        </Box>
      </Box>
    </MobileScreen>
  );
}
