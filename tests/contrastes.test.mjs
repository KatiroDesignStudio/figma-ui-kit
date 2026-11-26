// Tests du script de mesure `contrastes.js` (WCAG 2.2 AA), sur un faux document Figma.
// Lancer : npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lancer } from './aide/figma-simule.mjs';

const couleur = (hex) => {
  const n = parseInt(hex, 16);
  return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255 };
};
const plein = (hex, opacity) => ({ type: 'SOLID', color: couleur(hex), ...(opacity === undefined ? {} : { opacity }) });
const texte = (id, extra = {}) => ({ id, type: 'TEXT', name: 'Texte', characters: 'Bonjour', fontSize: 16, fills: [plein('000000')], ...extra });
const ecran = (enfants, extra = {}) => ({ id: '2:1', type: 'FRAME', name: 'Accueil', fills: [plein('FFFFFF')], children: enfants, ...extra });
const mesurer = async (cadres, params = {}) => {
  const document = { pages: [{ id: '1:1', name: 'Écrans', children: cadres }] };
  return (await lancer('contrastes.js', { pageId: '1:1', ...params }, document)).resultat;
};
const premierEcran = async (enfants, extra, params) => (await mesurer([ecran(enfants, extra)], params)).ecrans[0];

test('noir sur blanc donne 21 et passe', async () => {
  const e = await premierEcran([texte('2:2')]);

  assert.equal(e.textes, 1);
  assert.equal(e.echecs, 0);
  assert.deepEqual(e.exemples, []);
});

test('gris 767676 sur blanc fait 4,54 et passe, 777777 fait 4,48 et échoue', async () => {
  const e = await premierEcran([texte('2:2', { fills: [plein('767676')] }), texte('2:3', { fills: [plein('777777')] })]);

  assert.equal(e.echecs, 1);
  assert.deepEqual(e.exemples, [{ noeud: '2:3', texte: 'Bonjour', couleur: '777777', fond: 'FFFFFF', ratio: 4.48, seuil: 4.5, etat: 'echec' }]);
});

test('blanc sur blanc fait 1 et échoue', async () => {
  const e = await premierEcran([texte('2:2', { fills: [plein('FFFFFF')] })], { fills: [plein('FFFFFF')] });

  assert.equal(e.exemples[0].ratio, 1);
});

test('grand texte : seuil 3 à partir de 24, 4,5 en dessous', async () => {
  const gris = [plein('949494')];
  const e = await premierEcran([
    texte('2:2', { fontSize: 24, fills: gris }),
    texte('2:3', { fontSize: 23, fills: gris }),
  ]);

  assert.equal(e.echecs, 1);
  assert.equal(e.exemples[0].noeud, '2:3');
  assert.equal(e.exemples[0].seuil, 4.5);
});

test('grand texte : 18,66 en graisse 700 passe au seuil 3, pas en 600 ni à 18', async () => {
  const gris = [plein('949494')];
  const e = await premierEcran([
    texte('2:2', { fontSize: 18.66, fontWeight: 700, fills: gris }),
    texte('2:3', { fontSize: 18.66, fontWeight: 600, fills: gris }),
    texte('2:4', { fontSize: 18, fontWeight: 700, fills: gris }),
  ]);

  assert.deepEqual(e.exemples.map((x) => x.noeud), ['2:3', '2:4']);
});

test('un fond translucide est composé sur ce qui est dessous', async () => {
  const e = await premierEcran([
    { id: '2:2', type: 'FRAME', name: 'Voile', fills: [plein('000000', 0.5)], children: [texte('2:3', { fills: [plein('FFFFFF')] })] },
  ]);

  assert.equal(e.exemples[0].fond, '808080');
  assert.equal(e.exemples[0].ratio, 3.95);
});

