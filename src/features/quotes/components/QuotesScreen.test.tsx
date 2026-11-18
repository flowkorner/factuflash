import { screen } from '@testing-library/react';
import { renderWithTheme } from '@/test/renderWithTheme';
import { QuotesScreen } from './QuotesScreen';

describe('QuotesScreen (vide)', () => {
  it('affiche l’état vide', () => {
    renderWithTheme(<QuotesScreen />);

    expect(screen.getByRole('heading', { level: 1, name: 'Mes devis' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Aucun devis pour l’instant' })).toBeInTheDocument();
  });

  it('montre « Nouveau devis » et « Mon entreprise » désactivés (bientôt)', () => {
    renderWithTheme(<QuotesScreen />);

    expect(screen.getByRole('button', { name: /Nouveau devis.*bientôt/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Mon entreprise.*bientôt/ })).toBeDisabled();
  });
});
