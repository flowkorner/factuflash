'use client';

import { useMemo } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import FormHelperText from '@mui/material/FormHelperText';
import Typography from '@mui/material/Typography';
import AddIcon from '@mui/icons-material/Add';
import { BackHeader } from '@/components/BackHeader';
import { LabeledInput } from '@/components/LabeledInput';
import { LabeledSelect } from '@/components/LabeledSelect';
import { LabeledTextarea } from '@/components/LabeledTextarea';
import { MobileScreen } from '@/components/MobileScreen';
import type { VatMode } from '@/features/company/domain/types';
import { colors } from '@/theme/tokens';
import { buildLegalMentions } from '../domain/legalMentions';
import type { ClientOption, QuoteFormValues } from '../domain/types';
import { NEW_CLIENT } from '../domain/types';
import { useQuoteEditor } from '../hooks/useQuoteEditor';
import { DeleteQuoteDraftButton } from './DeleteQuoteDraftButton';
import { LegalMentionsList } from './LegalMentionsList';
import { QuoteLineCard } from './QuoteLineCard';
import { QuoteTotalsBar } from './QuoteTotalsBar';

const FORM_ID = 'quote-form';

interface QuoteEditorScreenProps {
  quoteId: string | null;
  number: string | null;
  initialValues: QuoteFormValues;
  clients: readonly ClientOption[];
  company: { name: string; siret: string; vatMode: VatMode };
}

