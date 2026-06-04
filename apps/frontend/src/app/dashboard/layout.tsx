'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLocale, useTranslations } from '@/lib/translations';
import { GardeAuthentification } from '@/components/garde-authentification';
import { useAuthentificationStore } from '@/stores/authentification-store';
import { cn } from '@/lib/utilitaires';
import { isRTL } from '@/lib/rtl';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { BasculeLangue } from '@/components/bascule-langue';
import { BasculeTheme } from '@/components/bascule-theme';
import {
  BarChart3, Package, Search, Bot, Settings, CreditCard, MapPin,
  Tag, ClipboardList, Users, Mail, Image, LayoutGrid, FileText, Truck, MessageSquare,
} from 'lucide-react';

const sidebarLinks = [
  { href: '/dashboard', labelKey: 'links.dashboard', icon: BarChart3 },
  { href: '/dashboard/orders', labelKey: 'links.orders', icon: Package },
  { href: '/dashboard/search', labelKey: 'links.search', icon: Search },
  { href: '/dashboard/chat', labelKey: 'links.aiAssistant', icon: Bot },
  { href: '/dashboard/settings/addresses', labelKey: 'links.addresses', icon: MapPin },
  { href: '/dashboard/settings/payment-methods', labelKey: 'links.payment', icon: CreditCard },
  { href: '/dashboard/settings', labelKey: 'links.settings', icon: Settings },
];

const adminLinks = [
  { href: '/dashboard/admin/products', labelKey: 'adminLinks.products', icon: Tag, roles: ['ADMIN', 'MANAGER_PRODUCTS'] },
  { href: '/dashboard/admin/categories', labelKey: 'adminLinks.categories', icon: LayoutGrid, roles: ['ADMIN', 'MANAGER_PRODUCTS'] },
  { href: '/dashboard/admin/orders', labelKey: 'adminLinks.orders', icon: ClipboardList, roles: ['ADMIN', 'MANAGER_ORDERS', 'ACCOUNTANT'] },
  { href: '/dashboard/admin/users', labelKey: 'adminLinks.users', icon: Users, roles: ['ADMIN'] },
  { href: '/dashboard/admin/contacts', labelKey: 'adminLinks.messages', icon: Mail, roles: ['ADMIN', 'MODERATOR'] },
  { href: '/dashboard/admin/conversations', labelKey: 'adminLinks.conversations', icon: MessageSquare, roles: ['ADMIN', 'MODERATOR'] },
  { href: '/dashboard/admin/carousel', labelKey: 'adminLinks.carousel', icon: Image, roles: ['ADMIN'] },
  { href: '/dashboard/admin/site-settings', labelKey: 'adminLinks.siteContent', icon: FileText, roles: ['ADMIN'] },
  { href: '/dashboard/admin/shipping', labelKey: 'adminLinks.shipping', icon: Truck, roles: ['ADMIN'] },
];

const ADMIN_ROLES = ['ADMIN', 'MANAGER_PRODUCTS', 'MANAGER_ORDERS', 'ACCOUNTANT', 'MODERATOR'];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const locale = useLocale();
  const t = useTranslations('dashboardLayout');
  const rtl = isRTL(locale);
  const { user, logout } = useAuthentificationStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isStaff = user?.role ? ADMIN_ROLES.includes(user.role) : false;
  const visibleAdminLinks = adminLinks.filter((link) => user?.role && link.roles.includes(user.role));

  const handleLogout = () => {
    logout();
    window.location.href = '/';
  };

  return (
    <GardeAuthentification>
      <div className="flex min-h-screen">
        {/* Mobile overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/50 lg:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* Sidebar */}
        <aside
          id="dashboard-sidebar"
          aria-label={t('sidebarAria')}
          className={cn(
            'fixed inset-y-0 z-40 w-64 bg-card p-4 transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0',
            rtl ? 'right-0 border-l' : 'left-0 border-r',
            sidebarOpen ? 'translate-x-0' : (rtl ? 'translate-x-full' : '-translate-x-full'),
          )}
        >
          <div className="flex h-full flex-col overflow-y-auto">
            <Link href="/" className="mb-6 text-lg font-bold">
              <span className="text-primary">Althea</span> System
            </Link>

            <nav aria-label={t('navigationAria')} className="flex-1 space-y-1">
              {sidebarLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href as any}
                  onClick={() => setSidebarOpen(false)}
                  aria-current={pathname === link.href ? 'page' : undefined}
                  className={cn(
                    'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    pathname === link.href
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                  )}
                >
                  <link.icon className="h-4 w-4" aria-hidden="true" />
                  {t(link.labelKey)}
                </Link>
              ))}

              {isStaff && visibleAdminLinks.length > 0 && (
                <>
                  <div className="my-4 border-t pt-4">
                    <p className="mb-2 px-3 text-xs font-semibold uppercase text-muted-foreground">
                      {t('administration')}
                    </p>
                  </div>
                  {visibleAdminLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href as any}
                      onClick={() => setSidebarOpen(false)}
                      aria-current={pathname === link.href ? 'page' : undefined}
                      className={cn(
                        'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                        pathname === link.href
                          ? 'bg-primary/10 text-primary'
                          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                      )}
                    >
                      <link.icon className="h-4 w-4" aria-hidden="true" />
                      {t(link.labelKey)}
                    </Link>
                  ))}
                </>
              )}
            </nav>

            <div className="shrink-0 border-t pt-4">
              <div className="mb-3 px-3">
                <p className="text-sm font-medium">{user?.name}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={handleLogout}
              >
                {t('logout')}
              </Button>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <div className="flex flex-1 flex-col">
          <header className="flex h-14 items-center justify-between border-b px-6">
            <button
              className="lg:hidden"
              onClick={() => setSidebarOpen(true)}
              aria-label={t('openMenu')}
              aria-expanded={sidebarOpen}
              aria-controls="dashboard-sidebar"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h1 className="text-lg font-semibold">{t('title')}</h1>
            <div className="flex items-center gap-3">
              <BasculeTheme />
              <BasculeLangue />
              {user?.role && (
                <span className="rounded bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                  {t(`roles.${user.role}` as any)}
                </span>
              )}
            </div>
          </header>
          <main id="main-content" className="flex-1 p-6">{children}</main>
        </div>
      </div>
    </GardeAuthentification>
  );
}
