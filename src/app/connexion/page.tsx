import type { Metadata } from 'next';
import { LoginScreen } from '@/features/auth/components/LoginScreen';

export const metadata: Metadata = {
  title: 'Connexion',
  robots: { index: false },
};

export default function ConnexionPage() {
  return <LoginScreen />;
}
