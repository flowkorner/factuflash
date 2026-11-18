import type { Metadata } from 'next';
import { QuotesScreen } from '@/features/quotes/components/QuotesScreen';

export const metadata: Metadata = {
  title: 'Mes devis',
  robots: { index: false },
};

export default function DevisPage() {
  return <QuotesScreen />;
}
