import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithTheme } from '@/test/renderWithTheme';
import { createFinalInvoice, markInvoicePaid } from '../actions/invoiceActions';
import type { InvoiceSummary } from '../domain/types';
import { InvoicesSection } from './InvoicesSection';

const refresh = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));
jest.mock('../actions/invoiceActions', () => ({
  createFinalInvoice: jest.fn(),
  sendInvoice: jest.fn(),
  markInvoicePaid: jest.fn(),
}));

const DEPOSIT: InvoiceSummary = {
  id: 'i1',
  kind: 'deposit',
  number: 'F-2026-001',
  issueDate: '2026-11-21',
  dueDate: '2026-11-21',
  totalTtcCents: 18840,
  amountDueCents: 0,
  paidOn: '2026-11-21',
  paymentMethod: 'card_online',
  sentAt: '2026-11-21T10:00:00Z',
  sentToEmail: 'martin@example.fr',
};
const FINAL: InvoiceSummary = {
  ...DEPOSIT,
  id: 'i2',
  kind: 'final',
  number: 'F-2026-002',
  dueDate: '2026-12-25',
  totalTtcCents: 62800,
  amountDueCents: 43960,
  paidOn: null,
  paymentMethod: null,
};

describe('InvoicesSection', () => {
  beforeEach(() => {
    jest.mocked(createFinalInvoice).mockReset();
    jest.mocked(markInvoicePaid).mockReset();
  });

  it('crée la facture de solde avec l’acompte déduit', async () => {
    jest
      .mocked(createFinalInvoice)
      .mockResolvedValue({ ok: true, number: 'F-2026-002', emailSent: true });
    const user = userEvent.setup();
    renderWithTheme(
      <InvoicesSection
        quoteId="q1"
        invoices={[DEPOSIT]}
        canCreateFinal
        totalTtcCents={62800}
        clientEmail="martin@example.fr"
      />,
    );

    expect(
      screen.getByText(/Payée le 21 nov\. 2026 \(carte bancaire en ligne\)/),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Créer la facture de solde' }));

    const dialog = screen.getByRole('dialog', { name: 'Facture de solde' });
    expect(within(dialog).getByText(/439,60/)).toBeInTheDocument();
    expect(
      within(dialog).getByText(/ne pourra plus être modifiée ni supprimée/),
    ).toBeInTheDocument();
    expect(within(dialog).getByLabelText('Email du client')).toHaveValue('martin@example.fr');
    await user.selectOptions(within(dialog).getByLabelText('Délai de paiement'), '15');
    await user.click(within(dialog).getByRole('button', { name: 'Émettre' }));

    expect(createFinalInvoice).toHaveBeenCalledWith(
      expect.objectContaining({ quoteId: 'q1', dueDays: 15, email: 'martin@example.fr' }),
    );
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Facture de solde F-2026-002 émise.',
    );
    expect(refresh).toHaveBeenCalled();
  });

  it('enregistre le solde reçu sur la facture de solde', async () => {
    jest.mocked(markInvoicePaid).mockResolvedValue({ ok: true, number: '', emailSent: false });
    const user = userEvent.setup();
    renderWithTheme(
      <InvoicesSection
        quoteId="q1"
        invoices={[DEPOSIT, FINAL]}
        canCreateFinal={false}
        totalTtcCents={62800}
        clientEmail={null}
      />,
    );

    const final = screen.getByRole('listitem', { name: 'Facture F-2026-002' });
    expect(
      within(final).getByText(/Reste 439,60 .* à payer avant le 25 déc\. 2026/),
    ).toBeInTheDocument();
    expect(within(final).getByRole('link', { name: 'PDF' })).toHaveAttribute(
      'href',
      '/factures/i2/pdf',
    );
    expect(
      screen.queryByRole('button', { name: 'Créer la facture de solde' }),
    ).not.toBeInTheDocument();

    await user.click(within(final).getByRole('button', { name: 'Solde reçu' }));
    const dialog = screen.getByRole('dialog', { name: 'Solde reçu · F-2026-002' });
    await user.selectOptions(within(dialog).getByLabelText('Moyen de paiement'), 'cheque');
    await user.click(within(dialog).getByRole('button', { name: 'Confirmer' }));

    expect(markInvoicePaid).toHaveBeenCalledWith(
      expect.objectContaining({ invoiceId: 'i2', method: 'cheque' }),
    );
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Solde reçu : la facture F-2026-002 est acquittée.',
    );
  });

  it('affiche l’erreur sur le bon champ', async () => {
    jest.mocked(createFinalInvoice).mockResolvedValue({
      ok: false,
      field: 'serviceDate',
      message: 'La date de fin des travaux doit être passée et postérieure à l’accord du client.',
    });
    const user = userEvent.setup();
    renderWithTheme(
      <InvoicesSection
        quoteId="q1"
        invoices={[]}
        canCreateFinal
        totalTtcCents={62800}
        clientEmail="martin@example.fr"
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Créer la facture de solde' }));
    await user.click(screen.getByRole('button', { name: 'Émettre' }));

    expect(await screen.findByLabelText('Date de fin des travaux')).toHaveAccessibleDescription(
      /doit être passée/,
    );
  });
});
