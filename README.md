# Génération de propositions techniques et commerciales pour appels d'offres

Application qui, à partir d'un **profil d'entreprise structuré** et d'un **document d'appel d'offres**, génère trois livrables Word : analyse du profil (go/no-go), proposition technique, proposition commerciale.

📄 Spécification complète : [`docs/spec.md`](docs/spec.md)

## État d'avancement

| Itération | Contenu | État |
|---|---|---|
| 1 | Schéma de données + CRUD profils (auth, identité, finances versionnées, projets, personnel, matériel, fichiers) | ✅ |
| 2 | Import AO + extraction de la grille de conformité (PDF/Word, détection scan, analyse IA auditable) | ✅ |
| 3 | Moteur de matching profil ↔ exigences (couvertures/écarts, anti-hallucination, rapports traçables) | ✅ |
| 4 | Génération des livrables — analyse go/no-go ✅, proposition technique ✅, proposition commerciale (bordereau importé) ✅ | ✅ |
| 5 | Export Word ✅, relecture ✅, envoi email ✅ ; charte graphique ⬜ | 🟡 |

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

### Bordereau de prix (proposition commerciale)
| Méthode | Route | Description |
|---|---|---|
| GET | `/api/tenders/:id/price-schedule/template` | **Template Excel** à remplir (exemples + feuille d'instructions) |
| POST | `/api/tenders/:id/price-schedule?taxRate=0.18` | Importer le bordereau rempli (multipart `file`) — validation ligne par ligne, totaux recalculés côté serveur, TVA 18 % par défaut |
| GET | `/api/tenders/:id/price-schedule` | Version courante |
| GET | `/api/tenders/:id/price-schedule/history` | Historique des versions (chaque ré-import crée une version) |

### Livrables (itérations 4-5)
| Méthode | Route | Description |
|---|---|---|
| POST | `/api/tenders/:id/deliverables/analysis` | Générer le document d'analyse (forces/faiblesses, écarts, go/no-go) à partir du dernier matching |
| POST | `/api/tenders/:id/deliverables/technical` | Générer la proposition technique — **409 avec la liste des écarts** tant que `acknowledgeGaps=true` n'est pas envoyé (spec 7.2) |
| POST | `/api/tenders/:id/deliverables/commercial` | Générer la proposition commerciale depuis le bordereau importé — **assemblage déterministe, aucun LLM sur les prix** ; montant TTC en toutes lettres ; conditions commerciales paramétrables (`offerValidityDays`, `paymentTerms`, `warrantyTerms`, `executionDelay`) |
| GET | `/api/tenders/:id/deliverables` | Lister les livrables générés |
| GET | `/api/tenders/:id/deliverables/:id` | Contenu structuré + Markdown |
| GET | `/api/tenders/:id/deliverables/:id/markdown` | Rendu Markdown brut (relecture) |
| PATCH | `/api/tenders/:id/deliverables/:id` | Corriger le contenu (relecture) — invalide la validation précédente |
| POST | `/api/tenders/:id/deliverables/:id/review` | Valider la relecture |
| GET | `/api/tenders/:id/deliverables/:id/docx` | **Export Word** (.docx) — en-tête `X-Relecture-Validee` ; export bloqué si `REQUIRE_REVIEW_BEFORE_EXPORT=true` et document non validé |
| POST | `/api/tenders/:id/deliverables/send-email` | **Envoi par email** : `deliverableIds` (joints en .docx), `to`, `cc?`, `subject?`, `message?` — sujet et corps par défaut en français ; nécessite la config SMTP |
| GET | `/api/tenders/:id/deliverables/emails` | Historique des envois (qui, quoi, à qui, quand) |

Les documents citent leurs sources (éléments du profil), ne masquent jamais un écart, et tracent le rapport de matching utilisé. La proposition technique suit le plan imposé par l'AO s'il existe, sinon le plan standard (présentation, compréhension du besoin, méthodologie, moyens humains/matériels, références, planning).

### Fichiers (documents sensibles)
- `POST /api/files?profileId=&category=` — upload multipart (`file`), types autorisés : PDF, Word, images ; max 25 Mo
- `GET /api/files/:id/download` — téléchargement après contrôle d'accès (aucun lien public)
- `DELETE /api/files/:id`

Catégories : `LOGO`, `ISO_CERTIFICATE`, `BALANCE_SHEET`, `BANK_ATTESTATION`, `TAX_CLEARANCE`, `PROJECT_PHOTO`, `FINAL_ACCEPTANCE`, `GOOD_EXECUTION`, `PERSONNEL_PHOTO`, `CV`, `DIPLOMA`, `PERSONNEL_CERTIFICATE`, `EQUIPMENT_PHOTO`, `OWNERSHIP_PROOF`, `OTHER`.

## Tests

```bash
cd backend && npm test
```
