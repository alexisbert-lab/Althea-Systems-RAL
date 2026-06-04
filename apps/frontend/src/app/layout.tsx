import type { Metadata } from 'next';
import { Poppins, Inter } from 'next/font/google';
import { TranslationProvider } from '@/lib/translations';
import { getLocale } from '@/lib/locale';
import { Analytics } from '@vercel/analytics/react';
import { Toaster } from 'sonner';
import { BulleChat } from '@/components/bulle-chat';
import { FournisseurTheme } from '@/components/fournisseur-theme';
import { getDirection } from '@/lib/rtl';
import './globals.css';
import './rtl.css';

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['600'],
  variable: '--font-poppins',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Althea System – Matériel médical de pointe pour cabinets',
  description:
    'Althea System : votre fournisseur de matériel médical de pointe pour cabinets médicaux. Diagnostic, instruments chirurgicaux, mobilier médical et plus.',
  keywords: [
    'althea system',
    'matériel médical',
    'cabinet médical',
    'équipement médical',
    'diagnostic',
    'instruments chirurgicaux',
  ],
  icons: {
    icon: '/images/Logo-ico-althea.ico',
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const messages = (await import(`../messages/${locale}.json`)).default;
  const direction = getDirection(locale);

  return (
    <html lang={locale} dir={direction} suppressHydrationWarning>
      <body className={`${poppins.variable} ${inter.variable} min-h-screen font-inter antialiased at-bg at-grid`}>
        <FournisseurTheme>
          <TranslationProvider locale={locale} messages={messages}>
            <a
              href="#main-content"
              className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[9999] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:outline-none"
            >
              Aller au contenu principal
            </a>
            {children}
            <BulleChat />
            <Toaster position="top-right" richColors />
            <Analytics />
          </TranslationProvider>
        </FournisseurTheme>
      </body>
    </html>
  );
}