test('l\'opacité d\'un parent rend son fond translucide d\'autant', async () => {
  const e = await premierEcran([
    { id: '2:2', type: 'FRAME', name: 'Carte', opacity: 0.5, fills: [plein('000000')], children: [texte('2:3', { fills: [plein('FFFFFF')] })] },
  ]);

  assert.equal(e.exemples[0].fond, '808080');
});

test('un texte translucide est composé sur le fond avant le calcul', async () => {
  const e = await premierEcran([texte('2:2', { opacity: 0.5 }), texte('2:3', { fills: [plein('000000', 0.5)] })]);

  assert.equal(e.echecs, 2);
  assert.equal(e.exemples[0].couleur, '808080');
  assert.equal(e.exemples[1].couleur, '808080');
  assert.equal(e.exemples[0].ratio, 3.95);
});

test('un dégradé sous le texte le rend indéterminé, sans ratio ni seuil', async () => {
  const e = await premierEcran([texte('2:2')], { fills: [{ type: 'GRADIENT_LINEAR' }] });

  assert.equal(e.indetermines, 1);
  assert.equal(e.echecs, 0);
  assert.deepEqual(e.exemples, [{ noeud: '2:2', texte: 'Bonjour', couleur: '000000', fond: null, etat: 'indetermine' }]);
});

test('une image sous le texte le rend indéterminé', async () => {
  const e = await premierEcran([texte('2:2')], { fills: [{ type: 'IMAGE' }] });

  assert.equal(e.indetermines, 1);
  assert.equal(e.exemples[0].fond, null);
});

test('un texte sans remplissage plein est indéterminé, couleur nulle', async () => {
  const e = await premierEcran([texte('2:2', { fills: [{ type: 'GRADIENT_LINEAR' }] })]);

  assert.deepEqual(e.exemples, [{ noeud: '2:2', texte: 'Bonjour', couleur: null, fond: 'FFFFFF', etat: 'indetermine' }]);
});

test('sans fond opaque jusqu\'à la page, le fond est blanc par défaut', async () => {
  const e = await premierEcran([texte('2:2', { fills: [plein('FFFFFF')] })], { fills: [] });

  assert.equal(e.exemples[0].fond, 'FFFFFF');
  assert.equal(e.exemples[0].fondParDefaut, true);
});

test('un fond trouvé ne porte pas fondParDefaut', async () => {
  const e = await premierEcran([texte('2:2', { fills: [plein('FFFFFF')] })], { fills: [plein('FFFFFE')] });

  assert.equal('fondParDefaut' in e.exemples[0], false);
});

test('un frère dessous qui recouvre le texte et porte un remplissage rend le résultat approximatif', async () => {
  const boite = { x: 0, y: 0, width: 100, height: 40 };
  const e = await premierEcran([
    { id: '2:2', type: 'RECTANGLE', name: 'Photo', fills: [plein('333333')], absoluteBoundingBox: boite },
    texte('2:3', { fills: [plein('777777')], absoluteBoundingBox: { x: 10, y: 10, width: 50, height: 20 } }),
  ]);

  assert.equal(e.approximatifs, 1);
  assert.equal(e.exemples[0].approximatif, true);
});

test('sans recouvrement ou sans boîte, le résultat n\'est pas approximatif', async () => {
  const e = await premierEcran([
    { id: '2:2', type: 'RECTANGLE', name: 'Loin', fills: [plein('333333')], absoluteBoundingBox: { x: 500, y: 0, width: 10, height: 10 } },
    texte('2:3', { fills: [plein('777777')], absoluteBoundingBox: { x: 0, y: 0, width: 50, height: 20 } }),
    { id: '2:4', type: 'RECTANGLE', name: 'Sans boîte', fills: [plein('333333')] },
    texte('2:5', { fills: [plein('777777')] }),
  ]);

  assert.equal(e.approximatifs, 0);
  assert.equal('approximatif' in e.exemples[0], false);
});

