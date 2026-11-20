import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import type { QuoteDocumentView } from '../document/documentView';

interface QuoteDocumentProps {
  view: QuoteDocumentView;
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25, minWidth: 0 }}>
      <Typography component="dt" sx={{ fontSize: 12, color: 'text.secondary' }}>
        {label}
      </Typography>
      <Typography
        component="dd"
        sx={{ m: 0, fontSize: 15, fontWeight: 600, overflowWrap: 'anywhere' }}
      >
        {value}
      </Typography>
    </Box>
  );
}

const card = {
  p: 2,
  bgcolor: 'background.paper',
  border: 1,
  borderColor: 'divider',
  borderRadius: '16px',
} as const;

/** Le devis tel que le client le lit (maquette « Devis (client) »). Aucun état : affichage pur. */
export function QuoteDocument({ view }: QuoteDocumentProps) {
  return (
    <Box
      component="article"
      aria-label={`Devis ${view.number}`}
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
            <Typography
              key={detail}
              component="p"
              sx={{ fontSize: 13, color: 'text.secondary', lineHeight: 1.45 }}
            >
              {detail}
            </Typography>
          ))}
        </Box>
      </Box>

      <Box
        component="dl"
        aria-label="Informations du devis"
        sx={{
          ...card,
          m: 0,
          display: 'grid',
          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
          gap: 1.5,
        }}
      >
        <InfoItem label="Numéro" value={view.number} />
        <InfoItem label="Date" value={view.issueDateLabel} />
        <InfoItem label="Client" value={view.client.name} />
        <InfoItem label="Valable jusqu’au" value={view.validUntilLabel} />
        <Box sx={{ gridColumn: '1 / -1' }}>
          <InfoItem label="Chantier" value={view.siteAddress} />
        </Box>
      </Box>

      <Box
        component="section"
        aria-labelledby="quote-doc-title"
        sx={{ ...card, display: 'flex', flexDirection: 'column', gap: 1.5 }}
      >
        <Typography id="quote-doc-title" component="h2" sx={{ fontSize: 17, fontWeight: 600 }}>
          {view.title}
        </Typography>
        <Box
          component="ul"
          sx={{ listStyle: 'none', m: 0, p: 0, display: 'flex', flexDirection: 'column' }}
        >
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
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              pt: 0.25,
            }}
          >
            <Typography component="span" sx={{ fontSize: 16, fontWeight: 600 }}>
              {view.totalLabel}
            </Typography>
            <Typography component="span" sx={{ fontSize: 22, fontWeight: 700 }}>
              {view.totalValue}
            </Typography>
          </Box>
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
