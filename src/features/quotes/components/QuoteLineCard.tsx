import { memo, useCallback } from 'react';
import type { ChangeEvent } from 'react';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { LabeledInput } from '@/components/LabeledInput';
import { LabeledSelect } from '@/components/LabeledSelect';
import { LabeledTextarea } from '@/components/LabeledTextarea';
import { formatCents } from '../domain/money';
import type { LineField, QuoteLineInput } from '../domain/types';
import { UNITS } from '../domain/units';
import { VAT_RATES, formatVatRate } from '../domain/vat';
import { lineFieldId } from '../hooks/useQuoteEditor';

const UNIT_OPTIONS = UNITS.map((unit) => ({ value: unit.value, label: unit.label }));
const VAT_OPTIONS = VAT_RATES.map((rate) => ({ value: String(rate), label: formatVatRate(rate) }));

interface QuoteLineCardProps {
  line: QuoteLineInput;
  index: number;
  htCents: number;
  showVat: boolean;
  canRemove: boolean;
  errors?: Partial<Record<LineField, string>>;
  onChange: (key: string, field: LineField, value: string) => void;
  onUnitChange: (key: string, unit: string) => void;
  onVatChange: (key: string, rate: string) => void;
  onRemove: (key: string) => void;
}

function QuoteLineCardBase({
  line,
  index,
  htCents,
  showVat,
  canRemove,
  errors,
  onChange,
  onUnitChange,
  onVatChange,
  onRemove,
}: QuoteLineCardProps) {
  const { key } = line;
  const handleText = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const field = event.target.name;
      if (field === 'quantity' || field === 'unitPrice') onChange(key, field, event.target.value);
    },
    [key, onChange],
  );
  const handleDesignation = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>) => onChange(key, 'designation', event.target.value),
    [key, onChange],
  );
  const handleUnit = useCallback(
    (event: ChangeEvent<HTMLSelectElement>) => onUnitChange(key, event.target.value),
    [key, onUnitChange],
  );
  const handleVat = useCallback(
    (event: ChangeEvent<HTMLSelectElement>) => onVatChange(key, event.target.value),
    [key, onVatChange],
  );
  const handleRemove = useCallback(() => onRemove(key), [key, onRemove]);
  const lineLabel = line.designation.trim() || `ligne ${index + 1}`;

  return (
    <Box
      component="article"
      aria-label={`Ligne ${index + 1}`}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 1.5,
        p: 2,
        bgcolor: 'background.paper',
        border: 1,
        borderColor: 'divider',
        borderRadius: '16px',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
        <Box sx={{ flex: 1 }}>
          <LabeledTextarea
            id={lineFieldId(key, 'designation')}
            name="designation"
            label="Désignation"
            value={line.designation}
            onChange={handleDesignation}
            error={errors?.designation}
            placeholder="Ex. : Chauffe-eau électrique 200 L"
            maxLength={300}
            minRows={1}
          />
        </Box>
        {canRemove ? (
          <IconButton
            onClick={handleRemove}
            aria-label={`Supprimer la ligne : ${lineLabel}`}
            sx={{ mt: 3, width: 48, height: 48, color: 'text.secondary' }}
          >
            <DeleteOutlineIcon />
          </IconButton>
        ) : null}
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 1.25 }}>
        <LabeledInput
          id={lineFieldId(key, 'quantity')}
          name="quantity"
          label="Quantité"
          value={line.quantity}
          onChange={handleText}
          error={errors?.quantity}
          inputMode="decimal"
          maxLength={10}
        />
        <LabeledSelect
          id={lineFieldId(key, 'unit')}
          name="unit"
          label="Unité"
          value={line.unit}
          options={UNIT_OPTIONS}
          onChange={handleUnit}
        />
        <LabeledInput
          id={lineFieldId(key, 'unitPrice')}
          name="unitPrice"
          label="Prix unit. HT (€)"
          value={line.unitPrice}
          onChange={handleText}
          error={errors?.unitPrice}
          inputMode="decimal"
          placeholder="0"
          maxLength={12}
        />
        {showVat ? (
          <LabeledSelect
            id={lineFieldId(key, 'vat')}
            name="vat"
            label="TVA"
            value={String(line.vatRateBp)}
            options={VAT_OPTIONS}
            onChange={handleVat}
          />
        ) : null}
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <Typography variant="body2" color="text.secondary">
          Total HT de la ligne
        </Typography>
        <Typography sx={{ fontSize: 17, fontWeight: 700 }}>{formatCents(htCents)}</Typography>
      </Box>
    </Box>
  );
}

export const QuoteLineCard = memo(QuoteLineCardBase);
