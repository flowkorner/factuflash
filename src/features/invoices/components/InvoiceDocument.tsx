import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { colors } from '@/theme/tokens';
import type { InvoiceDocumentView } from '../document/invoiceView';

const card = {
  p: 2,
  bgcolor: 'background.paper',
  border: 1,
  borderColor: 'divider',
  borderRadius: '16px',
} as const;

/** La facture telle que le client la lit. Affichage pur. */
export function InvoiceDocument({ view }: { view: InvoiceDocumentView }) {
  return (
    <Box
      component="article"
      aria-label={`${view.title} ${view.number}`}
      sx={{ display: 'flex', flexDirection: 'column', gap: 1.75 }}
    >
      <Box
        component="section"
        aria-label="Entreprise"
        sx={{ ...card, display: 'flex', gap: 1.5, alignItems: 'flex-start' }}
      >
        {view.company.logoUrl ? (
          <Avatar
            variant="rounded"
            src={view.company.logoUrl}
            alt={`Logo de ${view.company.name}`}
            sx={{
              width: 56,
              height: 56,
              borderRadius: '12px',
              bgcolor: 'background.paper',
              '& img': { objectFit: 'contain' },
            }}
          />
        ) : null}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25, minWidth: 0 }}>
          <Typography component="p" sx={{ fontSize: 17, fontWeight: 700 }}>
            {view.company.name}
          </Typography>
          {view.company.details.map((detail) => (
            <Typography key={detail} component="p" sx={{ fontSize: 13, color: 'text.secondary' }}>
              {detail}
            </Typography>
          ))}
        </Box>
      </Box>

      <Box
        component="dl"
        aria-label="Informations de la facture"
        sx={{
          ...card,
          m: 0,
          display: 'grid',
          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
          gap: 1.5,
        }}
      >
        {view.infos.map((info) => (
          <Box
            key={info.label}
            sx={{ display: 'flex', flexDirection: 'column', gap: 0.25, minWidth: 0 }}
          >
            <Typography component="dt" sx={{ fontSize: 12, color: 'text.secondary' }}>
              {info.label}
            </Typography>
            <Typography
              component="dd"
              sx={{ m: 0, fontSize: 15, fontWeight: 600, overflowWrap: 'anywhere' }}
            >
              {info.value}
            </Typography>
          </Box>
        ))}
      </Box>

      <Box
        component="section"
        aria-labelledby="invoice-doc-title"
        sx={{ ...card, display: 'flex', flexDirection: 'column', gap: 1.5 }}
      >
        <Typography id="invoice-doc-title" component="h2" sx={{ fontSize: 17, fontWeight: 600 }}>
          {view.object}
        </Typography>
        <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0 }}>
          {view.lines.map((line, index) => (
            <Box
              component="li"
              key={`${index}-${line.designation}`}
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 1.5,
                py: 1.5,
                borderTop: 1,
                borderColor: 'divider',
              }}
            >
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.4, minWidth: 0 }}>
                <Typography sx={{ fontSize: 15, lineHeight: 1.35, overflowWrap: 'anywhere' }}>
                  {line.designation}
                </Typography>
                <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
                  {line.detail}
                  {line.vatLabel ? ` · ${line.vatLabel}` : ''}
                </Typography>
              </Box>
              <Typography sx={{ flex: 'none', fontSize: 15, fontWeight: 600 }}>
                {line.total}
              </Typography>
            </Box>
          ))}
        </Box>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 0.75,
            pt: 1.5,
            borderTop: 1,
            borderColor: 'divider',
          }}
        >
          {view.totals.map((row) => (
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
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <Typography component="span" sx={{ fontSize: 16, fontWeight: 600 }}>
              {view.totalLabel}
            </Typography>
            <Typography component="span" sx={{ fontSize: 18, fontWeight: 700 }}>
              {view.totalValue}
            </Typography>
          </Box>
          {view.deductions.map((row) => (
            <Box
              key={row.label}
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 1,
                fontSize: 14,
                color: 'text.secondary',
              }}
            >
              <span>{row.label}</span>
              <span style={{ whiteSpace: 'nowrap' }}>{row.value}</span>
            </Box>
          ))}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              mt: 0.5,
              p: 1.25,
              borderRadius: '12px',
              bgcolor: colors.primarySoft,
              color: colors.primaryDark,
            }}
          >
            <Typography component="span" sx={{ fontWeight: 700 }}>
              {view.amountDue.label}
            </Typography>
            <Typography component="span" sx={{ fontSize: 22, fontWeight: 700 }}>
              {view.amountDue.value}
            </Typography>
          </Box>
          {view.paidLabel ? (
            <Typography
              sx={{ fontSize: 14, fontWeight: 600, color: colors.successFg, textAlign: 'right' }}
            >
              Acquittée · {view.paidLabel}
            </Typography>
          ) : null}
        </Box>
      </Box>

      <Box
        component="section"
        aria-label="Mentions légales"
        sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}
      >
        {view.mentions.map((mention) => (
          <Typography key={mention} sx={{ fontSize: 12, lineHeight: 1.5, color: 'text.secondary' }}>
            {mention}
          </Typography>
        ))}
      </Box>
    </Box>
  );
}
