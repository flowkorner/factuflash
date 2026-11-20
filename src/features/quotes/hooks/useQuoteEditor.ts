'use client';

import { useCallback, useMemo, useReducer, useState, useTransition } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import type { VatMode } from '@/features/company/domain/types';
import { saveQuoteDraft } from '../actions/saveQuoteDraft';
import { parseEuroToCents, parseQuantityToMilli } from '../domain/money';
import type { QuoteTotals } from '../domain/totals';
import { computeTotals } from '../domain/totals';
import type {
  ClientOption,
  LineField,
  QuoteFormErrors,
  QuoteFormValues,
  QuoteLineInput,
} from '../domain/types';
import { NEW_CLIENT } from '../domain/types';
import type { Unit } from '../domain/units';
import { isUnit } from '../domain/units';
import { validateQuote } from '../domain/validation';
import type { VatRateBp } from '../domain/vat';
import { DEFAULT_VAT_RATE, isVatRate } from '../domain/vat';

type TextField = 'title' | 'siteAddress' | 'description' | 'newClientName' | 'newClientEmail';
const TEXT_FIELDS: readonly string[] = [
  'title',
  'siteAddress',
  'description',
  'newClientName',
  'newClientEmail',
];

function isTextField(name: string): name is TextField {
  return TEXT_FIELDS.includes(name);
}

interface EditorState {
  values: QuoteFormValues;
  errors: QuoteFormErrors;
  formError: string | null;
  nextKey: number;
}

type EditorAction =
  | { type: 'clientSelected'; clientId: string; clientAddress: string | null }
  | { type: 'fieldChanged'; field: TextField; value: string }
  | { type: 'lineAdded'; vatRateBp: VatRateBp }
  | { type: 'lineChanged'; key: string; field: LineField; value: string }
  | { type: 'lineUnitChanged'; key: string; unit: Unit }
  | { type: 'lineVatChanged'; key: string; vatRateBp: VatRateBp }
  | { type: 'lineRemoved'; key: string }
  | { type: 'failed'; errors: QuoteFormErrors; formError: string | null };

export function createEmptyLine(key: string, vatRateBp: VatRateBp): QuoteLineInput {
  return {
    key,
    designation: '',
    quantity: '1',
    unit: 'u',
    unitPrice: '',
    vatRateBp,
    source: 'manual',
    priceItemId: null,
  };
}

function clearLineError(
  errors: QuoteFormErrors,
  key: string,
  field: LineField,
): QuoteFormErrors['lineErrors'] {
  const current = errors.lineErrors?.[key];
  if (!current?.[field]) return errors.lineErrors;
  return { ...errors.lineErrors, [key]: { ...current, [field]: undefined } };
}

function editorReducer(state: EditorState, action: EditorAction): EditorState {
  const { values, errors } = state;
  switch (action.type) {
    case 'clientSelected':
      return {
        ...state,
        values: {
          ...values,
          clientId: action.clientId,
          // Adresse du client reprise pour le chantier si rien n'est encore saisi.
          siteAddress:
            values.siteAddress.trim() === '' && action.clientAddress
              ? action.clientAddress
              : values.siteAddress,
        },
        errors: { ...errors, clientId: undefined },
      };
    case 'fieldChanged':
      return {
        ...state,
        values: { ...values, [action.field]: action.value },
        errors: { ...errors, [action.field]: undefined },
      };
    case 'lineAdded':
      return {
        ...state,
        nextKey: state.nextKey + 1,
        values: {
          ...values,
          lines: [...values.lines, createEmptyLine(`new-${state.nextKey}`, action.vatRateBp)],
        },
        errors: { ...errors, lines: undefined },
      };
    case 'lineChanged':
      return {
        ...state,
        values: {
          ...values,
          lines: values.lines.map((line) =>
            line.key === action.key ? { ...line, [action.field]: action.value } : line,
          ),
        },
        errors: { ...errors, lineErrors: clearLineError(errors, action.key, action.field) },
      };
    case 'lineUnitChanged':
      return {
        ...state,
        values: {
          ...values,
          lines: values.lines.map((line) =>
            line.key === action.key ? { ...line, unit: action.unit } : line,
          ),
        },
      };
    case 'lineVatChanged':
      return {
        ...state,
        values: {
          ...values,
          lines: values.lines.map((line) =>
            line.key === action.key ? { ...line, vatRateBp: action.vatRateBp } : line,
          ),
        },
      };
    case 'lineRemoved':
      return {
        ...state,
        values: { ...values, lines: values.lines.filter((line) => line.key !== action.key) },
      };
    case 'failed':
      return { ...state, errors: action.errors, formError: action.formError };
    default:
      return state;
  }
}

