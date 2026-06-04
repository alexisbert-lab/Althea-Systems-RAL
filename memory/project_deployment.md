---
name: project-deployment
description: État du déploiement Althea System RAL — stack, credentials partiels, étapes restantes
metadata:
  type: project
---

## Althea System RAL — Déploiement

Stack cible (100% gratuit) :
- Frontend → Vercel
- Backend → Render free (gardé éveillé par UptimeRobot)
- PostgreSQL → Supabase
- MongoDB → Atlas M0
- Meilisearch → Meilisearch Cloud (trial 14j)
- Email → Resend

### Services configurés
- Supabase PostgreSQL ✅ — DATABASE_URL connue
- MongoDB Atlas ✅ — MONGODB_URI connue
- Meilisearch Cloud ✅ — HOST connu, MEILISEARCH_API_KEY à récupérer dans le dashboard (Default Admin API Key)
- Resend ✅ — RESEND_API_KEY récupérée

### render.yaml
- `buildCommand` corrigé : `npm ci && cd apps/backend && npm ci && npx prisma generate && npm run build`
- `startCommand` : `cd apps/backend && npm run render:start` (migrate + node dist/src/main.js)
- Health check : `/api/health`
- Region : frankfurt

### Étapes restantes (au 2026-06-04)
1. Push le fix render.yaml → déclenche autodeploy Render
2. Renseigner les env vars dans Render dashboard (DATABASE_URL, MONGODB_URI, JWT_SECRET, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, MEILISEARCH_HOST, MEILISEARCH_API_KEY, RESEND_API_KEY, FRONTEND_URL)
3. Déployer le frontend sur Vercel (pointer sur apps/frontend, Root Directory = apps/frontend)
4. UptimeRobot — monitor HTTP sur `<render-url>/api/health` toutes les 5 min
5. Stripe — mettre à jour l'URL du webhook avec l'URL Render définitive

**Why:** Projet étudiant SUP de Vinci, contrainte budget = services gratuits uniquement.
**How to apply:** Toujours vérifier la compatibilité tier gratuit avant de suggérer un service.
