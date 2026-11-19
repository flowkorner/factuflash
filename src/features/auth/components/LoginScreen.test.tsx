import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithTheme } from '@/test/renderWithTheme';
import { requestMagicLink } from '../actions/requestMagicLink';
import { INVALID_LINK_MESSAGE, LoginScreen } from './LoginScreen';

jest.mock('../actions/requestMagicLink', () => ({
  requestMagicLink: jest.fn(),
}));

const mockedRequest = jest.mocked(requestMagicLink);

function setup(props: { invalidLink?: boolean } = {}) {
  const user = userEvent.setup();
  renderWithTheme(<LoginScreen {...props} />);
  const emailInput = screen.getByLabelText('Votre email');
  const submit = screen.getByRole('button', { name: 'Recevoir mon lien de connexion' });
  return { user, emailInput, submit };
}

describe('LoginScreen', () => {
  beforeEach(() => {
    mockedRequest.mockReset();
    mockedRequest.mockResolvedValue({ ok: true });
  });

  it('affiche une erreur et n’envoie rien si l’email est invalide', async () => {
    const { user, emailInput, submit } = setup();

    await user.type(emailInput, 'pas-un-email');
    await user.click(submit);

    expect(screen.getByText(/ne semble pas valide/)).toBeInTheDocument();
    expect(emailInput).toHaveAttribute('aria-invalid', 'true');
    expect(mockedRequest).not.toHaveBeenCalled();
  });

  it('confirme l’envoi du lien et bloque le renvoi pendant 60 s', async () => {
    const { user, emailInput } = setup();

    await user.type(emailInput, 'paul@plomberie.fr{Enter}');

    expect(await screen.findByRole('heading', { name: 'Vérifiez vos emails' })).toHaveFocus();
    expect(screen.getByText('paul@plomberie.fr')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Renvoyer (60 s)' })).toBeDisabled();
    expect(mockedRequest).toHaveBeenCalledWith('paul@plomberie.fr');
  });

  it('revient au formulaire avec « Changer d’email »', async () => {
    const { user, emailInput } = setup();

    await user.type(emailInput, 'paul@plomberie.fr{Enter}');
    await user.click(await screen.findByRole('button', { name: 'Changer d’email' }));

    expect(screen.getByLabelText('Votre email')).toHaveValue('paul@plomberie.fr');
    expect(screen.getByLabelText('Votre email')).toHaveFocus();
  });

  it('explique quand Supabase limite les envois', async () => {
    mockedRequest.mockResolvedValueOnce({ ok: false, reason: 'rate_limited' });
    const { user, emailInput } = setup();

    await user.type(emailInput, 'paul@plomberie.fr{Enter}');

    expect(await screen.findByText(/Trop de demandes/)).toBeInTheDocument();
  });

  it('affiche une erreur si l’appel échoue', async () => {
    mockedRequest.mockRejectedValueOnce(new Error('réseau'));
    const { user, emailInput } = setup();

    await user.type(emailInput, 'paul@plomberie.fr{Enter}');

    expect(await screen.findByText(/L’envoi a échoué/)).toBeInTheDocument();
  });

  it('prévient quand le lien reçu a expiré', () => {
    setup({ invalidLink: true });

    expect(screen.getByText(INVALID_LINK_MESSAGE)).toBeInTheDocument();
  });
});
