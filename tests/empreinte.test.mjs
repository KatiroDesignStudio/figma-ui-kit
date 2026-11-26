// Tests du script de mesure `empreinte.js` et du bloc commun des scripts.
// Lancer : npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { blocCommun, DOSSIER_SCRIPTS, lancer, lireScript } from './aide/figma-simule.mjs';
import { ecritureFigma } from '../plugins/figma-ui-kit/hooks/filtre-outils.mjs';

const SCRIPTS = readdirSync(DOSSIER_SCRIPTS).filter((nom) => nom.endsWith('.js') && !nom.startsWith('_'));

const bouton = { id: '9:1', type: 'COMPONENT', name: 'Button' };
const documentSimple = () => ({
  pages: [{
    id: '1:1', name: 'Écrans', children: [
      { id: '2:1', type: 'FRAME', name: 'Accueil', children: [
        { id: '2:2', type: 'TEXT', name: 'Titre' },
        { id: '2:3', type: 'RECTANGLE', name: 'Caché', visible: false },
        { id: '2:4', type: 'FRAME', name: 'Groupe caché', visible: false, children: [{ id: '2:5', type: 'TEXT', name: 'Invisible par héritage' }] },
        { id: '2:6', type: 'INSTANCE', name: 'Button', mainComponent: bouton, children: [{ id: '2:7', type: 'TEXT', name: 'Libellé' }] },
        { id: '2:8', type: 'INSTANCE', name: 'Button', mainComponent: bouton, children: [] },
        { id: '2:9', type: 'INSTANCE', name: 'Icône', mainComponent: { id: '8:1', key: 'cle-bibliotheque', remote: true, type: 'COMPONENT', name: 'Icon' } },
      ] },
      { id: '3:1', type: 'SECTION', name: 'Section', children: [
        { id: '3:2', type: 'FRAME', name: 'Contact', children: [{ id: '3:3', type: 'RECTANGLE', name: 'Fond' }] },
      ] },
    ],
  }, { id: '1:2', name: 'Autre', children: [{ id: '4:1', type: 'FRAME', name: 'Ailleurs' }] }],
});

test('chaque script contient une copie conforme du bloc commun', () => {
  assert.ok(SCRIPTS.length > 0, 'aucun script trouvé');
  for (const nom of SCRIPTS) assert.ok(lireScript(nom).includes(blocCommun()), `${nom} : bloc commun absent ou modifié`);
});

test('chaque script porte son en-tête et son marqueur de paramètres', () => {
  for (const nom of SCRIPTS) {
    const code = lireScript(nom);
    assert.match(code, new RegExp(`^// figma-ui-kit:script ${nom.replace('.js', '')} v\\d+\\n`), `${nom} : en-tête`);
    assert.match(code, /const PARAMS = \/\*PARAMS\*\/\{\}\/\*FIN-PARAMS\*\/;/, `${nom} : marqueur de paramètres`);
  }
});

test('aucun script n\'écrit dans Figma', () => {
  for (const nom of SCRIPTS) assert.equal(ecritureFigma(lireScript(nom)), null, nom);
});

test('empreinte compte les nœuds visibles, une instance pour 1, sans la section', async () => {
  const { resultat } = await lancer('empreinte.js', { pageId: '1:1' }, documentSimple());

  assert.deepEqual(resultat.page, { id: '1:1', nom: 'Écrans' });
  // Accueil, Titre, 3 instances, Contact, Fond : ni les cachés, ni les enfants d'instance, ni la section.
  assert.equal(resultat.noeuds, 7);
  assert.deepEqual(resultat.parType, { FRAME: 2, INSTANCE: 3, RECTANGLE: 1, TEXT: 1 });
});

test('empreinte compte les instances par composant principal, par clé pour une bibliothèque', async () => {
  const { resultat } = await lancer('empreinte.js', { pageId: '1:1' }, documentSimple());

  assert.deepEqual(resultat.instances, { '9:1': 2, 'cle-bibliotheque': 1 });
});

test('empreinte ne change de page qu\'une fois et ne lit que la page demandée', async () => {
  const { resultat, figma } = await lancer('empreinte.js', { pageId: '1:2' }, documentSimple());

  assert.equal(figma.changementsDePage, 1);
  assert.equal(resultat.noeuds, 1);
});

test('empreinte donne le même sceau pour le même document, un autre si un nœud change', async () => {
  const a = await lancer('empreinte.js', { pageId: '1:1' }, documentSimple());
  const b = await lancer('empreinte.js', { pageId: '1:1' }, documentSimple());
  const modifie = documentSimple();
  modifie.pages[0].children[0].children.push({ id: '2:10', type: 'RECTANGLE', name: 'Ajout' });
  const c = await lancer('empreinte.js', { pageId: '1:1' }, modifie);

  assert.match(a.resultat.sceau, /^[0-9a-f]{8}$/);
  assert.equal(a.resultat.sceau, b.resultat.sceau);
  assert.notEqual(a.resultat.sceau, c.resultat.sceau);
});

test('empreinte refuse une page introuvable avec un message clair', async () => {
  await assert.rejects(lancer('empreinte.js', { pageId: '7:7' }, documentSimple()), /page introuvable : 7:7/);
});
