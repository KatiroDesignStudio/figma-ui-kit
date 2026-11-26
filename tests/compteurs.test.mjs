// Tests du script de mesure `compteurs.js` : un cas par règle de comptage.
// Lancer : npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { avecParams, blocCommun, creerFigma, lancer } from './aide/figma-simule.mjs';

const NOIR = { r: 0, g: 0, b: 0 };
const BLANC = { r: 1, g: 1, b: 1 };
const plein = (couleur, extra = {}) => ({ type: 'SOLID', color: couleur, ...extra });
const typo = (extra = {}) => ({ characters: 'x', fontSize: 16, fontName: { family: 'Inter', style: 'Regular' }, textStyleId: '', boundVariables: {}, fills: [], ...extra });

/** Document d'une page « Écrans » (1:1) avec un écran 2:1 qui porte les enfants donnés. */
const documentAvec = (enfants, extraEcran = {}, autresPages = []) => ({
  pages: [{ id: '1:1', name: 'Écrans', children: [{ id: '2:1', type: 'FRAME', name: 'Accueil', width: 1440.4, children: enfants, ...extraEcran }] }, ...autresPages],
});

/** Écran 2:1 mesuré, avec le document donné. */
async function ecranDe(document, params = {}) {
  const { resultat } = await lancer('compteurs.js', { pageId: '1:1', ...params }, document);
  return resultat.ecrans[0];
}
const mesurer = (enfants, extraEcran) => ecranDe(documentAvec(enfants, extraEcran));

/** Comme `lancer`, mais permet de retoucher le faux document (par exemple pour y mettre `figma.mixed`). */
async function lancerRetouche(params, document, retouche) {
  const figma = creerFigma(document);
  await retouche(figma);
  const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor;
  return new AsyncFunction('figma', avecParams('compteurs.js', params))(figma);
}

test('compte les nœuds visibles, ignore les cachés et leurs enfants, traverse une section sans la compter', async () => {
  const document = documentAvec([
    { id: '2:2', type: 'RECTANGLE', name: 'Fond' },
    { id: '2:3', type: 'RECTANGLE', name: 'Caché', visible: false },
    { id: '2:4', type: 'FRAME', name: 'Groupe caché', visible: false, children: [{ id: '2:5', type: 'RECTANGLE', name: 'Fils' }] },
  ]);
  document.pages[0].children.push({ id: '3:1', type: 'SECTION', name: 'Section', children: [{ id: '3:2', type: 'FRAME', name: 'Contact', width: 320, children: [] }] });

  const { resultat } = await lancer('compteurs.js', { pageId: '1:1' }, document);

  assert.equal(resultat.version, 1);
  assert.deepEqual(resultat.page, { id: '1:1', nom: 'Écrans' });
  assert.deepEqual(resultat.ecrans.map((e) => [e.id, e.nom, e.noeuds]), [['2:1', 'Accueil', 2], ['3:2', 'Contact', 1]]);
});

test('arrondit la largeur de l\'écran', async () => {
  const ecran = await mesurer([]);

  assert.equal(ecran.largeur, 1440);
});

test('un remplissage plein visible compte une propriété et une couleur, avec l\'alpha sous 1', async () => {
  const ecran = await mesurer([
    { id: '2:2', type: 'RECTANGLE', name: 'A', fills: [plein(NOIR), plein(BLANC, { opacity: 0.5 })] },
    { id: '2:3', type: 'RECTANGLE', name: 'B', fills: [plein(NOIR, { visible: false })] },
  ]);

  assert.deepEqual(ecran.proprietes, { total: 2, parVariable: 0, parStyle: 0 });
  assert.deepEqual(ecran.couleurs, { '000000': 1, FFFFFF80: 1 });
});

test('un remplissage image reste hors des compteurs et un dégradé compte sans couleur', async () => {
  const ecran = await mesurer([
    { id: '2:2', type: 'RECTANGLE', name: 'Photo', fills: [{ type: 'IMAGE' }] },
    { id: '2:3', type: 'RECTANGLE', name: 'Dégradé', fills: [{ type: 'GRADIENT_LINEAR' }] },
  ]);

  assert.equal(ecran.proprietes.total, 1);
  assert.deepEqual(ecran.couleurs, {});
});

