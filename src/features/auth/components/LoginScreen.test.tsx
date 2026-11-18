import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithTheme } from '@/test/renderWithTheme';
import { sendMagicLink } from '../services/magicLink';
import { LoginScreen } from './LoginScreen';

jest.mock('../services/magicLink', () => ({
  sendMagicLink: jest.fn(() => Promise.resolve()),
}));

const mockedSend = jest.mocked(sendMagicLink);

function setup() {
  const user = userEvent.setup();
  renderWithTheme(<LoginScreen />);
  const emailInput = screen.getByLabelText('Votre email');
  const submit = screen.getByRole('button', { name: 'Recevoir mon lien de connexion' });
  return { user, emailInput, submit };
}

describe('LoginScreen', () => {
  beforeEach(() => mockedSend.mockClear());

  it('affiche une erreur et n’envoie rien si l’email est invalide', async () => {
    const { user, emailInput, submit } = setup();

    await user.type(emailInput, 'pas-un-email');
    await user.click(submit);

    expect(screen.getByText(/ne semble pas valide/)).toBeInTheDocument();
    expect(emailInput).toHaveAttribute('aria-invalid', 'true');
    expect(mockedSend).not.toHaveBeenCalled();
  });

  it('confirme l’envoi du lien avec l’email saisi', async () => {
    const { user, emailInput } = setup();

    await user.type(emailInput, 'paul@plomberie.fr{Enter}');

    expect(await screen.findByRole('heading', { name: 'Vérifiez vos emails' })).toHaveFocus();
    expect(screen.getByText('paul@plomberie.fr')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Simuler le clic sur le lien' })).toHaveAttribute(
      'href',
      '/devis',
    );
    expect(mockedSend).toHaveBeenCalledWith('paul@plomberie.fr');
  });

  it('revient au formulaire avec « Changer d’email »', async () => {
    const { user, emailInput } = setup();

    await user.type(emailInput, 'paul@plomberie.fr{Enter}');
    await user.click(await screen.findByRole('button', { name: 'Changer d’email' }));

    expect(screen.getByLabelText('Votre email')).toHaveValue('paul@plomberie.fr');
    expect(screen.getByLabelText('Votre email')).toHaveFocus();
  });

  it('affiche une erreur si l’envoi échoue', async () => {
    mockedSend.mockRejectedValueOnce(new Error('réseau'));
    const { user, emailInput } = setup();

    await user.type(emailInput, 'paul@plomberie.fr{Enter}');

    expect(await screen.findByText(/L’envoi a échoué/)).toBeInTheDocument();
  });
});