export const lineFieldId = (key: string, field: LineField | 'unit' | 'vat'): string =>
  `line-${key}-${field}`;

/** Place le curseur sur la première erreur, dans l'ordre de l'écran. */
function focusFirstError(errors: QuoteFormErrors, lines: readonly QuoteLineInput[]): void {
  const simple: [keyof QuoteFormErrors, string][] = [
    ['clientId', 'quote-client'],
    ['newClientName', 'quote-new-client-name'],
    ['newClientEmail', 'quote-new-client-email'],
    ['title', 'quote-title'],
    ['siteAddress', 'quote-site-address'],
  ];
  const firstSimple = simple.find(([field]) => errors[field]);
  if (firstSimple) {
    document.getElementById(firstSimple[1])?.focus();
    return;
  }
  const fields: LineField[] = ['designation', 'quantity', 'unitPrice'];
  const firstLine = lines.find((line) => errors.lineErrors?.[line.key]);
  const field = fields.find((name) => firstLine && errors.lineErrors?.[firstLine.key]?.[name]);
  if (firstLine && field) {
    document.getElementById(lineFieldId(firstLine.key, field))?.focus();
    return;
  }
  if (errors.lines) document.getElementById('quote-add-line')?.focus();
}

export interface UseQuoteEditorOptions {
  quoteId: string | null;
  initialValues: QuoteFormValues;
  clients: readonly ClientOption[];
  vatMode: VatMode;
  /** Appelé une fois le brouillon enregistré, quand l'artisan demande l'envoi. */
  onReadyToSend?: (quoteId: string, clientEmail: string) => void;
}

export interface UseQuoteEditor {
  values: QuoteFormValues;
  errors: QuoteFormErrors;
  formError: string | null;
  isSaving: boolean;
  totals: QuoteTotals;
  isNewClient: boolean;
  onClientChange: (event: ChangeEvent<HTMLSelectElement>) => void;
  onFieldChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onAddLine: () => void;
  onLineChange: (key: string, field: LineField, value: string) => void;
  onLineUnitChange: (key: string, unit: string) => void;
  onLineVatChange: (key: string, rate: string) => void;
  onRemoveLine: (key: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  /** Enregistre puis passe la main à la fenêtre d'envoi. */
  onSend: () => void;
}

export function useQuoteEditor({
  quoteId,
  initialValues,
  clients,
  vatMode,
  onReadyToSend,
}: UseQuoteEditorOptions): UseQuoteEditor {
  const [state, dispatch] = useReducer(editorReducer, {
    values: initialValues,
    errors: {},
    formError: null,
    nextKey: 1,
  });
  const [isSaving, startTransition] = useTransition();
  // Un nouveau devis garde son id après le premier enregistrement (pas de doublon au 2e clic).
  const [savedQuoteId, setSavedQuoteId] = useState<string | null>(quoteId);
  const router = useRouter();
  const { values } = state;
  const defaultRate: VatRateBp = vatMode === 'franchise' ? 0 : DEFAULT_VAT_RATE;

  // Totaux en direct : une saisie incomplète compte pour 0 (aucune erreur affichée pendant la frappe).
  const totals = useMemo(
    () =>
      computeTotals(
        values.lines.map((line) => ({
          quantityMilli: parseQuantityToMilli(line.quantity) ?? 0,
          unitPriceCents: parseEuroToCents(line.unitPrice) ?? 0,
          vatRateBp: vatMode === 'franchise' ? 0 : line.vatRateBp,
        })),
      ),
    [values.lines, vatMode],
  );

  const onClientChange = useCallback(
    (event: ChangeEvent<HTMLSelectElement>) => {
      const clientId = event.target.value;
      const client = clients.find((candidate) => candidate.id === clientId);
      dispatch({ type: 'clientSelected', clientId, clientAddress: client?.address ?? null });
    },
    [clients],
  );

  const onFieldChange = useCallback(
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const { name, value } = event.target;
      if (isTextField(name)) dispatch({ type: 'fieldChanged', field: name, value });
    },
    [],
  );

