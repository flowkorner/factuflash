import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithTheme } from '@/test/renderWithTheme';
import { deleteQuoteDraft } from '../actions/deleteQuoteDraft';
import { DeleteQuoteDraftButton } from './DeleteQuoteDraftButton';

const refresh = jest.fn();
const replace = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ refresh, replace }) }));
jest.mock('../actions/deleteQuoteDraft', () => ({ deleteQuoteDraft: jest.fn() }));

const mockedDelete = jest.mocked(deleteQuoteDraft);
const ID = '6f1c2c1e-9d7a-4c8e-8a51-3f2d9c0b7a11';

function setup(redirectTo?: string) {
  const user = userEvent.setup();
  renderWithTheme(
    <DeleteQuoteDraftButton
      quoteId={ID}
      number="D-2026-001"
      variant="icon"
      redirectTo={redirectTo}
    />,
  );
  const trigger = screen.getByRole('button', { name: 'Supprimer le brouillon D-2026-001' });
  return { user, trigger };
}

describe('DeleteQuoteDraftButton', () => {
  beforeEach(() => {
    mockedDelete.mockReset();
    refresh.mockReset();
    replace.mockReset();
  });

  it('ouvre une confirmation accessible, focus sur « Annuler »', async () => {
    const { user, trigger } = setup();

    await user.click(trigger);

    const dialog = screen.getByRole('alertdialog', { name: 'Supprimer le brouillon D-2026-001 ?' });
    expect(dialog).toHaveAccessibleDescription(/supprimés définitivement/);
    expect(screen.getByRole('button', { name: 'Annuler' })).toHaveFocus();
  });

  it('« Annuler » ne supprime rien et rend le focus au bouton', async () => {
    const { user, trigger } = setup();

    await user.click(trigger);
    await user.click(screen.getByRole('button', { name: 'Annuler' }));

    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
    expect(mockedDelete).not.toHaveBeenCalled();
  });

  it('supprime puis rafraîchit la liste', async () => {
    mockedDelete.mockResolvedValue({ ok: true });
    const { user, trigger } = setup();

    await user.click(trigger);
    await user.click(screen.getByRole('button', { name: 'Supprimer' }));

    expect(mockedDelete).toHaveBeenCalledWith(ID);
    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(replace).not.toHaveBeenCalled();
  });

  it('quitte l’écran du devis après suppression', async () => {
    mockedDelete.mockResolvedValue({ ok: true });
    const { user, trigger } = setup('/devis');

    await user.click(trigger);
    await user.click(screen.getByRole('button', { name: 'Supprimer' }));

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/devis'));
  });

  it('affiche l’erreur dans la fenêtre et la garde ouverte', async () => {
    mockedDelete.mockResolvedValue({
      ok: false,
      message: 'Ce devis n’existe plus ou n’est plus un brouillon.',
    });
    const { user, trigger } = setup();

    await user.click(trigger);
    await user.click(screen.getByRole('button', { name: 'Supprimer' }));

    expect(await screen.findByText(/n’est plus un brouillon/)).toBeInTheDocument();
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(refresh).not.toHaveBeenCalled();
  });
});