test('un remplissage relié par variable ou par style est compté à part, figma.mixed n\'est pas un style', async () => {
  const document = documentAvec([
    { id: '2:2', type: 'RECTANGLE', name: 'Variable', fills: [plein(NOIR, { boundVariables: { color: { id: 'v1' } } })] },
    { id: '2:3', type: 'RECTANGLE', name: 'Style', fills: [plein(NOIR)], fillStyleId: 'S:1' },
    { id: '2:4', type: 'RECTANGLE', name: 'Mixte', fills: [plein(NOIR)] },
  ]);

  const resultat = await lancerRetouche({ pageId: '1:1' }, document, async (figma) => {
    (await figma.getNodeByIdAsync('2:4')).fillStyleId = figma.mixed;
  });

  assert.deepEqual(resultat.ecrans[0].proprietes, { total: 3, parVariable: 1, parStyle: 1 });
});

test('un contour plein compte une propriété et une couleur, puis une épaisseur par côté non nul', async () => {
  const ecran = await mesurer([
    { id: '2:2', type: 'RECTANGLE', name: 'Cadre', strokes: [plein(NOIR)], strokeStyleId: 'S:2', strokeTopWeight: 1, strokeRightWeight: 0, strokeBottomWeight: 2, strokeLeftWeight: 0, boundVariables: { strokeBottomWeight: { id: 'v2' } } },
  ]);

  // couleur (style) + 2 épaisseurs (une par variable)
  assert.deepEqual(ecran.proprietes, { total: 3, parVariable: 1, parStyle: 1 });
  assert.deepEqual(ecran.couleurs, { '000000': 1 });
});

test('sans côtés détaillés, strokeWeight compte une propriété ; sans contour visible, aucune épaisseur', async () => {
  const ecran = await mesurer([
    { id: '2:2', type: 'RECTANGLE', name: 'Avec', strokes: [plein(NOIR)], strokeWeight: 2, boundVariables: { strokeWeight: { id: 'v3' } } },
    { id: '2:3', type: 'RECTANGLE', name: 'Sans', strokes: [plein(NOIR, { visible: false })], strokeWeight: 2, strokeTopWeight: 2 },
  ]);

  assert.deepEqual(ecran.proprietes, { total: 2, parVariable: 1, parStyle: 0 });
});

test('l\'auto-layout compte les paddings et l\'écart non nuls, reliés par variable, et nourrit les espacements', async () => {
  const ecran = await mesurer([
    { id: '2:2', type: 'FRAME', name: 'Pile', layoutMode: 'VERTICAL', paddingTop: 8, paddingRight: 0, paddingBottom: 8, paddingLeft: 13, itemSpacing: 4, boundVariables: { paddingTop: { id: 'v4' } } },
  ]);

  assert.deepEqual(ecran.proprietes, { total: 4, parVariable: 1, parStyle: 0 });
  assert.deepEqual(ecran.espacements, { 13: 1, 4: 1, 8: 2 });
});

test('l\'écart ne compte pas avec SPACE_BETWEEN, et rien ne compte sans auto-layout', async () => {
  const ecran = await mesurer([
    { id: '2:2', type: 'FRAME', name: 'Réparti', layoutMode: 'HORIZONTAL', primaryAxisAlignItems: 'SPACE_BETWEEN', itemSpacing: 24 },
    { id: '2:3', type: 'FRAME', name: 'Libre', layoutMode: 'NONE', paddingTop: 8, itemSpacing: 8 },
  ]);

  assert.equal(ecran.proprietes.total, 0);
  assert.deepEqual(ecran.espacements, {});
});

