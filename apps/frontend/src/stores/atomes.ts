import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';

// Atomes de recherche
export const atomeRequeteRecherche = atom('');
export const atomeResultatsRecherche = atom<any[]>([]);
export const atomeChargementRecherche = atom(false);

// Atomes panier / paiement
export const atomeArticlesPanier = atomWithStorage<any[]>('althea-cart', []);
export const atomeTotalPanier = atom((get) => {
  const articles = get(atomeArticlesPanier);
  return articles.reduce((sum, article) => sum + (article.price || 0) * (article.quantity || 1), 0);
});

// Notifications
export const atomeNotifications = atom<Array<{ id: string; message: string; type: string }>>([]);

// État du chat
export const atomeModeleChat = atomWithStorage<'openai' | 'anthropic'>('althea-chat-model', 'openai');
