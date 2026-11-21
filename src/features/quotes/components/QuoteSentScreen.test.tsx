import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithTheme } from '@/test/renderWithTheme';
import { sampleView } from '@/test/quoteFixtures';
import { sendQuote } from '../actions/sendQuote';
import type { ArtisanQuoteDocument } from '../document/quoteDocuments';
import { QuoteSentScreen } from './QuoteSentScreen';

const replace = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ replace, refresh: jest.fn() }) }));
jest.mock('../actions/sendQuote', () => ({ sendQuote: jest.fn() }));

function doc(overrides: Partial<ArtisanQuoteDocument> = {}): ArtisanQuoteDocument {
  return {
    id: 'q1',
    number: 'D-2026-001',
    status: 'sent',
    sentAt: '2026-11-20T10:00:00Z',
    lastSentAt: '2026-11-20T10:00:00Z',
    sentToEmail: 'martin@example.fr',
    clientEmail: 'martin@example.fr',
    view: sampleView(),
    ...overrides,
  };
}

describe('QuoteSentScreen', () => {
  it('montre un devis envoyé, non modifiable, avec PDF et renvoi', async () => {
    jest.mocked(sendQuote).mockResolvedValue({ ok: true, sentTo: 'martin@example.fr' });
    const user = userEvent.setup();
    renderWithTheme(<QuoteSentScreen document={doc()} notice="sent" />);

    expect(screen.getByText('Envoyé · non modifiable')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Devis envoyé à martin@example.fr');
    expect(screen.getByRole('link', { name: 'PDF' })).toHaveAttribute('href', '/devis/q1/pdf');

    await user.click(screen.getByRole('button', { name: 'Renvoyer l’email' }));
    const dialog = screen.getByRole('dialog', { name: 'Renvoyer l’email à M. Martin' });
    expect(within(dialog).getByText(/l’ancien ne fonctionnera plus/)).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Envoyer' }));
    expect(sendQuote).toHaveBeenCalledWith({
      quoteId: 'q1',
      email: 'martin@example.fr',
      depositPercent: 30,
    });
  });

  it('montre l’accord du client et ne propose plus de renvoi', () => {
    renderWithTheme(
      <QuoteSentScreen
        document={doc({
          status: 'accepted',
          view: sampleView({
            status: 'accepted',
            acceptedAt: '2026-11-21T13:32:00Z',
            acceptedByName: 'Jean Martin',
          }),
        })}
        notice={null}
      />,
    );

    expect(screen.getByText('Accepté par le client')).toBeInTheDocument();
    expect(screen.getByText('Jean Martin, le 21 novembre 2026 à 14:32.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Renvoyer l’email' })).not.toBeInTheDocument();
  });
});
