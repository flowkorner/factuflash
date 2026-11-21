import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithTheme } from '@/test/renderWithTheme';
import { startDepositCheckout } from '../actions/startDepositCheckout';
import DepositPanel from './DepositPanel';

jest.mock('@/lib/env', () => ({ getStripePublishableKey: () => 'pk_test_factice' }));
jest.mock('@stripe/stripe-js', () => ({ loadStripe: jest.fn(() => Promise.resolve(null)) }));
jest.mock('@stripe/react-stripe-js/checkout', () => ({
  CheckoutElementsProvider: ({
    children,
    options,
  }: {
    children: React.ReactNode;
    options: { clientSecret: string };
  }) => (
    <div data-testid="stripe-provider" data-secret={options.clientSecret}>
      {children}
    </div>
  ),
}));
jest.mock('./DepositPaymentForm', () => ({
  DepositPaymentForm: ({ amountLabel }: { amountLabel: string }) => (
    <p>Formulaire carte {amountLabel}</p>
  ),
}));
jest.mock('../actions/startDepositCheckout', () => ({ startDepositCheckout: jest.fn() }));
const mockedStart = jest.mocked(startDepositCheckout);

describe('DepositPanel', () => {
  beforeEach(() => mockedStart.mockReset());

  it('crée la session puis affiche le formulaire Stripe avec son clientSecret', async () => {
    mockedStart.mockResolvedValue({ ok: true, clientSecret: 'cs_test_1_secret' });
    renderWithTheme(<DepositPanel token={'a'.repeat(43)} amountLabel="188,40 €" />);

    expect(screen.getByRole('status')).toHaveTextContent('Préparation du paiement…');
    expect(await screen.findByText('Formulaire carte 188,40 €')).toBeInTheDocument();
    expect(screen.getByTestId('stripe-provider')).toHaveAttribute(
      'data-secret',
      'cs_test_1_secret',
    );
  });

  it('permet de réessayer si Stripe ne répond pas', async () => {
    mockedStart.mockResolvedValueOnce({ ok: false, message: 'Le paiement n’a pas pu démarrer.' });
    mockedStart.mockResolvedValueOnce({ ok: true, clientSecret: 'cs_test_2_secret' });
    const user = userEvent.setup();
    renderWithTheme(<DepositPanel token={'a'.repeat(43)} amountLabel="188,40 €" />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Le paiement n’a pas pu démarrer.');
    await user.click(screen.getByRole('button', { name: 'Réessayer' }));

    expect(await screen.findByText('Formulaire carte 188,40 €')).toBeInTheDocument();
    expect(mockedStart).toHaveBeenCalledTimes(2);
  });
});
