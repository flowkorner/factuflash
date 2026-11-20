import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

interface LegalMentionsListProps {
  mentions: readonly string[];
}

export function LegalMentionsList({ mentions }: LegalMentionsListProps) {
  return (
    <Box
      component="section"
      aria-labelledby="quote-mentions-title"
      sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}
    >
      <Typography id="quote-mentions-title" component="h2" sx={{ fontSize: 17, fontWeight: 600 }}>
        Mentions légales
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Ajoutées automatiquement en bas du devis.
      </Typography>
      <Box
        component="ul"
        sx={{
          m: 0,
          p: 2,
          pl: 3.5,
          display: 'flex',
          flexDirection: 'column',
          gap: 0.75,
          bgcolor: 'background.paper',
          border: 1,
          borderColor: 'divider',
          borderRadius: '12px',
        }}
      >
        {mentions.map((mention) => (
          <Typography key={mention} component="li" variant="body2">
            {mention}
          </Typography>
        ))}
      </Box>
    </Box>
  );
}
