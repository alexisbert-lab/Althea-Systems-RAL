# Althea System — Guide des Technologies

Document détaillant chaque technologie utilisée dans le projet Althea System : son rôle, pourquoi elle a été choisie, et comment elle est concrètement utilisée dans le code.

---

## Table des matières

1. [Runtime & Langage](#1-runtime--langage)
2. [Monorepo](#2-monorepo)
3. [Backend](#3-backend)
4. [Frontend](#4-frontend)
5. [Bases de données & Services](#5-bases-de-données--services)
6. [Infrastructure](#6-infrastructure)
7. [Récapitulatif du flux complet](#7-récapitulatif-du-flux-complet)

---

## 1. Runtime & Langage

### Node.js 20

**Rôle** : Environnement d'exécution JavaScript côté serveur.

**Dans le projet** : Fait tourner le backend NestJS et le frontend Next.js. Le Dockerfile utilise `node:20-alpine` pour la production. Toutes les dépendances npm sont gérées via Node.

---

### TypeScript

**Rôle** : Sur-couche de JavaScript qui ajoute le **typage statique**. Détecte les erreurs à la compilation plutôt qu'à l'exécution.

**Dans le projet** : 100 % du code (backend + frontend + shared) est en TypeScript. Trois `tsconfig.json` existent : un à la racine (`tsconfig.base.json`) qui définit les options communes, puis un par app qui l'étend. Les types partagés sont dans `packages/shared/src/types/`.

---

## 2. Monorepo

### Turborepo

**Rôle** : Orchestrateur de **monorepo** — gère les dépendances entre les workspaces et parallélise les tâches (build, dev, lint) avec un cache intelligent.

**Dans le projet** : Configuré dans `turbo.json`. Quand on lance `npm run dev`, Turborepo démarre le frontend ET le backend en parallèle. La tâche `build` respecte l'ordre des dépendances (`dependsOn: ["^build"]`), donc `packages/shared` est compilé avant `apps/backend` et `apps/frontend`. Le cache évite de rebuilder ce qui n'a pas changé.

---

### npm workspaces

**Rôle** : Fonctionnalité native de npm pour gérer plusieurs packages dans un seul dépôt. Permet de partager des dépendances et de référencer des packages locaux.

**Dans le projet** : Déclaré dans le `package.json` racine avec `"workspaces": ["apps/*", "packages/*"]`. Cela permet au frontend et au backend d'importer `@althea/shared` comme un module npm classique, alors que le code est local.

---

## 3. Backend

### NestJS 11

**Rôle** : Framework backend Node.js basé sur des **modules**, **contrôleurs** et **services** (architecture inspirée d'Angular). Fournit l'injection de dépendances, la validation, les guards, les intercepteurs, les pipes.

**Dans le projet** :

- `app.module.ts` importe les 18 modules métier.
- Chaque module (ex : `produits/`) contient :
  - un **controller** (définit les routes HTTP)
  - un **service** (logique métier)
  - un **module** (déclaration des imports/exports)
- `main.ts` bootstrap l'application : applique Helmet, CORS, compression, Swagger, `ValidationPipe` global, et le préfixe `/api`.
- Les **guards** (`AuthGuard`, `RolesGarde`) sont utilisés comme décorateurs sur les routes pour protéger l'accès.

**Exemple de structure d'un module** :

```text
modules/produits/
├── produits.controller.ts   ← Définit les routes HTTP (GET, POST, PUT, DELETE)
├── produits.service.ts      ← Contient la logique métier (requêtes Prisma, validation)
├── produits.module.ts       ← Déclare le controller et le service, importe les dépendances
└── dto/
    └── produit.dto.ts       ← Définit la forme des données attendues par chaque route
```

---

### Prisma ORM 6

**Rôle** : ORM (Object-Relational Mapping) pour **PostgreSQL**. On définit le schéma dans un fichier `.prisma`, et Prisma génère un client TypeScript typé pour requêter la base.

**Dans le projet** :

- Le schéma est dans `prisma/schema.prisma` — 19 modèles, 5 enums, toutes les relations.
- `npx prisma migrate dev` crée les migrations SQL automatiquement quand on modifie le schéma.
- `npx prisma generate` génère le client typé (`PrismaClient`).
- `prisma.service.ts` expose `PrismaClient` comme un service NestJS injectable dans tous les modules.
- `npx prisma studio` ouvre une interface web pour visualiser et éditer la base.

**Exemple d'utilisation dans un service** :

```typescript
// Récupérer les produits actifs avec leur catégorie
const produits = await this.prisma.product.findMany({
  where: { active: true },
  include: { category: true, translations: true },
  orderBy: { position: 'asc' },
  skip: (page - 1) * limit,
  take: limit,
});
```

---

### Mongoose 8

**Rôle** : ODM (Object-Document Mapping) pour **MongoDB**. Même principe que Prisma mais pour les bases NoSQL orientées documents.

**Dans le projet** : Utilisé **uniquement** pour l'historique du chatbot IA. Le schéma est défini dans `chat-message.schema.ts` avec les décorateurs Mongoose (`@Schema`, `@Prop`). MongoDB est connecté dans `app.module.ts` via `MongooseModule.forRoot(MONGODB_URI)`.

**Exemple de schéma Mongoose** :

```typescript
@Schema({ timestamps: true })
export class ChatMessage {
  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ required: true, index: true })
  conversationId: string;

  @Prop({ required: true, enum: ['user', 'assistant'] })
  role: string;

  @Prop({ required: true })
  content: string;

  @Prop({ default: 'openai' })
  model: string;
}
```

---

### Passport + JWT

**Rôle** :

- **Passport** : framework d'authentification modulaire pour Node.js (stratégies : JWT, OAuth, etc.).
- **JWT** (JSON Web Token) : standard pour transmettre des informations d'authentification de manière sécurisée entre le client et le serveur.

**Dans le projet** :

- La **stratégie JWT** est définie dans `jwt.strategie.ts` — elle extrait le token Bearer du header `Authorization`, vérifie sa signature avec `JWT_SECRET`, et charge l'utilisateur depuis la base.
- À la connexion (`POST /api/auth/login`), le service génère un JWT contenant le `userId`.
- Sur chaque requête protégée, `@UseGuards(AuthGuard('jwt'))` vérifie automatiquement le token.
- Le `RolesGarde` vient ensuite vérifier que le rôle de l'utilisateur correspond aux rôles requis par la route (`@Roles('ADMIN')`).

**Flux d'authentification** :

```text
1. POST /api/auth/login { email, password }
2. Backend vérifie le mot de passe (bcrypt.compare)
3. Génère un JWT : { userId: "abc123" } signé avec JWT_SECRET
4. Retourne : { user: {...}, token: "eyJhbGciOi..." }
5. Le frontend stocke le token (Zustand → localStorage)
6. Chaque requête suivante inclut : Authorization: Bearer eyJhbGciOi...
7. Le guard JWT extrait et vérifie le token automatiquement
```

---

### class-validator + class-transformer

**Rôle** :

- **class-validator** : décorateurs de validation sur les DTOs (`@IsEmail()`, `@IsNotEmpty()`, `@MinLength(8)`, etc.).
- **class-transformer** : transforme les objets JSON bruts en instances de classes typées.

**Dans le projet** : Chaque endpoint qui reçoit un body a un **DTO** (Data Transfer Object).

**Exemple** :

```typescript
export class InscriptionDto {
  @IsNotEmpty({ message: 'Le nom est requis' })
  name: string;

  @IsEmail({}, { message: 'Email invalide' })
  email: string;

  @MinLength(8, { message: 'Le mot de passe doit faire au moins 8 caractères' })
  password: string;
}
```

Le `ValidationPipe` global dans `main.ts` (options `whitelist: true`, `forbidNonWhitelisted: true`) rejette automatiquement toute requête avec des champs invalides ou non déclarés.

---

### @nestjs/throttler

**Rôle** : Module de **rate limiting** (limitation du nombre de requêtes par fenêtre de temps) pour protéger contre les abus et attaques brute-force.

**Dans le projet** : Configuré dans `app.module.ts` avec 3 fenêtres cumulatives :

| Fenêtre | Limite |
| --- | --- |
| 1 seconde | 5 requêtes |
| 10 secondes | 30 requêtes |
| 1 minute | 100 requêtes |

Des throttles spécifiques plus restrictifs sont appliqués sur les routes sensibles via le décorateur `@Throttle()` :

- Login : 10 requêtes/min
- Register : 5 requêtes/min
- Forgot password : 3 requêtes/min

---

### Helmet

**Rôle** : Middleware qui ajoute des **headers HTTP de sécurité** pour protéger contre les attaques courantes.

**Headers ajoutés** :

| Header | Protection contre |
| --- | --- |
| `Content-Security-Policy` | XSS (scripts malveillants injectés) |
| `X-Frame-Options` | Clickjacking (page embarquée dans une iframe) |
| `X-Content-Type-Options` | MIME sniffing |
| `Strict-Transport-Security` | Connexions non HTTPS |
| `X-DNS-Prefetch-Control` | Fuites DNS |

**Dans le projet** : Appliqué dans `main.ts` via `app.use(helmet())`. En mode dev, le CSP est désactivé pour permettre le rechargement à chaud.

---

### Swagger / OpenAPI

**Rôle** : Génère automatiquement une **documentation interactive** de l'API à partir des décorateurs NestJS. L'interface web permet de tester chaque endpoint directement depuis le navigateur.

**Dans le projet** : Configuré dans `main.ts` en mode développement uniquement. Accessible sur `http://localhost:4000/api/docs`. NestJS génère la spécification OpenAPI à partir des types des DTOs et des décorateurs `@ApiTags`, `@ApiResponse`.

---

### Stripe SDK 17

**Rôle** : SDK officiel de **Stripe** pour le traitement des paiements en ligne. Gère la création de sessions de paiement, la gestion des PaymentIntents, et la réception de webhooks.

**Dans le projet** :

| Endpoint | Mécanisme Stripe | Usage |
| --- | --- | --- |
| `POST /api/payments/create-checkout` | Checkout Session | Page de paiement hébergée par Stripe |
| `POST /api/payments/create-intent` | PaymentIntent | Paiement intégré dans l'interface Althea |
| `POST /api/payments/webhook` | Webhook Events | Écoute les événements (paiement réussi/échoué) |

Le webhook utilise `rawBody` pour vérifier la signature `stripe-signature` et s'assurer que les événements proviennent bien de Stripe.

**Flux de paiement (Checkout Session)** :

```
1. Le client valide son panier → POST /api/payments/create-checkout
2. Le backend crée une session Stripe avec les articles et montants
3. Stripe retourne une URL de paiement → le client est redirigé
4. Le client paie sur la page Stripe
5. Stripe envoie un webhook → POST /api/payments/webhook
6. Le backend vérifie la signature, met à jour la commande
7. Le client est redirigé vers /checkout/confirmation
```

---

### ExcelJS

**Rôle** : Librairie pour lire et écrire des fichiers **Excel (.xlsx) et CSV** en Node.js.

**Dans le projet** : Utilisé dans le module `produits` pour l'import en masse. Quand un admin uploade un fichier CSV/Excel via `POST /api/products/import/preview`, ExcelJS parse le fichier, extrait chaque ligne, et les valide avant insertion.

**Workflow d'import** :

```
1. Upload du fichier (max 5 Mo) → POST /api/products/import/preview
2. ExcelJS lit le fichier et extrait les lignes
3. Chaque ligne est validée (nom, prix > 0, stock >= 0, SKU unique, catégorie existante)
4. Retourne un aperçu : X lignes valides, Y erreurs
5. L'admin confirme → POST /api/products/import/confirm
6. Les produits valides sont créés en base de données
```

---

### bcrypt

**Rôle** : Librairie de **hashing de mots de passe**. Utilise un algorithme lent par conception (résistant aux attaques brute-force) avec un salt automatique.

**Dans le projet** :

- À l'inscription : `bcrypt.hash(password, 10)` → hash avec 10 rounds de salt
- À la connexion : `bcrypt.compare(password, user.passwordHash)` → vérifie le mot de passe saisi contre le hash stocké

Le hash résultant ressemble à : `$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy`

Il est **impossible** de retrouver le mot de passe original à partir du hash (fonction à sens unique).

---

### Resend + SendGrid

**Rôle** : Services d'envoi d'**emails transactionnels** via API (pas de serveur SMTP à gérer).

- **Resend** : service moderne et simple d'utilisation (provider par défaut).
- **SendGrid** : alternative robuste de Twilio (fallback configurable).

**Dans le projet** : Le `email.service.ts` implémente les deux providers. La variable `EMAIL_PROVIDER` (`resend` ou `sendgrid`) détermine lequel est utilisé.

**Emails envoyés** :

| Email | Déclencheur | Contenu |
| --- | --- | --- |
| Bienvenue | Inscription | Message d'accueil + lien vers le site |
| Reset mot de passe | Demande de réinitialisation | Lien de réinitialisation (expire en 1h) |
| Facture | Envoi/renvoi par l'admin | Numéro de facture, montant, détails |
| Avoir | Envoi par l'admin | Numéro d'avoir, motif d'annulation |

---

## 4. Frontend

### Next.js 15 (App Router)

**Rôle** : Framework React qui ajoute le **Server-Side Rendering (SSR)**, les **Server Components**, le routage basé sur les fichiers, les Route Handlers (API routes), et l'optimisation automatique des images/polices.

**Dans le projet** :

| Concept | Explication | Exemple dans Althea |
| --- | --- | --- |
| **App Router** | Chaque dossier dans `src/app/` = une route | `app/products/[slug]/page.tsx` → `/products/mon-produit` |
| **Server Components** | Composants rendus côté serveur (par défaut) | La homepage charge slides + catégories + produits via `fetch()` côté serveur |
| **Client Components** | Composants interactifs côté navigateur | Le panier, la recherche, les formulaires (`"use client"` en haut du fichier) |
| **Route Handlers** | Endpoints API côté serveur Next.js | `app/api/chat/route.ts` → proxy IA |
| **Turbopack** | Bundler de dev ultra-rapide | Activé via `next dev --turbopack` |
| **Layouts** | Structure partagée entre les pages | `app/layout.tsx` (racine), `app/dashboard/layout.tsx` (sidebar admin) |

**Structure du routage** :

```
src/app/
├── layout.tsx              ← Layout racine (navbar, chat, toaster)
├── page.tsx                ← /
├── products/
│   ├── page.tsx            ← /products
│   └── [slug]/page.tsx     ← /products/mon-stethoscope
├── cart/page.tsx            ← /cart
├── checkout/
│   ├── page.tsx            ← /checkout
│   └── confirmation/page.tsx ← /checkout/confirmation
├── auth/
│   ├── login/page.tsx      ← /auth/login
│   └── register/page.tsx   ← /auth/register
└── dashboard/
    ├── layout.tsx          ← Layout dashboard (sidebar + guard auth)
    ├── page.tsx            ← /dashboard
    └── admin/
        └── products/page.tsx ← /dashboard/admin/products
```

---

### React 19

**Rôle** : Librairie de construction d'**interfaces utilisateur** via des composants. React 19 ajoute les Server Components, les Actions, et des améliorations de performance.

**Dans le projet** : Tout le frontend est composé de composants React fonctionnels avec hooks. Les composants sont organisés dans :

- `src/components/` → composants réutilisables (navbar, footer, chat, etc.)
- `src/app/*/page.tsx` → pages (une par route)

**Hooks utilisés** : `useState`, `useEffect`, `useCallback`, `useMemo`, `useRef`, plus les hooks des librairies (`useChat`, `useAtom`, `useTranslations`, etc.).

---

### Tailwind CSS 3

**Rôle** : Framework CSS **utility-first** — on style directement dans le JSX avec des classes utilitaires au lieu d'écrire du CSS dans des fichiers séparés.

**Exemples de classes** :

| Classe | CSS généré |
| --- | --- |
| `flex` | `display: flex` |
| `p-4` | `padding: 1rem` |
| `text-red-500` | `color: rgb(239 68 68)` |
| `hover:bg-blue-600` | `background sur hover` |
| `md:grid-cols-3` | `3 colonnes à partir de 768px` |
| `dark:bg-gray-900` | `fond sombre en mode dark` |

**Dans le projet** :

- Configuré dans `tailwind.config.js` avec une palette personnalisée :
  - `althea-dark` : couleur principale sombre
  - `althea-cta` : couleur des boutons d'action
  - `althea-hover` : couleur de survol
- Les styles globaux sont dans `globals.css`
- Un fichier `rtl.css` gère les ajustements pour l'arabe (inversion des marges, paddings, etc.)

---

### shadcn/ui (Radix UI)

**Rôle** :

- **Radix UI** : collection de composants UI **non stylisés** mais **accessibles** (gèrent le focus, les raccourcis clavier, les attributs aria).
- **shadcn/ui** : couche de style par-dessus Radix avec Tailwind CSS. Les composants sont **copiés** directement dans le projet (pas de dépendance npm), ce qui permet de les personnaliser librement.

**Dans le projet** : Les composants sont dans `src/components/ui/`.

**Composants utilisés** :

| Composant | Usage dans Althea |
| --- | --- |
| `Button` | Boutons partout (ajouter au panier, valider, annuler) |
| `Card` | Cartes produit, KPIs dashboard, slides |
| `Input` | Champs de formulaire (login, contact, recherche) |
| `DropdownMenu` | Menu utilisateur, sélection langue |
| `Dialog` | Modales (import produits, confirmation suppression) |
| `Tabs` | Onglets dans le dashboard |
| `Toast` (Sonner) | Notifications (succès, erreur) |
| `Select` | Sélection catégorie, rôle, statut |
| `Checkbox` | Filtres (produits actifs, en stock) |
| `Avatar` | Photo de profil utilisateur |
| `ScrollArea` | Zones de défilement stylisées |

---

### CVA (Class Variance Authority)

**Rôle** : Utilitaire pour créer des **variantes de composants** avec Tailwind (similaire aux variants de styled-components).

**Dans le projet** : Utilisé dans `button.tsx` pour définir les variantes et tailles :

```typescript
const buttonVariants = cva("inline-flex items-center justify-center rounded-md", {
  variants: {
    variant: {
      default: "bg-althea-cta text-white hover:bg-althea-hover",
      destructive: "bg-red-500 text-white hover:bg-red-600",
      outline: "border border-gray-300 bg-white hover:bg-gray-50",
      ghost: "hover:bg-gray-100",
      link: "text-althea-cta underline hover:no-underline",
    },
    size: {
      default: "h-10 px-4 py-2",
      sm: "h-8 px-3 text-sm",
      lg: "h-12 px-6 text-lg",
      icon: "h-10 w-10",
    },
  },
});
```

---

### Zustand 5

**Rôle** : Librairie de **gestion d'état global** minimaliste pour React. Beaucoup plus simple que Redux — un store se crée en quelques lignes.

**Dans le projet** : Deux stores :

**1. Store d'authentification** (`authentification-store.ts`) :

```typescript
const useAuthentificationStore = create(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      login: (user, token) => set({ user, token, isAuthenticated: true }),
      logout: () => set({ user: null, token: null, isAuthenticated: false }),
      updateUser: (user) => set({ user }),
    }),
    { name: 'althea-auth' }  // Clé localStorage
  )
);
```

**2. Store d'interface** (`interface-store.ts`) :

- `sidebarOpen` : état du menu latéral
- `theme` : thème (light / dark / system)
- `locale` : langue sélectionnée

**Usage dans un composant** :

```typescript
const { user, logout } = useAuthentificationStore();
```

---

### Jotai 2

**Rôle** : Librairie de **gestion d'état atomique** pour React. Chaque donnée est un "atom" indépendant. Contrairement à Zustand (store centralisé), Jotai permet de ne re-render que les composants qui lisent un atom spécifique.

**Dans le projet** (défini dans `atomes.ts`) :

| Atom | Type | Persistance | Usage |
| --- | --- | --- | --- |
| `atomeArticlesPanier` | `CartItem[]` | `localStorage (althea-cart)` | Articles du panier |
| `atomeTotalPanier` | derived (lecture seule) | — | Calcul automatique du total |
| `atomeRequeteRecherche` | `string` | mémoire | Texte de recherche en cours |
| `atomeResultatsRecherche` | `Product[]` | mémoire | Résultats de recherche |
| `atomeChargementRecherche` | `boolean` | mémoire | Indicateur de chargement |
| `atomeNotifications` | `Notification[]` | mémoire | File de notifications |
| `atomeModeleChat` | `'openai' \| 'anthropic'` | `localStorage (althea-chat-model)` | Modèle IA sélectionné |

**Usage dans un composant** :

```typescript
const [panier, setPanier] = useAtom(atomeArticlesPanier);
const total = useAtomValue(atomeTotalPanier); // lecture seule
```

**Pourquoi Zustand ET Jotai ?** Zustand est utilisé pour les données qui forment un "bloc" cohérent (authentification, interface). Jotai est utilisé pour des données atomiques indépendantes (panier, recherche) où on veut minimiser les re-renders.

---

### i18n Custom (fr / en / ar)

**Rôle** : Système d'**internationalisation** maison — sans dépendance externe. Gère les traductions, les interpolations de variables, et le support RTL pour l'arabe.

> ⚠️ `next-intl` est absent du projet. L'i18n repose entièrement sur un contexte React custom défini dans `src/lib/translations.tsx`.

**Dans le projet** :

- 3 fichiers de traduction JSON dans `src/messages/` (fr, en, ar).
- La locale est persistée dans un cookie `NEXT_LOCALE` via `POST /api/locale`.
- Le layout racine applique `dir="rtl"` quand la locale est `ar`.
- `TranslationProvider` (wrapping dans `layout.tsx`) distribue `locale` + `messages` via un contexte React.

**Langues supportées** :

| Code | Langue | Direction | Statut |
| --- | --- | --- | --- |
| `fr` | Français | LTR (gauche à droite) | Complète |
| `en` | English | LTR | Complète |
| `ar` | العربية (Arabe) | **RTL** (droite à gauche) | Complète |

**Usage dans un composant** :

```typescript
import { useTranslations, useLocale } from '@/lib/translations';

const t = useTranslations('products');
const locale = useLocale(); // 'fr' | 'en' | 'ar'

return (
  <div>
    <h1>{t('title')}</h1>          {/* → "Nos produits" / "Our products" */}
    <button>{t('addToCart')}</button>
  </div>
);
```

**Structure d'un fichier de traduction (`fr.json`)** :

```json
{
  "products": {
    "title": "Nos produits",
    "addToCart": "Ajouter au panier",
    "outOfStock": "Rupture de stock"
  },
  "auth": {
    "login": "Connexion",
    "register": "Inscription"
  }
}
```

---

### Vercel AI SDK 6

**Rôle** : SDK pour intégrer des **modèles d'IA générative** (OpenAI, Anthropic, etc.) dans des apps Next.js, avec support natif du **streaming** (les réponses apparaissent mot par mot en temps réel).

**Dans le projet** :

**Côté serveur** (`app/api/chat/route.ts`) :

```typescript
import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';

export async function POST(req) {
  const { messages, model } = await req.json();
  const result = streamText({
    model: openai('gpt-4o'),
    system: "Tu es Althea, un assistant pour la vente d'équipements médicaux...",
    messages,
  });
  return result.toDataStreamResponse();
}
```

**Côté client** (page `/dashboard/chat`) :

```typescript
const { messages, input, handleInputChange, handleSubmit } = useChat({
  api: '/api/chat',
});
```

Le hook `useChat()` gère automatiquement l'état de la conversation, l'envoi des messages, et l'affichage progressif des réponses (streaming).

**4 providers IA disponibles (priorité décroissante)** :

| Priorité | Provider | Modèle | Variable d'environnement |
| --- | --- | --- | --- |
| 1 | **Groq** | `llama-3.3-70b-versatile` | `GROQ_API_KEY` |
| 2 | **Google** | `gemini-2.0-flash` | `GOOGLE_GENERATIVE_AI_API_KEY` |
| 3 | **OpenAI** | `gpt-4o` | `OPENAI_API_KEY` |
| 4 | **Anthropic** | `claude-haiku-4-5` | `ANTHROPIC_API_KEY` |
| — | **Mode local** | Correspondance mots-clés | aucune clé requise |

Le mode local couvre 14 thèmes (livraison, retours, paiements, stock, RGPD, etc.) sans appel IA.

---

### Vercel Analytics

**Rôle** : Outil d'**analytics web** qui mesure les performances (Core Web Vitals) et le trafic, intégré nativement avec Next.js. Aucune configuration externe nécessaire.

**Dans le projet** : Le composant `<Analytics />` est ajouté dans `layout.tsx` et collecte automatiquement les métriques de chaque page visitée.

---

### Sonner (Toaster)

**Rôle** : Librairie de **notifications toast** élégantes et animées pour React.

**Dans le projet** : Le composant `<Toaster />` est monté dans le layout racine.

**Usage** :

```typescript
import { toast } from 'sonner';

toast.success('Produit ajouté au panier');
toast.error('Erreur lors de la connexion');
toast.info('Votre commande est en cours de traitement');
```

---

### GSAP 3 + @gsap/react

**Rôle** : Librairie d'**animations JavaScript** professionnelle. Permet des transitions fluides, des effets d'entrée, et des séquences complexes avec une API déclarative.

**Dans le projet** : Utilisé dans la page `/dashboard/chat` pour animer l'entrée du header et de la zone d'input au montage, ainsi que l'apparition de chaque message.

```typescript
import gsap from 'gsap';

useEffect(() => {
  gsap.fromTo(ref.current,
    { opacity: 0, y: 10, scale: 0.97 },
    { opacity: 1, y: 0, scale: 1, duration: 0.32, ease: 'power2.out' }
  );
}, []);
```

Le hook `useGSAP()` (de `@gsap/react`) gère automatiquement le cleanup des animations à l'unmount du composant.

---

### React Three Fiber + Three.js

**Rôle** :

- **Three.js** : librairie WebGL 3D bas-niveau. Gère les scènes, caméras, matériaux, lumières et géométries.
- **@react-three/fiber** : binding React pour Three.js — permet d'écrire des scènes 3D en JSX.
- **@react-three/drei** : collection de helpers prêts à l'emploi (OrbitControls, Environment, Text, etc.).
- **@react-three/postprocessing** : effets de post-traitement (bloom, blur, glitch, etc.).

**Dans le projet** : Deux scènes 3D utilisées sur la homepage :

| Composant | Description |
| --- | --- |
| `cards-scene-3d.tsx` | Cartes produit 3D flottantes avec effet de survol mouse-tracking |
| `dna-scene-3d.tsx` | Animation ADN décorative en arrière-plan |

**Exemple** :

```tsx
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';

export function Scene() {
  return (
    <Canvas camera={{ position: [0, 0, 5] }}>
      <ambientLight intensity={0.5} />
      <mesh>
        <boxGeometry />
        <meshStandardMaterial color="#00a8b5" />
      </mesh>
      <OrbitControls />
    </Canvas>
  );
}
```

---

### Tilt3D (composant custom)

**Rôle** : Wrapper React maison qui applique un effet de **tilt 3D au survol** via mouse-tracking JavaScript. Remplace les animations CSS fixes de la classe `.card-3d`.

**Dans le projet** : `src/components/tilt-3d.tsx` — utilisé sur les cartes de la homepage (catégories, produits vedette, cartes de réassurance).

```tsx
<Tilt3D intensity={8} perspective={600}>
  <article>...</article>
</Tilt3D>
```

---

### @dnd-kit

**Rôle** : Librairie de **drag & drop** accessible et performante pour React. Gère les interactions tactiles et souris, avec support d'animations et de stratégies de tri.

**Dans le projet** : Utilisé dans les pages admin pour réordonner :

- `dashboard/admin/categories/page.tsx` — tri des catégories par glisser-déposer
- `dashboard/admin/carousel/page.tsx` — réordonnancement des slides du carrousel

```tsx
import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
```

---

### Lottie React

**Rôle** : Lecteur d'animations **Lottie** (format JSON exporté depuis After Effects) pour React. Permet d'intégrer des animations vectorielles complexes légères.

**Dans le projet** : Utilisé dans `bulle-chat.tsx` pour afficher le chat animé dans le bouton flottant.

| Fichier Lottie | Variante | Condition d'affichage |
| --- | --- | --- |
| `chat-noir.json` | Chat noir | Thème dark |
| `chat-blanc.json` | Chat blanc | Thème light |
| `chat-arabe.json` | Chat "dynamite" | Locale arabe (`ar`) |

---

### lucide-react

**Rôle** : Collection de plus de 1 000 **icônes SVG** open source, disponibles comme composants React. Fork moderne de Feather Icons.

**Dans le projet** : Utilisé partout dans l'interface :

| Icône | Usage |
| --- | --- |
| `<ShoppingCart />` | Icône panier dans la navbar |
| `<Search />` | Barre de recherche |
| `<MessageCircle />` | Bulle de chat |
| `<ChevronDown />` | Dropdowns et accordéons |
| `<User />` | Menu utilisateur |
| `<Package />` | Liste des commandes |
| `<AlertTriangle />` | Alertes de stock |

---

### clsx + tailwind-merge

**Rôle** :

- **clsx** : utilitaire pour combiner conditionnellement des classes CSS.
- **tailwind-merge** : résout les conflits de classes Tailwind intelligemment.

**Dans le projet** : Combinés dans la fonction utilitaire `cn()` utilisée dans quasiment tous les composants :

```typescript
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Utilisation :
<div className={cn(
  "p-4 rounded-lg",                        // Classes de base
  isActive && "bg-blue-500 text-white",     // Conditionnelle
  className                                  // Classes passées en props
)} />
```

---

### react-hook-form

**Rôle** : gère les formulaires React avec un minimum de re-renders et une excellente performance.

**Dans le projet** : Les formulaires frontend (login, register, contact, création de produit) utilisent la validation native de react-hook-form :

```typescript
import { useForm } from 'react-hook-form';

const { register, handleSubmit, formState: { errors } } = useForm();
```

> ⚠️ Zod n'est pas installé dans ce projet — la validation se fait via les options natives de `react-hook-form` (`required`, `pattern`, `minLength`...).

---

## 5. Bases de données & Services

### PostgreSQL 16

**Rôle** : Base de données **relationnelle** — stocke les données structurées avec des relations (clés étrangères, contraintes, index). Standard de l'industrie pour les applications transactionnelles.

**Dans le projet** : Base principale contenant toutes les données métier :

| Données | Tables |
| --- | --- |
| Utilisateurs & auth | `users`, `sessions` |
| Catalogue | `products`, `categories`, `product_translations`, `category_translations` |
| Commerce | `orders`, `order_items`, `addresses`, `payments`, `subscriptions` |
| Facturation | `invoices`, `credit_notes` |
| Contenu | `carousel_slides`, `carousel_slide_translations`, `site_settings` |
| Interactions | `reviews`, `contacts` |
| Configuration | `shipping_rules` |

Accédée exclusivement via **Prisma ORM**. Lancée via Docker sur le port **5433** (décalé du port par défaut 5432 pour éviter les conflits avec une installation locale).

---

### MongoDB 7

**Rôle** : Base de données **NoSQL orientée documents** — stocke des données sous forme de documents JSON flexibles (pas de schéma rigide de tables/colonnes).

**Pourquoi MongoDB en plus de PostgreSQL ?** Les messages du chatbot sont des documents avec des champs variables (`metadata`, `model`, etc.) et n'ont pas de relations complexes avec les autres entités. Le format document est plus naturel pour ce cas d'usage.

**Dans le projet** : Utilisé **uniquement** pour la collection `chat_messages` (historique du chatbot IA). Lancée via Docker sur le port **27018**.

---

### Meilisearch v1.11

**Rôle** : Moteur de **recherche full-text** ultra-rapide (réponse < 50ms) et **tolérant aux fautes de frappe**. Alternative légère à Elasticsearch, conçue pour l'expérience utilisateur.

**Fonctionnalités exploitées** :

| Fonctionnalité | Usage dans Althea |
| --- | --- |
| Recherche full-text | Recherche dans le nom et la description des produits |
| Tolérance aux typos | "stetoscope" trouve "stéthoscope" |
| Facettes | Filtre par catégorie, fourchette de prix |
| Tri | Par prix, date, stock, position |
| Autocomplétion | Suggestions instantanées dans la barre de recherche (max 6 résultats) |

**Dans le projet** :

- `POST /api/search/sync` : l'admin synchronise tous les produits vers l'index Meilisearch
- `GET /api/search` : recherche facettée côté public
- `GET /api/search/suggest` : autocomplétion avec min 2 caractères (utilisé dans la navbar)
- Lancé via Docker sur le port **7700**

---

### Redis 7

**Rôle** : Base de données **en mémoire** (clé-valeur) — extrêmement rapide (sub-milliseconde), utilisée pour le cache, les sessions, et les files d'attente.

**Dans le projet** : Présent dans le Docker Compose sur le port **6379**. Utilisable pour le cache de requêtes fréquentes et la gestion de sessions.

---

## 6. Infrastructure

### Docker

**Rôle** : Crée des **conteneurs** isolés pour chaque service. Un conteneur est comme une mini-machine virtuelle légère qui embarque l'application et toutes ses dépendances, garantissant que le code fonctionne de la même manière partout (dev, CI, prod).

**Dans le projet** : Le `Dockerfile` (dans `apps/backend/`) construit une image de production :

```dockerfile
FROM node:20-alpine    # Image de base légère (~50 Mo)
WORKDIR /app
COPY . .
RUN npm install
EXPOSE 3000
CMD ["node", "dist/main"]
```

---

### Docker Compose

**Rôle** : Orchestre **plusieurs conteneurs** en les déclarant dans un seul fichier YAML. Un seul commande (`docker-compose up -d`) démarre toute l'infrastructure.

**Dans le projet** : `docker-compose.yml` définit 5 services :

```
┌──────────────────────────────────────────────────────────┐
│  Docker Compose                                           │
│                                                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐  │
│  │ PostgreSQL   │  │  MongoDB    │  │  Meilisearch    │  │
│  │ port 5433    │  │ port 27018  │  │  port 7700      │  │
│  │ (données     │  │ (historique │  │  (recherche     │  │
│  │  métier)     │  │  chatbot)   │  │   full-text)    │  │
│  └─────────────┘  └─────────────┘  └─────────────────┘  │
│                                                           │
│  ┌─────────────┐  ┌─────────────────────────────────┐    │
│  │   Redis     │  │  Backend NestJS                  │    │
│  │ port 6379   │  │  port 3000                       │    │
│  │ (cache)     │  │  (API REST)                      │    │
│  └─────────────┘  └─────────────────────────────────┘    │
└──────────────────────────────────────────────────────────┘
```

Chaque service a :
- Un **healthcheck** (vérifie qu'il est prêt avant de démarrer les services dépendants)
- Un **volume nommé** (les données survivent au redémarrage des conteneurs)
- Une politique `unless-stopped` (redémarre automatiquement en cas de crash)

---

## 7. Récapitulatif du flux complet

```
┌─ UTILISATEUR ─────────────────────────────────────────────────────────┐
│  Navigateur web                                                        │
│  → React 19 + Tailwind CSS + shadcn/ui (interface)                    │
│  → Zustand (authentification) + Jotai (panier, recherche)             │
│  → i18n custom (traductions fr/en/ar, cookie NEXT_LOCALE)             │
│  → Vercel AI SDK useChat() (streaming chat IA)                        │
│  → GSAP (animations) + React Three Fiber (scènes 3D)                  │
└────────────┬──────────────────────────────────────────────────────────┘
             │
             │  HTTP requests + JWT Bearer token
             ▼
┌─ NEXT.JS 15 (port 3000) ─────────────────────────────────────────────┐
│  App Router : pages SSR + Client Components                           │
│  Route Handlers :                                                      │
│  ├── /api/chat   → Vercel AI SDK → OpenAI GPT-4o / Claude / local    │
│  └── /api/locale → Set cookie NEXT_LOCALE                             │
└────────────┬──────────────────────────────────────────────────────────┘
             │
             │  fetch() → http://localhost:4000/api/*
             ▼
┌─ NESTJS 11 (port 4000) ──────────────────────────────────────────────┐
│  Helmet (sécurité headers) + CORS + Compression                       │
│  Rate Limiting : 5/1s, 30/10s, 100/60s                               │
│  ValidationPipe (class-validator DTOs)                                 │
│  AuthGuard (Passport JWT) + RolesGarde (RBAC)                         │
│  Swagger/OpenAPI (docs dev)                                            │
│                                                                        │
│  18 modules métier :                                                   │
│  auth · users · products · categories · orders · addresses · reviews  │
│  payments · search · chat · contact · dashboard · carousel             │
│  site-settings · invoices · shipping-rules · email · prisma            │
└──┬──────────┬──────────┬──────────┬──────────┬───────────────────────┘
   │          │          │          │          │
   ▼          ▼          ▼          ▼          ▼
PostgreSQL  MongoDB   Meilisearch  Redis    Stripe
(Prisma)   (Mongoose)  (search)   (cache)  (paiements)
  5433      27018       7700       6379    (API externe)
```

**En résumé** :

1. L'utilisateur interagit avec l'**interface React** (Next.js + Tailwind + shadcn/ui)
2. Animations : **GSAP** pour les transitions UI, **React Three Fiber** pour les scènes 3D, **Lottie** pour les animations JSON
3. État global : **Zustand** (auth) + **Jotai** (panier, recherche)
4. i18n **custom** (fr/en/ar) sans librairie externe
5. Le frontend envoie des requêtes HTTP à l'**API NestJS** (protégée par JWT + rate limiting)
6. NestJS interroge **PostgreSQL** (via Prisma) pour les données métier
7. **MongoDB** (via Mongoose) pour l'historique du chat
8. **Meilisearch** pour la recherche instantanée
9. **Stripe** pour les paiements
10. **Resend/SendGrid** pour les emails
11. Le tout est orchestré par **Turborepo** en dev et **Docker Compose** en infra

---

*Document généré pour le projet Althea System — SUP de Vinci © 2026*
