// Tests du journal du chantier (plugins/figma-ui-kit/skills/build/scripts/journal.mjs).
// Lancer : npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { formater, lireJournal, nouvelleLigne, resumer } from '../plugins/figma-ui-kit/skills/build/scripts/journal.mjs';
import { controlerContenu } from '../plugins/figma-ui-kit/hooks/format-uikit.mjs';

const SCRIPT = fileURLToPath(new URL('../plugins/figma-ui-kit/skills/build/scripts/journal.mjs', import.meta.url));
const MAINTENANT = new Date(2026, 10, 26, 14, 3);

function avecDossier(faire) {
  const racine = mkdtempSync(join(tmpdir(), 'journal-'));
  const uikit = join(racine, '.uikit');
  mkdirSync(uikit);
  try {
    return faire(uikit);
  } finally {
    rmSync(racine, { recursive: true, force: true });
  }
}

const lancer = (...args) => spawnSync('node', [SCRIPT, ...args], { encoding: 'utf8' });
const LANCEMENT = { commande: 'build', type: 'lancement', texte: 'Scan des écrans', agent: 'seiri', mode: 'scan', appels: 14 };

// --- Lignes ---

test('une ligne valide reçoit la date du moment, à la minute', () => {
  const { ligne, erreurs } = nouvelleLigne(LANCEMENT, MAINTENANT);
  assert.equal(erreurs, undefined);
  assert.deepEqual(ligne, { date: '2026-11-26T14:03', ...LANCEMENT });
});

test('une ligne mal formée rend ses écarts', () => {
  const { erreurs } = nouvelleLigne({ commande: 'build', type: 'fin', texte: '' }, MAINTENANT);
  assert.ok(erreurs.some((e) => /type/.test(e)));
  assert.ok(erreurs.some((e) => /texte/.test(e)));
});

test('un lancement dit quel agent et combien d\'appels Figma', () => {
  const { agent, appels, ...sans } = LANCEMENT;
  const { erreurs } = nouvelleLigne(sans, MAINTENANT);
  assert.ok(erreurs.some((e) => /agent/.test(e)));
  assert.ok(erreurs.some((e) => /appels/.test(e)));
});

test('les appels ne sont jamais négatifs, les références suivent leur format', () => {
  assert.ok(nouvelleLigne({ ...LANCEMENT, appels: -3 }, MAINTENANT).erreurs.some((e) => /appels/.test(e)));
  assert.equal(nouvelleLigne({ commande: 'build', type: 'decision', texte: 'Rayon 8', refs: ['D12', 'R3', 'Q4', 'C012', 'F004', 'B001', 'P3-02', 'K01'] }, MAINTENANT).erreurs, undefined);
  assert.ok(nouvelleLigne({ commande: 'build', type: 'decision', texte: 'x', refs: ['décision 12'] }, MAINTENANT).erreurs.some((e) => /refs/.test(e)));
});

test('formater rend une ligne lisible', () => {
  const { ligne } = nouvelleLigne(LANCEMENT, MAINTENANT);
  assert.equal(formater(ligne), '2026-11-26T14:03 · build · lancement · Seiri (scan) · Scan des écrans · 14 appels Figma');
});

// --- Lecture et résumé ---

test('lireJournal rend les lignes, et signale une ligne retouchée à la main', () => {
  avecDossier((uikit) => {
    assert.deepEqual(lireJournal(uikit), { lignes: [], invalides: [] });
    const bonne = JSON.stringify({ date: '2026-11-26T14:03', ...LANCEMENT });
    writeFileSync(join(uikit, 'journal.jsonl'), `${bonne}\n{pas du json\n${JSON.stringify({ date: '2026-11-26', commande: 'build', type: 'x', texte: 'y' })}\n`);
    const { lignes, invalides } = lireJournal(uikit);
    assert.equal(lignes.length, 1);
    assert.deepEqual(invalides.map((i) => i.numero), [2, 3]);
  });
});

