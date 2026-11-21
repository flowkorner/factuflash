import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithTheme } from '@/test/renderWithTheme';
import type { VatMode } from '@/features/company/domain/types';
import { saveQuoteDraft } from '../actions/saveQuoteDraft';
import { sendQuote } from '../actions/sendQuote';
import { newQuoteValues } from '../domain/newQuote';
import type { ClientOption } from '../domain/types';
import { QuoteEditorScreen } from './QuoteEditorScreen';

const push = jest.fn();
const replace = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ push, replace, refresh: jest.fn() }) }));
jest.mock('../actions/saveQuoteDraft', () => ({ saveQuoteDraft: jest.fn() }));
jest.mock('../actions/deleteQuoteDraft', () => ({ deleteQuoteDraft: jest.fn() }));
jest.mock('../actions/sendQuote', () => ({ sendQuote: jest.fn() }));

const mockedSave = jest.mocked(saveQuoteDraft);
const mockedSend = jest.mocked(sendQuote);
const CLIENTS: ClientOption[] = [
  { id: 'c1', name: 'Mme Lefèvre', email: null, address: '8 avenue Foch, 69006 Lyon' },
];

function setup(vatMode: VatMode = 'subject', clients: ClientOption[] = []) {
  const user = userEvent.setup();
  renderWithTheme(
    <QuoteEditorScreen
      quoteId={null}
      number={null}
      initialValues={newQuoteValues(clients, vatMode)}
      clients={clients}
      company={{ name: 'Plomberie Durand', siret: '81234567800013', vatMode }}
    />,
  );
  return user;
}

const totals = () => screen.getByRole('status', { name: 'Totaux du devis' });