test('un rayon numérique non nul compte une propriété, relié par variable si elle existe', async () => {
  const ecran = await mesurer([
    { id: '2:2', type: 'RECTANGLE', name: 'A', cornerRadius: 4, boundVariables: { cornerRadius: { id: 'v5' } } },
    { id: '2:3', type: 'RECTANGLE', name: 'B', cornerRadius: 0 },
  ]);

  assert.deepEqual(ecran.proprietes, { total: 1, parVariable: 1, parStyle: 0 });
  assert.deepEqual(ecran.rayons, { 4: 1 });
});

test('un rayon figma.mixed compte une propriété par coin non nul', async () => {
  const document = documentAvec([
    { id: '2:2', type: 'RECTANGLE', name: 'Coins', topLeftRadius: 8, topRightRadius: 8, bottomRightRadius: 0, bottomLeftRadius: 2, boundVariables: { topLeftRadius: { id: 'v6' } } },
  ]);

  const resultat = await lancerRetouche({ pageId: '1:1' }, document, async (figma) => {
    (await figma.getNodeByIdAsync('2:2')).cornerRadius = figma.mixed;
  });

  assert.deepEqual(resultat.ecrans[0].proprietes, { total: 3, parVariable: 1, parStyle: 0 });
  assert.deepEqual(resultat.ecrans[0].rayons, { 2: 1, 8: 2 });
});

test('les effets visibles comptent, reliés par style ou par variable ; un effet caché est ignoré', async () => {
  const ecran = await mesurer([
    { id: '2:2', type: 'RECTANGLE', name: 'Ombre', effects: [{ type: 'DROP_SHADOW' }, { type: 'LAYER_BLUR', boundVariables: { radius: { id: 'v7' } } }, { type: 'DROP_SHADOW', visible: false }] },
    { id: '2:3', type: 'RECTANGLE', name: 'Style', effects: [{ type: 'DROP_SHADOW' }], effectStyleId: 'S:3' },
  ]);

  assert.deepEqual(ecran.proprietes, { total: 3, parVariable: 1, parStyle: 1 });
});

test('une opacité différente de 1 compte une propriété, reliée par variable si elle existe', async () => {
  const ecran = await mesurer([
    { id: '2:2', type: 'RECTANGLE', name: 'A', opacity: 0.5 },
    { id: '2:3', type: 'RECTANGLE', name: 'B', opacity: 0.2, boundVariables: { opacity: { id: 'v8' } } },
    { id: '2:4', type: 'RECTANGLE', name: 'C' },
  ]);

  assert.deepEqual(ecran.proprietes, { total: 2, parVariable: 1, parStyle: 0 });
});

test('chaque segment de texte compte une propriété de typo, tailles et polices comprises', async () => {
  const ecran = await mesurer([
    { id: '2:2', type: 'TEXT', name: 'Titre', segments: [
      typo({ fontSize: 24, fontName: { family: 'Inter', style: 'Bold' }, textStyleId: 'S:4' }),
      typo({ boundVariables: { fontSize: { id: 'v9' } } }),
      typo({ fontSize: 14, boundVariables: { fontFamily: { id: 'v10' } } }),
      typo({ fontSize: 14 }),
    ] },
  ]);

  assert.deepEqual(ecran.proprietes, { total: 4, parVariable: 2, parStyle: 1 });
  assert.deepEqual(ecran.taillesTexte, { 14: 2, 16: 1, 24: 1 });
  assert.deepEqual(ecran.polices, { 'Inter/Bold': 1, 'Inter/Regular': 3 });
});

test('un texte est sans style si un segment au moins n\'a pas de style de texte', async () => {
  const ecran = await mesurer([
    { id: '2:2', type: 'TEXT', name: 'Stylé', segments: [typo({ textStyleId: 'S:5' })] },
    { id: '2:3', type: 'TEXT', name: 'Mixte', segments: [typo({ textStyleId: 'S:5' }), typo()] },
    { id: '2:4', type: 'TEXT', name: 'Nu', segments: [typo()] },
  ]);

  assert.deepEqual(ecran.textes, { total: 3, sansStyle: 2 });
});

