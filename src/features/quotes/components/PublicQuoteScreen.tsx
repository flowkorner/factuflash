'use client';

import { useEffect, useRef } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormHelperText from '@mui/material/FormHelperText';
import Typography from '@mui/material/Typography';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import { LabeledInput } from '@/components/LabeledInput';
import { MobileScreen } from '@/components/MobileScreen';
import { colors } from '@/theme/tokens';
import { formatDateTime } from '../document/documentView';
import type { QuoteDocumentView } from '../document/documentView';
import type { Acceptance } from '../hooks/useAcceptQuote';
import { useAcceptQuote } from '../hooks/useAcceptQuote';
import { QuoteDocument } from './QuoteDocument';

const FORM_ID = 'accept-form';
const HELP_ID = 'accept-help';

interface PublicQuoteScreenProps {
  token: string;
  view: QuoteDocumentView;
  isExpired: boolean;
  initialAcceptance: Acceptance | null;
}

export function PublicQuoteScreen({
  token,
  view,
  isExpired,
  initialAcceptance,
}: PublicQuoteScreenProps) {
  const accept = useAcceptQuote(token, initialAcceptance);
  const canAccept = !accept.accepted && !isExpired && view.status === 'sent';
  const pdfHref = `/d/${token}/pdf`;

  // Après acceptation, le focus va sur la confirmation (annoncée aux lecteurs d'écran).
  const confirmationRef = useRef<HTMLHeadingElement>(null);
  const wasAccepted = useRef(initialAcceptance !== null);
  useEffect(() => {
    if (accept.accepted && !wasAccepted.current) {
      wasAccepted.current = true;
      confirmationRef.current?.focus();
    }
  }, [accept.accepted]);

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
            Devis {view.number}
          </Typography>
          <Typography variant="h1" sx={{ fontSize: 24 }}>
            {view.company.name}
          </Typography>
        </Box>
      }
      footer={
        canAccept ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <Typography sx={{ fontSize: 15, color: 'text.secondary' }}>
                {view.totalLabel}
              </Typography>
              <Typography sx={{ fontSize: 20, fontWeight: 700 }}>{view.totalValue}</Typography>
            </Box>
            <Button
              type="submit"
              form={FORM_ID}
              variant="contained"
              size="large"
              fullWidth
              disabled={!accept.canSubmit}
              aria-busy={accept.isSubmitting}
              aria-describedby={accept.canSubmit ? undefined : HELP_ID}
            >
              {accept.isSubmitting ? 'Enregistrement…' : 'J’accepte le devis'}
            </Button>
            {accept.canSubmit || accept.isSubmitting ? null : (
              <Typography
                id={HELP_ID}
                sx={{ fontSize: 13, color: 'text.secondary', textAlign: 'center' }}
              >
                Saisissez votre nom et cochez la case pour continuer.
              </Typography>
            )}
          </Box>
        ) : (
          <Button
            component="a"
            href={pdfHref}
            variant="contained"
            size="large"
            fullWidth
            startIcon={<FileDownloadOutlinedIcon />}
          >
            Télécharger le devis (PDF)
          </Button>
        )
      }
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2, pb: 3 }}>
        {accept.accepted ? (
          <Box
            role="status"
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              gap: 1,
              p: 2.5,
              borderRadius: '16px',
              bgcolor: colors.successBg,
              color: colors.successFg,
            }}
          >
            <CheckCircleOutlineIcon sx={{ fontSize: 40 }} aria-hidden="true" />
            <Typography
              component="h2"
              ref={confirmationRef}
              tabIndex={-1}
              sx={{ fontSize: 20, fontWeight: 700, outline: 'none' }}
            >
              Devis accepté, merci !
            </Typography>
            <Typography sx={{ fontSize: 15, lineHeight: 1.5 }}>
              Accepté par {accept.accepted.acceptedByName} le{' '}
              {formatDateTime(accept.accepted.acceptedAt)}. {view.company.name} a bien reçu votre
              accord et va vous recontacter pour fixer la date du chantier.
            </Typography>
          </Box>
        ) : null}

        {isExpired && !accept.accepted ? (
          <Alert severity="warning" sx={{ borderRadius: '12px' }}>
            Ce devis a dépassé sa date de validité ({view.validUntilLabel}). Contactez{' '}
            {view.company.name} pour en recevoir un nouveau.
          </Alert>
        ) : null}

        <QuoteDocument view={view} />

        {canAccept ? (
          <Button
            component="a"
            href={pdfHref}
            variant="outlined"
            startIcon={<FileDownloadOutlinedIcon />}
          >
            Télécharger le devis (PDF)
          </Button>
        ) : null}

        {canAccept ? (
          <Box
            component="form"
            id={FORM_ID}
            noValidate
            onSubmit={accept.onSubmit}
            aria-labelledby="accept-title"
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: 1.75,
              p: 2,
              bgcolor: 'background.paper',
              border: 1.5,
              borderColor: colors.acceptBorder,
              borderRadius: '16px',
            }}
          >
            <Typography id="accept-title" component="h2" sx={{ fontSize: 17, fontWeight: 600 }}>
              Votre accord
            </Typography>
            <LabeledInput
              id="accept-name"
              name="name"
              label="Votre nom et prénom"
              value={accept.name}
              onChange={accept.onNameChange}
              autoComplete="name"
              maxLength={120}
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={accept.agreed}
                  onChange={accept.onAgreedChange}
                  sx={{ mt: -0.75 }}
                />
              }
              label="J’ai lu ce devis et je l’accepte : bon pour accord."
              sx={{
                alignItems: 'flex-start',
                m: 0,
                gap: 0.5,
                '& .MuiFormControlLabel-label': { fontSize: 15, lineHeight: 1.45, pt: 0.25 },
              }}
            />
            <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
              La date et l’heure de votre accord seront enregistrées et transmises à{' '}
              {view.company.name}.
            </Typography>
            {accept.error ? (
              <FormHelperText error role="alert" sx={{ m: 0, fontSize: 14 }}>
                {accept.error}
              </FormHelperText>
            ) : null}
          </Box>
        ) : null}

        <Typography sx={{ fontSize: 12, color: 'text.secondary', textAlign: 'center' }}>
          Service de devis en ligne FactuFlash
        </Typography>
      </Box>
    </MobileScreen>
  );
}
