import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithTheme } from '@/test/renderWithTheme';
import { sampleView } from '@/test/quoteFixtures';
import { acceptPublicQuote } from '../actions/acceptPublicQuote';
import { PublicQuoteScreen } from './PublicQuoteScreen';

jest.mock('../actions/acceptPublicQuote', () => ({ acceptPublicQuote: jest.fn() }));
const mockedAccept = jest.mocked(acceptPublicQuote);
const TOKEN = 'a'.repeat(43);

function setup(props: { isExpired?: boolean } = {}) {
  const user = userEvent.setup();
  renderWithTheme(
    <PublicQuoteScreen
      token={TOKEN}
      view={sampleView()}
      isExpired={props.isExpired ?? false}
      initialAcceptance={null}
    />,
  );
  return user;
}

describe('PublicQuoteScreen', () => {
  beforeEach(() => mockedAccept.mockReset());

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
    mockedAccept.mockResolvedValue({
      ok: true,
      acceptedAt: '2026-11-21T13:32:00Z',
      acceptedByName: 'Jean Martin',
    });
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
    expect(screen.queryByRole('button', { name: 'J’accepte le devis' })).not.toBeInTheDocument();
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
});
