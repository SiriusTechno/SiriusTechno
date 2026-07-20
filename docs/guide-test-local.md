# Guide — Tester localement avec de vraies données

Ce guide vous amène de zéro jusqu'aux trois documents Word générés à partir de
**votre vrai profil d'entreprise** et d'un **vrai appel d'offres**.

## 1. Prérequis (une seule fois)

| Outil | Pourquoi | Où l'obtenir |
|---|---|---|
| **Node.js 20+** | Exécuter l'API | https://nodejs.org |
| **Docker Desktop** | PostgreSQL + MinIO sans installation manuelle | https://www.docker.com/products/docker-desktop |
| **Git** | Récupérer le code | https://git-scm.com |
| **Clé API Claude** | Les 3 étapes IA (grille, matching, génération) | https://platform.claude.com → *API keys* |

> Sans Docker : installez PostgreSQL 16 directement et ajustez `DATABASE_URL` dans `.env`.

## 2. Installation

```bash
git clone https://github.com/SiriusTechno/SiriusTechno.git
cd SiriusTechno
git checkout claude/new-session-i4bkej
cd backend

npm install
docker compose up -d          # démarre PostgreSQL et MinIO
cp .env.example .env
```

Ouvrez `backend/.env` et renseignez au minimum :

```
ANTHROPIC_API_KEY=sk-ant-...     # votre clé Claude
JWT_SECRET=une-phrase-secrete-a-vous
```

Puis :

```bash
npx prisma migrate dev        # crée les tables
npm run start:dev             # API sur http://localhost:3000/api
```

Laissez ce terminal ouvert : c'est le serveur.

## 3. Préparer vos vraies données

1. **Votre profil d'entreprise** — copiez le modèle puis remplacez les valeurs
   d'exemple par les vôtres (raison sociale, CA des 3 derniers exercices,
   vrais projets de référence, personnel clé, matériel) :

   ```bash
   cp scripts/profil-exemple.json scripts/mon-profil.json
   # éditez scripts/mon-profil.json avec vos données réelles
   ```

   Plus le profil est complet et précis, meilleur sera le matching.

2. **Un vrai appel d'offres** — un fichier `.pdf` (texte, pas scanné) ou
   `.docx`. Placez-le où vous voulez, par exemple `~/Documents/ao-ageroute.pdf`.

## 4. Dérouler le parcours complet

Dans un **second terminal** :

```bash
cd SiriusTechno/backend
node scripts/demo.mjs ~/Documents/ao-ageroute.pdf scripts/mon-profil.json
```

Le script déroule et commente chaque étape :

1. Création d'un compte de démonstration (`demo@local.test`)
2. Création de votre profil (réutilisé aux exécutions suivantes)
3. Import de l'AO et extraction du texte (les PDF scannés sont détectés et refusés proprement)
4. **Grille de conformité** extraite par l'IA → `sorties-demo/grille.json` — le script fait une pause pour que vous la vérifiiez
5. **Matching** profil ↔ exigences → `sorties-demo/matching.json` (couvertes / partielles / non couvertes)
6. **Document d'analyse** go/no-go → `sorties-demo/analyse.docx`
7. **Proposition technique** — si des écarts existent, ils sont listés et le script demande confirmation avant de générer → `sorties-demo/proposition-technique.docx`
8. **Bordereau de prix** — le script télécharge le template Excel, attend que vous le remplissiez avec vos prix réels, l'importe, puis génère → `sorties-demo/proposition-commerciale.docx`

Tous les résultats sont dans `backend/sorties-demo/`. Ouvrez les `.docx` dans Word.

## 5. Rejouer, corriger, itérer

- **Corriger la grille avant le matching** : éditez via l'API
  (`PATCH /api/tenders/:id/grid` avec `{"data": {...}}`) — la sortie brute de
  l'IA est conservée pour audit.
- **Relancer après mise à jour du profil** : rejouez simplement le script ;
  le profil est réutilisé, un nouveau rapport de matching est créé (l'historique
  est conservé).
- **Nouveau bordereau** : chaque ré-import crée une version, rien n'est écrasé.
- **Envoi par email** : configurez `SMTP_*` dans `.env` (ou
  `SMTP_JSON_TRANSPORT=true` pour simuler), puis
  `POST /api/tenders/:id/deliverables/send-email`.

## 6. Problèmes fréquents

| Symptôme | Cause probable | Solution |
|---|---|---|
| `Connexion impossible … l'API tourne-t-elle ?` | Serveur non démarré | `npm run start:dev` dans `backend/` |
| `Can't reach database server` | Docker arrêté | `docker compose up -d` puis relancer l'API |
| `L'analyse par IA n'est pas configurée` | Clé absente | `ANTHROPIC_API_KEY` dans `.env`, redémarrer l'API |
| Statut `NEEDS_OCR` | PDF scanné (image) | Utiliser un PDF texte ou la version .docx de l'AO |
| `Le bordereau contient N erreur(s)` | Cellules non numériques | Corriger les lignes indiquées dans le message |

## 7. Coût des appels IA

Chaque AO consomme environ 3 appels au modèle (grille, matching, analyse
+ 1 pour la proposition technique). Avec un AO de taille normale, comptez
quelques dizaines de centimes de dollar par dossier complet. La proposition
commerciale n'utilise pas d'IA.