test('les remplissages d\'un texte comptent une fois, sur le nœud', async () => {
  const ecran = await mesurer([
    { id: '2:2', type: 'TEXT', name: 'Titre', fills: [plein(NOIR)], segments: [typo({ textStyleId: 'S:6', fills: [plein(NOIR)] }), typo({ textStyleId: 'S:6', fills: [plein(NOIR)] })] },
  ]);

  assert.deepEqual(ecran.couleurs, { '000000': 1 });
  assert.equal(ecran.proprietes.total, 3);
});

test('une instance compte 1, sans ses enfants ni ses propriétés propres', async () => {
  const ecran = await mesurer([
    { id: '2:2', type: 'INSTANCE', name: 'Bouton', fills: [plein(NOIR)], cornerRadius: 8, opacity: 0.5, mainComponent: { id: '9:1' }, children: [{ id: '2:3', type: 'TEXT', name: 'Libellé' }] },
  ]);

  assert.equal(ecran.noeuds, 2);
  assert.equal(ecran.proprietes.total, 0);
  assert.deepEqual(ecran.couleurs, {});
  assert.equal(ecran.textes.total, 0);
});

test('les instances sont rangées : kit, locales, bibliothèques par clé, composant introuvable en locales', async () => {
  const kit = { id: '1:3', name: 'Kit', children: [{ id: '9:1', type: 'COMPONENT', name: 'Bouton' }] };
  const hors = { id: '1:4', name: 'Divers', children: [{ id: '9:2', type: 'COMPONENT', name: 'Carte' }] };
  const document = documentAvec([
    { id: '2:2', type: 'INSTANCE', name: 'A', mainComponent: { id: '9:1' } },
    { id: '2:3', type: 'INSTANCE', name: 'B', mainComponent: { id: '9:1' } },
    { id: '2:4', type: 'INSTANCE', name: 'C', mainComponent: { id: '9:2' } },
    { id: '2:5', type: 'INSTANCE', name: 'D', mainComponent: { id: '8:1', key: 'cle-abc', remote: true, type: 'COMPONENT', name: 'Icon / arrow' } },
    { id: '2:6', type: 'INSTANCE', name: 'E', mainComponent: { id: '8:1', key: 'cle-abc', remote: true, type: 'COMPONENT', name: 'Icon / arrow' } },
    { id: '2:7', type: 'INSTANCE', name: 'F', mainComponent: null },
  ], {}, [kit, hors]);

  const { resultat } = await lancer('compteurs.js', { pageId: '1:1', pagesKit: ['1:3'] }, document);

  assert.deepEqual(resultat.ecrans[0].instances, { total: 6, kit: 2, locales: 2, bibliotheques: { 'cle-abc': 2 } });
  assert.deepEqual(resultat.nomsBibliotheques, { 'cle-abc': 'Icon / arrow' });
});

test('seules les modifications locales d\'une instance comptent, sur le nœud surchargé', async () => {
  const ecran = await mesurer([
    { id: '2:2', type: 'INSTANCE', name: 'Bouton', mainComponent: { id: '9:1' },
      overrides: [
        { id: '2:3', overriddenFields: ['fills', 'cornerRadius', 'name'] },
        { id: '2:4', overriddenFields: ['fontSize', 'characters'] },
        { id: '2:5', overriddenFields: ['characters'] },
        { id: '2:6', overriddenFields: ['paddingLeft', 'itemSpacing', 'opacity'] },
        { id: '9:9', overriddenFields: ['fills'] },
      ],
      children: [
        { id: '2:3', type: 'RECTANGLE', name: 'Fond', fills: [plein(NOIR)], cornerRadius: 4, opacity: 0.5, strokes: [plein(BLANC)] },
        { id: '2:4', type: 'TEXT', name: 'Libellé', fills: [plein(BLANC)], segments: [typo({ fontSize: 20 })] },
        { id: '2:5', type: 'TEXT', name: 'Autre', segments: [typo()] },
        { id: '2:6', type: 'FRAME', name: 'Pile', layoutMode: 'HORIZONTAL', paddingLeft: 6, paddingRight: 6, itemSpacing: 2, opacity: 0.9, fills: [plein(NOIR)] },
      ] },
  ]);

  // fills + rayon sur 2:3 ; typo sur 2:4 ; padding gauche, écart et opacité sur 2:6.
  assert.equal(ecran.proprietes.total, 2 + 1 + 3);
  assert.deepEqual(ecran.couleurs, { '000000': 1 });
  assert.deepEqual(ecran.rayons, { 4: 1 });
  assert.deepEqual(ecran.taillesTexte, { 20: 1 });
  assert.deepEqual(ecran.espacements, { 2: 1, 6: 1 });
  assert.equal(ecran.noeuds, 2);
  assert.equal(ecran.textes.total, 0);
});

