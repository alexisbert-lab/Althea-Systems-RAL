'use client';

import Link from 'next/link';
import { useTranslations } from '@/lib/translations';
import { Mail, MapPin, Instagram, Facebook, Linkedin, Youtube } from 'lucide-react';

export function PiedPage() {
  const t = useTranslations('footer');

  return (
    <footer className="footer-dark relative hidden overflow-hidden text-white/80 md:block">
      {/* Orbes décoratifs */}
      <div className="orb orb-teal animate-float-slow pointer-events-none"
        style={{ width: 400, height: 400, bottom: '-100px', left: '-80px', opacity: 0.12 }} />
      <div className="orb orb-cyan animate-float pointer-events-none"
        style={{ width: 300, height: 300, top: '-60px', right: '10%', opacity: 0.08 }} />

      {/* Grille subtile */}
      <div className="pointer-events-none absolute inset-0 z-0"
        style={{
          backgroundImage:
            'linear-gradient(rgba(0,168,181,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,168,181,0.04) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
        }}
      />

      <div className="relative z-10">
        {/* Séparateur lumineux */}
        <div className="at-divider" />

        <div className="container mx-auto px-6 py-14">
          <div className="grid gap-10 md:grid-cols-4">

            {/* Brand */}
            <div className="md:col-span-1">
              <img
                src="/images/logo-althea-system-removebg-preview.png"
                alt="Althea System"
                className="h-14 w-auto mb-4 drop-shadow-[0_0_12px_rgba(0,168,181,0.4)]"
              />
              <p className="text-sm text-white/55 leading-relaxed">
                {t('brand.description')}
              </p>
              <div className="mt-5 space-y-2 text-xs text-white/40">
                <div className="flex items-center gap-2 hover:text-althea-cta transition-colors">
                  <Mail className="h-3.5 w-3.5 text-althea-cta/60" />
                  <span>contact@althea-system.com</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5 text-althea-cta/60" />
                  <span>France</span>
                </div>
              </div>
              <div className="mt-5 flex items-center gap-3">
                {[
                  { href: 'https://instagram.com', icon: Instagram, label: 'Instagram' },
                  { href: 'https://facebook.com', icon: Facebook, label: 'Facebook' },
                  { href: 'https://linkedin.com', icon: Linkedin, label: 'LinkedIn' },
                  { href: 'https://youtube.com', icon: Youtube, label: 'YouTube' },
                ].map(({ href, icon: Icon, label }) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 text-white/40 transition-all hover:border-althea-cta/50 hover:text-althea-cta hover:shadow-[0_0_8px_rgba(0,168,181,0.3)]"
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </a>
                ))}
              </div>
            </div>

            {/* Catalogue */}
            <nav aria-label={t('catalog.title')}>
              <h4 className="mb-4 font-poppins text-xs font-semibold uppercase tracking-widest text-althea-cta/80">
                {t('catalog.title')}
              </h4>
              <ul className="space-y-2.5 text-sm">
                {[
                  { href: '/products', label: t('catalog.allProducts') },
                  { href: '/products?category=diagnostic', label: t('catalog.diagnostic') },
                  { href: '/products?category=mobilier-medical', label: t('catalog.furniture') },
                  { href: '/products?category=instruments-chirurgicaux', label: t('catalog.surgical') },
                ].map(({ href, label }) => (
                  <li key={href}>
                    <Link
                      href={href}
                      className="group flex items-center gap-1.5 text-white/50 transition-all hover:text-althea-cta hover:translate-x-1"
                    >
                      <span className="h-px w-3 bg-althea-cta/30 transition-all group-hover:w-5 group-hover:bg-althea-cta" />
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            {/* Mon compte */}
            <nav aria-label={t('account.title')}>
              <h4 className="mb-4 font-poppins text-xs font-semibold uppercase tracking-widest text-althea-cta/80">
                {t('account.title')}
              </h4>
              <ul className="space-y-2.5 text-sm">
                {[
                  { href: '/auth/login', label: t('account.login') },
                  { href: '/auth/register', label: t('account.register') },
                  { href: '/dashboard', label: t('account.mySpace') },
                  { href: '/dashboard/orders', label: t('account.orders') },
                ].map(({ href, label }) => (
                  <li key={href}>
                    <Link
                      href={href}
                      className="group flex items-center gap-1.5 text-white/50 transition-all hover:text-althea-cta hover:translate-x-1"
                    >
                      <span className="h-px w-3 bg-althea-cta/30 transition-all group-hover:w-5 group-hover:bg-althea-cta" />
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            {/* Informations légales */}
            <nav aria-label={t('info.title')}>
              <h4 className="mb-4 font-poppins text-xs font-semibold uppercase tracking-widest text-althea-cta/80">
                {t('info.title')}
              </h4>
              <ul className="space-y-2.5 text-sm">
                {[
                  { href: '/contact', label: t('info.contact') },
                  { href: '/legal/mentions', label: t('info.legal') },
                  { href: '/legal/cgv', label: t('info.terms') },
                  { href: '/legal/privacy', label: t('info.privacy') },
                ].map(({ href, label }) => (
                  <li key={href}>
                    <Link
                      href={href}
                      className="group flex items-center gap-1.5 text-white/50 transition-all hover:text-althea-cta hover:translate-x-1"
                    >
                      <span className="h-px w-3 bg-althea-cta/30 transition-all group-hover:w-5 group-hover:bg-althea-cta" />
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>

          {/* Bande basse */}
          <div className="mt-12 border-t border-white/[0.07] pt-8 flex flex-col items-center gap-2 text-center">
            <p className="text-xs text-white/30">
              &copy; {new Date().getFullYear()}&nbsp;
              <span className="text-shimmer font-semibold">Althea System</span>
              &nbsp;— {t('copyright')}
            </p>
            <p className="text-[10px] text-white/20">
              {t('tagline')}
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}

// Backward-compatible English alias
export { PiedPage as Footer };
