# Génération de propositions techniques et commerciales pour appels d'offres

Application qui, à partir d'un **profil d'entreprise structuré** et d'un **document d'appel d'offres**, génère trois livrables Word : analyse du profil (go/no-go), proposition technique, proposition commerciale.

📄 Spécification complète : [`docs/spec.md`](docs/spec.md)

## État d'avancement

| Itération | Contenu | État |
|---|---|---|
| 1 | Schéma de données + CRUD profils (auth, identité, finances versionnées, projets, personnel, matériel, fichiers) | ✅ |
| 2 | Import AO + extraction de la grille de conformité (PDF/Word, détection scan, analyse IA auditable) | ✅ |
| 3 | Moteur de matching profil ↔ exigences (couvertures/écarts, anti-hallucination, rapports traçables) | ✅ |
| 4 | Génération des livrables (IA) — document d'analyse go/no-go ✅ ; propositions technique et commerciale ⬜ | 🟡 |
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

### Appels d'offres (itération 2)
| Méthode | Route | Description |
|---|---|---|
| POST | `/api/tenders` | Créer un AO (`profileId`, `fileId` d'un PDF/Word uploadé) — extrait le texte immédiatement |
| GET | `/api/tenders?profileId=` | Lister mes AO |
| GET | `/api/tenders/:id` | Détail (texte extrait + grille) |
| POST | `/api/tenders/:id/extract` | Relancer l'extraction de texte |
| POST | `/api/tenders/:id/analyze` | Analyse IA → grille de conformité (nécessite `ANTHROPIC_API_KEY`) |
| PATCH | `/api/tenders/:id/grid` | Corriger la grille (la sortie brute du LLM est conservée) |
| DELETE | `/api/tenders/:id` | Supprimer |

Statuts : `UPLOADED` → `TEXT_EXTRACTED` → `GRID_READY` ; `NEEDS_OCR` si PDF scanné détecté (OCR à venir) ; `FAILED` avec `extractionError` en français.

### Matching profil ↔ exigences (itération 3)
| Méthode | Route | Description |
|---|---|---|
| POST | `/api/tenders/:id/matching` | Lancer le matching (exige une grille `GRID_READY`) |
| GET | `/api/tenders/:id/matching` | Dernier rapport : exigences couvertes / partielles / non couvertes |
| GET | `/api/tenders/:id/matching/history` | Historique des rapports |
| GET | `/api/tenders/:id/matching/:reportId` | Un rapport précis |

Chaque rapport contient : le statut de chaque exigence (`COVERED`/`PARTIAL`/`NOT_COVERED`), les éléments du profil qui la couvrent (IDs validés côté serveur — aucun élément inventé), la justification, l'écart, un résumé chiffré, plus l'instantané du profil et de la grille utilisés (traçabilité).

### Livrables (itération 4 — document d'analyse)
| Méthode | Route | Description |
|---|---|---|
| POST | `/api/tenders/:id/deliverables/analysis` | Générer le document d'analyse (forces/faiblesses, écarts, go/no-go) à partir du dernier matching |
| GET | `/api/tenders/:id/deliverables` | Lister les livrables générés |
| GET | `/api/tenders/:id/deliverables/:id` | Contenu structuré + Markdown |
| GET | `/api/tenders/:id/deliverables/:id/markdown` | Rendu Markdown brut (relecture) |

Le document cite ses sources (éléments du profil), ne masque jamais un écart, et trace le rapport de matching utilisé.

### Fichiers (documents sensibles)
- `POST /api/files?profileId=&category=` — upload multipart (`file`), types autorisés : PDF, Word, images ; max 25 Mo
- `GET /api/files/:id/download` — téléchargement après contrôle d'accès (aucun lien public)
- `DELETE /api/files/:id`

Catégories : `LOGO`, `ISO_CERTIFICATE`, `BALANCE_SHEET`, `BANK_ATTESTATION`, `TAX_CLEARANCE`, `PROJECT_PHOTO`, `FINAL_ACCEPTANCE`, `GOOD_EXECUTION`, `PERSONNEL_PHOTO`, `CV`, `DIPLOMA`, `PERSONNEL_CERTIFICATE`, `EQUIPMENT_PHOTO`, `OWNERSHIP_PROOF`, `OTHER`.

## Tests

```bash
cd backend && npm test
```
