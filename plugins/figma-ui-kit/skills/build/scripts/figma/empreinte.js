// figma-ui-kit:script empreinte v1
const PARAMS = /*PARAMS*/{}/*FIN-PARAMS*/;
// Empreinte d'une page : nœuds comptés, nœuds par type, instances par composant principal.
// Sert à savoir si une page a changé depuis un relevé, sans la rescanner.
// Paramètres : { pageId }. Lecture seule.
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
const page = await figma.getNodeByIdAsync(PARAMS.pageId);
if (!page || page.type !== 'PAGE') throw new Error('page introuvable : ' + PARAMS.pageId);
await figma.setCurrentPageAsync(page);

const instancesVues = [];
const parTypeBrut = {};
let noeuds = 0;
for (const enfant of page.children) {
  parcourir(enfant, (noeud) => {
    noeuds += 1;
    parTypeBrut[noeud.type] = (parTypeBrut[noeud.type] || 0) + 1;
    if (noeud.type === 'INSTANCE') instancesVues.push(noeud);
  });
}

// Composant principal de chaque instance : son identifiant, ou sa clé s'il vient d'une bibliothèque.
const instancesBrut = {};
for (const instance of instancesVues) {
  const principal = await instance.getMainComponentAsync();
  const cle = !principal ? 'inconnu' : (principal.remote && principal.key ? principal.key : principal.id);
  instancesBrut[cle] = (instancesBrut[cle] || 0) + 1;
}

const trier = (objet) => Object.fromEntries(Object.keys(objet).sort().map((cle) => [cle, objet[cle]]));
const mesures = { page: { id: page.id, nom: texteSur(page.name) }, noeuds, parType: trier(parTypeBrut), instances: trier(instancesBrut) };
return { ...mesures, sceau: sceau(mesures) };