test('une copie détachée est un nœud compté dont detachedInfo n\'est pas nul', async () => {
  const ecran = await mesurer([
    { id: '2:2', type: 'FRAME', name: 'Copie', detachedInfo: { type: 'local', componentId: '9:1' } },
    { id: '2:3', type: 'FRAME', name: 'Normal', detachedInfo: null },
    { id: '2:4', type: 'FRAME', name: 'Caché', visible: false, detachedInfo: { type: 'local' } },
  ]);

  assert.equal(ecran.copiesDetachees, 1);
});

test('le cadre d\'un component set est compté, mais son décor est hors compteurs ; ses enfants sont mesurés', async () => {
  const ecran = await mesurer([
    { id: '2:2', type: 'COMPONENT_SET', name: 'Bouton', fills: [plein(BLANC)], strokes: [plein(NOIR)], strokeWeight: 1, cornerRadius: 5, layoutMode: 'HORIZONTAL', paddingTop: 16, paddingLeft: 16, children: [
      { id: '2:3', type: 'COMPONENT', name: 'Variante', fills: [plein(NOIR)] },
    ] },
  ]);

  assert.equal(ecran.noeuds, 3);
  assert.equal(ecran.proprietes.total, 1);
  assert.deepEqual(ecran.couleurs, { '000000': 1 });
  assert.deepEqual(ecran.rayons, {});
  assert.deepEqual(ecran.espacements, {});
});

test('les noms que Figma génère par défaut sont comptés', async () => {
  const ecran = await mesurer([
    { id: '2:2', type: 'FRAME', name: 'Frame 12' },
    { id: '2:3', type: 'GROUP', name: 'Group 3' },
    { id: '2:4', type: 'ELLIPSE', name: 'Ellipse' },
    { id: '2:5', type: 'VECTOR', name: 'Vector 7' },
    { id: '2:6', type: 'FRAME', name: 'Frame du héros' },
    { id: '2:7', type: 'RECTANGLE', name: 'Mon Rectangle 5' },
  ], { name: 'Frame 1' });

  // l'écran « Frame 1 » compte aussi
  assert.equal(ecran.nomsGeneres, 5);
});

test('les composants de la page : sets, simples et variantes, avec leur sceau', async () => {
  const document = documentAvec([]);
  document.pages[0].children.push(
    { id: '4:1', type: 'COMPONENT_SET', name: 'Set', children: [{ id: '4:2', type: 'COMPONENT', name: 'a' }, { id: '4:3', type: 'COMPONENT', name: 'b' }] },
    { id: '4:4', type: 'COMPONENT', name: 'Seul' },
  );

  const { resultat } = await lancer('compteurs.js', { pageId: '1:1' }, document);

  assert.deepEqual({ ...resultat.composants, sceau: undefined }, { sets: 1, simples: 1, variantes: 3, sceau: undefined });
  assert.match(resultat.composants.sceau, /^[0-9a-f]{8}$/);
});

test('budget dépassé : le premier écran est traité, les autres vont dans reste', async () => {
  const document = documentAvec([]);
  document.pages[0].children.push({ id: '3:1', type: 'FRAME', name: 'B', children: [] }, { id: '3:2', type: 'FRAME', name: 'C', children: [] });

  const { resultat } = await lancer('compteurs.js', { pageId: '1:1', budgetMs: -1 }, document);

  assert.deepEqual(resultat.ecrans.map((e) => e.id), ['2:1']);
  assert.deepEqual(resultat.reste, ['3:1', '3:2']);
});

