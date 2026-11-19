import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { formatCents } from '../domain/money';
import type { QuoteTotals } from '../domain/totals';
import { formatVatRate } from '../domain/vat';

interface QuoteTotalsBarProps {
  totals: QuoteTotals;
  isFranchise: boolean;
}

export function QuoteTotalsBar({ totals, isFranchise }: QuoteTotalsBarProps) {
  const rows = isFranchise
    ? [{ label: 'Total HT', value: formatCents(totals.htCents) }]
    : [
        { label: 'Total HT', value: formatCents(totals.htCents) },
        ...totals.vatGroups
          .filter((group) => group.htCents > 0)
          .map((group) => ({
            label: `TVA ${formatVatRate(group.rateBp)}`,
            value: formatCents(group.vatCents),
          })),
      ];

  return (
    <Box
      role="status"
      aria-live="polite"
      aria-label="Totaux du devis"
      sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mb: 1.5 }}
    >
      {rows.map((row) => (
        <Box
          key={row.label}
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: 14,
            color: 'text.secondary',
          }}
        >
          <span>{row.label}</span>
          <span>{row.value}</span>
        </Box>
      ))}
      <Box
        sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', pt: 0.5 }}
      >
        <Typography component="span" sx={{ fontSize: 17, fontWeight: 600 }}>
          {isFranchise ? 'Total à payer' : 'Total TTC'}
        </Typography>
        <Typography
          component="span"
          sx={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em' }}
        >
          {formatCents(totals.ttcCents)}
        </Typography>
      </Box>
    </Box>
  );
}
