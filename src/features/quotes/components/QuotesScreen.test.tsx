import { screen } from '@testing-library/react';
import { renderWithTheme } from '@/test/renderWithTheme';
import { QuotesScreen } from './QuotesScreen';

jest.mock('@/features/auth/actions/signOut', () => ({ signOut: jest.fn() }));

describe('QuotesScreen (vide)', () => {
  it('affiche l’état vide et la déconnexion', () => {
    renderWithTheme(<QuotesScreen hasCompany />);

    expect(screen.getByRole('heading', { level: 1, name: 'Mes devis' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Aucun devis pour l’instant' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Se déconnecter' })).toBeInTheDocument();
    expect(screen.queryByText('Complétez votre entreprise')).not.toBeInTheDocument();
  });

  it('mène à Mon entreprise et garde « Nouveau devis » désactivé (bientôt)', () => {
    renderWithTheme(<QuotesScreen hasCompany />);

    expect(screen.getByRole('link', { name: 'Mon entreprise' })).toHaveAttribute(
      'href',
      '/entreprise',
    );
    expect(screen.getByRole('button', { name: /Nouveau devis.*bientôt/ })).toBeDisabled();
  });

  it('invite à compléter l’entreprise tant qu’elle est vide', () => {
    renderWithTheme(<QuotesScreen hasCompany={false} />);

    expect(screen.getByRole('link', { name: 'Remplir Mon entreprise' })).toHaveAttribute(
      'href',
      '/entreprise',
    );
  });
});
