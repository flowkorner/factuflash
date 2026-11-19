'use client';

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { BackHeader } from '@/components/BackHeader';
import { LabeledInput } from '@/components/LabeledInput';
import { MobileScreen } from '@/components/MobileScreen';
import { colors } from '@/theme/tokens';
import type { CompanyFormValues } from '../domain/types';
import { COMPANY_FIELD_IDS, useCompanyForm } from '../hooks/useCompanyForm';
import { LogoField } from './LogoField';
import { VatModeField } from './VatModeField';

const FORM_ID = 'company-form';

interface CompanyScreenProps {
  initialValues: CompanyFormValues;
  initialLogoUrl: string | null;
  isFirstTime: boolean;
}

export function CompanyScreen({ initialValues, initialLogoUrl, isFirstTime }: CompanyScreenProps) {
  const form = useCompanyForm({ initialValues, initialLogoUrl });
  const { values, errors } = form;

  return (
    <MobileScreen
      header={
        <BackHeader
          title="Mon entreprise"
          subtitle="Ces infos figurent sur vos devis et factures"
          backHref="/devis"
          backLabel="Retour à mes devis"
        />
      }
      footer={
        <Button
          type="submit"
          form={FORM_ID}
          variant="contained"
          size="large"
          fullWidth
          disabled={form.isSaving}
          aria-busy={form.isSaving}
        >
          {form.isSaving ? 'Enregistrement…' : 'Enregistrer'}
        </Button>
      }
    >
      <Box
        component="form"
        id={FORM_ID}
        noValidate
        onSubmit={form.onSubmit}
        aria-label="Mon entreprise"
        sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 2, pb: 3 }}
      >
        {isFirstTime ? (
          <Box
            sx={{
              display: 'flex',
              gap: 1.25,
              alignItems: 'flex-start',
              p: 1.5,
              borderRadius: '12px',
              bgcolor: colors.primarySoft,
              color: colors.primaryDark,
            }}
          >
            <InfoOutlinedIcon fontSize="small" aria-hidden="true" sx={{ mt: 0.25 }} />
            <Typography variant="body2">
              À remplir une seule fois. Vous pourrez créer votre premier devis dès que tout est
              complet.
            </Typography>
          </Box>
        ) : null}

        {form.formError ? (
          <Alert severity="error" sx={{ borderRadius: '12px' }}>
            {form.formError}
          </Alert>
        ) : null}

        <Box
          component="section"
          aria-labelledby="company-identity-title"
          sx={{ display: 'flex', flexDirection: 'column', gap: 1.75 }}
        >
          <Typography
            id="company-identity-title"
            component="h2"
            sx={{ fontSize: 17, fontWeight: 600 }}
          >
            Identité
          </Typography>
          <LabeledInput
            id={COMPANY_FIELD_IDS.name}
            name="name"
            label="Nom de l’entreprise"
            value={values.name}
            onChange={form.onFieldChange}
            error={errors.name}
            placeholder="Ex. : Plomberie Durand"
            autoComplete="organization"
            maxLength={120}
          />
          <LabeledInput
            id={COMPANY_FIELD_IDS.siret}
            name="siret"
            label="SIRET"
            value={values.siret}
            onChange={form.onFieldChange}
            error={errors.siret}
            helper="Sur votre avis de situation Insee ou votre Kbis."
            placeholder="14 chiffres"
            inputMode="numeric"
            autoComplete="off"
            maxLength={20}
          />
          <LabeledInput
            id={COMPANY_FIELD_IDS.address}
            name="address"
            label="Adresse"
            value={values.address}
            onChange={form.onFieldChange}
            error={errors.address}
            placeholder="Numéro, rue, code postal, ville"
            autoComplete="street-address"
            maxLength={300}
          />
          <LabeledInput
            id={COMPANY_FIELD_IDS.phone}
            name="phone"
            label="Téléphone"
            type="tel"
            value={values.phone}
            onChange={form.onFieldChange}
            error={errors.phone}
            placeholder="06 12 34 56 78"
            inputMode="tel"
            autoComplete="tel"
            maxLength={20}
          />
        </Box>

        <LogoField
          inputId={COMPANY_FIELD_IDS.logo}
          previewUrl={form.logoPreviewUrl}
          error={errors.logo}
          onSelect={form.onLogoSelect}
          onRemove={form.onLogoRemove}
        />

        <VatModeField
          value={values.vatMode}
          vatNumber={form.vatNumber}
          error={errors.vatMode}
          onChange={form.onFieldChange}
        />
      </Box>
    </MobileScreen>
  );
}
