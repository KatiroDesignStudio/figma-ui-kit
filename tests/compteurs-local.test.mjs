// Tests de l'agrégation locale `compteurs.mjs` (plugins/figma-ui-kit/skills/build/scripts/compteurs.mjs).
// Lancer : npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { agreger, canon, horsEchelle, sceau, verifierSceaux } from '../plugins/figma-ui-kit/skills/build/scripts/compteurs.mjs';
import { lancer } from './aide/figma-simule.mjs';

const SCRIPT = fileURLToPath(new URL('../plugins/figma-ui-kit/skills/build/scripts/compteurs.mjs', import.meta.url));

const scelle = (objet) => ({ ...objet, sceau: sceau(objet) });

function ecran(id, surcharge = {}) {
  return scelle({
    id, nom: `Écran ${id}`, largeur: 1440, noeuds: 100,
    proprietes: { total: 50, parVariable: 10, parStyle: 5 },
    couleurs: { '0A0A0A': 4, FFFFFF: 2 },
    taillesTexte: { 14: 3, 16: 1 },
    espacements: { 8: 5, 13: 1 },
    rayons: { 4: 2 },
    polices: { 'Inter/Regular': 3, 'Inter/Bold': 1 },
    textes: { total: 4, sansStyle: 1 },
    copiesDetachees: 1,
    instances: { total: 10, kit: 4, locales: 5, bibliotheques: {} },
    nomsGeneres: 2,
    ...surcharge,
  });
}

const contraste = (id, textes = 10, echecs = 2, indetermines = 1) => scelle({ id, nom: id, textes, echecs, indetermines, approximatifs: 0, exemples: [] });
const composants = (sets = 1, simples = 2, variantes = 5) => scelle({ sets, simples, variantes });

function page(id, ecrans, comp = composants(), contrastes = []) {
  return {
    mesures: {
      compteurs: { page: { id, nom: id }, ecrans, composants: comp },
      contrastes: { page: { id, nom: id }, ecrans: contrastes },
    },
  };
}

function chantier(fichiers) {
  const dossier = mkdtempSync(join(tmpdir(), 'uikit-'));
  mkdirSync(join(dossier, 'scan'));
  for (const [nom, contenu] of Object.entries(fichiers)) {
    writeFileSync(join(dossier, nom), typeof contenu === 'string' ? contenu : JSON.stringify(contenu));
  }
  return dossier;
}

function executer(fichiers, args = []) {
  const dossier = chantier(fichiers);
  try {
    const r = spawnSync('node', [SCRIPT, dossier, ...args], { encoding: 'utf8' });
    const chemin = join(dossier, 'scan', 'compteurs.json');
    let texte = null;
    try { texte = readFileSync(chemin, 'utf8'); } catch { /* pas de fichier */ }
    return { ...r, texte, json: texte ? JSON.parse(texte) : null };
  } finally {
    rmSync(dossier, { recursive: true, force: true });
  }
}

const deuxPages = () => ({
  'scan/1_1.json': page('1:1', [ecran('2:1'), ecran('2:2', { noeuds: 50 })], composants(1, 2, 5), [contraste('2:1'), contraste('2:2', 0, 0, 0)]),
  'scan/1_2.json': page('1:2', [ecran('3:1')], composants(2, 0, 4), [contraste('3:1', 5, 1, 0)]),
});

test('le sceau local est le même que le sceau rendu par un script Figma', async () => {
  const doc = { pages: [{ id: '1:1', name: 'P', children: [{ id: '2:1', type: 'FRAME', name: 'A', children: [{ id: '2:2', type: 'TEXT', name: 'T' }] }] }] };
  const { resultat } = await lancer('empreinte.js', { pageId: '1:1' }, doc);
  const { sceau: rendu, ...contenu } = resultat;
  assert.match(rendu, /^[0-9a-f]{8}$/);
  assert.equal(sceau(contenu), rendu);
  assert.equal(canon({ b: 1, a: [2, { d: 1, c: 2 }] }), '{"a":[2,{"c":2,"d":1}],"b":1}');
});

test('verifierSceaux accepte un bloc intact et refuse un bloc dont une valeur a changé', () => {
  const bon = ecran('2:1');
  const altere = { ...bon, noeuds: 101 };
  const resultat = verifierSceaux({ compteurs: { ecrans: [bon, altere], composants: composants() }, contrastes: { ecrans: [] } }, '1:1');
  assert.equal(resultat.valides.compteurs.length, 1);
  assert.deepEqual(resultat.invalides, [{ page: '1:1', ecran: '2:1', motif: 'sceau', bloc: 'compteurs' }]);
});

