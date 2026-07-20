#!/usr/bin/env node
/**
 * Parcours complet avec vos vraies données — voir docs/guide-test-local.md.
 *
 *   node scripts/demo.mjs <chemin-vers-AO.pdf|.docx> [chemin-vers-profil.json]
 *
 * Prérequis : l'API démarrée (npm run start:dev) et, pour les étapes IA,
 * ANTHROPIC_API_KEY définie dans backend/.env.
 *
 * Le script crée un compte de démonstration, charge votre profil, importe
 * l'AO, extrait la grille, lance le matching, génère les livrables et
 * enregistre tout dans ./sorties-demo/.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { basename, resolve } from 'path';
import { createInterface } from 'readline';

const API = process.env.API_URL ?? 'http://localhost:3000/api';
const EMAIL = process.env.DEMO_EMAIL ?? 'demo@local.test';
const PASSWORD = process.env.DEMO_PASSWORD ?? 'motdepasse-demo-123';
const OUT_DIR = resolve('sorties-demo');

const aoPath = process.argv[2];
const profilePath = process.argv[3] ?? new URL('./profil-exemple.json', import.meta.url).pathname;

if (!aoPath) {
  console.error('Usage : node scripts/demo.mjs <chemin-vers-AO.pdf|.docx> [chemin-vers-profil.json]');
  process.exit(1);
}

let token = '';

async function api(method, path, { json, form, expect } = {}) {
  const headers = { Authorization: `Bearer ${token}` };
  let body;
  if (json !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(json);
  } else if (form) {
    body = form;
  }
  const res = await fetch(`${API}${path}`, { method, headers, body });
  const type = res.headers.get('content-type') ?? '';
  const payload = type.includes('json')
    ? await res.json()
    : Buffer.from(await res.arrayBuffer());
  if (!res.ok && expect !== res.status) {
    const msg = payload?.message ?? res.statusText;
    throw new Error(`${method} ${path} → ${res.status} : ${Array.isArray(msg) ? msg.join(' ; ') : msg}${payload?.gaps ? '\n  Écarts : ' + JSON.stringify(payload.gaps, null, 2) : ''}${payload?.errors ? '\n  ' + payload.errors.join('\n  ') : ''}`);
  }
  return { status: res.status, data: payload, headers: res.headers };
}

function ask(question) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((done) => rl.question(question, (a) => { rl.close(); done(a.trim()); }));
}

function uploadForm(filePath, mime) {
  const form = new FormData();
  form.append('file', new Blob([readFileSync(filePath)], { type: mime }), basename(filePath));
  return form;
}

function save(name, content) {
  writeFileSync(`${OUT_DIR}/${name}`, content);
  console.log(`   💾 sorties-demo/${name}`);
}

const step = (n, label) => console.log(`\n━━━ ${n}. ${label} ━━━`);

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const profile = JSON.parse(readFileSync(profilePath, 'utf8'));

  step(1, 'Connexion');
  const reg = await fetch(`${API}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD, fullName: 'Compte démo' }),
  });
  if (reg.ok) {
    token = (await reg.json()).accessToken;
    console.log(`   Compte créé : ${EMAIL}`);
  } else {
    const login = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
    });
    if (!login.ok) throw new Error(`Connexion impossible pour ${EMAIL} — l'API tourne-t-elle sur ${API} ?`);
    token = (await login.json()).accessToken;
    console.log(`   Connecté : ${EMAIL}`);
  }

  step(2, 'Profil d\'entreprise');
  const { data: profiles } = await api('GET', '/profiles');
  let profileId = profiles.find((p) => p.legalName === profile.identity.legalName)?.id;
  if (profileId) {
    console.log(`   Profil existant réutilisé : ${profile.identity.legalName}`);
  } else {
    const { data: created } = await api('POST', '/profiles', { json: profile.identity });
    profileId = created.id;
    for (const fy of profile.financialYears ?? []) {
      await api('PUT', `/profiles/${profileId}/financial-years`, { json: fy });
    }
    for (const c of profile.isoCertifications ?? []) {
      await api('POST', `/profiles/${profileId}/certifications`, { json: c });
    }
    for (const p of profile.projects ?? []) {
      await api('POST', `/profiles/${profileId}/projects`, { json: p });
    }
    for (const { diplomas, certifications, ...member } of profile.personnel ?? []) {
      const { data: m } = await api('POST', `/profiles/${profileId}/personnel`, { json: member });
      for (const d of diplomas ?? []) {
        await api('POST', `/profiles/${profileId}/personnel/${m.id}/diplomas`, { json: d });
      }
      for (const c of certifications ?? []) {
        await api('POST', `/profiles/${profileId}/personnel/${m.id}/certifications`, { json: c });
      }
    }
    for (const e of profile.equipment ?? []) {
      await api('POST', `/profiles/${profileId}/equipment`, { json: e });
    }
    await api('POST', `/profiles/${profileId}/confirm`);
    console.log(`   Profil créé et confirmé : ${profile.identity.legalName}`);
  }
  const { data: full } = await api('GET', `/profiles/${profileId}`);
  console.log(`   ${full.projects.length} projet(s), ${full.personnel.length} personne(s), ${full.equipment.length} équipement(s), ${full.financialYears.length} exercice(s)`);

  step(3, "Import de l'appel d'offres");
  const mime = aoPath.toLowerCase().endsWith('.pdf')
    ? 'application/pdf'
    : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  const { data: file } = await api('POST', `/files?profileId=${profileId}&category=TENDER_DOCUMENT`, {
    form: uploadForm(aoPath, mime),
  });
  const { data: tender } = await api('POST', '/tenders', {
    json: { profileId, fileId: file.id, title: basename(aoPath) },
  });
  console.log(`   Statut : ${tender.status} — ${tender.textCharCount ?? 0} caractères extraits`);
  if (tender.status === 'NEEDS_OCR') {
    console.error(`   ⚠️ ${tender.extractionError}\n   Utilisez un PDF texte (non scanné) ou un .docx.`);
    process.exit(1);
  }
  if (tender.status === 'FAILED') {
    console.error(`   ❌ ${tender.extractionError}`);
    process.exit(1);
  }

  step(4, 'Grille de conformité (IA)');
  let analyzed;
  try {
    analyzed = (await api('POST', `/tenders/${tender.id}/analyze`)).data;
  } catch (e) {
    console.error(`   ❌ ${e.message}`);
    console.error('   → Ajoutez ANTHROPIC_API_KEY dans backend/.env puis relancez l\'API et ce script.');
    process.exit(1);
  }
  save('grille.json', JSON.stringify(analyzed.grid.data, null, 2));
  const g = analyzed.grid.data;
  console.log(`   Objet : ${g.subjectOfContract}`);
  console.log(`   ${g.administrativeEligibility.length} critère(s) admin, ${g.keyPersonnel.length} profil(s) exigé(s), ${g.requiredEquipment.length} matériel(s), ${g.documentsToProvide.length} document(s) à fournir`);
  await ask('   Vérifiez sorties-demo/grille.json (corrigible via PATCH /tenders/:id/grid). Entrée pour continuer… ');

  step(5, 'Matching profil ↔ exigences');
  const { data: report } = await api('POST', `/tenders/${tender.id}/matching`);
  save('matching.json', JSON.stringify(report.data, null, 2));
  const s = report.data.summary;
  console.log(`   ${s.covered} couverte(s), ${s.partial} partielle(s), ${s.notCovered} non couverte(s) sur ${s.total}`);
  if (s.invalidElementIdsRemoved > 0) {
    console.log(`   (garde-fou : ${s.invalidElementIdsRemoved} référence(s) inventée(s) retirée(s))`);
  }

  step(6, "Document d'analyse (go/no-go)");
  const { data: analysis } = await api('POST', `/tenders/${tender.id}/deliverables/analysis`);
  console.log(`   Recommandation : ${analysis.content.recommendation}`);
  const docx1 = await api('GET', `/tenders/${tender.id}/deliverables/${analysis.id}/docx`);
  save('analyse.docx', docx1.data);

  step(7, 'Proposition technique');
  let technical = await api('POST', `/tenders/${tender.id}/deliverables/technical`, {
    json: {},
    expect: 409,
  });
  if (technical.status === 409) {
    console.log(`   ⚠️ ${technical.data.message}`);
    for (const gap of technical.data.gaps ?? []) console.log(`      - [${gap.status}] ${gap.requirement}`);
    const ok = await ask('   Générer malgré ces écarts ? (o/N) ');
    if (!/^o/i.test(ok)) { console.log('   Étape sautée.'); technical = null; }
    else technical = await api('POST', `/tenders/${tender.id}/deliverables/technical`, { json: { acknowledgeGaps: true } });
  }
  if (technical) {
    const docx2 = await api('GET', `/tenders/${tender.id}/deliverables/${technical.data.id}/docx`);
    save('proposition-technique.docx', docx2.data);
  }

  step(8, 'Bordereau de prix → proposition commerciale');
  const template = await api('GET', `/tenders/${tender.id}/price-schedule/template`);
  save('bordereau-a-remplir.xlsx', template.data);
  await ask('   Remplissez sorties-demo/bordereau-a-remplir.xlsx avec vos prix, enregistrez, puis Entrée… ');
  const { data: schedule } = await api('POST', `/tenders/${tender.id}/price-schedule`, {
    form: uploadForm(`${OUT_DIR}/bordereau-a-remplir.xlsx`, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'),
  });
  console.log(`   Bordereau v${schedule.version} : HT ${schedule.totalExclTax} — TTC ${schedule.totalInclTax} ${schedule.currency}`);
  const { data: commercial } = await api('POST', `/tenders/${tender.id}/deliverables/commercial`, { json: {} });
  const docx3 = await api('GET', `/tenders/${tender.id}/deliverables/${commercial.id}/docx`);
  save('proposition-commerciale.docx', docx3.data);

  console.log('\n✅ Terminé. Vos documents sont dans sorties-demo/ :');
  console.log('   grille.json, matching.json, analyse.docx, proposition-technique.docx, proposition-commerciale.docx');
}

main().catch((e) => {
  console.error(`\n❌ ${e.message}`);
  process.exit(1);
});
