// Tests du script de mesure `survol.js`.
// Lancer : npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lancer } from './aide/figma-simule.mjs';

const cadre = (id, nom, extra = {}) => ({ id, type: 'FRAME', name: nom, ...extra });

const documentSimple = () => ({
  pages: [
    { id: '1:1', name: 'Écrans', children: [
      cadre('2:1', 'Accueil'),
      cadre('2:2', 'home_hero'),
      cadre('2:3', 'Home-footer'),
      { id: '2:4', type: 'COMPONENT', name: 'Bouton' },
      { id: '2:5', type: 'INSTANCE', name: 'Carte', mainComponent: { id: '9:1' } },
      { id: '3:1', type: 'SECTION', name: 'Public', children: [
        cadre('3:2', 'Contact'),
        { id: '3:3', type: 'RECTANGLE', name: 'Image 3' },
      ] },
      { id: '5:1', type: 'TEXT', name: 'Note' },
    ] },
    { id: '1:2', name: 'Vide', children: [] },
    { id: '1:3', name: 'Kit', children: [
      { id: '6:1', type: 'COMPONENT_SET', name: 'Bouton', children: [
        { id: '6:2', type: 'COMPONENT', name: 'Type=Primaire' },
        { id: '6:3', type: 'COMPONENT', name: 'Type=Secondaire' },
      ] },
      { id: '6:4', type: 'COMPONENT', name: 'Icône' },
    ] },
  ],
});

const surPages = (pages, extra = {}) => ({ pages, ...extra });
const lancerSurvol = async (document) => (await lancer('survol.js', {}, document)).resultat;

test('survol rend les pages dans l\'ordre du fichier avec identifiant, nom et vide', async () => {
  const r = await lancerSurvol(documentSimple());

  assert.equal(r.version, 1);
  assert.deepEqual(r.pages.map((p) => [p.id, p.nom, p.vide]), [['1:1', 'Écrans', false], ['1:2', 'Vide', true], ['1:3', 'Kit', false]]);
});

test('survol compte les cadres de premier niveau, ceux d\'une section compris', async () => {
  const r = await lancerSurvol(documentSimple());

  // Accueil, home_hero, Home-footer, Bouton (composant), Carte (instance), Contact (dans la section) ; pas le rectangle ni le texte.
  assert.equal(r.pages[0].cadres, 6);
});

test('survol liste les sections de la page', async () => {
  const r = await lancerSurvol(documentSimple());

  assert.deepEqual(r.pages[0].sections, ['Public']);
  assert.deepEqual(r.pages[1].sections, []);
});

test('survol liste les autres nœuds de premier niveau, sans cadres ni sections', async () => {
  const r = await lancerSurvol(documentSimple());

  assert.deepEqual(r.pages[0].autresNoeuds, [
    { id: '3:3', nom: 'Image 3', type: 'RECTANGLE' },
    { id: '5:1', nom: 'Note', type: 'TEXT' },
  ]);
});

test('survol relève les préfixes communs à 2 cadres au moins, casse ignorée, séparateurs variés', async () => {
  const r = await lancerSurvol(documentSimple());

  assert.deepEqual(r.pages[0].prefixes, [{ prefixe: 'home', occurrences: 2 }]);
});

test('survol ignore un préfixe porté par un seul cadre', async () => {
  const r = await lancerSurvol(surPages([{ id: '1:1', name: 'P', children: [cadre('2:1', 'a_x'), cadre('2:2', 'b_y')] }]));

  assert.deepEqual(r.pages[0].prefixes, []);
});

test('survol prend un nom sans séparateur en entier comme préfixe, casse ignorée', async () => {
  const r = await lancerSurvol(surPages([{ id: '1:1', name: 'P', children: [cadre('2:1', 'Accueil'), cadre('2:2', 'accueil'), cadre('2:3', 'Accueil/Menu')] }]));

  assert.deepEqual(r.pages[0].prefixes, [{ prefixe: 'accueil', occurrences: 3 }]);
});

test('survol trie les préfixes par occurrences décroissantes puis par ordre alphabétique', async () => {
  const noms = ['zeta_1', 'zeta_2', 'beta 1', 'beta 2', 'alpha-1', 'alpha-2', 'alpha-3'];
  const r = await lancerSurvol(surPages([{ id: '1:1', name: 'P', children: noms.map((n, i) => cadre('2:' + i, n)) }]));

  assert.deepEqual(r.pages[0].prefixes.map((p) => [p.prefixe, p.occurrences]), [['alpha', 3], ['beta', 2], ['zeta', 2]]);
});

