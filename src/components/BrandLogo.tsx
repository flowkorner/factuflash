import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';

export function BrandLogo() {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
      <Box
        aria-hidden="true"
        sx={{
          width: 40,
          height: 40,
          borderRadius: '12px',
          bgcolor: 'primary.main',
          color: 'primary.contrastText',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <DescriptionOutlinedIcon fontSize="small" />
      </Box>
      <Typography component="span" sx={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em' }}>
        FactuFlash
      </Typography>
    </Box>
  );
}