test('sans dépassement de budget, reste est vide', async () => {
  const { resultat } = await lancer('compteurs.js', { pageId: '1:1' }, documentAvec([]));

  assert.deepEqual(resultat.reste, []);
});

test('avec cadres donnés, seuls ces cadres sont mesurés et composants n\'est pas rendu', async () => {
  const document = documentAvec([]);
  document.pages[0].children.push({ id: '3:1', type: 'FRAME', name: 'B', children: [] });

  const { resultat } = await lancer('compteurs.js', { pageId: '1:1', cadres: ['3:1'] }, document);

  assert.deepEqual(resultat.ecrans.map((e) => e.id), ['3:1']);
  assert.equal('composants' in resultat, false);
});

test('une liste de cadres vide vaut tous les cadres, composants rendu', async () => {
  const { resultat } = await lancer('compteurs.js', { pageId: '1:1', cadres: [] }, documentAvec([]));

  assert.equal(resultat.ecrans.length, 1);
  assert.deepEqual({ ...resultat.composants, sceau: 0 }, { sets: 0, simples: 0, variantes: 0, sceau: 0 });
});

test('le sceau d\'un écran couvre l\'écran sans son champ sceau, il est stable et change avec une valeur', async () => {
  const sceauDe = new Function(`${blocCommun()}\nreturn sceau;`)();
  const a = await mesurer([{ id: '2:2', type: 'RECTANGLE', name: 'A', fills: [plein(NOIR)] }]);
  const b = await mesurer([{ id: '2:2', type: 'RECTANGLE', name: 'A', fills: [plein(NOIR)] }]);
  const c = await mesurer([{ id: '2:2', type: 'RECTANGLE', name: 'A', fills: [plein(BLANC)] }]);
  const { sceau: _, ...sansSceau } = a;

  assert.match(a.sceau, /^[0-9a-f]{8}$/);
  assert.equal(a.sceau, sceauDe(sansSceau));
  assert.equal(a.sceau, b.sceau);
  assert.notEqual(a.sceau, c.sceau);
});

test('ne change de page qu\'une fois et refuse une page introuvable', async () => {
  const { figma } = await lancer('compteurs.js', { pageId: '1:1' }, documentAvec([]));

  assert.equal(figma.changementsDePage, 1);
  await assert.rejects(lancer('compteurs.js', { pageId: '7:7' }, documentAvec([])), /page introuvable : 7:7/);
});

test('une surcharge sur un nœud caché, ou sous un parent caché de l\'instance, ne compte pas', async () => {
  const ecran = await mesurer([
    { id: '2:2', type: 'INSTANCE', name: 'Bouton', mainComponent: { id: '9:1' },
      overrides: [
        { id: '2:3', overriddenFields: ['fills'] },
        { id: '2:5', overriddenFields: ['fills'] },
        { id: '2:6', overriddenFields: ['fills'] },
      ],
      children: [
        { id: '2:3', type: 'RECTANGLE', name: 'Icône cachée', visible: false, fills: [plein(NOIR)] },
        { id: '2:4', type: 'FRAME', name: 'Groupe caché', visible: false, children: [{ id: '2:5', type: 'RECTANGLE', name: 'Fils', fills: [plein(NOIR)] }] },
        { id: '2:6', type: 'RECTANGLE', name: 'Visible', fills: [plein(BLANC)] },
      ] },
  ]);

  assert.equal(ecran.proprietes.total, 1);
  assert.deepEqual(ecran.couleurs, { FFFFFF: 1 });
});

test('le cadre d\'un component set est hors de tous les compteurs de propriétés, écart, effets et opacité compris', async () => {
  const ecran = await mesurer([
    { id: '2:2', type: 'COMPONENT_SET', name: 'Bouton', layoutMode: 'HORIZONTAL', itemSpacing: 16, opacity: 0.5, effects: [{ type: 'DROP_SHADOW' }], children: [] },
  ]);

  assert.equal(ecran.noeuds, 2);
  assert.equal(ecran.proprietes.total, 0);
  assert.deepEqual(ecran.espacements, {});
});