test('survol relève les mots récurrents à partir de 3 occurrences, tous cadres du fichier', async () => {
  const r = await lancerSurvol(surPages([
    { id: '1:1', name: 'A', children: [cadre('2:1', 'Dashboard clair'), cadre('2:2', 'Dashboard sombre')] },
    { id: '1:2', name: 'B', children: [cadre('3:1', 'dashboard_liste'), cadre('3:2', 'Profil')] },
  ]));

  assert.deepEqual(r.motsRecurrents, [{ mot: 'dashboard', occurrences: 3 }]);
});

test('survol exclut les mots de moins de 3 lettres et les marqueurs de version des mots récurrents', async () => {
  const noms = ['de x v2', 'de y v2', 'de z v2', 'final a', 'final b', 'final c'];
  const r = await lancerSurvol(surPages([{ id: '1:1', name: 'P', children: noms.map((n, i) => cadre('2:' + i, n)) }]));

  assert.deepEqual(r.motsRecurrents, []);
});

test('survol trie les mots récurrents par occurrences décroissantes puis alphabétique', async () => {
  const noms = ['zoo a', 'zoo b', 'zoo c', 'bar a', 'bar b', 'bar c', 'bar d'];
  const r = await lancerSurvol(surPages([{ id: '1:1', name: 'P', children: noms.map((n, i) => cadre('2:' + i, n)) }]));

  assert.deepEqual(r.motsRecurrents, [{ mot: 'bar', occurrences: 4 }, { mot: 'zoo', occurrences: 3 }]);
});

test('survol détecte les versions : mot entier, casse ignorée, v1 à v99', async () => {
  const noms = ['Accueil v2', 'Accueil FINAL', 'Profil_old', 'Contest', 'Revision', 'Page v100', 'Page v0', 'Copie de Aide', 'Nouveau', 'Liste Test'];
  const r = await lancerSurvol(surPages([{ id: '1:1', name: 'P', children: noms.map((n, i) => cadre('2:' + i, n)) }]));

  assert.deepEqual(r.versions.map((v) => v.nom), ['Accueil v2', 'Accueil FINAL', 'Profil_old', 'Copie de Aide', 'Liste Test']);
  assert.ok(r.versions.every((v) => v.page === '1:1'));
});

test('survol détecte les dates comme des versions, dans les deux formes', async () => {
  const noms = ['Accueil 2024-05-01', 'Accueil 01/05/2024', 'Accueil 2024'];
  const r = await lancerSurvol(surPages([{ id: '1:1', name: 'P', children: noms.map((n, i) => cadre('2:' + i, n)) }]));

  assert.deepEqual(r.versions.map((v) => v.nom), ['Accueil 2024-05-01', 'Accueil 01/05/2024']);
});

test('survol garde les versions dans l\'ordre du document, avec la page de chacune', async () => {
  const r = await lancerSurvol(surPages([
    { id: '1:1', name: 'A', children: [cadre('2:1', 'Un draft')] },
    { id: '1:2', name: 'B', children: [cadre('3:1', 'Deux bis')] },
  ]));

  assert.deepEqual(r.versions, [{ nom: 'Un draft', page: '1:1' }, { nom: 'Deux bis', page: '1:2' }]);
});

test('survol liste les noms en double avec leurs identifiants, d\'une page à l\'autre', async () => {
  const r = await lancerSurvol(surPages([
    { id: '1:1', name: 'A', children: [cadre('2:1', 'Accueil'), cadre('2:2', 'Profil'), cadre('2:3', 'Liste')] },
    { id: '1:2', name: 'B', children: [cadre('7:1', 'Accueil'), cadre('7:2', 'Liste'), cadre('7:3', 'Accueil')] },
  ]));

  assert.deepEqual(r.nomsEnDouble, [
    { nom: 'Accueil', ids: ['2:1', '7:1', '7:3'] },
    { nom: 'Liste', ids: ['2:3', '7:2'] },
  ]);
});

test('survol rend des listes vides pour une page vide et un fichier sans doublon', async () => {
  const r = await lancerSurvol(surPages([{ id: '1:1', name: 'Vide', children: [] }]));

  assert.deepEqual(r.pages[0], { id: '1:1', nom: 'Vide', vide: true, cadres: 0, sections: [], prefixes: [], autresNoeuds: [], composants: 0 });
  assert.deepEqual([r.motsRecurrents, r.versions, r.nomsEnDouble], [[], [], []]);
});

test('survol compte les component sets et les composants simples de la page, pas les variantes', async () => {
  const r = await lancerSurvol(documentSimple());

  assert.equal(r.pages[0].composants, 1);
  // Le set (ses 2 variantes ne comptent pas) et le composant simple.
  assert.equal(r.pages[2].composants, 2);
});