export function QuoteEditorScreen({
  quoteId,
  number,
  initialValues,
  clients,
  company,
}: QuoteEditorScreenProps) {
  const editor = useQuoteEditor({ quoteId, initialValues, clients, vatMode: company.vatMode });
  const { values, errors } = editor;
  const isFranchise = company.vatMode === 'franchise';

  const clientOptions = useMemo(
    () => [
      { value: '', label: 'Choisir un client…', disabled: true },
      ...clients.map((client) => ({ value: client.id, label: client.name })),
      { value: NEW_CLIENT, label: '+ Nouveau client' },
    ],
    [clients],
  );

  const mentions = useMemo(
    () =>
      buildLegalMentions({
        companyName: company.name,
        siret: company.siret,
        vatMode: company.vatMode,
        validityDays: values.validityDays,
      }),
    [company, values.validityDays],
  );

  return (
    <MobileScreen
      header={
        <BackHeader
          title={number ? `Devis ${number}` : 'Nouveau devis'}
          subtitle={number ? 'Brouillon · modifiable' : 'Le numéro est attribué à l’enregistrement'}
          backHref="/devis"
          backLabel="Retour à mes devis"
        />
      }
      footer={
        <>
          <QuoteTotalsBar totals={editor.totals} isFranchise={isFranchise} />
          <Button
            type="submit"
            form={FORM_ID}
            variant="contained"
            size="large"
            fullWidth
            disabled={editor.isSaving}
            aria-busy={editor.isSaving}
          >
            {editor.isSaving ? 'Enregistrement…' : 'Enregistrer le brouillon'}
          </Button>
        </>
      }
    >
      <Box
        component="form"
        id={FORM_ID}
        noValidate
        onSubmit={editor.onSubmit}
        aria-label={number ? `Devis ${number}` : 'Nouveau devis'}
        sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 2, pb: 3 }}
      >
        {editor.formError ? (
          <Alert severity="error" sx={{ borderRadius: '12px' }}>
            {editor.formError}
          </Alert>
        ) : null}

        <Box
          component="section"
          aria-labelledby="quote-client-title"
          sx={{ display: 'flex', flexDirection: 'column', gap: 1.75 }}
        >
          <Typography id="quote-client-title" component="h2" sx={{ fontSize: 17, fontWeight: 600 }}>
            Le client
          </Typography>
          <LabeledSelect
            id="quote-client"
            name="clientId"
            label="Client"
            value={values.clientId}
            options={clientOptions}
            onChange={editor.onClientChange}
            error={errors.clientId}
          />
          {editor.isNewClient ? (
            <>
              <LabeledInput
                id="quote-new-client-name"
                name="newClientName"
                label="Nom du client"
                value={values.newClientName}
                onChange={editor.onFieldChange}
                error={errors.newClientName}
                placeholder="Ex. : M. Martin"
                autoComplete="off"
                maxLength={120}
              />
              <LabeledInput
                id="quote-new-client-email"
                name="newClientEmail"
                label="Email du client (facultatif)"
                type="email"
                value={values.newClientEmail}
                onChange={editor.onFieldChange}
                error={errors.newClientEmail}
                helper="Pour lui envoyer le devis."
                placeholder="client@exemple.fr"
                inputMode="email"
                autoComplete="off"
                maxLength={254}
              />
            </>
          ) : null}
        </Box>

        <Box
          component="section"
          aria-labelledby="quote-site-title"
          sx={{ display: 'flex', flexDirection: 'column', gap: 1.75 }}
        >
          <Typography id="quote-site-title" component="h2" sx={{ fontSize: 17, fontWeight: 600 }}>
            Le chantier
          </Typography>
          <LabeledInput
            id="quote-title"
            name="title"
            label="Objet du devis"
            value={values.title}
            onChange={editor.onFieldChange}
            error={errors.title}
            placeholder="Ex. : Remplacement chauffe-eau 200 L"
            maxLength={160}
          />
          <LabeledInput
            id="quote-site-address"
            name="siteAddress"
            label="Adresse du chantier"
            value={values.siteAddress}
            onChange={editor.onFieldChange}
            error={errors.siteAddress}
            placeholder="Numéro, rue, code postal, ville"
            autoComplete="off"
            maxLength={300}
          />
          <LabeledTextarea
            id="quote-description"
            name="description"
            label="Notes sur le chantier (facultatif)"
            value={values.description}
            onChange={editor.onFieldChange}
            helper="Pour vous seulement : n’apparaît pas sur le devis."
            placeholder="Ex. : chauffe-eau dans le cellier, accès par le garage"
            maxLength={4000}
            minRows={3}
          />
        </Box>

        <Box
          component="section"
          aria-labelledby="quote-lines-title"
          sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}
        >
          <Typography id="quote-lines-title" component="h2" sx={{ fontSize: 17, fontWeight: 600 }}>
            Les prestations
          </Typography>
          {isFranchise ? (
            <Typography variant="body2" color="text.secondary">
              Franchise de TVA : les prix sont nets, sans TVA.
            </Typography>
          ) : null}
          {values.lines.map((line, index) => (
            <QuoteLineCard
              key={line.key}
              line={line}
              index={index}
              htCents={editor.totals.lineHtCents[index] ?? 0}
              showVat={!isFranchise}
              canRemove={values.lines.length > 1}
              errors={errors.lineErrors?.[line.key]}
              onChange={editor.onLineChange}
              onUnitChange={editor.onLineUnitChange}
              onVatChange={editor.onLineVatChange}
              onRemove={editor.onRemoveLine}
            />
          ))}
          <Button
            id="quote-add-line"
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={editor.onAddLine}
            aria-describedby={errors.lines ? 'quote-lines-error' : undefined}
            sx={{ borderStyle: 'dashed', borderColor: colors.dashedBorder, color: 'primary.main' }}
          >
            Ajouter une ligne
          </Button>
          {errors.lines ? (
            <FormHelperText id="quote-lines-error" error sx={{ m: 0 }}>
              {errors.lines}
            </FormHelperText>
          ) : null}
        </Box>

        <LegalMentionsList mentions={mentions} />

        {quoteId && number ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', pt: 1 }}>
            <DeleteQuoteDraftButton
              quoteId={quoteId}
              number={number}
              variant="text"
              redirectTo="/devis"
            />
          </Box>
        ) : null}
      </Box>
    </MobileScreen>
  );
}
