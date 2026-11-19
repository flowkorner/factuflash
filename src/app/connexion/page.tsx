import type { Metadata } from 'next';
import { LoginScreen } from '@/features/auth/components/LoginScreen';

export const metadata: Metadata = {
  title: 'Connexion',
  robots: { index: false },
};

interface ConnexionPageProps {
  searchParams: Promise<{ erreur?: string | string[] }>;
}

export default async function ConnexionPage({ searchParams }: ConnexionPageProps) {
  const { erreur } = await searchParams;
  return <LoginScreen invalidLink={erreur === 'lien-invalide'} />;
}