test('agreger additionne deux écrans et réunit les histogrammes avec clés triées', () => {
  const total = agreger([ecran('a'), ecran('b', { noeuds: 50, couleurs: { '0A0A0A': 1, '1A3456': 7 }, taillesTexte: { 9: 1 } })], []);
  assert.equal(total.noeuds, 150);
  assert.deepEqual(total.proprietes, { total: 100, parVariable: 20, parStyle: 10, partReliee: 30 });
  assert.deepEqual(Object.keys(total.histogrammes.couleurs), ['0A0A0A', '1A3456', 'FFFFFF']);
  assert.equal(total.histogrammes.couleurs['0A0A0A'], 5);
  assert.deepEqual(Object.keys(total.histogrammes.taillesTexte), ['9', '14', '16']);
  assert.equal(total.couleursUniques, 3);
  assert.equal(total.familles, 1);
  assert.equal(total.polices, 2);
});

test('les parts sont en pourcentage à une décimale et valent 0 si le dénominateur est nul', () => {
  const un = agreger([ecran('a', { noeuds: 3, proprietes: { total: 3, parVariable: 1, parStyle: 0 }, instances: { total: 1, kit: 1, locales: 0, bibliotheques: {} } })], []);
  assert.equal(un.proprietes.partReliee, 33.3);
  assert.equal(un.instances.partKit, 33.3);
  const vide = agreger([ecran('a', { noeuds: 0, proprietes: { total: 0, parVariable: 0, parStyle: 0 }, instances: { total: 0, kit: 0, locales: 0, bibliotheques: {} } })], []);
  assert.equal(vide.proprietes.partReliee, 0);
  assert.equal(vide.instances.partKit, 0);
});

test('horsEchelle garde ce qui n\'est pas multiple de 4, tolère 2 sous 8, trie numériquement', () => {
  assert.deepEqual(horsEchelle({ 4: 1, 8: 2, 12: 1, 13: 1, 2: 1, 6: 1, 100: 1, 10: 1, 0: 1 }), ['6', '10', '13']);
  assert.deepEqual(horsEchelle({}), []);
});

test('deux pages sont agrégées, composants additionnés, contrastes sommés', () => {
  const r = executer(deuxPages());
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.json.version, 1);
  assert.equal(r.json.ecransRetenus, 3);
  assert.equal(r.json.ecransMesures, 3);
  assert.equal(r.json.ecrans.noeuds, 250);
  assert.deepEqual(r.json.composants, { sets: 3, simples: 2, variantes: 9 });
  assert.deepEqual(r.json.ecrans.contrastes, { textes: 15, echecs: 3, indetermines: 1 });
  assert.deepEqual(r.json.ecrans.horsEchelle, { espacements: ['13'], rayons: [] });
  assert.equal(r.json.kit, null);
  assert.deepEqual(r.json.invalides, []);
  assert.match(r.stdout, /3 écrans/);
});

test('le périmètre validé restreint les écrans, avec des chaînes ou des objets', () => {
  const fichiers = { ...deuxPages(), 'perimetre-valide.json': { ecrans: ['2:1', { id: '3:1' }] } };
  const r = executer(fichiers);
  assert.equal(r.json.ecransRetenus, 2);
  assert.equal(r.json.ecrans.noeuds, 200);
  assert.deepEqual(r.json.ecrans.contrastes, { textes: 15, echecs: 3, indetermines: 1 });
});

test('--tout ignore le périmètre validé', () => {
  const fichiers = { ...deuxPages(), 'perimetre-valide.json': { ecrans: ['2:1'] } };
  const r = executer(fichiers, ['--tout']);
  assert.equal(r.json.ecransRetenus, 3);
  assert.equal(r.json.ecrans.noeuds, 250);
});

test('les pages de kit sont agrégées à part et hors des écrans retenus', () => {
  const fichiers = {
    ...deuxPages(),
    'survol.json': { pages: [{ id: '1:1', role: 'ecrans' }, { id: '1:2', role: 'kit' }] },
  };
  const r = executer(fichiers);
  assert.equal(r.json.ecransRetenus, 2);
  assert.equal(r.json.ecrans.noeuds, 150);
  assert.equal(r.json.kit.noeuds, 100);
  assert.equal(r.json.kit.proprietes.partReliee, 30);
  assert.deepEqual(r.json.composants, { sets: 3, simples: 2, variantes: 9 });
});

