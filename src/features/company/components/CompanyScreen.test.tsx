import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithTheme } from '@/test/renderWithTheme';
import { saveCompany } from '../actions/saveCompany';
import type { CompanyFormValues } from '../domain/types';
import { CompanyScreen } from './CompanyScreen';

const push = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
jest.mock('../actions/saveCompany', () => ({ saveCompany: jest.fn() }));

const mockedSave = jest.mocked(saveCompany);
const EMPTY: CompanyFormValues = { name: '', siret: '', address: '', phone: '', vatMode: '' };

function setup(initialValues: CompanyFormValues = EMPTY) {
  const user = userEvent.setup();
  renderWithTheme(
    <CompanyScreen initialValues={initialValues} initialLogoUrl={null} isFirstTime />,
  );
  const save = screen.getByRole('button', { name: 'Enregistrer' });
  return { user, save };
}

async function fillValidForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Nom de l’entreprise'), 'Plomberie Durand');
  await user.type(screen.getByLabelText('SIRET'), '812 345 678 00013');
  await user.type(screen.getByLabelText('Adresse'), '12 rue des Lilas, 69003 Lyon');
  await user.type(screen.getByLabelText('Téléphone'), '06 12 34 56 78');
  await user.click(screen.getByRole('radio', { name: /Je facture la TVA/ }));
}

describe('CompanyScreen', () => {
  beforeEach(() => {
    mockedSave.mockReset();
    push.mockReset();
  });

  it('signale les champs manquants, place le curseur sur le premier et n’enregistre rien', async () => {
    const { user, save } = setup();

    await user.click(save);

    expect(screen.getByText('Indiquez le nom de votre entreprise.')).toBeInTheDocument();
    expect(screen.getByText('Choisissez votre situation de TVA.')).toBeInTheDocument();
    expect(screen.getByLabelText('Nom de l’entreprise')).toHaveFocus();
    expect(mockedSave).not.toHaveBeenCalled();
  });

  it('refuse un SIRET avec une faute de frappe', async () => {
    const { user, save } = setup();

    await user.type(screen.getByLabelText('SIRET'), '81234567800014');
    await user.click(save);

    expect(screen.getByText(/Ce SIRET n’existe pas/)).toBeInTheDocument();
  });

  it('affiche le numéro de TVA déduit du SIRET', async () => {
    const { user } = setup();

    await fillValidForm(user);

    expect(screen.getByText(/FR25812345678/)).toBeInTheDocument();
  });

  it('enregistre puis revient à Mes devis', async () => {
    mockedSave.mockResolvedValue({ ok: true });
    const { user, save } = setup();

    await fillValidForm(user);
    await user.click(save);

    expect(mockedSave).toHaveBeenCalledTimes(1);
    const sent = mockedSave.mock.calls[0]?.[0];
    expect(sent?.get('name')).toBe('Plomberie Durand');
    expect(sent?.get('vatMode')).toBe('subject');
    expect(push).toHaveBeenCalledWith('/devis');
  });

  it('affiche l’erreur renvoyée par le serveur', async () => {
    mockedSave.mockResolvedValue({ ok: false, errors: {}, message: 'Votre session a expiré.' });
    const { user, save } = setup();

    await fillValidForm(user);
    await user.click(save);

    expect(await screen.findByRole('alert')).toHaveTextContent('Votre session a expiré.');
    expect(push).not.toHaveBeenCalled();
  });

  it('refuse un logo SVG', async () => {
    const user = userEvent.setup({ applyAccept: false });
    renderWithTheme(<CompanyScreen initialValues={EMPTY} initialLogoUrl={null} isFirstTime />);
    const section = screen.getByRole('region', { name: /Logo/ });

    await user.upload(
      within(section).getByLabelText('Choisir une image'),
      new File(['<svg/>'], 'logo.svg', { type: 'image/svg+xml' }),
    );

    expect(screen.getByText('Format accepté : PNG, JPG ou WebP.')).toBeInTheDocument();
  });
});