test('resumer additionne les appels par commande et par lancement', () => {
  const lignes = [
    { date: '2026-11-25T10:00', commande: 'diagnostic', type: 'lancement', texte: 'a', agent: 'seiri', mode: 'survol', appels: 3 },
    { date: '2026-11-25T10:20', commande: 'diagnostic', type: 'lancement', texte: 'b', agent: 'seiri', mode: 'scan', appels: 40 },
    { date: '2026-11-26T09:00', commande: 'build', type: 'reprise', texte: 'c', economises: 30 },
    { date: '2026-11-26T09:30', commande: 'build', type: 'lancement', texte: 'd', agent: 'seiton', mode: 'lot P2-01', appels: 25 },
  ];
  assert.deepEqual(resumer(lignes), {
    entrees: 4, appels: 68, economises: 30, premiere: '2026-11-25T10:00', derniere: '2026-11-26T09:30',
    parCommande: { build: 25, diagnostic: 43 },
    parLancement: { 'seiri survol': 3, 'seiri scan': 40, 'seiton lot P2-01': 25 },
  });
});

// --- Ligne de commande ---

test('ajouter écrit une ligne à la fin du journal, sans toucher aux précédentes', () => {
  avecDossier((uikit) => {
    const a = lancer(uikit, 'ajouter', '--commande', 'build', '--type', 'demarrage', '--texte', 'Démarrage');
    assert.equal(a.status, 0, a.stderr);
    const b = lancer(uikit, 'ajouter', '--commande', 'build', '--type', 'lancement', '--texte', 'Scan', '--agent', 'seiri', '--mode', 'scan', '--appels', '14', '--refs', 'P1-01');
    assert.equal(b.status, 0, b.stderr);
    const lignes = readFileSync(join(uikit, 'journal.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l));
    assert.equal(lignes.length, 2);
    assert.equal(lignes[0].type, 'demarrage');
    assert.deepEqual([lignes[1].appels, lignes[1].refs], [14, ['P1-01']]);
  });
});

test('ajouter refuse une entrée mal formée et n\'écrit rien', () => {
  avecDossier((uikit) => {
    const r = lancer(uikit, 'ajouter', '--commande', 'build', '--type', 'lancement', '--texte', 'Scan', '--appels', 'beaucoup');
    assert.equal(r.status, 2);
    assert.match(r.stderr, /appels/);
    assert.equal(lireJournal(uikit).lignes.length, 0);
  });
});

test('ajouter refuse un dossier qui n\'est pas un .uikit existant', () => {
  const r = lancer('/chemin/inexistant/.uikit', 'ajouter', '--commande', 'build', '--type', 'note', '--texte', 'x');
  assert.equal(r.status, 2);
});

test('resume imprime les totaux, et sort en 1 si une ligne est invalide', () => {
  avecDossier((uikit) => {
    lancer(uikit, 'ajouter', '--commande', 'build', '--type', 'lancement', '--texte', 'Scan', '--agent', 'seiri', '--mode', 'scan', '--appels', '14');
    const ok = lancer(uikit, 'resume', '--json');
    assert.equal(ok.status, 0, ok.stderr);
    assert.equal(JSON.parse(ok.stdout).appels, 14);
    writeFileSync(join(uikit, 'journal.jsonl'), `${readFileSync(join(uikit, 'journal.jsonl'), 'utf8')}retouche\n`);
    const ko = lancer(uikit, 'resume');
    assert.equal(ko.status, 1);
    assert.match(ko.stdout, /14 appels/);
    assert.match(ko.stderr, /ligne 2/);
  });
});

test('lire imprime les dernières lignes', () => {
  avecDossier((uikit) => {
    for (const texte of ['un', 'deux', 'trois']) lancer(uikit, 'ajouter', '--commande', 'build', '--type', 'note', '--texte', texte);
    const r = lancer(uikit, 'lire', '--dernieres', '2');
    assert.equal(r.status, 0, r.stderr);
    const lignes = r.stdout.trim().split('\n');
    assert.equal(lignes.length, 2);
    assert.match(lignes[1], /trois$/);
  });
});

// --- Filtre ---

test('le journal ne s\'écrit pas à la main', () => {
  assert.match(controlerContenu('journal.jsonl', '{}'), /journal\.mjs/);
});

test('--refs vide vaut une option absente, --dernieres invalide est refusé', () => {
  avecDossier((uikit) => {
    assert.equal(lancer(uikit, 'ajouter', '--commande', 'build', '--type', 'note', '--texte', 'x', '--refs', ',').status, 0);
    assert.equal(lireJournal(uikit).lignes[0].refs, undefined);
    assert.equal(lancer(uikit, 'lire', '--dernieres', 'abc').status, 2);
  });
});