test('un cadre demandé qui n\'est pas un cadre de premier niveau visible lève une erreur qui nomme tous les fautifs', async () => {
  const document = documentAvec([{ id: '2:2', type: 'FRAME', name: 'Imbriqué', children: [] }]);
  document.pages[0].children.push({ id: '3:1', type: 'FRAME', name: 'Caché', visible: false, children: [] });

  await assert.rejects(
    lancer('compteurs.js', { pageId: '1:1', cadres: ['2:1', '2:99', '2:2', '3:1', '2:99'] }, document),
    /cadres inconnus sur cette page : 2:99, 2:2, 3:1$/,
  );
});

test('les cadres demandés sortent dans l\'ordre du document, sans doublon', async () => {
  const document = documentAvec([]);
  document.pages[0].children.push({ id: '3:1', type: 'FRAME', name: 'B', children: [] });

  const { resultat } = await lancer('compteurs.js', { pageId: '1:1', cadres: ['3:1', '2:1', '3:1'] }, document);

  assert.deepEqual(resultat.ecrans.map((e) => e.id), ['2:1', '3:1']);
});

test('budgetMs null ou absent vaut 20 000 : tous les écrans sont traités', async () => {
  const document = documentAvec([]);
  document.pages[0].children.push({ id: '3:1', type: 'FRAME', name: 'B', children: [] });

  const { resultat } = await lancer('compteurs.js', { pageId: '1:1', budgetMs: null }, document);

  assert.deepEqual(resultat.ecrans.map((e) => e.id), ['2:1', '3:1']);
  assert.deepEqual(resultat.reste, []);
});

test('le découpage des segments de typo ne dépend pas des couleurs', async () => {
  const document = documentAvec([{ id: '2:2', type: 'TEXT', name: 'Titre' }]);

  const resultat = await lancerRetouche({ pageId: '1:1' }, document, async (figma) => {
    const texte = await figma.getNodeByIdAsync('2:2');
    texte.getStyledTextSegments = (champs) => (champs.includes('fills') ? [typo(), typo()] : [typo()]);
  });

  assert.equal(resultat.ecrans[0].proprietes.total, 1);
  assert.deepEqual(resultat.ecrans[0].taillesTexte, { 16: 1 });
  assert.deepEqual(resultat.ecrans[0].polices, { 'Inter/Regular': 1 });
});

test('un texte aux remplissages figma.mixed est lu par segment, relié par style si fillStyleId est une chaîne non vide', async () => {
  const document = documentAvec([{ id: '2:2', type: 'TEXT', name: 'Titre' }]);

  const resultat = await lancerRetouche({ pageId: '1:1' }, document, async (figma) => {
    const texte = await figma.getNodeByIdAsync('2:2');
    texte.fills = figma.mixed;
    texte.getStyledTextSegments = (champs) => (champs.includes('fillStyleId')
      ? [{ fills: [plein(NOIR)], fillStyleId: 'S:9' }, { fills: [plein(BLANC)], fillStyleId: '' }, { fills: [plein(BLANC)], fillStyleId: figma.mixed }]
      : [typo({ textStyleId: 'S:1' })]);
  });

  // 3 couleurs de segments (une par style) + 1 segment de typo (par style)
  assert.deepEqual(resultat.ecrans[0].proprietes, { total: 4, parVariable: 0, parStyle: 2 });
  assert.deepEqual(resultat.ecrans[0].couleurs, { '000000': 1, FFFFFF: 2 });
});

test('un écart d\'auto-layout négatif (chevauchement) compte comme une propriété et dans les espacements', async () => {
  const ecran = await mesurer([
    { id: '2:2', type: 'FRAME', name: 'Pile', layoutMode: 'HORIZONTAL', itemSpacing: -10 },
  ]);

  assert.equal(ecran.proprietes.total, 1);
  assert.deepEqual(ecran.espacements, { '-10': 1 });
});
