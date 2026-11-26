// figma-ui-kit:script survol v1
const PARAMS = /*PARAMS*/{}/*FIN-PARAMS*/;
// Survol du fichier : par page, cadres de premier niveau, sections, autres nœuds, préfixes ;
// pour le fichier, mots récurrents, versions, noms en double, styles et collections locaux.
// Aucun paramètre. Lecture seule (change de page pour lire chaque page).
// --- commun ---
// Bloc partagé par tous les scripts de mesure (copie conforme de _commun.js).
// JSON canonique : clés triées, pour qu'un même contenu donne toujours le même texte.
function canon(valeur) {
  if (valeur === null || typeof valeur !== 'object') return JSON.stringify(valeur);
  if (Array.isArray(valeur)) return '[' + valeur.map(canon).join(',') + ']';
  return '{' + Object.keys(valeur).sort().map((cle) => JSON.stringify(cle) + ':' + canon(valeur[cle])).join(',') + '}';
}
// Sceau : FNV-1a 32 bits du JSON canonique, en hexadécimal sur 8 caractères.
function sceau(valeur) {
  const texte = canon(valeur);
  let h = 0x811c9dc5;
  for (let i = 0; i < texte.length; i++) {
    h ^= texte.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}
// Parcours des nœuds comptés : visibles, instance comptée sans ses enfants,
// section traversée sans être comptée. `visite(noeud)` est appelée pour chaque nœud compté.
function parcourir(racine, visite) {
  const pile = [racine];
  while (pile.length) {
    const noeud = pile.pop();
    if (noeud.visible === false) continue;
    if (noeud.type !== 'SECTION') visite(noeud);
    if (noeud.type === 'INSTANCE') continue;
    const enfants = 'children' in noeud && noeud.children ? noeud.children : [];
    for (let i = enfants.length - 1; i >= 0; i--) pile.push(enfants[i]);
  }
}
// Cadres de premier niveau d'une page : enfants directs de la page ou d'une section.
// Un cadre invisible, ou rangé dans une section invisible, n'est pas un écran.
const TYPES_ECRAN = ['FRAME', 'COMPONENT', 'COMPONENT_SET', 'INSTANCE'];
function cadresDePremierNiveau(page) {
  const cadres = [];
  const pile = [...page.children].reverse();
  while (pile.length) {
    const noeud = pile.pop();
    if (noeud.visible === false) continue;
    if (noeud.type === 'SECTION') { for (let i = noeud.children.length - 1; i >= 0; i--) pile.push(noeud.children[i]); continue; }
    if (TYPES_ECRAN.includes(noeud.type)) cadres.push(noeud);
  }
  return cadres;
}
// Couleur d'un remplissage plein en hexadécimal, avec l'alpha s'il est sous 1.
function hexa(couleur, alpha) {
  const c = (v) => Math.round(v * 255).toString(16).padStart(2, '0');
  const base = (c(couleur.r) + c(couleur.g) + c(couleur.b)).toUpperCase();
  return alpha === undefined || alpha >= 1 ? base : base + c(alpha).toUpperCase();
}
// Texte sûr pour le transport, sur une seule ligne : les retours à la ligne
// (dont celui de Figma, U+2028, qui casse le transport) et les tabulations deviennent des espaces.
function texteSur(texte) {
  const separateurs = [0x2028, 0x2029, 0x0A, 0x0D, 0x09].map((code) => String.fromCharCode(code));
  return separateurs.reduce((reste, separateur) => reste.split(separateur).join(' '), String(texte));
}
// --- fin commun ---
const MOTS_VERSION = ['version', 'final', 'old', 'wip', 'draft', 'explo', 'test', 'copy', 'copie', 'backup', 'archive', 'ancien', 'new', 'bis'];
const SEUIL_PREFIXE = 2;
const SEUIL_MOT = 3;
const LONGUEUR_MOT = 3;
const separateurs = /[_\-\/ ]/;
const decoupe = (nom) => nom.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean);
// Mots d'un nom pour les mots récurrents : le tiret entre deux lettres reste dans le mot (« en-tête »).
const decoupeMots = (nom) => nom.toLowerCase().replace(/(?<!\p{L})-|-(?!\p{L})/gu, ' ').split(/[^\p{L}\p{N}-]+/u).filter(Boolean);
const estMarqueur = (mot) => MOTS_VERSION.includes(mot) || /^v[1-9][0-9]?$/.test(mot);
const estVersion = (nom) => decoupe(nom).some(estMarqueur) || /(^|\D)\d{4}-\d{2}-\d{2}(\D|$)/.test(nom) || /(^|\D)\d{2}\/\d{2}\/\d{4}(\D|$)/.test(nom);
const parOccurrences = (a, b, cle) => (b.occurrences - a.occurrences) || (a[cle] < b[cle] ? -1 : a[cle] > b[cle] ? 1 : 0);
// Sections et autres nœuds de premier niveau d'une page (enfants directs de la page ou d'une section).
function sectionsEtAutres(page) {
  const sections = [];
  const autres = [];
  const pile = [...page.children].reverse();
  while (pile.length) {
    const noeud = pile.pop();
    if (noeud.type === 'SECTION') {
      sections.push(texteSur(noeud.name));
      for (let i = noeud.children.length - 1; i >= 0; i--) pile.push(noeud.children[i]);
    } else if (!TYPES_ECRAN.includes(noeud.type)) {
      autres.push({ id: noeud.id, nom: texteSur(noeud.name), type: noeud.type });
    }
  }
  return { sections, autres };
}

