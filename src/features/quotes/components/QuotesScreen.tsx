import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import AddIcon from '@mui/icons-material/Add';
import { MobileScreen } from '@/components/MobileScreen';
import { QuotesEmptyState } from './QuotesEmptyState';
import { QuotesHeader } from './QuotesHeader';

export function QuotesScreen() {
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
      <Box sx={{ pt: 2, pb: 3 }}>
        <QuotesEmptyState />
      </Box>
    </MobileScreen>
  );
}
