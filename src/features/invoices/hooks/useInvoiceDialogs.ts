'use client';

import { useCallback, useState, useTransition } from 'react';
import type { ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import { createFinalInvoice, markInvoicePaid, sendInvoice } from '../actions/invoiceActions';
import type { InvoiceActionResult } from '../actions/invoiceActions';
import { todayIso } from '../domain/dates';
import { DEFAULT_DUE_DAYS } from '../domain/types';

export type InvoiceDialog =
  | { type: 'none' }
  | { type: 'create' }
  | { type: 'send'; invoiceId: string; number: string }
  | { type: 'paid'; invoiceId: string; number: string };

export interface InvoiceForm {
  serviceDate: string;
  dueDays: string;
  email: string;
  paidOn: string;
  method: string;
}

export interface UseInvoiceDialogs {
  dialog: InvoiceDialog;
  form: InvoiceForm;
  fieldError: { field: string; message: string } | null;
  error: string | null;
  notice: string | null;
  isPending: boolean;
  openCreate: () => void;
  openSend: (invoiceId: string, number: string, email: string | null) => void;
  openPaid: (invoiceId: string, number: string) => void;
  close: () => void;
  onChange: (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  confirm: () => void;
}

const FIELDS: readonly string[] = ['serviceDate', 'dueDays', 'email', 'paidOn', 'method'];

function isField(name: string): name is keyof InvoiceForm {
  return FIELDS.includes(name);
}

/** Fenêtres « facture de solde », « envoyer » et « solde reçu » de l'écran du devis. */
export function useInvoiceDialogs(quoteId: string, clientEmail: string | null): UseInvoiceDialogs {
  const router = useRouter();
  const [dialog, setDialog] = useState<InvoiceDialog>({ type: 'none' });
  const [form, setForm] = useState<InvoiceForm>({
    serviceDate: todayIso(),
    dueDays: String(DEFAULT_DUE_DAYS),
    email: clientEmail ?? '',
    paidOn: todayIso(),
    method: 'transfer',
  });
  const [fieldError, setFieldError] = useState<{ field: string; message: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const reset = useCallback(() => {
    setFieldError(null);
    setError(null);
  }, []);

  const openCreate = useCallback(() => {
    reset();
    setDialog({ type: 'create' });
  }, [reset]);

  const openSend = useCallback(
    (invoiceId: string, number: string, email: string | null) => {
      reset();
      if (email) setForm((previous) => ({ ...previous, email }));
      setDialog({ type: 'send', invoiceId, number });
    },
    [reset],
  );

  const openPaid = useCallback(
    (invoiceId: string, number: string) => {
      reset();
      setDialog({ type: 'paid', invoiceId, number });
    },
    [reset],
  );

  const close = useCallback(() => {
    if (!isPending) setDialog({ type: 'none' });
  }, [isPending]);

  const onChange = useCallback((event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    if (isField(name)) setForm((previous) => ({ ...previous, [name]: value }));
    setFieldError(null);
  }, []);

  /** `sendsEmail` : l'action envoie un email ; s'il n'est pas parti, on le signale. */
  const handle = useCallback(
    (result: InvoiceActionResult, success: string, sendsEmail: boolean) => {
      if (result.ok) {
        setDialog({ type: 'none' });
        const emailWarning =
          sendsEmail && !result.emailSent
            ? ' L’email n’est pas parti : utilisez « Envoyer » pour réessayer.'
            : '';
        setNotice(success + emailWarning);
        router.refresh();
        return;
      }
      if (result.field) setFieldError({ field: result.field, message: result.message });
      else setError(result.message);
    },
    [router],
  );

  const confirm = useCallback(() => {
    const current = dialog;
    startTransition(async () => {
      try {
        if (current.type === 'create') {
          const result = await createFinalInvoice({
            quoteId,
            serviceDate: form.serviceDate,
            dueDays: Number(form.dueDays),
            email: form.email,
          });
          handle(result, `Facture de solde ${result.ok ? result.number : ''} émise.`, true);
        } else if (current.type === 'send') {
          const result = await sendInvoice({ invoiceId: current.invoiceId, email: form.email });
          handle(result, `Facture ${current.number} envoyée à ${form.email.trim()}.`, true);
        } else if (current.type === 'paid') {
          const result = await markInvoicePaid({
            invoiceId: current.invoiceId,
            paidOn: form.paidOn,
            method: form.method,
          });
          handle(result, `Solde reçu : la facture ${current.number} est acquittée.`, false);
        }
      } catch {
        setError('L’opération a échoué. Vérifiez votre connexion et réessayez.');
      }
    });
  }, [dialog, form, quoteId, handle]);

  return {
    dialog,
    form,
    fieldError,
    error,
    notice,
    isPending,
    openCreate,
    openSend,
    openPaid,
    close,
    onChange,
    confirm,
  };
}