test('un texte invisible, dans un parent invisible ou vide est ignoré', async () => {
  const e = await premierEcran([
    texte('2:2', { visible: false }),
    { id: '2:3', type: 'FRAME', name: 'Caché', visible: false, children: [texte('2:4')] },
    texte('2:7', { characters: '' }),
    texte('2:8'),
  ]);

  assert.equal(e.textes, 1);
});

test('le pire segment décide de l\'état, le texte ne compte qu\'une fois', async () => {
  const segments = [
    { characters: 'ab', fontSize: 16, fontWeight: 400, fills: [plein('000000')] },
    { characters: 'cd', fontSize: 16, fontWeight: 400, fills: [plein('777777')] },
  ];
  const e = await premierEcran([texte('2:2', { characters: 'abcd', segments })]);

  assert.equal(e.textes, 1);
  assert.equal(e.echecs, 1);
  assert.equal(e.exemples[0].couleur, '777777');
});

test('l\'exemple coupe le texte à 40 caractères', async () => {
  const e = await premierEcran([texte('2:2', { characters: 'x'.repeat(60), fills: [plein('FFFFFF')] })]);

  assert.equal(e.exemples[0].texte.length, 40);
});

test('20 exemples au plus par écran, dans l\'ordre du document, mais tous comptés', async () => {
  const textes = Array.from({ length: 25 }, (_, i) => texte(`5:${i}`, { fills: [plein('FFFFFF')] }));
  const e = await premierEcran(textes);

  assert.equal(e.echecs, 25);
  assert.deepEqual(e.exemples.map((x) => x.noeud), textes.slice(0, 20).map((t) => t.id));
});

test('les échecs passent avant les indéterminés, chacun dans l\'ordre du document', async () => {
  const degrade = { fills: [{ type: 'GRADIENT_LINEAR' }] };
  const e = await premierEcran([
    texte('2:2', degrade),
    texte('2:3', { fills: [plein('FFFFFF')] }),
    texte('2:4', degrade),
    texte('2:5', { fills: [plein('FFFFFF')] }),
  ]);

  assert.deepEqual(e.exemples.map((x) => x.noeud), ['2:3', '2:5', '2:2', '2:4']);
});

test('sans cadres, tous les cadres de premier niveau sont mesurés, avec cadres, seulement ceux-là', async () => {
  const deux = [ecran([texte('2:2')]), ecran([texte('3:2')], { id: '3:1', name: 'Contact' })];

  const tous = await mesurer(deux);
  const un = await mesurer(deux, { cadres: ['3:1'] });

  assert.deepEqual(tous.ecrans.map((x) => x.id), ['2:1', '3:1']);
  assert.deepEqual(un.ecrans.map((x) => x.id), ['3:1']);
  assert.deepEqual(un.page, { id: '1:1', nom: 'Écrans' });
  assert.equal(un.version, 1);
});

test('budget dépassé : le premier cadre est traité, les autres vont dans reste', async () => {
  const trois = [ecran([texte('2:2')]), ecran([], { id: '3:1' }), ecran([], { id: '4:1' })];

  const r = await mesurer(trois, { budgetMs: -1 });

  assert.deepEqual(r.ecrans.map((x) => x.id), ['2:1']);
  assert.deepEqual(r.reste, ['3:1', '4:1']);
});

test('budget par défaut : rien dans reste', async () => {
  const r = await mesurer([ecran([texte('2:2')]), ecran([], { id: '3:1' })]);

  assert.deepEqual(r.reste, []);
});

test('le sceau est stable, calculé sur l\'écran, et change avec la mesure', async () => {
  const a = await premierEcran([texte('2:2')]);
  const b = await premierEcran([texte('2:2')]);
  const c = await premierEcran([texte('2:2', { fills: [plein('FFFFFF')] })]);

  assert.match(a.sceau, /^[0-9a-f]{8}$/);
  assert.equal(a.sceau, b.sceau);
  assert.notEqual(a.sceau, c.sceau);
});

test('une page introuvable est refusée avec un message clair', async () => {
  await assert.rejects(mesurer([], { pageId: '7:7' }), /page introuvable : 7:7/);
});

