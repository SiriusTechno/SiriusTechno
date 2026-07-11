# Application de génération de propositions pour appels d'offres

Spécification complète : `docs/spec.md` — à lire avant toute modification.
Le cœur du produit est le moteur de matching profil ↔ exigences de l'AO
(spec section 5-6), pas la génération de texte générique.

## Feuille de route (itérations, spec §Note d'usage)

1. ✅ Schéma de données (spec 4.1) + CRUD profils — `backend/`
2. ⬜ Extraction AO + grille de conformité (spec 5)
3. ⬜ Moteur de matching (spec 6)
4. ⬜ Génération des livrables (spec 7) — un document d'abord
5. ⬜ Export Word + relecture (spec 8)

## Stack

- Backend : NestJS + PostgreSQL + Prisma (`backend/`)
- Stockage fichiers : MinIO/S3 en prod, disque local en dev (`STORAGE_DRIVER`)
- À venir : BullMQ + Redis (tâches longues), API Claude (extraction + génération), docxtemplater (Word)

## Commandes (dans `backend/`)

```bash
npm install
docker compose up -d          # PostgreSQL + MinIO
cp .env.example .env
npx prisma migrate dev        # crée/applique les migrations
npm run start:dev             # API sur http://localhost:3000/api
npm test                      # tests unitaires
npm run build
```

## Conventions

- Code en anglais, API et messages d'erreur en français (utilisateurs francophones).
- Toute donnée financière est versionnée (jamais d'écrasement) — voir `FinancialYearsService`.
- Tout accès à une ressource passe par `ProfilesService.assertOwnership`.
- Les fichiers uploadés ne sont jamais servis par lien public : uniquement via `GET /api/files/:id/download` après contrôle d'accès.
- Chaque modification de profil est journalisée dans `ProfileChangeLog` (traçabilité, spec 10).

## Décisions en attente (spec section 11)

- Bordereau de prix : saisie manuelle / import / modèle de coûts ? (bloque la proposition commerciale)
- Outil interne SIRIUS ou produit multi-clients ? (le modèle de données est déjà multi-profils)
