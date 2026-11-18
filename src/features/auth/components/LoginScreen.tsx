'use client';

import { useEffect, useRef } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { BrandLogo } from '@/components/BrandLogo';
import { MobileScreen } from '@/components/MobileScreen';
import { useMagicLinkLogin } from '../hooks/useMagicLinkLogin';
import { LinkSentCard } from './LinkSentCard';
import { LoginForm } from './LoginForm';

export function LoginScreen() {
  const login = useMagicLinkLogin();
  const isSent = login.status === 'sent';

  const emailInputRef = useRef<HTMLInputElement>(null);
  const sentHeadingRef = useRef<HTMLHeadingElement>(null);
  const isFirstRender = useRef(true);

  // Déplace le focus quand l'écran bascule entre "saisie" et "lien envoyé".
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const target = isSent ? sentHeadingRef.current : emailInputRef.current;
    target?.focus();
  }, [isSent]);

  return (
    <MobileScreen>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4, pt: { xs: 9, sm: 12 }, pb: 3 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.75 }}>
          <BrandLogo />
          <Typography variant="h1" sx={{ fontSize: 30 }}>
            Vos devis envoyés avant de quitter le client.
          </Typography>
        </Box>

        {isSent ? (
          <LinkSentCard
            email={login.email.trim()}
            resent={login.resent}
            headingRef={sentHeadingRef}
            onResend={login.onResend}
            onChangeEmail={login.onChangeEmail}
          />
        ) : (
          <LoginForm
            email={login.email}
            error={login.error}
            isSending={login.status === 'sending'}
            inputRef={emailInputRef}
            onEmailChange={login.onEmailChange}
            onSubmit={login.onSubmit}
          />
        )}
      </Box>
    </MobileScreen>
  );
}
