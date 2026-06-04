'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthentificationStore } from '@/stores/authentification-store';

export function GardeAuthentification({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    // Wait for hydration of persisted store
    const timeout = setTimeout(() => {
      const state = useAuthentificationStore.getState();
      if (!state.isAuthenticated || !state.token) {
        // Pass current path as redirect so user comes back after login
        const redirect = encodeURIComponent(pathname);
        router.replace(`/auth/login?redirect=${redirect}`);
      } else {
        setChecked(true);
      }
    }, 100);
    return () => clearTimeout(timeout);
  }, [router, pathname]);

  if (!checked) {
    return (
      <div className="flex min-h-screen items-center justify-center" role="status" aria-busy="true" aria-live="polite">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" aria-hidden="true" />
        <span className="sr-only">Verification de l'authentification en cours...</span>
      </div>
    );
  }

  return <>{children}</>;
}
