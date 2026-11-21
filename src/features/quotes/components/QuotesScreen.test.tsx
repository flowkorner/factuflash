import { screen, within } from '@testing-library/react';
import { renderWithTheme } from '@/test/renderWithTheme';
import type { QuoteSummary } from '../domain/types';
import { QuotesScreen } from './QuotesScreen';

jest.mock('@/features/auth/actions/signOut', () => ({ signOut: jest.fn() }));
jest.mock('../actions/deleteQuoteDraft', () => ({ deleteQuoteDraft: jest.fn() }));
jest.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: jest.fn(), replace: jest.fn() }),
}));

const QUOTE: QuoteSummary = {
  id: '6f1c2c1e-9d7a-4c8e-8a51-3f2d9c0b7a11',
  number: 'D-2026-001',
  status: 'draft',
  title: 'Remplacement chauffe-eau 200 L',
  issueDate: '2026-11-19',
  clientName: 'M. Martin',
  totalTtcCents: 62800,
  depositPaidCents: 0,
};

describe('QuotesScreen', () => {
  it('affiche l’état vide, la déconnexion et le bouton Nouveau devis actif', () => {
    renderWithTheme(<QuotesScreen hasCompany quotes={[]} />);

    expect(screen.getByRole('heading', { level: 1, name: 'Mes devis' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Aucun devis pour l’instant' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Se déconnecter' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Nouveau devis' })).toHaveAttribute(
      'href',
      '/devis/nouveau',
    );
    expect(screen.getByRole('link', { name: 'Mon entreprise' })).toHaveAttribute(
      'href',
      '/entreprise',
    );
  });

  it('liste les devis avec client, statut, numéro et montant TTC', () => {
    renderWithTheme(<QuotesScreen hasCompany quotes={[QUOTE]} />);

    expect(screen.getByText('1 devis')).toBeInTheDocument();
    const list = screen.getByRole('list', { name: 'Mes devis' });
    const card = within(list).getByRole('link', { name: /D-2026-001/ });
    expect(card).toHaveAttribute('href', `/devis/${QUOTE.id}`);
    expect(within(card).getByText('Brouillon')).toBeInTheDocument();
    expect(within(card).getByText(/628,00/)).toBeInTheDocument();
    expect(screen.queryByText('Aucun devis pour l’instant')).not.toBeInTheDocument();
  });

  it('affiche le badge « Acompte payé » et le montant reçu', () => {
    renderWithTheme(
      <QuotesScreen
        hasCompany
        quotes={[{ ...QUOTE, status: 'deposit_paid', depositPaidCents: 18840 }]}
      />,
    );

    const card = screen.getByRole('link', { name: /D-2026-001/ });
    expect(within(card).getByText('Acompte payé')).toBeInTheDocument();
    expect(within(card).getByText(/Acompte reçu : 188,40/)).toBeInTheDocument();
  });

  it('propose la suppression pour un brouillon seulement, hors du lien de la carte', () => {
    renderWithTheme(
      <QuotesScreen
        hasCompany
        quotes={[QUOTE, { ...QUOTE, id: 'b2', number: 'D-2026-002', status: 'sent' }]}
      />,
    );

    const remove = screen.getByRole('button', { name: 'Supprimer le brouillon D-2026-001' });
    expect(remove.closest('a')).toBeNull();
    expect(
      screen.queryByRole('button', { name: 'Supprimer le brouillon D-2026-002' }),
    ).not.toBeInTheDocument();
  });

  it('invite à compléter l’entreprise tant qu’elle est vide', () => {
    renderWithTheme(<QuotesScreen hasCompany={false} quotes={[]} />);

    expect(screen.getByRole('link', { name: 'Remplir Mon entreprise' })).toHaveAttribute(
      'href',
      '/entreprise',
    );
  });
});
