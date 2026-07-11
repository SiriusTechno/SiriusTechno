# Spécification — Application de génération autonome de propositions techniques et commerciales pour appels d'offres

## 1. Objectif

Application permettant, à partir (1) d'un profil d'entreprise structuré et (2) d'un document d'appel d'offres (cahier des charges / termes de référence), de générer automatiquement trois livrables Word :

1. Document d'analyse du profil (forces/faiblesses/écarts par rapport à l'AO, recommandation go/no-go)
2. Proposition technique
3. Proposition commerciale

**Point clé à ne pas perdre de vue pendant le développement :** la qualité du livrable dépend entièrement de la capacité de l'application à faire correspondre les exigences précises de l'AO aux données réelles du profil — pas à générer un texte générique. Le moteur de matching (section 5) est le cœur du produit, pas une fonctionnalité annexe.

## 2. Hypothèse d'architecture à valider

Le modèle ci-dessous suppose une architecture **multi-comptes / multi-profils** (un utilisateur ou une organisation peut gérer plusieurs profils d'entreprise — utile si l'outil sert en interne pour SIRIUS + NOOREO, ou s'il devient un produit vendu à d'autres entreprises). Si l'usage est strictement mono-entreprise, l'authentification peut être simplifiée, mais je recommande de garder le modèle de données multi-profils dès le départ — le surcoût est faible et évite une migration plus tard.

## 3. Flux utilisateur global

1. Connexion
2. Choix d'un profil existant OU création d'un nouveau profil
3. Si création : saisie guidée en 4 sections (identité, finances, expérience & personnel, matériel) avec récapitulatif final et confirmation
4. Upload du document d'AO (Word ou PDF)
5. Extraction automatique des exigences de l'AO → génération d'une grille de conformité
6. Moteur de matching profil ↔ exigences
7. Génération des 3 livrables
8. Étape de relecture/édition (recommandée avant export final)
9. Export Word + téléchargement ou envoi par email

## 4. Module — Gestion des profils d'entreprise

### 4.1 Modèle de données

**A. Identité de l'entreprise**
- Raison sociale, nom commercial
- Registre de commerce, numéro NCC
- Siège social, téléphone, email
- Logo (fichier image)
- Certifications ISO (nom, norme, organisme certificateur, date d'obtention, date d'expiration, fichier scanné)

**B. Informations financières** (par exercice N-3, N-2, N-1)
- Chiffre d'affaires
- Bilan financier (fichier)
- Attestation bancaire (fichier)
- Quitus de non redevance (fichier)
- ⚠️ Prévoir que ces données évoluent chaque année → besoin d'un historique versionné, pas de simple écrasement des valeurs.

**C. Expérience & projets**
Par projet : titre, maître d'ouvrage, type de travaux, montant, date début, date fin, durée (calculée), description, photos (multiple), PV de réception définitive (fichier), attestation de bonne exécution (fichier).

Par personnel : nom, prénom, fonction, photo, CV complet (fichier), diplômes (intitulé, établissement, année, fichier scanné — répétable), certifications (nom, organisme, date obtention, date expiration, fichier — répétable), expérience détaillée (texte libre ou structuré).

**D. Matériel et équipements**
Type, statut (propriété/location), marque, modèle, capacité, année d'acquisition, numéro de série, immatriculation, photo, attestation de propriété (fichier).

### 4.2 Règles de gestion

- Récapitulatif complet avant confirmation de création du profil.
- Sauvegarde persistante, sélectionnable à chaque connexion.
- Le profil doit être **modifiable après création** (mise à jour annuelle des finances, ajout de projets/personnel/matériel) — ce point n'était pas explicite dans la version initiale et doit l'être : sans édition post-création, le profil devient obsolète en quelques mois.
- Historique des modifications recommandé (au minimum : date de dernière mise à jour par section).

### 4.3 Stockage des fichiers

Tous les documents (attestations bancaires, bilans, diplômes, PV, photos) sont sensibles ou confidentiels :
- Stockage objet (type MinIO/S3), pas en base directement.
- Accès contrôlé par profil/utilisateur, pas de lien public direct.
- Chiffrement au repos recommandé pour les documents financiers et bancaires.

## 5. Module — Import et analyse du document d'appel d'offres

### 5.1 Extraction

- Formats acceptés : .docx, .pdf.
- Extraction texte via parseur adapté (mammoth pour docx, pdf-parse pour PDF texte).
- **Prévoir un fallback OCR** (Tesseract ou équivalent) : une part significative des AO en Côte d'Ivoire/CEDEAO circule en PDF scanné, pas en texte natif. Sans ça, l'extraction échoue silencieusement sur une partie des documents.

### 5.2 Extraction structurée des exigences (grille de conformité)

À partir du texte extrait, générer via LLM une structure JSON contenant :
- Objet du marché / nature des travaux
- Critères d'éligibilité administrative (documents exigés : RC, NCC, attestations, etc.)
- Expérience similaire exigée (nombre de projets, montant minimum, nature)
- Personnel clé exigé (profils, qualifications, expérience minimale)
- Matériel exigé
- Méthodologie/livrables attendus
- Critères et grille de notation (si disponible)
- Délais, montant de l'enveloppe (si mentionné)
- Documents administratifs à fournir

