import type { Metadata } from 'next';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import { BrandLogo } from '@/components/BrandLogo';
import { MobileScreen } from '@/components/MobileScreen';
import { InvoiceDocument } from '@/features/invoices/components/InvoiceDocument';
import { getPublicInvoiceDocument } from '@/features/invoices/data/invoices';

// Lien secret : jamais indexé, jamais transmis à un autre site.
export const metadata: Metadata = {
  title: 'Votre facture',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};

export default async function PublicInvoicePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const view = await getPublicInvoiceDocument(token);

  if (!view) {
    return (
      <MobileScreen>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 9 }}>
          <BrandLogo />
          <Typography variant="h1" sx={{ fontSize: 24 }}>
            Ce lien ne fonctionne pas
          </Typography>
          <Typography color="text.secondary">
            Il est incomplet, ou l’entreprise vous a envoyé un lien plus récent. Utilisez le dernier
            email reçu, ou contactez directement l’entreprise.
          </Typography>
        </Box>
      </MobileScreen>
    );
  }

  return (
    <MobileScreen
      header={
        <Box
          component="header"
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 0.5,
            px: 2.5,
            pt: 'calc(24px + env(safe-area-inset-top))',
            pb: 2,
            bgcolor: 'background.paper',
            borderBottom: 1,
            borderColor: 'divider',
          }}
        >
          <Typography
            component="p"
            sx={{
              fontSize: 13,
              fontWeight: 600,
              color: 'primary.main',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}
          >
            {view.title} {view.number}
          </Typography>
          <Typography variant="h1" sx={{ fontSize: 24 }}>
            {view.company.name}
          </Typography>
        </Box>
      }
      footer={
        <Button
          component="a"
          href={`/f/${token}/pdf`}
          variant="contained"
          size="large"
          fullWidth
          startIcon={<FileDownloadOutlinedIcon />}
        >
          Télécharger la facture (PDF)
        </Button>
      }
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2, pb: 3 }}>
        <InvoiceDocument view={view} />
        <Typography sx={{ fontSize: 12, color: 'text.secondary', textAlign: 'center' }}>
          Service de facturation en ligne FactuFlash
        </Typography>
      </Box>
    </MobileScreen>
  );
}
