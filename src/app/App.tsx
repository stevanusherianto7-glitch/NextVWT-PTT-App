import { useEffect } from 'react';
import { usePTTStore } from './store/usePTTStore';
import { Toaster } from './components/ui/sonner';
import { useAuthSession } from './hooks/useAuthSession';

import { LoginGate } from './components/LoginGate';
import { RadioLayout } from './components/RadioLayout';
import { ErrorBoundary } from './components/ErrorBoundary';
import { performSecurityAudit } from './utils/appSecurity';

export default function App() {
  const { initializeSession, user, setUser, signInWithGoogle } = usePTTStore();

  useAuthSession();

  useEffect(() => {
    performSecurityAudit()
      .then((audit) => {
        if (audit.blocked && import.meta.env.PROD) {
          console.error('[Security] Potential security issue detected:', audit.issues.join(', '));
        }
      })
      .catch((err) => {
        console.error('[Security] Error performing audit:', err);
      });
  }, []);

  useEffect(() => {
    initializeSession();
  }, [initializeSession]);

  return (
    <ErrorBoundary>
      <div className="min-h-dvh h-dvh w-full bg-[#1a1c23] flex items-center justify-center sm:p-4 select-none overflow-hidden sm:overflow-auto overscroll-none">
        {user === null ? (
          <div
            className="w-full h-dvh sm:w-[360px] sm:h-[800px] bg-white sm:rounded-[40px] overflow-hidden relative sm:shadow-[0_20px_50px_rgba(0,0,0,0.5)] sm:border-[8px] sm:border-[#2a2d36] flex-shrink-0 flex flex-col"
            style={{
              boxShadow: 'inset 0 0 0 2px rgba(255,255,255,0.1)',
            }}
          >
            <LoginGate
              onLogin={async (provider) => {
                if (provider === 'google') {
                  await signInWithGoogle();
                } else if (provider === 'guest') {
                  const guestUser = {
                    id: 'guest-' + crypto.randomUUID(),
                    isGuest: true as const,
                    email: 'guest@example.com',
                    user_metadata: { full_name: 'Tamu Peb' },
                    app_metadata: { provider: 'guest' },
                    aud: 'authenticated',
                    created_at: new Date().toISOString(),
                  };
                  setUser(guestUser);
                }
              }}
            />
          </div>
        ) : (
          <RadioLayout />
        )}
        <Toaster />
      </div>
    </ErrorBoundary>
  );
}