Cette étape doit être **auditable** : l'utilisateur doit pouvoir visualiser la grille extraite et la corriger avant de lancer la génération, car une erreur d'extraction ici se propage à tous les livrables.

## 6. Module — Moteur de matching profil ↔ exigences

Pour chaque exigence de la grille de conformité, sélectionner automatiquement dans le profil les éléments correspondants :
- Projets de référence pertinents (par secteur, montant, type de travaux)
- Personnel correspondant aux profils exigés
- Matériel correspondant

Produire en sortie :
- Liste des exigences couvertes (avec les éléments du profil qui les couvrent)
- Liste des écarts / manques (aucun élément du profil ne couvre l'exigence)

C'est cette sortie qui alimente le document d'analyse (section 7.1) et qui contraint la génération de la proposition technique (section 7.2) — le LLM ne doit utiliser que les données réelles du profil, jamais inventer une expérience ou une qualification absente.

## 7. Module — Génération des livrables

### 7.1 Document d'analyse du profil

- Forces / faiblesses par rapport aux exigences de l'AO
- Écarts identifiés (section 6)
- Recommandation go/no-go argumentée
- Usage interne (aide à la décision), pas destiné au client

### 7.2 Proposition technique

- Structurée selon le plan imposé par l'AO si celui-ci en impose un ; sinon, plan standard (présentation entreprise, compréhension du besoin, méthodologie, moyens humains, moyens matériels, références similaires, planning).
- Contenu strictement basé sur les données du profil sélectionnées par le moteur de matching.
- Les écarts non couverts doivent être signalés à l'utilisateur avant génération finale, pas masqués.

### 7.3 Proposition commerciale

⚠️ Non spécifié dans la version initiale — à trancher avant développement :
- Le bordereau de prix est-il saisi manuellement par l'utilisateur, importé, ou calculé à partir d'un modèle de coûts internes ?
- Conditions commerciales (validité de l'offre, modalités de paiement, garanties) : template fixe ou variable par AO ?

Sans réponse à ces deux questions, ce module ne peut pas être développé de façon autonome — il y a nécessairement une saisie humaine des prix.

## 8. Module — Export, relecture, diffusion

- Génération Word via template(s) avec charte graphique (logo, couleurs) configurable par profil.
- Si l'AO impose un format de présentation strict (pagination, police, structure), le template doit pouvoir s'y adapter — sinon utiliser le template par défaut.
- **Étape de relecture recommandée avant export final** : afficher les 3 documents générés (ou au moins la proposition technique et commerciale) pour validation/édition avant de permettre le téléchargement définitif. Une génération 100% autonome sans point de contrôle humain est risquée pour un document soumis officiellement.
- Téléchargement direct ou envoi par email (pièce jointe).

## 9. Stack technique suggérée

Cohérente avec les choix déjà utilisés sur YALÉ :
- Backend : NestJS + PostgreSQL (Prisma ou TypeORM)
- Stockage fichiers : MinIO (ou S3-compatible)
- File d'attente pour tâches longues (extraction AO, génération documents) : BullMQ + Redis
- Génération Word : bibliothèque type `docx` (Node) ou `docxtemplater` avec templates à variables
- Extraction : `mammoth` (docx), `pdf-parse` (PDF texte), OCR en fallback
- IA : API Claude (extraction structurée + génération de contenu, en deux appels distincts — extraction puis génération — pour limiter les hallucinations)
- Email : SMTP via nodemailer
- Frontend : au choix selon votre stack habituel (React suggéré par défaut)

## 10. Contraintes non-fonctionnelles

- Confidentialité des documents financiers et personnels (RGPD-like, même hors UE — bonnes pratiques de chiffrement et contrôle d'accès)
- Traçabilité : qui a généré quel document, à partir de quelle version du profil et de quel AO
- Le contenu généré doit toujours indiquer sa source (quel projet/personnel/matériel a été utilisé pour justifier chaque affirmation) — utile pour la relecture et pour éviter les incohérences

## 11. Décisions à trancher avant de lancer le développement

| Question | Impact si non tranchée |
|---|---|
| Outil interne SIRIUS ou futur produit multi-clients ? | Architecture d'authentification et de facturation |
| Comment est déterminé le bordereau de prix ? | Bloque le module proposition commerciale |
| Profils modifiables après création ? (recommandé : oui) | Fraîcheur des données financières/personnel |
| Relecture humaine obligatoire avant export ? (recommandé : oui) | Risque qualité sur un document soumis officiellement |
| Format Word imposé par certains AO à respecter ? | Flexibilité requise du moteur de templating |

---

### Note d'usage avec Claude Code

Ne pas soumettre ce document en un seul prompt monolithique en attendant une application complète. Recommandation : sauvegarder ce fichier comme référence dans le repo (ex. `docs/spec.md` ou `CLAUDE.md`), puis faire construire par itérations :
1. Schéma de données (section 4.1) + CRUD profils
2. Extraction AO + grille de conformité (section 5)
3. Moteur de matching (section 6)
4. Génération des livrables (section 7) — en commençant par un seul document pour valider le pipeline avant les trois
5. Export Word + relecture (section 8)

Cela permet de valider chaque brique (notamment la qualité de l'extraction et du matching, qui sont les points de risque réels du projet) avant d'empiler la suite.
