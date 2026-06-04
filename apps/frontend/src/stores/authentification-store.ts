import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  rememberMe: boolean;
  login: (user: User, token: string, rememberMe?: boolean) => void;
  logout: () => void;
  updateUser: (user: Partial<User>) => void;
}

export const useAuthentificationStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      rememberMe: true,

      login: (user, token, rememberMe = true) => {
        set({ user, token, isAuthenticated: true, rememberMe });
        if (!rememberMe) {
          // Copy to sessionStorage and clear localStorage
          sessionStorage.setItem('althea-auth', JSON.stringify({
            state: { user, token, isAuthenticated: true, rememberMe: false },
            version: 0,
          }));
          localStorage.removeItem('althea-auth');
        }
      },

      logout: () => {
        set({ user: null, token: null, isAuthenticated: false, rememberMe: true });
        localStorage.removeItem('althea-auth');
        sessionStorage.removeItem('althea-auth');
      },

      updateUser: (updates) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
        })),
    }),
    {
      name: 'althea-auth',
      storage: createJSONStorage(() => {
        if (typeof window === 'undefined') return localStorage;
        // Check sessionStorage first for non-remembered sessions
        const session = sessionStorage.getItem('althea-auth');
        if (session) return sessionStorage;
        return localStorage;
      }),
    },
  ),
);