test('un bloc au sceau altéré est signalé, exclu des totaux, et le code de sortie est 1', () => {
  const fichiers = deuxPages();
  fichiers['scan/1_1.json'].mesures.compteurs.ecrans[1].noeuds = 51;
  const r = executer(fichiers);
  assert.equal(r.status, 1);
  assert.deepEqual(r.json.invalides, [{ page: '1:1', ecran: '2:2', motif: 'sceau', bloc: 'compteurs' }]);
  assert.equal(r.json.ecrans.noeuds, 200);
  assert.equal(r.json.ecransMesures, 2);
  assert.match(r.stdout, /1 bloc invalide/);
});

test('un bloc composants altéré est refusé et n\'entre dans aucun total', () => {
  const fichiers = deuxPages();
  fichiers['scan/1_2.json'].mesures.compteurs.composants.sets = 99;
  const r = executer(fichiers);
  assert.equal(r.status, 1);
  assert.deepEqual(r.json.composants, { sets: 1, simples: 2, variantes: 5 });
  assert.equal(r.json.invalides.length, 1);
  assert.equal(r.json.invalides[0].motif, 'sceau');
  assert.equal(r.json.invalides[0].bloc, 'composants');
});

test('un écran de contrastes altéré est refusé', () => {
  const fichiers = deuxPages();
  fichiers['scan/1_1.json'].mesures.contrastes.ecrans[0].echecs = 0;
  const r = executer(fichiers);
  assert.equal(r.status, 1);
  assert.deepEqual(r.json.ecrans.contrastes, { textes: 5, echecs: 1, indetermines: 0 });
  assert.deepEqual(r.json.invalides, [
    { page: '1:1', ecran: '2:1', motif: 'absent-contraste', bloc: 'contrastes' },
    { page: '1:1', ecran: '2:1', motif: 'sceau', bloc: 'contrastes' },
  ]);
});

test('un écran retenu sans mesure est listé comme absent', () => {
  const fichiers = { ...deuxPages(), 'perimetre-valide.json': { ecrans: ['2:1', '9:9'] } };
  const r = executer(fichiers);
  assert.equal(r.status, 1);
  assert.equal(r.json.ecransRetenus, 2);
  assert.equal(r.json.ecransMesures, 1);
  assert.deepEqual(r.json.invalides, [{ page: null, ecran: '9:9', motif: 'absent', bloc: 'compteurs' }]);
});

test('les fichiers sans mesures et les fichiers de synthèse sont ignorés', () => {
  const fichiers = {
    ...deuxPages(),
    'scan/index.json': { pages: [] },
    'scan/synthese.json': { x: 1 },
    'scan/inventaire.json': { y: 2 },
    'scan/1_9.json': { page: '1:9', ecrans: [{ id: 'x' }] },
  };
  const r = executer(fichiers);
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.json.ecransRetenus, 3);
});

test('deux lancements sur les mêmes entrées donnent le même fichier octet pour octet', () => {
  const premier = executer(deuxPages());
  const second = executer(deuxPages());
  assert.equal(premier.texte, second.texte);
  assert.ok(premier.texte.endsWith('}\n'));
  assert.ok(premier.texte.startsWith('{\n  "version": 1,'));
  assert.doesNotMatch(premier.texte, /\/tmp|\/var|uikit-/);
});

test('un dossier manquant donne le code 2 et un message d\'usage', () => {
  const r = spawnSync('node', [SCRIPT, join(tmpdir(), 'uikit-inexistant-xyz')], { encoding: 'utf8' });
  assert.equal(r.status, 2);
  assert.match(r.stderr, /usage/i);
  assert.equal(spawnSync('node', [SCRIPT], { encoding: 'utf8' }).status, 2);
});

test('un JSON invalide nomme le fichier fautif et n\'est pas avalé', () => {
  const r = executer({ ...deuxPages(), 'scan/cassé.json': '{ pas du json' });
  assert.equal(r.status, 2);
  assert.match(r.stderr, /cassé\.json/);
  assert.equal(r.texte, null);
});

test('un écran retenu sans bloc de contrastes valide est listé en absent-contraste', () => {
  const fichiers = deuxPages();
  fichiers['scan/1_2.json'].mesures.contrastes.ecrans = [];
  const r = executer(fichiers);
  assert.equal(r.status, 1);
  assert.deepEqual(r.json.invalides, [{ page: '1:2', ecran: '3:1', motif: 'absent-contraste', bloc: 'contrastes' }]);
  assert.equal(r.json.ecransMesures, 3);
});

