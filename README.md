# Génération de propositions techniques et commerciales pour appels d'offres

Application qui, à partir d'un **profil d'entreprise structuré** et d'un **document d'appel d'offres**, génère trois livrables Word : analyse du profil (go/no-go), proposition technique, proposition commerciale.

📄 Spécification complète : [`docs/spec.md`](docs/spec.md)

## État d'avancement

| Itération | Contenu | État |
|---|---|---|
| 1 | Schéma de données + CRUD profils (auth, identité, finances versionnées, projets, personnel, matériel, fichiers) | ✅ |
| 2 | Import AO + extraction de la grille de conformité | ⬜ |
| 3 | Moteur de matching profil ↔ exigences | ⬜ |
| 4 | Génération des livrables (IA) | ⬜ |
| 5 | Export Word + relecture + envoi email | ⬜ |

## Démarrage rapide

```bash
cd backend
npm install
docker compose up -d          # PostgreSQL + MinIO
cp .env.example .env          # ajuster JWT_SECRET
npx prisma migrate dev
npm run start:dev             # API sur http://localhost:3000/api
```

## API — itération 1

Toutes les routes (sauf `/auth/*`) exigent un header `Authorization: Bearer <token>`.

### Authentification
| Méthode | Route | Description |
|---|---|---|
| POST | `/api/auth/register` | Créer un compte (`email`, `password`, `fullName?`) |
| POST | `/api/auth/login` | Se connecter → `accessToken` |

### Profils d'entreprise
| Méthode | Route | Description |
|---|---|---|
| POST | `/api/profiles` | Créer un profil (brouillon) |
| GET | `/api/profiles` | Lister mes profils |
| GET | `/api/profiles/:id` | Profil complet (récapitulatif, durées calculées) |
| PATCH | `/api/profiles/:id` | Modifier l'identité |
| POST | `/api/profiles/:id/confirm` | Confirmer après récapitulatif (DRAFT → ACTIVE) |
| DELETE | `/api/profiles/:id` | Archiver |
| GET | `/api/profiles/:id/change-log` | Historique des modifications |

### Sous-ressources d'un profil
- `POST/GET/PATCH/DELETE /api/profiles/:id/certifications` — certifications ISO
- `PUT/GET /api/profiles/:id/financial-years` + `GET .../:year/history` — finances **versionnées** : un PUT sur un exercice existant crée une nouvelle version, l'historique est conservé
- `POST/GET/PATCH/DELETE /api/profiles/:id/projects` + `POST/DELETE .../:id/photos` — projets de référence
- `POST/GET/PATCH/DELETE /api/profiles/:id/personnel` + diplômes et certifications par membre
- `POST/GET/PATCH/DELETE /api/profiles/:id/equipment` — matériel

### Fichiers (documents sensibles)
- `POST /api/files?profileId=&category=` — upload multipart (`file`), types autorisés : PDF, Word, images ; max 25 Mo
- `GET /api/files/:id/download` — téléchargement après contrôle d'accès (aucun lien public)
- `DELETE /api/files/:id`

Catégories : `LOGO`, `ISO_CERTIFICATE`, `BALANCE_SHEET`, `BANK_ATTESTATION`, `TAX_CLEARANCE`, `PROJECT_PHOTO`, `FINAL_ACCEPTANCE`, `GOOD_EXECUTION`, `PERSONNEL_PHOTO`, `CV`, `DIPLOMA`, `PERSONNEL_CERTIFICATE`, `EQUIPMENT_PHOTO`, `OWNERSHIP_PROOF`, `OTHER`.

## Tests

```bash
cd backend && npm test
```