test('survol compte les styles et les collections locaux', async () => {
  const r = await lancerSurvol(surPages([{ id: '1:1', name: 'P', children: [] }], {
    styles: { peinture: [{}, {}, {}], texte: [{}, {}], effet: [{}], grille: [] },
    collections: [{ name: 'primitives', modes: [{}], variableIds: ['a', 'b'] }, { name: 'sémantique', modes: [{}, {}], variableIds: ['c'] }],
  }));

  assert.deepEqual(r.local, {
    stylesCouleur: 3, stylesTexte: 2, stylesEffet: 1, stylesGrille: 0,
    collections: [{ nom: 'primitives', modes: 1, variables: 2 }, { nom: 'sémantique', modes: 2, variables: 1 }],
  });
});

test('survol change de page pour chaque page du fichier', async () => {
  const { figma } = await lancer('survol.js', {}, documentSimple());

  assert.equal(figma.changementsDePage, 3);
});

test('survol remplace les séparateurs de ligne Figma dans les noms renvoyés', async () => {
  const nom = 'Accueil' + String.fromCharCode(0x2028) + 'bis';
  const r = await lancerSurvol(surPages([{ id: '1:1', name: nom, children: [cadre('2:1', nom)] }]));

  assert.equal(r.pages[0].nom, 'Accueil bis');
  assert.equal(r.versions[0].nom, 'Accueil bis');
  assert.ok(!JSON.stringify(r).includes(String.fromCharCode(0x2028)));
});

test('survol donne un sceau stable calculé sans le champ sceau, différent si le fichier change', async () => {
  const a = await lancerSurvol(documentSimple());
  const b = await lancerSurvol(documentSimple());
  const modifie = documentSimple();
  modifie.pages[0].children.push(cadre('2:9', 'Nouveau cadre'));
  const c = await lancerSurvol(modifie);
  const { sceau, ...sansSceau } = a;
  const { resultat } = await lancer('empreinte.js', { pageId: '1:1' }, documentSimple());

  assert.match(a.sceau, /^[0-9a-f]{8}$/);
  assert.equal(a.sceau, b.sceau);
  assert.notEqual(a.sceau, c.sceau);
  assert.deepEqual(Object.keys(a), ['version', 'pages', 'motsRecurrents', 'versions', 'nomsEnDouble', 'local', 'sceau']);
  assert.equal(JSON.stringify(sansSceau).includes(sceau), false);
  assert.ok(resultat.sceau);
});

test('survol ne prend pas pour préfixe un nombre ni un marqueur de version', async () => {
  const noms = ['05_a', '05_b', '2026-a', '2026-b', 'v1 x', 'v1 y', 'Final_a', 'final_b', 'old/a', 'old/b'];
  const r = await lancerSurvol(surPages([{ id: '1:1', name: 'P', children: noms.map((n, i) => cadre('2:' + i, n)) }]));

  assert.deepEqual(r.pages[0].prefixes, []);
});

test('survol garde un mot à tiret entre deux lettres entier parmi les mots récurrents', async () => {
  const noms = ['en-tête a', 'en-tête b', 'En-tête c', '2026-05 x'];
  const r = await lancerSurvol(surPages([{ id: '1:1', name: 'P', children: noms.map((n, i) => cadre('2:' + i, n)) }]));

  assert.deepEqual(r.motsRecurrents, [{ mot: 'en-tête', occurrences: 3 }]);
});

test('survol voit toujours une version collée par un tiret à un autre mot', async () => {
  const r = await lancerSurvol(surPages([{ id: '1:1', name: 'P', children: [cadre('2:1', 'Accueil-old')] }]));

  assert.deepEqual(r.versions.map((v) => v.nom), ['Accueil-old']);
});

test('survol ignore les cadres invisibles et ceux d\'une section invisible partout', async () => {
  const r = await lancerSurvol(surPages([{ id: '1:1', name: 'P', children: [
    cadre('2:1', 'home_a'), cadre('2:2', 'home_b'), cadre('2:3', 'home_c', { visible: false }),
    cadre('2:4', 'Accueil draft', { visible: false }), cadre('2:5', 'home_a'),
    { id: '3:1', type: 'SECTION', name: 'Cachée', visible: false, children: [cadre('3:2', 'home_d'), cadre('3:3', 'home_e')] },
  ] }]));

  assert.equal(r.pages[0].cadres, 3);
  assert.deepEqual(r.pages[0].prefixes, [{ prefixe: 'home', occurrences: 3 }]);
  assert.deepEqual(r.versions, []);
  assert.deepEqual(r.nomsEnDouble, [{ nom: 'home_a', ids: ['2:1', '2:5'] }]);
  assert.deepEqual(r.motsRecurrents, [{ mot: 'home', occurrences: 3 }]);
});
