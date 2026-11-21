import { act, screen } from '@testing-library/react';
import { renderWithTheme } from '@/test/renderWithTheme';
import {
  CONFIRMATION_DEADLINE_MS,
  CONFIRMATION_INTERVAL_MS,
} from '@/features/payments/hooks/usePaymentConfirmation';
import { PublicQuoteUnavailable } from './PublicQuoteUnavailable';

const refresh = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));

describe('PublicQuoteUnavailable', () => {
  afterEach(() => jest.useRealTimers());

  it('au retour de paiement, reste sur « confirmation en cours » puis explique au bout du délai', () => {
    jest.useFakeTimers();
    renderWithTheme(<PublicQuoteUnavailable isPaymentReturn />);

    expect(
      screen.getByRole('heading', { name: 'Paiement en cours de confirmation…' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Ne payez pas une seconde fois/)).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();

    act(() => jest.advanceTimersByTime(CONFIRMATION_DEADLINE_MS + CONFIRMATION_INTERVAL_MS));
    expect(
      screen.getByRole('heading', { name: 'Confirmation plus longue que prévu' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Vérifier à nouveau' })).toBeInTheDocument();
  });

  it('hors paiement, propose de réessayer', () => {
    renderWithTheme(<PublicQuoteUnavailable isPaymentReturn={false} document="facture" />);
    expect(
      screen.getByRole('heading', { name: 'Facture momentanément indisponible' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Réessayer' })).toBeInTheDocument();
  });
});
