import { getSiteUrl } from '@/lib/env';
import { sendEmail } from '@/lib/email/resend';
import { formatIssueDate } from '@/features/quotes/domain/format';
import { formatCents } from '@/features/quotes/domain/money';
import type { InvoiceSnapshot } from '../document/invoiceSnapshot';
import { buildInvoiceEmail } from './invoiceEmail';

export interface InvoiceEmailRequest {
  to: string;
  token: string;
  snapshot: InvoiceSnapshot;
  dueDate: string;
  replyTo: string | null;
}

/** Envoie la facture au client (lien secret vers /f/<jeton>). Ne lève jamais : renvoie le succès. */
export async function sendInvoiceEmail({
  to,
  token,
  snapshot,
  dueDate,
  replyTo,
}: InvoiceEmailRequest): Promise<boolean> {
  try {
    const message = buildInvoiceEmail({
      kind: snapshot.kind,
      companyName: snapshot.company.name,
      clientName: snapshot.client.name,
      number: snapshot.number,
      title: snapshot.title,
      totalValue: formatCents(snapshot.totals.ttcCents),
      amountDueValue: formatCents(snapshot.amountDueCents),
      dueDateLabel: formatIssueDate(dueDate),
      link: `${getSiteUrl()}/f/${token}`,
    });
    const result = await sendEmail({
      to,
      ...message,
      fromName: `${snapshot.company.name} via FactuFlash`,
      replyTo,
    });
    return result.ok;
  } catch (error) {
    console.error('[factures] email non parti', {
      reason: error instanceof Error ? error.message : 'inconnue',
    });
    return false;
  }
}