test('les identifiants de reste sont listés non mesurés, retenus ou non, même avec --tout', () => {
  const fichiers = deuxPages();
  fichiers['scan/1_1.json'].mesures.compteurs.reste = ['2:7'];
  fichiers['scan/1_1.json'].mesures.contrastes.reste = ['2:8'];
  fichiers['perimetre-valide.json'] = { ecrans: ['2:1'] };
  const attendu = [
    { page: '1:1', ecran: '2:7', motif: 'non-mesure', bloc: 'compteurs' },
    { page: '1:1', ecran: '2:8', motif: 'non-mesure', bloc: 'contrastes' },
  ];
  for (const args of [[], ['--tout']]) {
    const r = executer(fichiers, args);
    assert.equal(r.status, 1);
    assert.deepEqual(r.json.invalides, attendu);
  }
});

test('un reste vide ne signale rien', () => {
  const fichiers = deuxPages();
  fichiers['scan/1_1.json'].mesures.compteurs.reste = [];
  assert.equal(executer(fichiers).status, 0);
});

test('un écran présent dans deux fichiers est listé en doublon et n\'entre dans aucun total', () => {
  const fichiers = deuxPages();
  fichiers['scan/1_2.json'].mesures.compteurs.ecrans.push(ecran('2:1'));
  const r = executer(fichiers);
  assert.equal(r.status, 1);
  assert.deepEqual(r.json.invalides, [{ page: '1:1', ecran: '2:1', motif: 'doublon', bloc: 'compteurs' }]);
  assert.equal(r.json.ecrans.noeuds, 150);
  assert.equal(r.json.ecransMesures, 2);
});

test('les contrastes en doublon d\'une page de kit sont écartés', () => {
  const fichiers = {
    ...deuxPages(),
    'survol.json': { pages: [{ id: '1:2', role: 'kit' }] },
  };
  fichiers['scan/1_2.json'].mesures.contrastes.ecrans.push(contraste('3:1', 5, 1, 0));
  const r = executer(fichiers);
  assert.deepEqual(r.json.kit.contrastes, { textes: 0, echecs: 0, indetermines: 0 });
  assert.deepEqual(r.json.invalides, [{ page: '1:2', ecran: '3:1', motif: 'doublon', bloc: 'contrastes' }]);
});

test('une liste d\'écrans qui n\'est pas un tableau donne le code 2 et nomme le fichier', () => {
  for (const cle of ['compteurs', 'contrastes']) {
    const fichiers = deuxPages();
    fichiers['scan/1_2.json'].mesures[cle].ecrans = { id: '3:1' };
    const r = executer(fichiers);
    assert.equal(r.status, 2, cle);
    assert.match(r.stderr, /1_2\.json/, cle);
    assert.match(r.stderr, /tableau/, cle);
  }
});

test('l\'absence de survol.json est signalée sur stderr sans changer le code de sortie', () => {
  const sans = executer(deuxPages());
  assert.equal(sans.status, 0);
  assert.match(sans.stderr, /survol\.json absent : les pages du kit ne sont pas distinguées des écrans/);
  const avec = executer({ ...deuxPages(), 'survol.json': { pages: [] } });
  assert.equal(avec.stderr, '');
});

test('horsEchelle ignore les valeurs nulles, négatives et non numériques', () => {
  assert.deepEqual(horsEchelle({ '-4': 1, '-3': 1, 0: 1, abc: 1, '': 1, 13: 1 }), ['13']);
});

test('horsEchelle ignore les valeurs au plafond et au-delà quand un plafond est donné', () => {
  assert.deepEqual(horsEchelle({ 13: 1, 99: 1, 101: 1, 9999: 1 }), ['13', '99', '101', '9999']);
  assert.deepEqual(horsEchelle({ 13: 1, 99: 1, 101: 1, 9999: 1 }, 100), ['13', '99']);
});

test('pour les rayons, 100 et plus (rayon plein) est exclu du hors échelle mais reste dans l\'histogramme', () => {
  const total = agreger([ecran('a', { rayons: { 13: 1, 9999: 2 }, espacements: { '-3': 1, 8: 1 } })], []);
  assert.deepEqual(total.horsEchelle, { espacements: [], rayons: ['13'] });
  assert.equal(total.histogrammes.rayons['9999'], 2);
  assert.equal(total.histogrammes.espacements['-3'], 1);
});

test('les clés négatives d\'un histogramme passent après les autres (ordre des clés de JavaScript)', () => {
  const total = agreger([ecran('a', { espacements: { '-4': 1, 8: 1, 4: 1 } })], []);
  assert.deepEqual(Object.keys(total.histogrammes.espacements), ['4', '8', '-4']);
});
