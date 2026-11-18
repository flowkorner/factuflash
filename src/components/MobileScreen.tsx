import type { ReactNode } from 'react';
import Box from '@mui/material/Box';

interface MobileScreenProps {
  header?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}

/**
 * Cadre commun des écrans : colonne pleine hauteur (100dvh), largeur limitée
 * sur grand écran, pied de page collé en bas et zones sûres iOS respectées.
 */
export function MobileScreen({ header, footer, children }: MobileScreenProps) {
  return (
    <Box
      sx={{
        minHeight: '100dvh',
        maxWidth: 480,
        mx: 'auto',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.default',
        borderInline: { sm: 1 },
        borderColor: { sm: 'divider' },
      }}
    >
      {header}
      <Box
        component="main"
        sx={{ flex: '1 1 auto', display: 'flex', flexDirection: 'column', px: { xs: 2.5, sm: 3 } }}
      >
        {children}
      </Box>
      {footer ? (
        <Box
          component="footer"
          sx={{
            position: 'sticky',
            bottom: 0,
            bgcolor: 'background.paper',
            borderTop: 1,
            borderColor: 'divider',
            px: 2.5,
            pt: 1.5,
            pb: 'calc(16px + env(safe-area-inset-bottom))',
          }}
        >
          {footer}
        </Box>
      ) : null}
    </Box>
  );
}
