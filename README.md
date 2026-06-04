# Althea System

Plateforme e-commerce complète dédiée à la vente d'équipements médicaux professionnels pour cabinets et cliniques. Architecture **monorepo full-stack** articulée autour d'un backend **NestJS 11**, d'un frontend **Next.js 15** (App Router + React 19), de **deux bases de données** (PostgreSQL 16 pour les données métier, MongoDB 7 pour l'historique du chatbot IA), d'un **moteur de recherche instantané** (Meilisearch v1.11), de **paiements sécurisés** via Stripe, d'un **système de facturation et d'avoirs**, d'un module d'**import CSV/Excel** de produits, et d'un **assistant IA intégré** fonctionnant avec OpenAI GPT-4o, Anthropic Claude Sonnet ou en mode local sans clé API.

---

## Table des matières

1. [Stack technique](#1-stack-technique)
2. [Architecture du projet](#2-architecture-du-projet)
3. [Arborescence détaillée des fichiers](#3-arborescence-détaillée-des-fichiers)
4. [Modèle de données (Prisma + MongoDB)](#4-modèle-de-données-prisma--mongodb)
5. [Système de rôles et sécurité](#5-système-de-rôles-et-sécurité)
6. [API Backend — toutes les routes](#6-api-backend--toutes-les-routes)
7. [Pages Frontend](#7-pages-frontend)
8. [Gestion d'état côté client](#8-gestion-détat-côté-client)
9. [Composants réutilisables](#9-composants-réutilisables)
10. [Package partagé (`packages/shared`)](#10-package-partagé-packagesshared)
11. [Assistant IA (chatbot)](#11-assistant-ia-chatbot)
12. [Internationalisation (i18n)](#12-internationalisation-i18n)
13. [Service d'emails](#13-service-demails)
14. [Import CSV/Excel de produits](#14-import-csvexcel-de-produits)
15. [Infrastructure Docker](#15-infrastructure-docker)
16. [Installation et démarrage](#16-installation-et-démarrage)
17. [Variables d'environnement](#17-variables-denvironnement)
18. [Scripts disponibles](#18-scripts-disponibles)
19. [Cahier de tests](#19-cahier-de-tests)

---

## 1. Stack technique

| Couche | Technologies | Version |
|---|---|---|
| **Frontend** | Next.js (App Router + Turbopack), React, TypeScript | 15.x, 19.x |
| **Backend** | NestJS, TypeScript | 11.x |
| **BDD principale** | PostgreSQL via Prisma ORM | 16, Prisma 6.x |
| **BDD chat** | MongoDB via Mongoose | 7, Mongoose 8.x |
| **Moteur de recherche** | Meilisearch | v1.11 |
| **Cache / Sessions** | Redis | 7 |
| **Paiements** | Stripe (Checkout Sessions, PaymentIntents, Webhooks) | SDK 17.x |
| **État global** | Zustand (auth + UI) + Jotai (panier, recherche, chat) | 5.x, 2.x |
| **Styling** | Tailwind CSS + shadcn/ui (Radix UI primitives) | 3.x |
| **Internationalisation** | Système i18n custom (FR / EN / AR avec support RTL) | — |
| **Chatbot IA** | Vercel AI SDK + OpenAI GPT-4o / Anthropic Claude Sonnet | ai 6.x |
| **Emails** | Resend (principal) + SendGrid (fallback configurable) | 4.x |
| **Import données** | ExcelJS (lecture CSV / XLSX) | 4.x |
| **Validation** | class-validator + class-transformer (backend), Zod + react-hook-form (frontend) | — |
| **2FA** | otplib (TOTP), QRCode | 14.x |
| **PDF** | PDFKit (génération de factures et avoirs) | 0.x |
| **Sécurité** | Helmet, CORS strict, Rate limiting multi-couche (Throttler), JWT (Passport), bcrypt, 2FA TOTP | — |
| **Documentation API** | Swagger / OpenAPI (dev uniquement) | — |
| **Analytics** | Vercel Analytics | — |
| **Monorepo** | Turborepo + npm workspaces | Turbo 2.x |
| **Infra locale** | Docker Compose (4 services) | — |

---

## 2. Architecture du projet

### Vue d'ensemble

```
althea-system/                         ← Racine monorepo (Turborepo + npm workspaces)
├── apps/
│   ├── backend/                       ← API REST NestJS 11
│   └── frontend/                      ← Application Next.js 15 (App Router)
├── packages/
│   └── shared/                        ← Types TypeScript et constantes partagés
├── docker-compose.yml                 ← PostgreSQL + MongoDB + Meilisearch + Redis
├── turbo.json                         ← Configuration Turborepo (build, dev, lint, clean)
├── tsconfig.base.json                 ← Config TypeScript commune
└── package.json                       ← Scripts racine et dépendances globales
```

### Flux de données complet

```
┌──────────────────────────────────────────────────────────────────────────┐
│  NAVIGATEUR (Client)                                                     │
│                                                                          │
│  Zustand (auth + UI)  ·  Jotai (panier, recherche, modèle chat)         │
│  i18n custom (fr/en/ar) · Tailwind CSS + shadcn/ui                       │
└────────────────┬──────────────────────────────┬──────────────────────────┘
                 │ Server Components            │ Client Components
                 │ (SSR / RSC)                  │ (fetch + JWT Bearer)
                 ▼                              ▼
┌──────────────────────────────────────────────────────────────────────────┐
│  NEXT.JS 15 (port 3000)  ·  App Router + Turbopack                      │
│                                                                          │
│  Route Handlers :                                                        │
│  ├─ /api/chat   →  Vercel AI SDK  →  OpenAI GPT-4o / Claude Sonnet     │
│  │                                    ou mode local (mots-clés)          │
│  └─ /api/locale →  Cookie NEXT_LOCALE (persistance i18n)                │
│                                                                          │
│  Middleware (désactivé par défaut) :  middleware.ts.disabled              │
└────────────────────────────────┬─────────────────────────────────────────┘
                                 │ HTTP REST + JWT Bearer
                                 ▼
┌──────────────────────────────────────────────────────────────────────────┐
│  NESTJS API (port 4000)  ·  Préfixe global /api                         │
│                                                                          │
│  Sécurité :  Helmet · CORS strict · Rate limiting (1s/10s/60s)          │
│              ValidationPipe (whitelist + forbidNonWhitelisted)            │
│              AuthGuard(jwt) + RolesGarde (RBAC)                          │
│                                                                          │
│  22 modules :  authentification · utilisateurs · produits · catégories   │
│                commandes · adresses · avis · paiements · recherche       │
│                chat · contact · tableau-de-bord · carrousel              │
│                parametres-site · factures · frais-port · email           │
│                images · panier · csrf · traduction · prisma              │
│                                                                          │
│  Swagger/OpenAPI :  http://localhost:4000/api/docs (dev only)            │
└──────┬──────────┬──────────┬──────────┬──────────────────────────────────┘
       │          │          │          │
       ▼          ▼          ▼          ▼
   PostgreSQL  MongoDB   Meilisearch  Stripe
   (port 5433) (port 27018) (port 7700) (API externe)
   [Prisma]    [Mongoose]
```

---

## 3. Arborescence détaillée des fichiers

### Backend (`apps/backend/`)

```
apps/backend/
├── prisma/
│   ├── schema.prisma           # Schéma complet : 19 modèles, 4 enums, relations
│   ├── seed.ts                 # Données de démonstration (13 users, 12 catégories, ~50 produits, commandes, avis)
│   └── migrations/             # 8 migrations successives
│       ├── 20260210_init
│       ├── 20260212_add_all_models
│       ├── 20260213_add_roles_and_product_fields
│       ├── 20260213_add_roles_threshold_docs
│       ├── 20260217_add_translations
│       ├── 20260219_add_category_featured
│       ├── 20260219_add_site_settings
│       └── 20260224_add_shipping_rules
├── src/
│   ├── main.ts                        # Bootstrap NestJS : Helmet, CORS, compression, Swagger, ValidationPipe
│   ├── app.module.ts                  # Module racine : imports de tous les modules + Throttler + Mongoose
│   ├── sante.controller.ts            # GET /api/health → { status: 'ok', service, timestamp }
│   ├── gardes/
│   │   └── roles.garde.ts             # Guard RBAC : vérifie le rôle de l'utilisateur via Reflector
│   ├── prisma/
│   │   ├── prisma.module.ts           # Module global PrismaService
│   │   └── prisma.service.ts          # Service Prisma avec gestion du cycle de vie (onModuleInit/onModuleDestroy)
│   ├── utils/
│   │   └── traductions.ts             # Interfaces de traduction (ProduitTraduisible, CategorieTraduisible, etc.)
│   └── modules/
│       ├── authentification/          # JWT auth avec Passport
│       │   ├── authentification.controller.ts   # 11 routes : register, login, verify-email, resend-verification, forgot/reset/change-password, 2FA (setup/verify/validate/disable)
│       │   ├── authentification.service.ts      # Logique auth : bcrypt, JWT, tokens de reset, vérification email, 2FA TOTP (otplib + QRCode)
│       │   ├── authentification.module.ts       # Imports : JwtModule, PassportModule
│       │   ├── decorateurs/
│       │   │   └── authentification.decorateurs.ts  # @UtilisateurCourant(), @Roles(), CLE_ROLES
│       │   ├── strategies/
│       │   │   └── jwt.strategie.ts             # PassportStrategy JWT : extraction Bearer, validation userId
│       │   └── dto/
│       │       └── authentification.dto.ts      # InscriptionDto, ConnexionDto, MotDePasseOublieDto, etc.
│       ├── utilisateurs/              # Gestion des comptes utilisateurs
│       │   ├── utilisateurs.controller.ts   # 12 routes : CRUD users + me + stats + role + email-change + deactivate/reactivate
│       │   ├── utilisateurs.service.ts      # findAll (paginé, filtrable), findById, update, delete, updateRole, getStats, deactivate, 2FA management
│       │   └── utilisateurs.module.ts
│       ├── produits/                  # Catalogue produits
│       │   ├── produits.controller.ts       # 15 routes : CRUD + featured + stats + slug + similar + import + check-availability + export + bulk actions
│       │   ├── produits.service.ts          # Filtres avancés, pagination, import CSV/Excel, export CSV/XLSX, Meilisearch sync, stock checking, bulk ops
│       │   ├── produits.module.ts
│       │   └── dto/
│       │       ├── produit.dto.ts           # CreerProduitDto, ModifierProduitDto
│       │       └── import-produit.dto.ts    # LigneImportValidee (structure d'une ligne CSV/Excel)
│       ├── categories/                # Catégories hiérarchiques
│       │   ├── categories.controller.ts     # 8 routes : CRUD + tree + slug + reorder
│       │   ├── categories.service.ts        # Arborescence parent/enfant, filtres active/featured, reorder
│       │   ├── categories.module.ts
│       │   └── dto/
│       │       └── categorie.dto.ts         # CreerCategorieDto, ModifierCategorieDto
│       ├── commandes/                 # Gestion des commandes
│       │   ├── commandes.controller.ts      # 6 routes : create + list + my + stats + detail + status
│       │   ├── commandes.service.ts         # Création (invité ou connecté), pagination, stats, workflow statut
│       │   ├── commandes.module.ts
│       │   └── dto/
│       │       └── commande.dto.ts          # CreerCommandeDto, ModifierStatutCommandeDto
│       ├── adresses/                  # Adresses de livraison
│       │   ├── adresses.controller.ts       # 5 routes CRUD isolées par utilisateur
│       │   ├── adresses.service.ts          # Vérification ownership, gestion isDefault
│       │   ├── adresses.module.ts
│       │   └── dto/
│       │       └── adresse.dto.ts           # CreerAdresseDto, ModifierAdresseDto
│       ├── avis/                      # Avis et notes produits
│       │   ├── avis.controller.ts           # 4 routes : list par produit + rating + create + delete
│       │   ├── avis.service.ts              # Contrainte 1 avis/user/produit, calcul note moyenne
│       │   ├── avis.module.ts
│       │   └── dto/
│       │       └── avis.dto.ts              # CreerAvisDto
│       ├── paiements/                 # Intégration Stripe
│       │   ├── paiements.controller.ts      # 4 routes : create-intent + create-checkout + webhook + history
│       │   ├── paiements.service.ts         # PaymentIntent, CheckoutSession, webhook verification
│       │   └── paiements.module.ts
│       ├── recherche/                 # Recherche Meilisearch
│       │   ├── recherche.controller.ts      # 3 routes : search facettée + suggest (autocomplete) + sync admin
│       │   ├── recherche.service.ts         # Indexation, recherche facettée, autocomplétion
│       │   └── recherche.module.ts
│       ├── chat/                      # Historique chatbot IA (MongoDB)
│       │   ├── chat.controller.ts           # 3 routes : list conversations + get + delete
│       │   ├── chat.service.ts              # CRUD conversations MongoDB par userId
│       │   ├── chat.module.ts
│       │   └── schemas/
│       │       └── chat-message.schema.ts   # Schéma Mongoose : userId, conversationId, role, content, model
│       ├── contact/                   # Formulaire de contact
│       │   ├── contact.controller.ts        # 6 routes : create (public) + admin CRUD + unread-count
│       │   ├── contact.service.ts           # Gestion read/resolved, comptage non lus
│       │   ├── contact.module.ts
│       │   └── dto/
│       │       └── contact.dto.ts           # EnvoyerContactDto, ModifierContactDto
│       ├── tableau-de-bord/           # Dashboard KPIs
│       │   ├── tableau-de-bord.controller.ts  # 5 routes : kpis + sales-by-category + stock-alerts + recent-orders + top-products
│       │   ├── tableau-de-bord.service.ts     # Agrégations Prisma : CA, commandes, alertes stock, top ventes
│       │   └── tableau-de-bord.module.ts
│       ├── carrousel/                 # Slides de la homepage
│       │   ├── carrousel.controller.ts      # 6 routes CRUD + filtre active + reorder
│       │   ├── carrousel.service.ts         # Gestion des slides avec traductions i18n, reorder
│       │   └── carrousel.module.ts
│       ├── parametres-site/           # Paramètres du site (clé/valeur)
│       │   ├── parametres-site.controller.ts  # 3 routes : getAll (public) + detailed (admin) + updateMany
│       │   ├── parametres-site.service.ts     # Lecture/écriture clé-valeur groupée
│       │   └── parametres-site.module.ts
│       ├── factures/                  # Factures et avoirs
│       │   ├── factures.controller.ts       # 9 routes : invoices CRUD + cancel + credit-notes + send-email + PDF download
│       │   ├── factures.service.ts          # Génération auto à la commande, annulation → avoir, envoi email, génération PDF (PDFKit)
│       │   ├── factures.module.ts
│       │   └── dto/
│       │       └── facture.dto.ts           # AnnulerFactureDto
│       ├── frais-port/                # Règles de livraison
│       │   ├── frais-port.controller.ts     # 6 routes : CRUD + calculate (public)
│       │   ├── frais-port.service.ts        # Calcul dynamique des frais selon sous-total et priorité
│       │   ├── frais-port.module.ts
│       │   └── dto/
│       │       └── regle-livraison.dto.ts   # CreerRegleLivraisonDto, ModifierRegleLivraisonDto
│       ├── email/                     # Service d'envoi d'emails
│       │   ├── email.service.ts             # Double provider : Resend (principal) + SendGrid (fallback)
│       │   └── email.module.ts              # Méthodes : sendWelcomeEmail, sendPasswordResetEmail, sendInvoiceEmail
│       ├── images/                    # Stockage images produits (MongoDB GridFS)
│       │   ├── images.controller.ts         # 3 routes : POST upload + GET serve + DELETE
│       │   ├── images.service.ts            # Upload/lecture/suppression dans MongoDB (contentType + data)
│       │   └── images.module.ts
│       ├── panier/                    # Panier serveur persisté (PostgreSQL)
│       │   ├── panier.controller.ts         # 5 routes : GET panier + POST item + PUT item/:id + DELETE item/:id + DELETE vider
│       │   ├── panier.service.ts            # getOrCreateCart, addItem, updateItem, removeItem, clearCart
│       │   ├── panier.module.ts
│       │   └── dto/
│       │       └── panier.dto.ts            # AjouterArticlePanierDto, ModifierArticlePanierDto
│       ├── csrf/                      # Protection CSRF (formulaires publics)
│       │   ├── csrf.controller.ts           # GET /api/csrf/token → token HMAC-SHA256 signé
│       │   ├── csrf.service.ts              # generateToken() + validateToken() — stateless
│       │   ├── csrf.guard.ts                # Guard NestJS : vérifie header X-CSRF-Token
│       │   └── csrf.module.ts
│       └── traduction/                # Service i18n interne (pas de routes HTTP exposées)
│           ├── traduction.service.ts        # Helpers pour récupérer les traductions selon la locale
│           └── traduction.module.ts
├── test/                              # Tests E2E backend
│   ├── app.e2e-spec.ts                # 20 tests HTTP (Supertest + JWT réel) couvrant auth, orders, payments, invoices
│   └── jest-e2e.json                  # Config Jest pour les tests e2e (rootDir .., testRegex e2e-spec.ts)
├── Dockerfile                         # Image Node.js 20-alpine pour production
├── nest-cli.json                      # Config NestJS CLI
├── package.json                       # Dépendances backend (@nestjs, prisma, stripe, mongoose, etc.)
└── tsconfig.json                      # Config TypeScript backend
```

### Frontend (`apps/frontend/`)

```
apps/frontend/
├── src/
│   ├── app/                           # Next.js App Router
│   │   ├── layout.tsx                 # Layout racine : Poppins + Inter, NextIntlClientProvider, BulleChat, Toaster, Analytics
│   │   ├── page.tsx                   # Homepage : carrousel auto-rotatif, catégories vedettes, produits mis en avant, statistiques
│   │   ├── globals.css                # Styles globaux Tailwind + CSS custom (palette Althea)
│   │   ├── rtl.css                    # Styles RTL pour les langues arabes/hébraïques
│   │   ├── api/
│   │   │   ├── chat/route.ts          # Route handler IA : OpenAI / Anthropic / mode local (streaming)
│   │   │   └── locale/route.ts        # Route handler i18n : set cookie NEXT_LOCALE (POST)
│   │   ├── auth/
│   │   │   ├── login/page.tsx         # Page de connexion avec formulaire, 2FA et redirection post-login
│   │   │   ├── register/page.tsx      # Page d'inscription (envoi email de vérification)
│   │   │   ├── verify-email/page.tsx  # Vérification de l'email via token (auto-login après succès)
│   │   │   ├── forgot-password/page.tsx   # Demande de réinitialisation de mot de passe
│   │   │   └── reset-password/page.tsx    # Réinitialisation via token envoyé par email
│   │   ├── products/
│   │   │   ├── page.tsx               # Catalogue : filtres par catégorie/prix, tri, pagination, recherche
│   │   │   └── [slug]/page.tsx        # Fiche produit : images, specs, avis, produits similaires, ajout panier
│   │   ├── cart/page.tsx              # Panier : quantités, sous-total, frais de port estimés, vérification stock temps réel
│   │   ├── checkout/
│   │   │   ├── page.tsx               # Tunnel de paiement : adresse + Stripe Checkout
│   │   │   └── confirmation/page.tsx  # Page de confirmation post-paiement
│   │   ├── contact/page.tsx           # Formulaire de contact (nom, email, sujet, message)
│   │   ├── legal/
│   │   │   ├── cgv/page.tsx           # Conditions générales de vente
│   │   │   ├── mentions/page.tsx      # Mentions légales
│   │   │   └── privacy/page.tsx       # Politique de confidentialité / RGPD
│   │   └── dashboard/
│   │       ├── layout.tsx             # Layout dashboard : sidebar responsive, navigation par rôle, déconnexion
│   │       ├── page.tsx               # Vue d'ensemble du compte (KPIs si admin)
│   │       ├── orders/
│   │       │   ├── page.tsx           # Mes commandes : historique groupé par année, recherche, filtres statut/année
│   │       │   └── settings/page.tsx  # Paramètres du profil utilisateur
│   │       ├── settings/
│   │       │   ├── page.tsx           # Paramètres du compte : profil, mot de passe, 2FA (QR code + activation/désactivation), désactivation, suppression
│   │       │   └── payment-methods/page.tsx  # Gestion des moyens de paiement Stripe
│   │       ├── chat/page.tsx          # Interface chatbot IA (conversation streaming)
│   │       ├── search/page.tsx        # Recherche avancée (Meilisearch)
│   │       └── admin/
│   │           ├── products/page.tsx      # Gestion des produits (CRUD + import CSV/Excel)
│   │           ├── categories/page.tsx    # Gestion des catégories (arborescence)
│   │           ├── orders/page.tsx        # Gestion des commandes (statuts, détails)
│   │           ├── users/page.tsx         # Gestion des utilisateurs (rôles)
│   │           ├── contacts/page.tsx      # Messages de contact (lu/résolu)
│   │           ├── invoices/page.tsx      # Factures (liste, détails, envoi email)
│   │           ├── credit-notes/page.tsx  # Avoirs (suite annulation facture)
│   │           ├── carousel/page.tsx      # Gestion des slides homepage
│   │           ├── shipping/page.tsx      # Règles de livraison (flat, free_above, custom)
│   │           └── site-settings/page.tsx # Paramètres du site (clé/valeur par groupe)
│   ├── components/
│   │   ├── barre-navigation.tsx       # Navbar responsive : logo, liens, recherche avec autocomplétion, panier, auth, i18n
│   │   ├── pied-page.tsx             # Footer : liens légaux, catégories, contact
│   │   ├── bulle-chat.tsx            # Bulle flottante → redirige vers /dashboard/chat (ou login si non connecté)
│   │   ├── bascule-langue.tsx        # Sélecteur de langue (fr/en/ar) avec dropdown
│   │   ├── garde-authentification.tsx # HOC : redirige vers /auth/login si non connecté (hydration-safe)
│   │   ├── admin/
│   │   │   └── import-produits-modal.tsx  # Modal d'import CSV/Excel : upload → preview → confirmation → résultat
│   │   └── ui/                        # Composants shadcn/ui (Radix)
│   │       ├── button.tsx             # Bouton avec variantes (default, destructive, outline, ghost, link)
│   │       ├── card.tsx               # Card, CardHeader, CardContent, CardFooter
│   │       ├── input.tsx              # Input texte stylisé
│   │       └── dropdown-menu.tsx      # Menu déroulant (Radix DropdownMenu)
│   ├── stores/
│   │   ├── authentification-store.ts  # Zustand persisté (localStorage) : user, token, login/logout/updateUser
│   │   ├── interface-store.ts         # Zustand : sidebar, theme, locale
│   │   └── atomes.ts                 # Jotai : panier (persisté localStorage), recherche, notifications, modèle chat
│   ├── lib/
│   │   ├── client-api.ts             # Client HTTP : get/post/put/patch/delete/upload avec injection JWT automatique
│   │   ├── utilitaires.ts            # cn() (clsx+twMerge), formatCurrency, formatDate, tronquer
│   │   ├── locale.ts                 # getLocale() (server) + isValidLocale() — cookie NEXT_LOCALE
│   │   ├── translations.tsx          # TranslationProvider + useTranslations() + useLocale() (custom, sans librairie)
│   │   └── rtl.ts                   # isRTL(), getDirection() — support arabe RTL
│   └── messages/
│       ├── fr.json                    # Traductions françaises (toutes les pages + composants)
│       ├── en.json                    # Traductions anglaises
│       └── ar.json                    # Traductions arabes (RTL)
├── public/images/
│   ├── Logo-ico-althea.ico           # Favicon
│   └── logo-althea-system-*.png      # Logo principal
├── e2e/                               # Tests E2E Playwright
│   ├── auth.spec.ts                   # 3 tests : login form, erreur credentials, register page
│   ├── cart.spec.ts                   # 5 tests : panier, checkout, confirmation commande
│   └── dashboard.spec.ts              # 5 tests : orders user, factures admin, orders admin
├── playwright.config.ts               # Config Playwright : baseURL :3000, webServer auto-start, chromium
├── next.config.ts                     # Config Next.js : images remotePatterns
├── tailwind.config.js                 # Palette Althea (althea-dark, althea-cta, althea-hover, etc.)
├── postcss.config.js                  # PostCSS avec Tailwind + Autoprefixer
├── package.json                       # Dépendances frontend (next, react, ai-sdk, stripe, radix, zod, etc.)
└── tsconfig.json                      # Config TS frontend avec alias @/
```

### Package partagé (`packages/shared/`)

```
packages/shared/
└── src/
    ├── index.ts                       # Ré-exporte tous les types et constantes
    ├── constants.ts                   # APP_NAME, API_ROUTES, SUPPORTED_LOCALES
    └── types/
        ├── api.ts                     # ApiResponse<T>, PaginatedResponse<T>, ApiError, SearchResult<T>
        ├── user.ts                    # User, UserRole, UserCreateInput, UserUpdateInput
        └── payment.ts                # Subscription, Payment, PricingPlan, SubscriptionStatus
```

---

## 4. Modèle de données (Prisma + MongoDB)

### Schéma PostgreSQL (Prisma) — 19 modèles

| Modèle | Table SQL | Description | Relations clés |
|---|---|---|---|
| `User` | `users` | Compte utilisateur : email unique, nom, hash bcrypt, rôle (enum), avatar, token de reset, email vérifié, 2FA TOTP (secret + enabled), compte actif/désactivé, changement email en attente | → Subscription, Payment[], Session[], Order[], Address[], Review[], Contact[], Invoice[], CreditNote[] |
| `Session` | `sessions` | Session JWT persistée : token unique, date d'expiration | → User (cascade delete) |
| `Subscription` | `subscriptions` | Abonnement Stripe : customer ID, subscription ID, price ID, statut, période | → User (1:1, cascade delete) |
| `Payment` | `payments` | Paiement Stripe : ID paiement Stripe unique, montant (centimes), devise, statut | → User (cascade delete) |
| `Category` | `categories` | Catégorie hiérarchique : nom unique, slug unique, image, position, active, featured | → Parent Category (self-relation), Children Category[], Product[], CategoryTranslation[] |
| `CategoryTranslation` | `category_translations` | Traduction i18n d'une catégorie : locale + nom + description | → Category (cascade delete). Contrainte unique : [categoryId, locale] |
| `Product` | `products` | Produit : nom, slug unique, description, prix (centimes), prix barré, devise, SKU unique, stock, seuil d'alerte, actif, featured, images[], documents[], specs (JSON), position | → Category, OrderItem[], Review[], ProductTranslation[] |
| `ProductTranslation` | `product_translations` | Traduction i18n d'un produit : locale + nom + description | → Product (cascade delete). Contrainte unique : [productId, locale] |
| `Address` | `addresses` | Adresse de livraison : prénom, nom, rue, ville, code postal, pays, téléphone, par défaut | → User (cascade delete), Order[] |
| `Order` | `orders` | Commande : utilisateur ou invité (guestEmail), statut, total/sous-total/taxe/frais de port (centimes), devise, notes | → User?, Address?, OrderItem[], Invoice? |
| `OrderItem` | `order_items` | Ligne de commande : produit, quantité, prix unitaire, total | → Order (cascade delete), Product |
| `Review` | `reviews` | Avis produit : note (1-5), commentaire | → User (cascade), Product (cascade). Contrainte unique : [userId, productId] |
| `Contact` | `contacts` | Message de contact : nom, email, sujet, message, lu, résolu | → User? |
| `SiteSetting` | `site_settings` | Paramètre du site : clé unique, valeur, label, groupe | — |
| `CarouselSlide` | `carousel_slides` | Slide carrousel : titre, sous-titre, image, lien, position, actif | → CarouselSlideTranslation[] |
| `CarouselSlideTranslation` | `carousel_slide_translations` | Traduction d'un slide : locale + titre + sous-titre | → CarouselSlide (cascade). Contrainte unique : [slideId, locale] |
| `Invoice` | `invoices` | Facture : numéro unique, montant, statut (PAID/PENDING/CANCELED), date d'émission | → Order (1:1), User?, CreditNote? |
| `CreditNote` | `credit_notes` | Avoir : numéro unique, montant, motif d'annulation, date d'émission | → Invoice (1:1), User? |
| `ShippingRule` | `shipping_rules` | Règle de livraison : type (FLAT/FREE_ABOVE/CUSTOM), montant, seuils min/max, priorité, actif | — |

### Enums

| Enum | Valeurs | Utilisation |
|---|---|---|
| `Role` | `USER`, `ADMIN`, `MODERATOR`, `MANAGER_PRODUCTS`, `MANAGER_ORDERS`, `ACCOUNTANT` | Champ `User.role` |
| `OrderStatus` | `PENDING`, `CONFIRMED`, `PROCESSING`, `SHIPPED`, `DELIVERED`, `CANCELED`, `REFUNDED` | Champ `Order.status` |
| `InvoiceStatus` | `PAID`, `PENDING`, `CANCELED` | Champ `Invoice.status` |
| `SubscriptionStatus` | `ACTIVE`, `CANCELED`, `PAST_DUE`, `TRIALING` | Champ `Subscription.status` |
| `ShippingRuleType` | `FLAT`, `FREE_ABOVE`, `CUSTOM` | Champ `ShippingRule.type` |

### Workflow des commandes

```
PENDING ──► CONFIRMED ──► PROCESSING ──► SHIPPED ──► DELIVERED
   │                                                       
   └──► CANCELED                                          
         └──► REFUNDED (si paiement déjà encaissé)       
```

### Schéma MongoDB (Mongoose) — 1 collection

| Collection | Champs | Description |
|---|---|---|
| `chat_messages` | `userId` (indexé), `conversationId` (indexé), `role` (user/assistant), `content`, `model` (openai/anthropic), `metadata`, `createdAt`, `updatedAt` | Historique des conversations du chatbot IA |

---

## 5. Système de rôles et sécurité

### Rôles détaillés

| Rôle | Description | Accès Backend | Pages Dashboard |
|---|---|---|---|
| `USER` | Utilisateur standard (client) | Profil, commandes personnelles, adresses, avis, panier, chatbot | `/dashboard`, `/dashboard/orders`, `/dashboard/chat`, `/dashboard/search`, `/dashboard/settings` |
| `MODERATOR` | Modérateur (messages de contact) | Mêmes droits que USER + accès messages contact | + `/dashboard/admin/contacts` |
| `MANAGER_PRODUCTS` | Gestionnaire produits | CRUD produits et catégories, statistiques produits, dashboard KPIs | + `/dashboard/admin/products`, `/dashboard/admin/categories` |
| `MANAGER_ORDERS` | Gestionnaire commandes | Liste et mise à jour des commandes, stats commandes, dashboard KPIs | + `/dashboard/admin/orders` |
| `ACCOUNTANT` | Comptable | Consultation stats commandes, dashboard KPIs, factures et avoirs | + `/dashboard/admin/orders` (lecture), `/dashboard/admin/invoices`, `/dashboard/admin/credit-notes` |
| `ADMIN` | Administrateur complet | Accès total à toutes les routes et fonctionnalités | Toutes les pages admin |

### Mécanisme de sécurité

1. **Authentification JWT** : `AuthGuard('jwt')` via Passport — extrait le Bearer token du header `Authorization` et valide le `userId` en base
2. **Autorisation RBAC** : `RolesGarde` — lit les rôles requis via le décorateur `@Roles()` et compare avec `user.role`
3. **Rate limiting multi-couche** (via `@nestjs/throttler`) :
   - Global : 60 req/s, 300 req/10s, 1000 req/min
   - Routes d'auth : throttles spécifiques (3-10/min selon la route)
4. **Validation des entrées** : `ValidationPipe` global avec `whitelist: true` et `forbidNonWhitelisted: true` — rejette tout champ non déclaré dans les DTOs
5. **Sécurité HTTP** : Helmet (headers sécurisés), CORS strict (origines autorisées), compression gzip
6. **Hashing** : bcrypt (12 rounds) pour les mots de passe
7. **Vérification email** : token unique envoyé à l'inscription, valide 24h, auto-login après vérification
8. **2FA TOTP** : authentification à deux facteurs via otplib (compatible Google Authenticator, Authy), QR code généré via qrcode
9. **Désactivation de compte** : soft-delete avec vérification `isActive` au login
10. **Webhook Stripe** : vérification de la signature `stripe-signature` via `rawBody`

---

## 6. API Backend — toutes les routes

Préfixe global : `/api`
Documentation interactive Swagger (dev uniquement) : `http://localhost:4000/api/docs`

### Rate limiting global

| Fenêtre | Limite |
|---|---|
| 1 seconde | 60 requêtes |
| 10 secondes | 300 requêtes |
| 1 minute | 1 000 requêtes |

---

### Health — `/api/health`

| Méthode | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/health` | Public | Retourne `{ status: 'ok', service: 'althea-api', timestamp }` |

---

### Authentification — `/api/auth`

| Méthode | Route | Auth | Throttle | Description |
|---|---|---|---|---|
| POST | `/api/auth/register` | Public | 5/min | Créer un compte (name, email, password). Envoie un email de vérification. Retourne `{ message, userId }` |
| POST | `/api/auth/login` | Public | 10/min | Connexion (email, password). Si 2FA activé → `{ requires2FA, temp_token }`. Sinon → `{ user, access_token }` |
| GET | `/api/auth/verify-email` | Public | — | Vérifier l'email via `?token=...`. Auto-login après succès → `{ access_token, user }` |
| POST | `/api/auth/resend-verification` | Public | 3/min | Renvoyer le lien de vérification email : `{ email }` |
| POST | `/api/auth/forgot-password` | Public | 3/min | Génère un token de reset et envoie un email avec le lien de réinitialisation |
| POST | `/api/auth/reset-password` | Public | 5/min | Réinitialise le mot de passe via `{ token, password }` |
| POST | `/api/auth/change-password` | JWT | 5/min | Change le mot de passe connecté via `{ currentPassword, newPassword }` |
| POST | `/api/auth/2fa/setup` | JWT | — | Générer le secret 2FA et le QR code. Retourne `{ secret, qrCode }` |
| POST | `/api/auth/2fa/verify` | JWT | — | Vérifier un code TOTP et activer le 2FA : `{ code }` |
| POST | `/api/auth/2fa/validate` | Public | 10/min | Valider le code 2FA lors du login : `{ userId, code }`. Retourne `{ access_token, user }` |
| POST | `/api/auth/2fa/disable` | JWT | — | Désactiver le 2FA (requiert un code valide) : `{ code }` |

---

### Utilisateurs — `/api/users`

Toutes les routes nécessitent un JWT.

| Méthode | Route | Rôle requis | Description |
|---|---|---|---|
| GET | `/api/users` | ADMIN | Lister les utilisateurs (paginé : `?page=1&limit=20&search=&status=active/inactive/all`) |
| GET | `/api/users/me` | Tout user | Profil de l'utilisateur connecté (sans passwordHash) |
| GET | `/api/users/stats` | ADMIN | Statistiques : total users, nouveaux ce mois, répartition par rôle |
| GET | `/api/users/confirm-email-change` | Public | Confirmer un changement d'email via `?token=...` |
| GET | `/api/users/:id` | Tout user | Profil d'un utilisateur par ID |
| PUT | `/api/users/me` | Tout user | Modifier son profil : `{ name?, email? }`. Si email changé → email de confirmation envoyé à la nouvelle adresse |
| PATCH | `/api/users/me/deactivate` | Tout user | Désactiver son propre compte (soft-delete) |
| DELETE | `/api/users/me` | Tout user | Supprimer son propre compte (cascade) |
| PUT | `/api/users/:id/role` | ADMIN | Modifier le rôle d'un utilisateur : `{ role: Role }` |
| PATCH | `/api/users/:id/deactivate` | ADMIN | Désactiver le compte d'un utilisateur |
| PATCH | `/api/users/:id/reactivate` | ADMIN | Réactiver le compte d'un utilisateur |
| DELETE | `/api/users/:id` | ADMIN | Supprimer un utilisateur |

---

### Produits — `/api/products`

| Méthode | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/products` | Public | Liste paginée avec filtres multiples (voir paramètres ci-dessous) |
| GET | `/api/products/featured` | Public | Produits mis en avant (`?limit=8`, défaut : 8) |
| GET | `/api/products/stats` | ADMIN, MANAGER_PRODUCTS | Stats : total, actifs, rupture de stock, valeur du stock |
| POST | `/api/products/import/preview` | ADMIN, MANAGER_PRODUCTS | Upload CSV/Excel (multipart, max 5 Mo) → prévisualisation avec validation ligne par ligne |
| POST | `/api/products/import/confirm` | ADMIN, MANAGER_PRODUCTS | Confirmer et exécuter l'import des lignes validées |
| GET | `/api/products/:id` | Public | Détail d'un produit par ID (avec catégorie, traductions, avis) |
| GET | `/api/products/slug/:slug` | Public | Détail d'un produit par slug |
| GET | `/api/products/:id/similar` | Public | Produits similaires (même catégorie) |
| POST | `/api/products/check-availability` | Public | Vérifier la disponibilité de stock : `{ items: [{ productId, quantity }] }` |
| GET | `/api/products/export` | ADMIN, MANAGER_PRODUCTS | Exporter les produits en CSV ou XLSX : `?format=csv&ids=...` |
| PATCH | `/api/products/bulk/status` | ADMIN, MANAGER_PRODUCTS | Modifier le statut en masse : `{ ids: string[], active: boolean }` |
| PATCH | `/api/products/bulk/category` | ADMIN, MANAGER_PRODUCTS | Changer la catégorie en masse : `{ ids: string[], categoryId: string }` |
| DELETE | `/api/products/bulk` | ADMIN, MANAGER_PRODUCTS | Supprimer en masse : `{ ids: string[] }` |
| POST | `/api/products` | ADMIN, MANAGER_PRODUCTS | Créer un produit (avec traductions optionnelles, slug SEO personnalisable) |
| PUT | `/api/products/:id` | ADMIN, MANAGER_PRODUCTS | Modifier un produit |
| DELETE | `/api/products/:id` | ADMIN, MANAGER_PRODUCTS | Supprimer un produit |

**Paramètres de filtre (GET /api/products)** :

| Paramètre | Type | Défaut | Description |
|---|---|---|---|
| `page` | number | 1 | Numéro de page |
| `limit` | number | 20 | Résultats par page |
| `categoryId` | string | — | Filtrer par catégorie |
| `search` | string | — | Recherche textuelle dans le nom et la description |
| `featured` | `true` | — | Uniquement les produits mis en avant |
| `active` | `true` / `false` / `all` | `true` | Statut d'activation |
| `sortBy` | string | — | Champ de tri (name, price, createdAt, stock, position) |
| `sortOrder` | `asc` / `desc` | — | Ordre de tri |
| `minPrice` | number | — | Prix minimum en centimes |
| `maxPrice` | number | — | Prix maximum en centimes |

---

### Catégories — `/api/categories`

| Méthode | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/categories` | Public | Lister les catégories (`?active=true&featured=true`) |
| GET | `/api/categories/tree` | Public | Arborescence hiérarchique complète (parent → enfants récursifs) |
| GET | `/api/categories/:id` | Public | Catégorie par ID (avec traductions et comptage produits) |
| GET | `/api/categories/slug/:slug` | Public | Catégorie par slug |
| POST | `/api/categories` | ADMIN, MANAGER_PRODUCTS | Créer une catégorie : `{ name, slug?, description?, image?, parentId?, position?, active?, featured? }` |
| PUT | `/api/categories/reorder` | ADMIN, MANAGER_PRODUCTS | Réordonner les catégories : `{ ids: string[] }` |
| PUT | `/api/categories/:id` | ADMIN, MANAGER_PRODUCTS | Modifier une catégorie |
| DELETE | `/api/categories/:id` | ADMIN, MANAGER_PRODUCTS | Supprimer une catégorie (vérifie absence de produits liés) |

---

### Commandes — `/api/orders`

| Méthode | Route | Auth | Description |
|---|---|---|---|
| POST | `/api/orders` | JWT | Créer une commande (utilisateur connecté). Inclut items, adresse, notes |
| GET | `/api/orders` | ADMIN, MANAGER_ORDERS | Toutes les commandes (paginé : `?page=1&limit=20&status=PENDING`) |
| GET | `/api/orders/my` | JWT | Mes commandes personnelles (filtrable : `?year=2026&status=DELIVERED&search=...`) |
| GET | `/api/orders/stats` | ADMIN, MANAGER_ORDERS, ACCOUNTANT | Stats : total commandes, CA, panier moyen, répartition par statut |
| GET | `/api/orders/:id/confirmation` | JWT (propriétaire) | Confirmation de commande (vérifie que l'utilisateur est le propriétaire) |
| GET | `/api/orders/:id` | JWT | Détails d'une commande (avec items, adresse, user) |
| PUT | `/api/orders/:id/status` | ADMIN, MANAGER_ORDERS | Changer le statut : `{ status: OrderStatus }` |

---

### Adresses — `/api/addresses`

Toutes les routes nécessitent un JWT. Les adresses sont **isolées par utilisateur** (vérification `userId` systématique).

| Méthode | Route | Description |
|---|---|---|
| POST | `/api/addresses` | Ajouter une adresse : `{ label?, firstName, lastName, street, city, postalCode, country?, phone?, isDefault? }` |
| GET | `/api/addresses` | Lister mes adresses |
| GET | `/api/addresses/:id` | Détails d'une adresse (vérifie ownership) |
| PUT | `/api/addresses/:id` | Modifier une adresse |
| DELETE | `/api/addresses/:id` | Supprimer une adresse |

---

### Avis — `/api/reviews`

| Méthode | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/reviews/product/:productId` | Public | Tous les avis d'un produit (avec nom de l'auteur) |
| GET | `/api/reviews/product/:productId/rating` | Public | Note moyenne et nombre d'avis |
| POST | `/api/reviews` | JWT | Laisser un avis : `{ productId, rating (1-5), comment? }`. 1 seul avis par user par produit |
| DELETE | `/api/reviews/:id` | JWT | Supprimer son propre avis (vérifie ownership) |

---

### Paiements — `/api/payments`

| Méthode | Route | Auth | Description |
|---|---|---|---|
| POST | `/api/payments/create-intent` | JWT | Créer un Stripe PaymentIntent pour une commande : `{ orderId }` |
| POST | `/api/payments/confirm-order` | JWT | Confirmer une commande après paiement Stripe réussi : `{ orderId }` |
| POST | `/api/payments/create-checkout` | JWT | Créer une session Stripe Checkout : `{ priceId }` |
| POST | `/api/payments/webhook` | Public (signature Stripe) | Webhook Stripe : vérifie `stripe-signature` via `rawBody`, traite les événements de paiement |
| POST | `/api/payments/refund` | ADMIN, MANAGER_ORDERS | Rembourser une commande via Stripe : `{ orderId }` |
| POST | `/api/payments/methods/setup` | JWT | Créer un SetupIntent pour ajouter une nouvelle carte : retourne `{ client_secret }` |
| GET | `/api/payments/methods` | JWT | Lister les méthodes de paiement sauvegardées (cartes Stripe) |
| DELETE | `/api/payments/methods/:id` | JWT | Supprimer une méthode de paiement |
| PUT | `/api/payments/methods/:id/default` | JWT | Définir une méthode de paiement comme défaut |
| GET | `/api/payments/history` | JWT | Historique de tous les paiements de l'utilisateur connecté |

---

### Recherche — `/api/search`

Moteur : **Meilisearch v1.11** — recherche full-text, facettes, tri, autocomplétion.

| Méthode | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/search` | Public | Recherche facettée de produits (voir paramètres ci-dessous) |
| GET | `/api/search/suggest` | Public | Autocomplétion : max 6 résultats, min 2 caractères (`?q=stetho&limit=6`) |
| POST | `/api/search/sync` | ADMIN | Synchroniser tous les produits actifs vers l'index Meilisearch |

**Paramètres (GET /api/search)** :

| Paramètre | Type | Description |
|---|---|---|
| `q` | string | Texte de recherche |
| `categoryId` | string | Filtrer par catégorie |
| `minPrice` | number | Prix minimum (centimes) |
| `maxPrice` | number | Prix maximum (centimes) |
| `availableOnly` | `true`/`false` | Exclure les produits en rupture de stock |
| `sortBy` | `price` / `createdAt` / `stock` / `position` | Champ de tri |
| `sortOrder` | `asc` / `desc` | Ordre de tri |
| `page` | number | Numéro de page (défaut : 1) |
| `limit` | number | Résultats par page (défaut : 20) |

---

### Chat — `/api/chat`

Toutes les routes nécessitent un JWT. L'historique est stocké dans MongoDB (collection `chat_messages`).

| Méthode | Route | Description |
|---|---|---|
| GET | `/api/chat/conversations` | Lister toutes mes conversations (triées par date) |
| GET | `/api/chat/conversations/:conversationId` | Messages d'une conversation spécifique |
| DELETE | `/api/chat/conversations/:conversationId` | Supprimer une conversation et tous ses messages |

---

### Contact — `/api/contact`

| Méthode | Route | Auth | Description |
|---|---|---|---|
| POST | `/api/contact` | Public (ou JWT) | Envoyer un message : `{ name, email, subject, message }`. Si connecté, lie au `userId` |
| GET | `/api/contact` | ADMIN | Lister les messages (paginé, `?unread=true` pour filtrer les non lus) |
| GET | `/api/contact/unread-count` | ADMIN | Nombre de messages non lus |
| GET | `/api/contact/:id` | ADMIN | Détails d'un message |
| PUT | `/api/contact/:id` | ADMIN | Marquer comme lu / résolu : `{ read?, resolved? }` |
| DELETE | `/api/contact/:id` | ADMIN | Supprimer un message |

---

### Tableau de bord — `/api/dashboard`

Toutes les routes requièrent : `ADMIN`, `MANAGER_PRODUCTS`, `MANAGER_ORDERS` ou `ACCOUNTANT`.

| Méthode | Route | Description |
|---|---|---|
| GET | `/api/dashboard/kpis` | KPIs globaux : chiffre d'affaires, nombre de commandes, nouveaux utilisateurs, produits en stock |
| GET | `/api/dashboard/sales-by-category` | Ventes par catégorie sur les N derniers jours (`?days=7`, défaut : 7) |
| GET | `/api/dashboard/stock-alerts` | Produits dont le stock est inférieur au seuil `lowStockThreshold` (`?limit=10`) |
| GET | `/api/dashboard/recent-orders` | Dernières commandes (`?limit=10`) |
| GET | `/api/dashboard/top-products` | Produits les plus vendus (`?limit=5&days=30`) |

---

### Carrousel — `/api/carousel-slides`

| Méthode | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/carousel-slides` | Public | Liste des slides (`?active=true` pour filtrer les actifs) |
| GET | `/api/carousel-slides/:id` | Public | Détail d'un slide (avec traductions) |
| POST | `/api/carousel-slides` | ADMIN | Créer un slide : `{ title, subtitle?, image, link?, position?, active? }` |
| PUT | `/api/carousel-slides/reorder` | ADMIN | Réordonner les slides : `{ ids: string[] }` |
| PUT | `/api/carousel-slides/:id` | ADMIN | Modifier un slide |
| DELETE | `/api/carousel-slides/:id` | ADMIN | Supprimer un slide |

---

### Paramètres du site — `/api/site-settings`

| Méthode | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/site-settings` | Public | Tous les paramètres sous forme `{ clé: valeur }` (utilisé par la homepage) |
| GET | `/api/site-settings/detailed` | ADMIN | Paramètres avec métadonnées : label, groupe, mise à jour |
| PUT | `/api/site-settings` | ADMIN | Mettre à jour en batch : `{ settings: [{ key, value }] }` |

---

### Factures — `/api/invoices`

| Méthode | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/invoices` | ADMIN, ACCOUNTANT | Lister les factures (paginé : `?page=1&limit=20&status=PAID`) |
| GET | `/api/invoices/:id` | ADMIN, ACCOUNTANT | Détail d'une facture (avec commande et lignes associées) |
| GET | `/api/invoices/:id/pdf` | ADMIN, ACCOUNTANT | Télécharger la facture en PDF (généré avec PDFKit) |
| POST | `/api/invoices/:id/send-email` | ADMIN | Renvoyer la facture par email au client |
| POST | `/api/invoices/:id/cancel` | ADMIN | Annuler une facture : crée automatiquement un avoir. Body : `{ reason }` |

---

### Avoirs — `/api/credit-notes`

| Méthode | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/credit-notes` | ADMIN, ACCOUNTANT | Lister les avoirs (paginé) |
| GET | `/api/credit-notes/:id` | ADMIN, ACCOUNTANT | Détail d'un avoir |
| GET | `/api/credit-notes/:id/pdf` | ADMIN, ACCOUNTANT | Télécharger l'avoir en PDF (généré avec PDFKit) |
| POST | `/api/credit-notes/:id/send-email` | ADMIN | Envoyer l'avoir par email au client |

---

### Frais de port — `/api/shipping-rules`

| Méthode | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/shipping-rules` | Public | Lister toutes les règles de livraison actives |
| GET | `/api/shipping-rules/calculate` | Public | Calculer les frais pour un sous-total : `?subtotal=15000` (centimes) |
| GET | `/api/shipping-rules/:id` | ADMIN | Détail d'une règle |
| POST | `/api/shipping-rules` | ADMIN | Créer une règle : `{ label, type, amount?, minSubtotal?, maxSubtotal?, message?, priority?, active? }` |
| PUT | `/api/shipping-rules/:id` | ADMIN | Modifier une règle |
| DELETE | `/api/shipping-rules/:id` | ADMIN | Supprimer une règle |

**Types de règles** :
- `FLAT` : montant fixe de frais de port
- `FREE_ABOVE` : gratuit au-dessus d'un sous-total minimum
- `CUSTOM` : règle personnalisée avec seuils min/max

---

### Images — `/api/images`

Stockage des images produits dans MongoDB (GridFS). Les URLs `/api/images/:id` sont référencées dans le champ `images[]` des produits.

| Méthode | Route | Auth | Description |
|---|---|---|---|
| POST | `/api/images` | ADMIN, MANAGER_PRODUCTS | Uploader une image (multipart, max 5 Mo, formats : jpeg/png/webp/gif). Retourne `{ id, url }` |
| GET | `/api/images/:id` | Public | Servir une image depuis MongoDB. Headers : `Content-Type` + `Cache-Control: public, max-age=31536000` |
| DELETE | `/api/images/:id` | ADMIN, MANAGER_PRODUCTS | Supprimer une image |

---

### CSRF — `/api/csrf`

Protection CSRF pour les formulaires publics (contact, escalade chatbot). Token HMAC-SHA256 stateless, validé via le header `X-CSRF-Token`.

| Méthode | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/csrf/token` | Public | Obtenir un token CSRF signé (valable pour la session) |

---

### Panier — `/api/cart`

Panier serveur persisté pour les utilisateurs authentifiés. Toutes les routes requièrent un JWT.

| Méthode | Endpoint | Rôle | Description |
|---------|----------|------|-------------|
| GET | `/api/cart` | USER | Récupérer le panier courant (créé automatiquement si inexistant) |
| POST | `/api/cart/items` | USER | Ajouter un article : `{ productId, quantity? }` |
| PUT | `/api/cart/items/:id` | USER | Modifier la quantité d'un article : `{ quantity }` |
| DELETE | `/api/cart/items/:id` | USER | Supprimer un article |
| DELETE | `/api/cart` | USER | Vider le panier |

**Note** : Le frontend synchronise le panier localStorage avec le serveur lorsque l'utilisateur est connecté. Le panier localStorage reste utilisé pour les visiteurs non connectés.

---

## 7. Pages Frontend

### Pages publiques

| Route | Description | Données chargées |
|---|---|---|
| `/` | Homepage : carrousel auto-rotatif (5s), accroche avec stats configurables, grille de catégories vedettes, produits mis en avant, bandeau de confiance | Slides carousel, catégories featured, produits featured, site settings |
| `/products` | Catalogue complet : filtres (catégorie, prix min/max), tri, pagination, barre de recherche | GET /api/products avec paramètres |
| `/products/[slug]` | Fiche produit : galerie images, description, spécifications JSON, avis avec note moyenne, produits similaires, bouton ajout panier | GET /api/products/slug/:slug, reviews, similar |
| `/cart` | Panier côté client (Jotai atoms persistés dans localStorage) : modification quantités, suppression, sous-total, estimation frais de port, **vérification stock temps réel** avec alertes de rupture | Données locales + GET /api/shipping-rules/calculate + POST /api/products/check-availability |
| `/checkout` | Tunnel de paiement : sélection adresse de livraison, récapitulatif, paiement Stripe (Checkout Session ou PaymentIntent) | Adresses utilisateur, création commande, session Stripe |
| `/checkout/confirmation` | Page de confirmation post-paiement avec récapitulatif de commande | GET /api/orders/:id/confirmation |
| `/contact` | Formulaire de contact : nom, email, sujet, message | POST /api/contact |
| `/legal/cgv` | Conditions générales de vente (contenu statique) | — |
| `/legal/mentions` | Mentions légales (contenu statique) | — |
| `/legal/privacy` | Politique de confidentialité / RGPD (contenu statique) | — |

### Pages d'authentification

| Route | Description | API utilisée |
|---|---|---|
| `/auth/login` | Formulaire de connexion (email + mot de passe + 2FA). Redirection post-login vers la page privée d'origine | POST /api/auth/login, POST /api/auth/2fa/validate |
| `/auth/register` | Formulaire d'inscription (nom, email, mot de passe). Envoi d'un email de vérification | POST /api/auth/register |
| `/auth/verify-email` | Vérification automatique de l'email via token. Auto-login et redirection après succès | GET /api/auth/verify-email |
| `/auth/forgot-password` | Saisie de l'email pour recevoir le lien de réinitialisation | POST /api/auth/forgot-password |
| `/auth/reset-password` | Formulaire de nouveau mot de passe (token reçu par email en query string) | POST /api/auth/reset-password |

### Dashboard utilisateur (protégé par `GardeAuthentification`)

| Route | Description | API utilisée |
|---|---|---|
| `/dashboard` | Vue d'ensemble : nom, email, rôle. Si staff → KPIs du tableau de bord | GET /api/dashboard/kpis (si admin) |
| `/dashboard/orders` | Historique de mes commandes : **groupé par année**, recherche, filtres par année et statut | GET /api/orders/my?year=&status=&search= |
| `/dashboard/settings` | Paramètres du compte : profil, mot de passe, **2FA** (QR code + activation/désactivation), désactivation de compte, suppression | GET/PUT /api/users/me, POST /api/auth/2fa/*, PATCH /api/users/me/deactivate |
| `/dashboard/settings/payment-methods` | Gestion des moyens de paiement Stripe | Stripe API |
| `/dashboard/chat` | Interface chatbot IA : conversation en streaming, choix du modèle (OpenAI/Anthropic), historique | POST /api/chat (Next.js), GET/DELETE /api/chat/conversations |
| `/dashboard/search` | Recherche avancée via Meilisearch avec facettes et autocomplétion | GET /api/search, GET /api/search/suggest |

### Dashboard admin (filtré par rôle dans le layout sidebar)

| Route | Rôles | Description |
|---|---|---|
| `/dashboard/admin/products` | ADMIN, MANAGER_PRODUCTS | CRUD produits : tableau paginé, création/édition avec formulaire complet, import CSV/Excel via modal |
| `/dashboard/admin/categories` | ADMIN, MANAGER_PRODUCTS | CRUD catégories : arborescence parent/enfant, gestion featured/active, **réorganisation** (monter/descendre) |
| `/dashboard/admin/orders` | ADMIN, MANAGER_ORDERS, ACCOUNTANT | Gestion des commandes : changement de statut, détails avec lignes, filtres par statut |
| `/dashboard/admin/users` | ADMIN | Gestion des utilisateurs : liste paginée, changement de rôle, suppression |
| `/dashboard/admin/contacts` | ADMIN, MODERATOR | Messages de contact : marquage lu/résolu, compteur non lus |
| `/dashboard/admin/invoices` | ADMIN, ACCOUNTANT | Liste des factures : détails, envoi par email, annulation |
| `/dashboard/admin/credit-notes` | ADMIN, ACCOUNTANT | Liste des avoirs (créés automatiquement lors de l'annulation d'une facture) |
| `/dashboard/admin/carousel` | ADMIN | Gestion des slides du carrousel homepage + **réorganisation** (monter/descendre) |
| `/dashboard/admin/shipping` | ADMIN | Gestion des règles de livraison (FLAT, FREE_ABOVE, CUSTOM) |
| `/dashboard/admin/site-settings` | ADMIN | Paramètres du site en clé/valeur groupés (tagline, stats affichées, etc.) |

### Routes API Next.js (route handlers)

| Route | Méthode | Description |
|---|---|---|
| `/api/chat` | POST | Proxy IA : sélectionne le modèle (Anthropic Claude Sonnet → OpenAI GPT-4o → mode local), streaming via Vercel AI SDK |
| `/api/locale` | POST | Persiste la locale choisie dans un cookie `NEXT_LOCALE` (durée : 1 an) |

---

## 8. Gestion d'état côté client

### Zustand (stores persistés)

| Store | Fichier | Rôle | Persistance |
|---|---|---|---|
| `useAuthentificationStore` | `stores/authentification-store.ts` | Gère `user`, `token`, `isAuthenticated`, `login()`, `logout()`, `updateUser()` | localStorage (`althea-auth`) |
| `useInterfaceStore` | `stores/interface-store.ts` | Gère `sidebarOpen`, `theme` (light/dark/system), `locale` | Mémoire (non persisté) |

### Jotai (atoms)

| Atom | Fichier | Rôle | Persistance |
|---|---|---|---|
| `atomeArticlesPanier` | `stores/atomes.ts` | Tableau des articles du panier avec quantités | localStorage (`althea-cart`) |
| `atomeTotalPanier` | `stores/atomes.ts` | Atom dérivé : calcul automatique du total du panier | — |
| `atomeRequeteRecherche` | `stores/atomes.ts` | Texte de recherche en cours | Mémoire |
| `atomeResultatsRecherche` | `stores/atomes.ts` | Résultats de recherche | Mémoire |
| `atomeChargementRecherche` | `stores/atomes.ts` | État de chargement de la recherche | Mémoire |
| `atomeNotifications` | `stores/atomes.ts` | Tableau de notifications `{ id, message, type }` | Mémoire |
| `atomeModeleChat` | `stores/atomes.ts` | Modèle IA sélectionné (`openai` ou `anthropic`) | localStorage (`althea-chat-model`) |

---

## 9. Composants réutilisables

### Composants globaux

| Composant | Fichier | Description |
|---|---|---|
| `Navbar` / `BarreNavigation` | `barre-navigation.tsx` | Barre de navigation responsive : logo, liens (Accueil, Produits, Contact), barre de recherche avec **autocomplétion live** (appel `/api/search/suggest` avec debounce, navigation clavier), compteur panier, boutons auth/compte, sélecteur de langue |
| `Footer` | `pied-page.tsx` | Pied de page : liens légaux (CGV, mentions, confidentialité), catégories, informations de contact |
| `BulleChat` | `bulle-chat.tsx` | Bulle flottante (coin bas-droit) : icône MessageCircle, masquée sur les pages dashboard, redirige vers `/dashboard/chat` (ou `/auth/login` si non connecté) |
| `BasculeLangue` | `bascule-langue.tsx` | Dropdown de sélection de langue (fr/en/ar) : appelle `/api/locale` puis recharge la page |
| `GardeAuthentification` | `garde-authentification.tsx` | HOC de protection : vérifie hydratation du store Zustand, redirige vers `/auth/login?redirect=...` si non authentifié (avec retour automatique après login), affiche spinner pendant la vérification |
| `ImportProduitsModal` | `admin/import-produits-modal.tsx` | Modal d'import CSV/Excel : drag & drop, upload (max 5 Mo), preview des lignes avec erreurs, confirmation, résultat (succès/échecs) |

### Composants UI (shadcn/ui + Radix)

| Composant | Description |
|---|---|
| `Button` | Bouton avec variantes via CVA : `default`, `destructive`, `outline`, `secondary`, `ghost`, `link` + tailles `default`, `sm`, `lg`, `icon` |
| `Card` | Container : `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter` |
| `Input` | Champ texte stylisé Tailwind avec états focus/disabled |
| `DropdownMenu` | Menu déroulant Radix : `DropdownMenu`, `DropdownMenuTrigger`, `DropdownMenuItem`, `DropdownMenuSeparator`, etc. |

L'application utilise également de nombreux composants Radix UI installés : Accordion, AlertDialog, Avatar, Checkbox, Dialog, Label, NavigationMenu, Popover, ScrollArea, Select, Separator, Slot, Switch, Tabs, Toast, Tooltip.

---

## 10. Package partagé (`packages/shared`)

Ce package npm interne (`@althea/shared`) centralise les **types TypeScript** et **constantes** utilisés par le frontend et le backend, garantissant la cohérence des interfaces.

### Types

| Type | Fichier | Description |
|---|---|---|
| `ApiResponse<T>` | `types/api.ts` | Réponse standard : `{ data: T, message?, success }` |
| `PaginatedResponse<T>` | `types/api.ts` | Réponse paginée : `{ data: T[], meta: { total, page, limit, totalPages } }` |
| `ApiError` | `types/api.ts` | Erreur API : `{ statusCode, message, error? }` |
| `SearchResult<T>` | `types/api.ts` | Résultat de recherche : `{ hits: T[], total, provider }` |
| `User` | `types/user.ts` | Interface utilisateur : id, name, email, role, avatar, emailVerified, dates |
| `UserRole` | `types/user.ts` | `'USER' \| 'ADMIN' \| 'MODERATOR'` |
| `UserCreateInput` / `UserUpdateInput` | `types/user.ts` | DTOs de création/modification utilisateur |
| `Subscription` | `types/payment.ts` | Abonnement Stripe avec statut et période |
| `Payment` | `types/payment.ts` | Paiement Stripe avec montant, devise, statut |
| `PricingPlan` | `types/payment.ts` | Plan tarifaire : nom, prix, intervalle, features, stripePriceId |
| `SubscriptionStatus` | `types/payment.ts` | `'ACTIVE' \| 'CANCELED' \| 'PAST_DUE' \| 'TRIALING'` |

### Constantes

| Constante | Description |
|---|---|
| `APP_NAME` | `'Althea System'` |
| `APP_VERSION` | `'1.0.0'` |
| `API_ROUTES` | Objet avec toutes les routes API typées (AUTH, USERS, PAYMENTS, SEARCH, CHAT, HEALTH) |
| `SUPPORTED_LOCALES` | `['fr', 'en']` |
| `DEFAULT_LOCALE` | `'fr'` |

---

## 11. Assistant IA (chatbot)

Le chatbot est accessible via une **bulle flottante** sur toutes les pages (composant `BulleChat`) et via la page `/dashboard/chat` pour les utilisateurs connectés.

### Architecture

```
┌── Navigateur ──────────────────────────────────────┐
│  Page /dashboard/chat                               │
│  └─ useChat() (Vercel AI SDK React)                │
│     └─ POST /api/chat  (Next.js route handler)     │
│        ├─ model='anthropic' + ANTHROPIC_API_KEY     │
│        │  → Claude Sonnet (streaming)               │
│        ├─ model='openai' + OPENAI_API_KEY           │
│        │  → GPT-4o (streaming)                      │
│        └─ Aucune clé API                            │
│           → Mode local (mots-clés)                  │
└── Backend NestJS ───────────────────────────────────┘
  └─ GET/DELETE /api/chat/conversations               
     └─ MongoDB (chat_messages)                       
```

### Fonctionnement détaillé (`/api/chat`)

1. **Si `ANTHROPIC_API_KEY` est configurée** et que le client demande `model: "anthropic"` → utilise **Claude Sonnet** via `@ai-sdk/anthropic` (streaming)
2. **Si `OPENAI_API_KEY` est configurée** → utilise **GPT-4o** via `@ai-sdk/openai` (streaming)
3. **Sinon → mode local** : correspondance par mots-clés dans une base de connaissances intégrée, aucune clé API requise

### Prompt système

> « Tu es Althea, un assistant intelligent pour la plateforme Althea System (vente d'équipements médicaux professionnels). Tu réponds en français, de manière claire, concise et utile. Tu connais notre catalogue : stéthoscopes, tensiomètres, otoscopes, oxymètres, mobilier médical, consommables et plus. »

### Base de connaissances locale (14 thèmes)

Le mode local couvre les sujets suivants sans aucune API externe :

| Thème | Mots-clés détectés |
|---|---|
| Livraison | livraison, frais, shipping, expedition, port |
| Retours | retour, renvoi, remboursement, echange |
| Paiements | paiement, carte, virement, stripe |
| Compte | compte, inscription, profil, mot de passe, connexion |
| Commandes | commande, suivi, statut, order |
| Produits | produit, catalogue, article, equipement, medical |
| Prix / TVA | prix, ht, ttc, tva, tarif, promo |
| Contact | contact, telephone, email, support, aide |
| Stock | stock, disponible, rupture, disponibilite |
| Factures | facture, comptabilite, justificatif, devis |
| Présentation | althea, qui, quoi, presentation, entreprise |
| RGPD | rgpd, donnees, confidentialite, cookie |
| Salutations | bonjour, salut, hello, hey, coucou |
| Remerciements | merci, thanks, super, parfait, genial |

### Stockage de l'historique

L'historique des conversations est persisté dans MongoDB via le backend NestJS (collection `chat_messages`). Chaque message stocke : `userId`, `conversationId`, `role` (user/assistant), `content`, `model` utilisé, et `metadata` optionnelles.

---

## 12. Internationalisation (i18n)

### Langues supportées

| Code | Langue | Direction | Fichier de traduction |
|---|---|---|---|
| `fr` | Français | LTR | `apps/frontend/src/messages/fr.json` |
| `en` | English | LTR | `apps/frontend/src/messages/en.json` |
| `ar` | العربية | **RTL** | `apps/frontend/src/messages/ar.json` |

### Implémentation

- **Librairie** : système **custom** — aucune dépendance externe (`src/lib/translations.tsx`)
- **Locale par défaut** : `en` (fallback quand le cookie `NEXT_LOCALE` est absent)
- **URLs** : sans préfixe — les URLs restent `/products` et non `/fr/products`
- **Persistance** : cookie `NEXT_LOCALE` (durée 1 an) via le route handler `POST /api/locale`
- **Support RTL** : activé automatiquement pour l'arabe via `dir="rtl"` sur `<html>` + fichier `rtl.css`
- **Composant de bascule** : `BasculeLangue` (dropdown avec drapeaux/labels)

### Traductions côté backend

Les entités suivantes ont des **traductions multilingues** stockées en base de données :

| Entité | Table de traduction | Champs traduits |
|---|---|---|
| Product | `product_translations` | `name`, `description` |
| Category | `category_translations` | `name`, `description` |
| CarouselSlide | `carousel_slide_translations` | `title`, `subtitle` |

La locale est passée en header ou query param par le frontend, et le backend retourne les traductions correspondantes.

---

## 13. Service d'emails

Le module `EmailService` (`apps/backend/src/modules/email/`) gère l'envoi de tous les emails transactionnels.

### Double provider

| Provider | Configuration | Priorité |
|---|---|---|
| **Resend** | `RESEND_API_KEY` | Principal (par défaut) |
| **SendGrid** | `SENDGRID_API_KEY` | Fallback (si `EMAIL_PROVIDER=sendgrid`) |

### Emails envoyés

| Email | Déclencheur | Template |
|---|---|---|
| Email de bienvenue | Inscription d'un nouvel utilisateur | HTML inline : titre + message d'accueil |
| Réinitialisation mot de passe | Demande via `/api/auth/forgot-password` | HTML inline : lien de reset (expire en 1h) |
| Facture client | Envoi/renvoi via `/api/invoices/:id/send-email` | HTML avec numéro de facture, nom client |
| Avoir client | Envoi via `/api/credit-notes/:id/send-email` | HTML avec numéro d'avoir |

---

## 14. Import CSV/Excel de produits

Le module produits inclut un système complet d'**import en masse** depuis des fichiers CSV ou Excel (.xlsx).

### Workflow

1. **Upload** : l'admin uploade un fichier via la modal `ImportProduitsModal` (max 5 Mo, formats CSV/XLSX)
2. **Prévisualisation** : `POST /api/products/import/preview` — parse le fichier avec **ExcelJS**, valide chaque ligne (nom, prix, stock, SKU, catégorie), retourne les lignes avec leurs erreurs éventuelles
3. **Confirmation** : l'admin voit le résumé (X lignes valides, Y erreurs) et peut confirmer
4. **Exécution** : `POST /api/products/import/confirm` — crée les produits en base, retourne le résultat (succès/échecs/IDs créés)

### Validation par ligne

Chaque ligne est validée sur : nom non vide, prix > 0, stock >= 0, SKU unique, correspondance catégorie existante.

---

## 15. Infrastructure Docker

Le fichier `docker-compose.yml` définit **5 services** :

| Service | Image | Port exposé | Port interne | Volume | Healthcheck |
|---|---|---|---|---|---|
| `postgres` | `postgres:16-alpine` | **5433** | 5432 | `postgres-data` | `pg_isready` |
| `mongodb` | `mongo:7` | **27018** | 27017 | `mongodb-data` | `mongosh ping` |
| `meilisearch` | `getmeili/meilisearch:v1.11` | **7700** | 7700 | `meilisearch-data` | `curl /health` |
| `redis` | `redis:7-alpine` | **6379** | 6379 | `redis-data` | `redis-cli ping` |
| `backend` | Build local (`Dockerfile`) | **4000** | 4000 | — | — |

### Configuration Docker

- **Restart policy** : `unless-stopped` pour tous les services
- **Healthchecks** : intervalle 10s, timeout 5s, 5 retries
- **Volumes nommés** : données persistées entre les redémarrages
- **Credentials dev** :
  - PostgreSQL : `althea_user` / `althea_password` / base `althea`
  - MongoDB : `althea_user` / `althea_password` / base `althea`
  - Meilisearch : master key `althea-meili-master-key`

---

## 16. Installation et démarrage

### Prérequis

- **Node.js** >= 20, **npm** >= 10
- **Docker** & **Docker Compose**
- Comptes optionnels : Stripe, OpenAI ou Anthropic, Resend ou SendGrid

### Étapes

```bash
# 1. Cloner le dépôt
git clone <repo-url> althea-system
cd althea-system

# 2. Installer les dépendances (tous les workspaces)
npm install

# 3. Configurer les variables d'environnement
cp apps/frontend/.env.example apps/frontend/.env.local
cp apps/backend/.env.example apps/backend/.env
# → remplir les clés API dans chaque fichier .env

# 4. Démarrer les services Docker (PostgreSQL, MongoDB, Meilisearch, Redis)
docker-compose up -d

# 5. Initialiser la base de données
cd apps/backend
npx prisma migrate dev     # Appliquer les migrations
npx prisma generate        # Générer le client Prisma
npx prisma db seed         # (optionnel) Données de démonstration : 13 users, 12 catégories, ~50 produits

# 6. Lancer le développement (frontend + backend en parallèle via Turborepo)
cd ../..
npm run dev
```

### Comptes de demo (après seed)

| Email | Mot de passe | Rôle |
|---|---|---|
| `admin@althea-system.fr` | `Password123!` | ADMIN |
| `moderateur@althea-system.fr` | `Password123!` | MODERATOR |
| `client@althea-system.fr` | `Password123!` | USER |
| `dr.martin@cabinet-martin.fr` | `Password123!` | USER |

### URLs locales

| Service | URL |
|---|---|
| Frontend (Next.js + Turbopack) | http://localhost:3000 |
| API Backend (NestJS) | http://localhost:4000/api |
| Swagger / OpenAPI (docs) | http://localhost:4000/api/docs |
| Meilisearch (dashboard) | http://localhost:7700 |
| Prisma Studio | `npx prisma studio` → http://localhost:5555 |

---

## 17. Variables d'environnement

### Backend (`apps/backend/.env`)

| Variable | Requis | Description |
|---|---|---|
| `PORT` | Non | Port du serveur (défaut : 4000) |
| `NODE_ENV` | Non | `development` ou `production` (défaut : development) |
| `FRONTEND_URL` | Oui | URL du frontend pour CORS (ex : `http://localhost:3000`) |
| `JWT_SECRET` | Oui | Secret pour signer les tokens JWT (min 32 chars recommandé) |
| `DATABASE_URL` | Oui | URL PostgreSQL (ex : `postgresql://althea_user:althea_password@localhost:5433/althea`) |
| `MONGODB_URI` | Oui | URL MongoDB (ex : `mongodb://althea_user:althea_password@localhost:27018/althea?authSource=admin`) |
| `STRIPE_SECRET_KEY` | Non | Clé secrète Stripe (mode test : `sk_test_...`) |
| `STRIPE_WEBHOOK_SECRET` | Non | Secret de vérification des webhooks Stripe (`whsec_...`) |
| `MEILISEARCH_HOST` | Non | URL Meilisearch (défaut : `http://localhost:7700`) |
| `MEILISEARCH_API_KEY` | Non | Clé master Meilisearch |
| `RESEND_API_KEY` | Non | Clé API Resend pour l'envoi d'emails |
| `SENDGRID_API_KEY` | Non | Clé API SendGrid (fallback email) |
| `EMAIL_PROVIDER` | Non | `resend` (défaut) ou `sendgrid` |
| `EMAIL_FROM` | Non | Adresse expéditeur (défaut : `noreply@althea-system.com`) |

### Frontend (`apps/frontend/.env.local`)

| Variable | Requis | Description |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Oui | URL de l'API backend (ex : `http://localhost:4000`) |
| `OPENAI_API_KEY` | Non | Clé OpenAI pour le chatbot GPT-4o |
| `ANTHROPIC_API_KEY` | Non | Clé Anthropic pour le chatbot Claude Sonnet (prioritaire si les deux sont définies) |

> **Note** : si aucune clé IA n'est configurée, le chatbot fonctionne en **mode local** avec des réponses par mots-clés — pas besoin de clé API pour tester.

---

## 18. Scripts disponibles

### Racine du monorepo

| Commande | Description |
|---|---|
| `npm run dev` | Lance frontend + backend en parallèle via Turborepo |
| `npm run dev:frontend` | Lance uniquement le frontend (Next.js + Turbopack, port 3000) |
| `npm run dev:backend` | Lance uniquement le backend (NestJS --watch, port 4000) |
| `npm run build` | Build de production de tous les packages |
| `npm run lint` | Lint de tous les packages |
| `npm run format` | Formate tout le code avec Prettier |
| `npm run docker:up` | `docker-compose up -d` — démarre les 4 services infra |
| `npm run docker:down` | `docker-compose down` — arrête les services |
| `npm run db:migrate` | Exécute `prisma migrate dev` dans le workspace backend |
| `npm run db:deploy` | Exécute `prisma migrate deploy` dans le workspace backend |
| `npm run db:seed` | Alimente la base avec les données de démonstration |
| `npm run clean` | Supprime les builds, caches Turbo et node_modules (tous les workspaces) |

### Backend (`apps/backend/`)

| Commande | Description |
|---|---|
| `npm run dev` | `nest start --watch` |
| `npm run build` | `nest build` |
| `npm run start:prod` | `node dist/src/main.js` |
| `npm run test` | Jest — tous les tests unitaires |
| `npm run test:watch` | Jest en mode watch |
| `npm run test:e2e` | Tests e2e HTTP (Supertest) via `jest-e2e.json` |
| `npm run db:migrate` | `npx prisma migrate dev` |
| `npm run db:deploy` | `npx prisma migrate deploy` (production) |
| `npm run db:seed` | `npx prisma db seed` — données de démonstration |
| `npm run db:studio` | `npx prisma studio` (GUI de la BDD, port 5555) |
| `npm run db:check:i18n` | Vérifie les traductions manquantes en base |
| `npm run db:fill:i18n-placeholders` | Remplit les traductions manquantes avec des placeholders |

### Frontend (`apps/frontend/`)

| Commande | Description |
|---|---|
| `npm run dev` | `next dev --turbopack --port 3000 --hostname 0.0.0.0` |
| `npm run build` | `next build` |
| `npm run start` | `next start` (production) |
| `npm run lint` | `next lint` |
| `npm run test:e2e` | Playwright — tests e2e navigateur (nécessite un serveur sur :3000) |
| `npm run test:e2e:ui` | Playwright en mode UI interactif |

---

---

## 19. Cahier de tests

Le projet dispose d'une couverture de tests complète : **78 tests**, tous verts.

### Backend — Tests unitaires (Jest)

**Commande** : `npm run test` dans `apps/backend/`

| Fichier | Suite | Tests couverts |
|---|---|---|
| `authentification.service.spec.ts` | AuthentificationService | register (conflit email, succès), login (email introuvable, mauvais mot de passe, 2FA requis, token valide) |
| `commandes.service.spec.ts` | CommandesService | create (produit inexistant, stock insuffisant, succès), findOne (404), updateStatus, getStats |
| `paiements.service.spec.ts` | PaiementsService | createPaymentIntent (404/403/400/idempotence/succès), confirmOrderAfterPayment (404/403/déjà confirmé/Stripe KO/OK), getPaymentHistory, refundOrder (404/déjà remboursé/Stripe KO/OK) |
| `factures.service.spec.ts` | FacturesService | createForOrder (doublon/404/numérotation séquentielle/succès), findOne (404), cancelInvoice (déjà annulé/avoir existant/succès), generateInvoicePdf (Buffer retourné/404) |
| `produits.service.spec.ts` | ProduitsService | findOne (succès), checkAvailability (hors stock/inactif/disponible) |

**Total : 45 tests unitaires**

### Backend — Tests E2E HTTP (Jest + Supertest)

**Commande** : `npm run test:e2e` dans `apps/backend/`

Fichier : `test/app.e2e-spec.ts` — module NestJS minimal avec JWT réel (PassportModule + JwtModule) et services mockés.

| Groupe | Route | Scénarios |
|---|---|---|
| Auth | `POST /api/auth/register` | 201 succès, 409 email existant, 400 données invalides |
| Auth | `POST /api/auth/login` | 200 succès avec token, 401 mauvais identifiants |
| Orders | `POST /api/orders` | 401 sans token, 201 avec JWT valide |
| Orders | `GET /api/orders` | 403 rôle USER, 200 rôle ADMIN |
| Orders | `GET /api/orders/my` | 200 avec JWT, liste retournée |
| Payments | `POST /api/payments/create-intent` | 401 sans token, 201 avec JWT |
| Payments | `POST /api/payments/confirm-order` | 401 sans token, 201 avec JWT |
| Invoices | `GET /api/invoices` | 401 sans token, 403 rôle USER, 200 rôle ADMIN |
| Invoices | `GET /api/invoices/:id/pdf` | 200 Buffer PDF retourné (rôle ADMIN) |

**Total : 20 tests E2E HTTP**

### Frontend — Tests E2E Navigateur (Playwright + Chromium)

**Commande** : `npm run test:e2e` dans `apps/frontend/` (démarre automatiquement le serveur Next.js)

Configuration : `playwright.config.ts` — baseURL `http://localhost:3000`, webServer auto-start, retries sur CI.

| Fichier | Suite | Tests |
|---|---|---|
| `e2e/auth.spec.ts` | Auth — Login | Page charge avec formulaire email/password, erreur sur identifiants invalides |
| `e2e/auth.spec.ts` | Auth — Register | Page register charge correctement |
| `e2e/cart.spec.ts` | Cart page | Panier vide s'affiche, page charge sans erreur JS |
| `e2e/cart.spec.ts` | Checkout flow | Page checkout charge (API mockée via `page.route()`) |
| `e2e/cart.spec.ts` | Order confirmation | Page confirmation s'affiche, aucune erreur JS |
| `e2e/dashboard.spec.ts` | Dashboard User Orders | Page commandes charge, rendu sans crash |
| `e2e/dashboard.spec.ts` | Dashboard Admin Invoices | Page factures admin charge, rendu sans crash |
| `e2e/dashboard.spec.ts` | Dashboard Admin Orders | Page commandes admin charge |

Toutes les appels API backend sont interceptés via `page.route('http://localhost:4000/*')` — les tests s'exécutent sans backend réel.

**Total : 13 tests E2E Playwright**

### Récapitulatif

| Couche | Outil | Tests | Statut |
|---|---|---|---|
| Unitaires backend | Jest | 45 | ✅ |
| E2E backend HTTP | Jest + Supertest | 20 | ✅ |
| E2E frontend navigateur | Playwright + Chromium | 13 | ✅ |
| **Total** | | **78** | **✅ Tous verts** |

---

Projet d'études — SUP de Vinci © 2026
