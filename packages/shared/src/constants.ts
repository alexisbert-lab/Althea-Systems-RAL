export const APP_NAME = 'Althea System';
export const APP_VERSION = '1.0.0';

export const API_ROUTES = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
  },
  USERS: {
    LIST: '/users',
    ME: '/users/me',
    BY_ID: (id: string) => `/users/${id}`,
  },
  PAYMENTS: {
    CHECKOUT: '/payments/create-checkout',
    HISTORY: '/payments/history',
    WEBHOOK: '/payments/webhook',
  },
  SEARCH: {
    QUERY: '/search',
  },
  CHAT: {
    CONVERSATIONS: '/chat/conversations',
    CONVERSATION: (id: string) => `/chat/conversations/${id}`,
  },
  HEALTH: '/health',
} as const;

export const SUPPORTED_LOCALES = ['fr', 'en'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: SupportedLocale = 'fr';