  const onAddLine = useCallback(() => {
    dispatch({ type: 'lineAdded', vatRateBp: defaultRate });
  }, [defaultRate]);

  const onLineChange = useCallback((key: string, field: LineField, value: string) => {
    dispatch({ type: 'lineChanged', key, field, value });
  }, []);

  const onLineUnitChange = useCallback((key: string, unit: string) => {
    if (isUnit(unit)) dispatch({ type: 'lineUnitChanged', key, unit });
  }, []);

  const onLineVatChange = useCallback((key: string, rate: string) => {
    const vatRateBp = Number(rate);
    if (isVatRate(vatRateBp)) dispatch({ type: 'lineVatChanged', key, vatRateBp });
  }, []);

  const onRemoveLine = useCallback((key: string) => {
    dispatch({ type: 'lineRemoved', key });
  }, []);

  /** Valide puis enregistre ; renvoie l'id du devis, ou null (erreurs affichées, curseur placé). */
  const persist = useCallback(async (): Promise<string | null> => {
    try {
      const result = await saveQuoteDraft({ quoteId: savedQuoteId, values });
      if (result.ok) {
        setSavedQuoteId(result.id);
        return result.id;
      }
      dispatch({ type: 'failed', errors: result.errors, formError: result.message ?? null });
      focusFirstError(result.errors, values.lines);
    } catch {
      dispatch({
        type: 'failed',
        errors: {},
        formError: 'L’enregistrement a échoué. Vérifiez votre connexion et réessayez.',
      });
    }
    return null;
  }, [savedQuoteId, values]);

  /** Validation locale immédiate (sans attendre le serveur). */
  const validateLocally = useCallback((): boolean => {
    const validation = validateQuote(values, vatMode);
    if (validation.data) return true;
    dispatch({ type: 'failed', errors: validation.errors, formError: null });
    focusFirstError(validation.errors, values.lines);
    return false;
  }, [values, vatMode]);

  const onSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!validateLocally()) return;
      startTransition(async () => {
        const id = await persist();
        if (id) router.push('/devis');
      });
    },
    [validateLocally, persist, router],
  );

  const clientEmail = useMemo(() => {
    if (values.clientId === NEW_CLIENT) return values.newClientEmail.trim();
    return clients.find((client) => client.id === values.clientId)?.email ?? '';
  }, [values.clientId, values.newClientEmail, clients]);

  const onSend = useCallback(() => {
    if (!validateLocally()) return;
    startTransition(async () => {
      const id = await persist();
      if (id) onReadyToSend?.(id, clientEmail);
    });
  }, [validateLocally, persist, onReadyToSend, clientEmail]);

  return {
    values,
    errors: state.errors,
    formError: state.formError,
    isSaving,
    totals,
    isNewClient: values.clientId === NEW_CLIENT,
    onClientChange,
    onFieldChange,
    onAddLine,
    onLineChange,
    onLineUnitChange,
    onLineVatChange,
    onRemoveLine,
    onSubmit,
    onSend,
  };
}
