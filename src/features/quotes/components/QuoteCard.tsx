import Link from 'next/link';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { colors } from '@/theme/tokens';
import { formatIssueDate, STATUS_LABELS } from '../domain/format';
import { formatCents } from '../domain/money';
import type { QuoteStatus, QuoteSummary } from '../domain/types';
import { DeleteQuoteDraftButton } from './DeleteQuoteDraftButton';

const STATUS_COLORS: Record<QuoteStatus, { bg: string; fg: string }> = {
  draft: { bg: colors.statusDraftBg, fg: colors.statusDraftFg },
  sent: { bg: colors.statusSentBg, fg: colors.statusSentFg },
  accepted: { bg: colors.statusAcceptedBg, fg: colors.statusAcceptedFg },
  declined: { bg: colors.statusDeclinedBg, fg: colors.statusDeclinedFg },
  deposit_paid: { bg: colors.successBg, fg: colors.successFg },
};

interface QuoteCardProps {
  quote: QuoteSummary;
}

export function QuoteCard({ quote }: QuoteCardProps) {
  const status = STATUS_COLORS[quote.status];
  const amount = formatCents(quote.totalTtcCents);
  const depositLabel =
    quote.depositPaidCents > 0 ? `Acompte reçu : ${formatCents(quote.depositPaidCents)}` : null;

  return (
    // Cadre commun : le lien et le bouton de suppression sont frères (pas de bouton dans un lien).
    <Box
      sx={{
        display: 'flex',
        alignItems: 'stretch',
        bgcolor: 'background.paper',
        border: 1,
        borderColor: 'divider',
        borderRadius: '16px',
        overflow: 'hidden',
      }}
    >
      <Box
        component={Link}
        href={`/devis/${quote.id}`}
        aria-label={[
          quote.number,
          quote.clientName,
          quote.title,
          STATUS_LABELS[quote.status],
          amount,
          depositLabel,
        ]
          .filter(Boolean)
          .join(', ')}
        sx={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 1.25,
          p: 2,
          color: 'text.primary',
          textDecoration: 'none',
          '&:focus-visible': { outline: 2, outlineColor: 'primary.main', outlineOffset: -2 },
        }}
      >
        <Box
          sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}
        >
          <Typography component="span" sx={{ fontSize: 17, fontWeight: 600 }}>
            {quote.clientName}
          </Typography>
          <Box
            component="span"
            sx={{
              fontSize: 13,
              fontWeight: 600,
              px: 1.25,
              py: 0.6,
              borderRadius: 999,
              whiteSpace: 'nowrap',
              bgcolor: status.bg,
              color: status.fg,
            }}
          >
            {STATUS_LABELS[quote.status]}
          </Box>
        </Box>
        <Typography
          component="span"
          sx={{ fontSize: 15, color: 'text.secondary', lineHeight: 1.4 }}
        >
          {quote.title}
        </Typography>
        <Box
          sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 1 }}
        >
          <Typography component="span" sx={{ fontSize: 13, color: 'text.secondary' }}>
            {quote.number} · {formatIssueDate(quote.issueDate)}
          </Typography>
          <Typography component="span" sx={{ fontSize: 19, fontWeight: 700 }}>
            {amount}
          </Typography>
        </Box>
        {depositLabel ? (
          <Typography
            component="span"
            sx={{ fontSize: 14, fontWeight: 600, color: colors.successFg }}
          >
            {depositLabel}
          </Typography>
        ) : null}
      </Box>
      {quote.status === 'draft' ? (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            px: 0.5,
            borderLeft: 1,
            borderColor: 'divider',
          }}
        >
          <DeleteQuoteDraftButton quoteId={quote.id} number={quote.number} variant="icon" />
        </Box>
      ) : null}
    </Box>
  );
}