test('les textes à l\'intérieur d\'une instance sont mesurés, sauf s\'ils sont cachés', async () => {
  const e = await premierEcran([
    { id: '2:5', type: 'INSTANCE', name: 'Bouton', children: [
      texte('2:6', { fills: [plein('FFFFFF')] }),
      texte('2:7', { visible: false }),
      { id: '2:8', type: 'FRAME', name: 'Caché', visible: false, children: [texte('2:9')] },
    ] },
  ]);

  assert.equal(e.textes, 1);
  assert.equal(e.exemples[0].noeud, '2:6');
});

test('la couleur du texte est le dernier remplissage plein visible, celui du dessus', async () => {
  const e = await premierEcran([texte('2:2', { fills: [plein('000000'), plein('FFFFFF'), { ...plein('000000'), visible: false }] })]);

  assert.equal(e.exemples[0].couleur, 'FFFFFF');
});

test('un dégradé au-dessus des pleins rend le segment indéterminé', async () => {
  const e = await premierEcran([texte('2:2', { fills: [plein('000000'), { type: 'GRADIENT_LINEAR' }] })]);

  assert.equal(e.indetermines, 1);
  assert.equal(e.exemples[0].couleur, null);
});

test('un plein translucide du dessus est composé sur les pleins du dessous du même texte', async () => {
  const e = await premierEcran([texte('2:2', { fills: [plein('000000'), plein('FFFFFF', 0.5)] })]);

  assert.equal(e.exemples[0].couleur, '808080');
  assert.equal(e.exemples[0].etat, 'echec');
});

test('le ratio se retrouve en le recalculant depuis couleur et fond en hexadécimal', async () => {
  const e = await premierEcran([texte('2:2', { fills: [plein('808080', 0.6)] })], { fills: [plein('123456', 0.7)] });
  const lin = (v) => { const x = v / 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; };
  const lum = (h) => 0.2126 * lin(parseInt(h.slice(0, 2), 16)) + 0.7152 * lin(parseInt(h.slice(2, 4), 16)) + 0.0722 * lin(parseInt(h.slice(4, 6), 16));
  const [a, b] = [lum(e.exemples[0].couleur), lum(e.exemples[0].fond)].sort((x, y) => y - x);

  assert.equal(e.exemples[0].ratio, Math.round(((a + 0.05) / (b + 0.05)) * 100) / 100);
});

test('à état égal, le segment au ratio le plus bas est gardé', async () => {
  const segment = (hex) => ({ characters: 'ab', fontSize: 16, fontWeight: 400, fills: [plein(hex)] });
  const e = await premierEcran([texte('2:2', { characters: 'abab', segments: [segment('888888'), segment('AAAAAA'), segment('999999')] })]);

  assert.equal(e.exemples[0].couleur, 'AAAAAA');
});

test('un identifiant de cadres inconnu ou caché lève une erreur qui les nomme tous', async () => {
  const cadres = [ecran([texte('2:2')]), ecran([], { id: '3:1', visible: false })];

  await assert.rejects(mesurer(cadres, { cadres: ['2:99', '2:1', '3:1'] }), /cadres inconnus sur cette page : 2:99, 3:1/);
});

test('les cadres demandés sortent dans l\'ordre du document, sans doublon', async () => {
  const cadres = [ecran([]), ecran([], { id: '3:1' }), ecran([], { id: '4:1' })];

  const r = await mesurer(cadres, { cadres: ['4:1', '2:1', '4:1'] });

  assert.deepEqual(r.ecrans.map((x) => x.id), ['2:1', '4:1']);
});

test('un budget nul ou absent vaut le budget par défaut', async () => {
  const r = await mesurer([ecran([]), ecran([], { id: '3:1' })], { budgetMs: null });

  assert.deepEqual(r.reste, []);
  assert.equal(r.ecrans.length, 2);
});
