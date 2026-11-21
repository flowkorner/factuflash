import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithTheme } from '@/test/renderWithTheme';
import { sampleView } from '@/test/quoteFixtures';
import { acceptPublicQuote } from '../actions/acceptPublicQuote';
import type { QuoteDocumentView } from '../document/documentView';
import { PublicQuoteScreen } from './PublicQuoteScreen';

const refresh = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));
jest.mock('../actions/acceptPublicQuote', () => ({ acceptPublicQuote: jest.fn() }));
// Le vrai panneau charge Stripe.js : remplacé ici par un témoin.
jest.mock('@/features/payments/components/DepositPanel', () => ({
  __esModule: true,
  default: ({ amountLabel }: { amountLabel: string }) => (
    <p>Formulaire Stripe pour {amountLabel}</p>
  ),
}));

const mockedAccept = jest.mocked(acceptPublicQuote);
const TOKEN = 'a'.repeat(43);
const ACCEPTANCE = { acceptedAt: '2026-11-21T13:32:00Z', acceptedByName: 'Jean Martin' };
const DEPOSIT = { percent: 30, cents: 18840, paidCents: 0, paidAt: null };

interface SetupOptions {
  view?: QuoteDocumentView;
  isExpired?: boolean;
  accepted?: boolean;
  isPaymentReturn?: boolean;
}

function setup({
  view = sampleView(),
  isExpired = false,
  accepted = false,
  isPaymentReturn = false,
}: SetupOptions = {}) {
  const user = userEvent.setup();
  renderWithTheme(
    <PublicQuoteScreen
      token={TOKEN}
      view={view}
      isExpired={isExpired}
      initialAcceptance={accepted ? ACCEPTANCE : null}
      isPaymentReturn={isPaymentReturn}
    />,
  );
  return user;
}

describe('PublicQuoteScreen', () => {
  beforeEach(() => {
    mockedAccept.mockReset();
    refresh.mockReset();
  });

  it('affiche le devis, le PDF et bloque l’accord tant que nom et case manquent', async () => {
    const user = setup();

    expect(screen.getByRole('heading', { level: 1, name: 'Plomberie Durand' })).toBeInTheDocument();
    expect(screen.getByText('Chauffe-eau 200 L')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Télécharger le devis (PDF)' })).toHaveAttribute(
      'href',
      `/d/${TOKEN}/pdf`,
    );
    const accept = screen.getByRole('button', { name: 'J’accepte le devis' });
    expect(accept).toBeDisabled();
    expect(accept).toHaveAccessibleDescription(
      'Saisissez votre nom et cochez la case pour continuer.',
    );

    await user.type(screen.getByLabelText('Votre nom et prénom'), 'Jean Martin');
    expect(accept).toBeDisabled();
    await user.click(screen.getByRole('checkbox', { name: /bon pour accord/ }));
    expect(accept).toBeEnabled();
  });

  it('confirme l’accord, avec date et heure, et y place le focus', async () => {
    mockedAccept.mockResolvedValue({ ok: true, ...ACCEPTANCE });
    const user = setup();

    await user.type(screen.getByLabelText('Votre nom et prénom'), 'Jean Martin');
    await user.click(screen.getByRole('checkbox', { name: /bon pour accord/ }));
    await user.click(screen.getByRole('button', { name: 'J’accepte le devis' }));

    expect(mockedAccept).toHaveBeenCalledWith({ token: TOKEN, name: 'Jean Martin', agreed: true });
    const confirmation = await screen.findByRole('heading', { name: 'Devis accepté, merci !' });
    expect(confirmation).toHaveFocus();
    expect(
      screen.getByText(/Accepté par Jean Martin le 21 novembre 2026 à 14:32/),
    ).toBeInTheDocument();
  });

  it('affiche l’erreur du serveur', async () => {
    mockedAccept.mockResolvedValue({
      ok: false,
      message: 'Ce devis a dépassé sa date de validité.',
    });
    const user = setup();

    await user.type(screen.getByLabelText('Votre nom et prénom'), 'Jean Martin');
    await user.click(screen.getByRole('checkbox', { name: /bon pour accord/ }));
    await user.click(screen.getByRole('button', { name: 'J’accepte le devis' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Ce devis a dépassé sa date de validité.',
    );
  });

  it('n’offre plus l’accord sur un devis expiré', () => {
    setup({ isExpired: true });

    expect(screen.getByText(/a dépassé sa date de validité/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'J’accepte le devis' })).not.toBeInTheDocument();
  });

  it('après l’accord, propose de payer l’acompte et ouvre le paiement intégré', async () => {
    const user = setup({
      accepted: true,
      view: sampleView({ status: 'accepted', ...ACCEPTANCE, deposit: DEPOSIT }),
    });

    expect(screen.getByText(/réglez l’acompte de 188,40/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Payer l’acompte' }));

    expect(await screen.findByText(/Formulaire Stripe pour 188,40/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Payer l’acompte · 188,40/ })).toHaveFocus();
    expect(screen.queryByRole('button', { name: 'Payer l’acompte' })).not.toBeInTheDocument();
  });

  it('au retour de Stripe, attend le webhook sans rien déduire de l’URL', () => {
    jest.useFakeTimers();
    setup({
      accepted: true,
      isPaymentReturn: true,
      view: sampleView({ status: 'accepted', ...ACCEPTANCE, deposit: DEPOSIT }),
    });

    expect(screen.getByText('Paiement en cours de confirmation…')).toBeInTheDocument();
    expect(screen.queryByText('Acompte payé, merci !')).not.toBeInTheDocument();
    jest.advanceTimersByTime(3000);
    expect(refresh).toHaveBeenCalledTimes(1);
    jest.useRealTimers();
  });

  it('affiche l’acompte payé une fois enregistré par le webhook', () => {
    setup({
      accepted: true,
      view: sampleView({
        status: 'deposit_paid',
        ...ACCEPTANCE,
        deposit: { ...DEPOSIT, paidCents: 18840, paidAt: '2026-11-21T13:40:00Z' },
      }),
    });

    expect(screen.getByRole('heading', { name: 'Acompte payé, merci !' })).toBeInTheDocument();
    expect(screen.getByText(/188,40 € reçus le 21 novembre 2026 à 14:40/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Payer l’acompte' })).not.toBeInTheDocument();
  });
});