describe('QuoteEditorScreen', () => {
  beforeEach(() => {
    mockedSave.mockReset();
    mockedSend.mockReset();
    push.mockReset();
    replace.mockReset();
  });

  it('calcule HT, TVA par taux et TTC pendant la saisie', async () => {
    const user = setup();

    await user.type(screen.getByLabelText('Désignation'), 'Chauffe-eau 200 L');
    await user.type(screen.getByLabelText('Prix unit. HT (€)'), '420');
    await user.selectOptions(screen.getByLabelText('TVA'), '1000');
    await user.click(screen.getByRole('button', { name: 'Ajouter une ligne' }));
    const second = screen.getByRole('article', { name: 'Ligne 2' });
    await user.type(within(second).getByLabelText('Désignation'), 'Pose');
    await user.clear(within(second).getByLabelText('Quantité'));
    await user.type(within(second).getByLabelText('Quantité'), '2,5');
    await user.type(within(second).getByLabelText('Prix unit. HT (€)'), '55,33');

    const box = totals();
    expect(within(box).getByText('Total HT').nextSibling).toHaveTextContent('558,33');
    expect(within(box).getByText('TVA 20 %').nextSibling).toHaveTextContent('27,67');
    expect(within(box).getByText('TVA 10 %').nextSibling).toHaveTextContent('42,00');
    expect(box).toHaveTextContent(/628,00/);
  });

  it('cache la TVA et l’indique dans les mentions en franchise', () => {
    setup('franchise');

    expect(screen.queryByLabelText('TVA')).not.toBeInTheDocument();
    expect(screen.getByText('TVA non applicable, art. 293 B du CGI.')).toBeInTheDocument();
    expect(totals()).toHaveTextContent('Total à payer');
  });

  it('signale les champs manquants et place le curseur sur le premier', async () => {
    const user = setup();

    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

    expect(screen.getByText('Indiquez le nom du client.')).toBeInTheDocument();
    expect(screen.getByText('Décrivez la prestation.')).toBeInTheDocument();
    expect(screen.getByLabelText('Nom du client')).toHaveFocus();
    expect(mockedSave).not.toHaveBeenCalled();
  });

  it('reprend l’adresse d’un client existant pour le chantier', async () => {
    const user = setup('subject', CLIENTS);

    await user.selectOptions(screen.getByLabelText('Client'), 'c1');

    expect(screen.getByLabelText('Adresse du chantier')).toHaveValue('8 avenue Foch, 69006 Lyon');
    expect(screen.queryByLabelText('Nom du client')).not.toBeInTheDocument();
  });

  it('enregistre le brouillon puis revient à Mes devis', async () => {
    mockedSave.mockResolvedValue({ ok: true, id: 'q1' });
    const user = setup();

    await user.type(screen.getByLabelText('Nom du client'), 'M. Martin');
    await user.type(screen.getByLabelText('Objet du devis'), 'Remplacement chauffe-eau');
    await user.type(screen.getByLabelText('Adresse du chantier'), '3 rue des Lilas, 69003 Lyon');
    await user.type(screen.getByLabelText('Désignation'), 'Chauffe-eau 200 L');
    await user.type(screen.getByLabelText('Prix unit. HT (€)'), '420');
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

    expect(mockedSave).toHaveBeenCalledWith(
      expect.objectContaining({
        quoteId: null,
        values: expect.objectContaining({
          newClientName: 'M. Martin',
          title: 'Remplacement chauffe-eau',
        }),
      }),
    );
    expect(push).toHaveBeenCalledWith('/devis');
  });

  it('ne propose la suppression du brouillon qu’une fois enregistré', () => {
    setup();
    expect(
      screen.queryByRole('button', { name: 'Supprimer ce brouillon' }),
    ).not.toBeInTheDocument();
  });

  it('propose la suppression sur un brouillon existant', () => {
    renderWithTheme(
      <QuoteEditorScreen
        quoteId="6f1c2c1e-9d7a-4c8e-8a51-3f2d9c0b7a11"
        number="D-2026-001"
        initialValues={newQuoteValues([], 'subject')}
        clients={[]}
        company={{ name: 'Plomberie Durand', siret: '81234567800013', vatMode: 'subject' }}
      />,
    );
    expect(screen.getByRole('button', { name: 'Supprimer ce brouillon' })).toBeInTheDocument();
  });

  it('enregistre, demande l’email puis envoie le devis', async () => {
    mockedSave.mockResolvedValue({ ok: true, id: 'q1' });
    mockedSend.mockResolvedValue({ ok: true, sentTo: 'martin@example.fr' });
    const user = setup();

    await user.type(screen.getByLabelText('Nom du client'), 'M. Martin');
    await user.type(screen.getByLabelText('Email du client (facultatif)'), 'martin@example.fr');
    await user.type(screen.getByLabelText('Objet du devis'), 'Remplacement chauffe-eau');
    await user.type(screen.getByLabelText('Adresse du chantier'), '3 rue des Lilas, 69003 Lyon');
    await user.type(screen.getByLabelText('Désignation'), 'Chauffe-eau 200 L');
    await user.type(screen.getByLabelText('Prix unit. HT (€)'), '420');
    await user.click(screen.getByRole('button', { name: 'Envoyer au client' }));

    const dialog = await screen.findByRole('dialog', { name: 'Envoyer le devis à M. Martin' });
    expect(mockedSave).toHaveBeenCalledTimes(1);
    expect(within(dialog).getByLabelText('Email du client')).toHaveValue('martin@example.fr');
    expect(
      within(dialog).getByText('Une fois envoyé, ce devis ne pourra plus être modifié.'),
    ).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: 'Envoyer' }));

    expect(mockedSend).toHaveBeenCalledWith({
      quoteId: 'q1',
      email: 'martin@example.fr',
      depositPercent: 30,
    });
    expect(replace).toHaveBeenCalledWith('/devis/q1?envoye=1');
    expect(push).not.toHaveBeenCalled();
  });

  it('n’ouvre pas l’envoi si le devis est incomplet', async () => {
    const user = setup();

    await user.click(screen.getByRole('button', { name: 'Envoyer au client' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(mockedSave).not.toHaveBeenCalled();
  });

  it('supprime une ligne mais en garde toujours une', async () => {
    const user = setup();

    expect(screen.queryByRole('button', { name: /Supprimer la ligne/ })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Ajouter une ligne' }));
    await user.click(screen.getByRole('button', { name: 'Supprimer la ligne : ligne 2' }));

    expect(screen.getAllByRole('article')).toHaveLength(1);
  });
});