const pages = [];
const tousLesCadres = [];
for (const page of figma.root.children) {
  await figma.setCurrentPageAsync(page);
  const cadres = cadresDePremierNiveau(page).map((c) => ({ id: c.id, nom: texteSur(c.name), page: page.id }));
  tousLesCadres.push(...cadres);
  const comptePrefixes = new Map();
  for (const cadre of cadres) {
    const prefixe = cadre.nom.toLowerCase().split(separateurs)[0];
    if (prefixe && !/^\p{N}+$/u.test(prefixe) && !estMarqueur(prefixe)) comptePrefixes.set(prefixe, (comptePrefixes.get(prefixe) || 0) + 1);
  }
  const prefixes = [...comptePrefixes].filter(([, n]) => n >= SEUIL_PREFIXE).map(([prefixe, occurrences]) => ({ prefixe, occurrences })).sort((a, b) => parOccurrences(a, b, 'prefixe'));
  const { sections, autres } = sectionsEtAutres(page);
  const composants = page.findAll((n) => n.type === 'COMPONENT_SET' || (n.type === 'COMPONENT' && (!n.parent || n.parent.type !== 'COMPONENT_SET'))).length;
  pages.push({ id: page.id, nom: texteSur(page.name), vide: page.children.length === 0, cadres: cadres.length, sections, prefixes, autresNoeuds: autres, composants });
}

const compteMots = new Map();
for (const cadre of tousLesCadres) {
  for (const mot of decoupeMots(cadre.nom)) {
    if (mot.length >= LONGUEUR_MOT && /^\p{L}+(-\p{L}+)*$/u.test(mot) && !estMarqueur(mot)) compteMots.set(mot, (compteMots.get(mot) || 0) + 1);
  }
}
const motsRecurrents = [...compteMots].filter(([, n]) => n >= SEUIL_MOT).map(([mot, occurrences]) => ({ mot, occurrences })).sort((a, b) => parOccurrences(a, b, 'mot'));
const versions = tousLesCadres.filter((c) => estVersion(c.nom)).map((c) => ({ nom: c.nom, page: c.page }));

const idsParNom = new Map();
for (const cadre of tousLesCadres) idsParNom.set(cadre.nom, [...(idsParNom.get(cadre.nom) || []), cadre.id]);
const nomsEnDouble = [...idsParNom].filter(([, ids]) => ids.length > 1).map(([nom, ids]) => ({ nom, ids }));

const collections = await figma.variables.getLocalVariableCollectionsAsync();
const local = {
  stylesCouleur: (await figma.getLocalPaintStylesAsync()).length,
  stylesTexte: (await figma.getLocalTextStylesAsync()).length,
  stylesEffet: (await figma.getLocalEffectStylesAsync()).length,
  stylesGrille: (await figma.getLocalGridStylesAsync()).length,
  collections: collections.map((c) => ({ nom: texteSur(c.name), modes: c.modes.length, variables: c.variableIds.length })),
};

const mesures = { version: 1, pages, motsRecurrents, versions, nomsEnDouble, local };
return { ...mesures, sceau: sceau(mesures) };
